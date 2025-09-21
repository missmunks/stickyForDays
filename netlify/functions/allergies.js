// ---- shared helpers (paste into each function file) ----
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Admin-Token',
};

function getAdminToken(event) {
  if (!isAdmin(event)) {
  return { statusCode: 401, headers: CORS, body: JSON.stringify({ error: 'Unauthorized' }) };
}

  const h = event.headers || {};
  // Authorization: Bearer <token>
  const auth = h.authorization || h.Authorization || '';
  const bearer = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  // x-admin-token: <token>
  const xhdr = h['x-admin-token'] || h['X-Admin-Token'] || '';
  // ?token=<token> as a last resort
  const qs = event.queryStringParameters?.token || '';
  return bearer || xhdr || qs || '';
}
function isAdmin(event) {
  const t = getAdminToken(event);
  return t && t === (process.env.ADMIN_TOKEN || '');
}


// netlify/functions/allergies.js
const { createClient } = require('@supabase/supabase-js');

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-admin-token',
};

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: cors, body: 'ok' };
  }

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE;
  if (!url || !key) {
    return { statusCode: 500, headers: cors, body: JSON.stringify({ error: 'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE' }) };
  }
  const db = createClient(url, key);

  try {
    // GET: list allergies
    if (event.httpMethod === 'GET') {
      const { data, error } = await db.from('allergies').select('id,name,note,created_at').order('created_at', { ascending: false });
      if (error) throw error;
      return { statusCode: 200, headers: cors, body: JSON.stringify({ rows: data }) };
    }

    // POST: add allergy
    if (event.httpMethod === 'POST') {
      const body = JSON.parse(event.body || '{}');
      const name = (body.name || '').toString().slice(0, 120);
      const note = (body.note || '').toString().slice(0, 500);
      if (!note) return { statusCode: 400, headers: cors, body: JSON.stringify({ error: 'note required' }) };
      const { error } = await db.from('allergies').insert([{ name: name || null, note }]);
      if (error) throw error;
      return { statusCode: 200, headers: cors, body: JSON.stringify({ ok: true }) };
    }

    // DELETE: remove allergy (admin only)
    if (event.httpMethod === 'DELETE') {
      const token = event.headers['x-admin-token'] || '';
      if (!token || token !== (process.env.ADMIN_TOKEN || '')) {
        return { statusCode: 401, headers: cors, body: JSON.stringify({ error: 'Unauthorized' }) };
      }
      // id can come from ?id=123 or JSON body { id: 123 }
      const qsId = event.queryStringParameters?.id;
      const bodyId = (() => { try { return JSON.parse(event.body || '{}').id; } catch { return undefined; } })();
      const id = Number(qsId ?? bodyId);
      if (!id) return { statusCode: 400, headers: cors, body: JSON.stringify({ error: 'id required' }) };

      const { error } = await db.from('allergies').delete().eq('id', id);
      if (error) throw error;
      return { statusCode: 200, headers: cors, body: JSON.stringify({ ok: true }) };
    }

    return { statusCode: 405, headers: cors, body: 'Method Not Allowed' };
  } catch (e) {
    return { statusCode: 500, headers: cors, body: JSON.stringify({ error: e.message }) };
  }
};
