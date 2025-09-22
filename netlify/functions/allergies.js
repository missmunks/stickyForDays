// netlify/functions/allergies.js
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
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers: CORS, body: 'ok' };

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE;
  if (!url || !key) return { statusCode: 500, headers: CORS, body: JSON.stringify({ error: 'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE' }) };
  const db = createClient(url, key);

  try {
    if (event.httpMethod === 'GET') {
      const { data, error } = await db.from('allergies').select('id,name,note,created_at').order('created_at', { ascending: false });
      if (error) throw error;
      return { statusCode: 200, headers: CORS, body: JSON.stringify({ rows: data }) };
    }

    if (event.httpMethod === 'POST') {
      const body = JSON.parse(event.body || '{}');
      const name = (body.name || '').toString().slice(0, 120) || null;
      const note = (body.note || '').toString().slice(0, 500);
      if (!note) return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'note required' }) };
      const { error } = await db.from('allergies').insert([{ name, note }]);
      if (error) throw error;
      return { statusCode: 200, headers: CORS, body: JSON.stringify({ ok: true }) };
    }

    if (event.httpMethod === 'DELETE') {
      if (!isAdmin(event)) return { statusCode: 401, headers: CORS, body: JSON.stringify({ error: 'Unauthorized' }) };
      const qsId = event.queryStringParameters?.id;
      let bodyId;
      try { bodyId = JSON.parse(event.body || '{}').id; } catch {}
      const id = Number(qsId ?? bodyId);
      if (!id) return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'id required' }) };
      const { error } = await db.from('allergies').delete().eq('id', id);
      if (error) throw error;
      return { statusCode: 200, headers: CORS, body: JSON.stringify({ ok: true }) };
    }

    return { statusCode: 405, headers: CORS, body: 'Method Not Allowed' };
  } catch (e) {
    return { statusCode: 500, headers: CORS, body: JSON.stringify({ error: e.message }) };
  }
};
