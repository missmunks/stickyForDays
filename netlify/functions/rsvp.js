// netlify/functions/rsvp.js
const { createClient } = require('@supabase/supabase-js');

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Admin-Token',
};

function getAdminToken(event) {
  const h = event.headers || {};
  const auth = h.authorization || h.Authorization || '';
  const bearer = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  const xhdr = h['x-admin-token'] || h['X-Admin-Token'] || '';
  const qs = event.queryStringParameters?.token || '';
  return bearer || xhdr || qs || '';
}
function isAdmin(event) {
  return getAdminToken(event) === (process.env.ADMIN_TOKEN || '');
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: CORS, body: 'ok' };
  }

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE;
  if (!url || !key) {
    return { statusCode: 500, headers: CORS, body: JSON.stringify({ error: 'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE' }) };
  }
  const s = createClient(url, key);

  const adminView = !!event.queryStringParameters?.admin;

  // GET: list RSVPs (CSV optional)
  if (event.httpMethod === 'GET') {
    try {
      if (adminView && !isAdmin(event)) {
        return { statusCode: 401, headers: CORS, body: JSON.stringify({ error: 'Unauthorized' }) };
      }
      const cols = adminView ? 'id,name,count,created_at' : 'name,count';
      const { data, error } = await s.from('rsvps').select(cols).order('created_at', { ascending: false });
      if (error) throw error;

      const wantsCsv = (event.queryStringParameters?.format || '').toLowerCase() === 'csv';
      if (wantsCsv) {
        const header = adminView ? ['id','name','count','created_at'] : ['name','count'];
        const lines = [header.join(',')];
        for (const r of data) lines.push(header.map(k => (r[k] ?? '')).join(','));
        return { statusCode: 200, headers: { ...CORS, 'Content-Type': 'text/csv' }, body: lines.join('\n') };
      }

      return { statusCode: 200, headers: CORS, body: JSON.stringify({ rows: data }) };
    } catch (e) {
      return { statusCode: 500, headers: CORS, body: JSON.stringify({ error: e.message }) };
    }
  }

  // POST: add RSVP + (optionally) log waiver
  if (event.httpMethod === 'POST') {
    try {
      const body = JSON.parse(event.body || '{}');
      const name = (body.name || '').toString().trim();
      const email = (body.email || '').toString().trim();
      const count = Number(body.count || 1);
      const agreed = !!body.agreed;
      const method = (body.method || 'checkbox').toString();

      if (!agreed) return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'Please accept the Release of Liability.' }) };
      if (!name) return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'Missing name' }) };

      const { error: rErr } = await s.from('rsvps').insert([{ name, count }]);
      if (rErr) throw rErr;

      const ip = event.headers['x-nf-client-connection-ip']
        || event.headers['x-forwarded-for']
        || event.headers['client-ip'] || '';
      const ua = event.headers['user-agent'] || '';

      const { error: wErr } = await s.from('waivers').insert([{
        name,
        email: email || null,
        contact: email || null,
        method,
        waiver_version: 'v8',
        ip_address: ip,
        user_agent: ua
      }]);
      if (wErr) throw wErr;

      return { statusCode: 200, headers: CORS, body: JSON.stringify({ ok: true }) };
    } catch (e) {
      return { statusCode: 500, headers: CORS, body: JSON.stringify({ error: e.message }) };
    }
  }

  // DELETE: admin only
if (event.httpMethod === 'DELETE') {
  if (!isAdmin(event)) {
    return { statusCode: 401, headers: CORS, body: JSON.stringify({ error: 'Unauthorized' }) };
  }
  try {
    const qsId = event.queryStringParameters?.id;
    let bodyId;
    try { bodyId = JSON.parse(event.body || '{}').id; } catch {}
    const id = Number(qsId ?? bodyId);
    if (!id) return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'id required' }) };

    const { error } = await s.from('rsvps').delete().eq('id', id);
    if (error) throw error;
    return { statusCode: 200, headers: CORS, body: JSON.stringify({ ok: true }) };
  } catch (e) {
    return { statusCode: 500, headers: CORS, body: JSON.stringify({ error: e.message }) };
  }
}


  return { statusCode: 405, headers: CORS, body: 'Method Not Allowed' };
};
  