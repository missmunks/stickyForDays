// netlify/functions/waivers.js
const { createClient } = require('@supabase/supabase-js');

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
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
  if (event.httpMethod !== 'GET') return { statusCode: 405, headers: CORS, body: 'Method Not Allowed' };
  if (!isAdmin(event)) return { statusCode: 401, headers: CORS, body: JSON.stringify({ error: 'Unauthorized' }) };

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE;
  if (!url || !key) return { statusCode: 500, headers: CORS, body: JSON.stringify({ error: 'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE' }) };

  const s = createClient(url, key);
  const { data, error } = await s
    .from('waivers')
    .select('id,name,email,contact,method,waiver_version,ip_address,user_agent,agreed_at')
    .order('agreed_at', { ascending: false });

  if (error) return { statusCode: 500, headers: CORS, body: JSON.stringify({ error: error.message }) };

  const wantsCsv = (event.queryStringParameters?.format || '').toLowerCase() === 'csv';
  if (wantsCsv) {
    const header = ['id','name','email','contact','method','waiver_version','ip_address','user_agent','agreed_at'];
    const lines = [header.join(',')];
    for (const r of data) lines.push(header.map(k => (r[k] ?? '')).join(','));
    return { statusCode: 200, headers: { ...CORS, 'Content-Type': 'text/csv' }, body: lines.join('\n') };
  }

  return { statusCode: 200, headers: CORS, body: JSON.stringify({ rows: data }) };
};
const body = JSON.parse(event.body || '{}');
const name = (body.name || '').trim();
if (!name) {
  return { statusCode: 400, headers: cors(), body: JSON.stringify({ error: 'Name is required' }) };
}

const covered = Array.isArray(body.covered_names)
  ? body.covered_names
  : (body.covered || '')
      .split('\n')
      .map(s => s.trim())
      .filter(Boolean);

const { error } = await supabase
  .from('waivers')
  .insert([{
    name,
    contact: body.email || null,
    method: body.method || 'checkbox',
    waiver_version: 'v9',
    ip_address: ip,
    user_agent: ua,
    covered_names: covered.length ? covered : null
  }]);
