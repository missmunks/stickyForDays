// netlify/functions/rsvp.js
const { createClient } = require('@supabase/supabase-js');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization'
};

function isAdmin(event) {
  const raw = event.headers['authorization'] || '';
  const bearer = raw.startsWith('Bearer ') ? raw.slice(7) : raw;
  const qs = event.queryStringParameters?.admin || '';
  const token = bearer || qs;
  return token && token === process.env.ADMIN_TOKEN;
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: corsHeaders, body: 'ok' };
  }

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE;
  if (!url || !key) {
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE' })
    };
  }
  const s = createClient(url, key);

  const adminView = !!event.queryStringParameters?.admin;

  // ---------- GET: list RSVPs (optionally CSV for admin) ----------
  if (event.httpMethod === 'GET') {
    try {
      const cols = adminView ? 'id,name,count,created_at' : 'name,count';
      if (adminView && !isAdmin(event)) {
        return { statusCode: 401, headers: corsHeaders, body: JSON.stringify({ error: 'Unauthorized' }) };
      }

      const { data, error } = await s
        .from('rsvps')
        .select(cols)
        .order('created_at', { ascending: false });
      if (error) throw error;

      // CSV export if ?format=csv
      if ((event.queryStringParameters?.format || '').toLowerCase() === 'csv') {
        const header = adminView ? ['id', 'name', 'count', 'created_at'] : ['name', 'count'];
        const rows = [header.join(',')];
        for (const row of data) rows.push(header.map(k => (row[k] ?? '')).join(','));
        return {
          statusCode: 200,
          headers: { ...corsHeaders, 'Content-Type': 'text/csv' },
          body: rows.join('\n')
        };
      }

      return { statusCode: 200, headers: corsHeaders, body: JSON.stringify({ rows: data }) };
    } catch (e) {
      return { statusCode: 500, headers: corsHeaders, body: JSON.stringify({ error: e.message }) };
    }
  }

  // ---------- POST: add RSVP & log waiver proof ----------
  if (event.httpMethod === 'POST') {
    try {
      const body = JSON.parse(event.body || '{}');

      // expected fields coming from your form
      const name   = (body.name || '').toString().trim();
      const count  = Number(body.count || 1);
      const agreed = !!body.agreed;                 // waiver checkbox on the page
      const email  = (body.email || '').toString().trim();
      const phone  = (body.phone || '').toString().trim();
      const method = (body.method || 'checkbox').toString();  // how they agreed (optional)

      if (!agreed) {
        return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: 'Please accept the Release of Liability.' }) };
      }
      if (!name) {
        return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: 'Missing name' }) };
      }

      // 1) Insert RSVP
      const { error: rsvpErr } = await s.from('rsvps').insert([{ name, count }]);
      if (rsvpErr) throw rsvpErr;

      // 2) Log waiver proof (simple table, no attendee_id)
      const ip = event.headers['x-nf-client-connection-ip']
              || event.headers['x-forwarded-for']
              || event.headers['client-ip']
              || '';
      const ua = event.headers['user-agent'] || '';
      const contact = email || phone || null;

      const { error: wErr } = await s.from('waivers').insert([{
        name,
        email,                       // <-- explicit email column
        contact,                     // email or phone (optional)
        method,                      // 'checkbox' | 'email' | 'sms'
        waiver_version: 'v8',
        ip_address: ip,
        user_agent: ua
      }]);
      if (wErr) throw wErr;

      return { statusCode: 200, headers: corsHeaders, body: JSON.stringify({ ok: true }) };
    } catch (e) {
      return { statusCode: 500, headers: corsHeaders, body: JSON.stringify({ error: e.message }) };
    }
  }

  // ---------- DELETE: remove RSVP (admin only) ----------
  if (event.httpMethod === 'DELETE') {
    try {
      if (!isAdmin(event)) {
        return { statusCode: 401, headers: corsHeaders, body: JSON.stringify({ error: 'Unauthorized' }) };
      }
      const { id } = JSON.parse(event.body || '{}');
      const num = Number(id);
      if (!num) {
        return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: 'Missing id' }) };
      }

      const { error: delErr } = await s.from('rsvps').delete().eq('id', num);
      if (delErr) throw delErr;

      return { statusCode: 200, headers: corsHeaders, body: JSON.stringify({ ok: true }) };
    } catch (e) {
      return { statusCode: 500, headers: corsHeaders, body: JSON.stringify({ error: e.message }) };
    }
  }

  return { statusCode: 405, headers: corsHeaders, body: 'Method Not Allowed' };
};
