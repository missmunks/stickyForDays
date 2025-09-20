// Logs waiver acceptance to Supabase with IP + User Agent
const { createClient } = require('@supabase/supabase-js');

const cors = () => ({
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization'
});

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: cors(), body: 'ok' };
  }
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: cors(), body: 'Method Not Allowed' };
  }

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE;
  if (!url || !key) {
    return { statusCode: 500, headers: cors(), body: JSON.stringify({ error: 'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE' }) };
  }

  let name = 'Guest';
  try {
    const body = JSON.parse(event.body || '{}');
    if (body.name) name = String(body.name).slice(0, 120);
  } catch {}

  const ip = event.headers['x-forwarded-for'] || '';
  const ua = event.headers['user-agent'] || '';

  try {
    const supabase = createClient(url, key);
    const { error } = await supabase.from('waivers').insert([{ name, ip_address: ip, user_agent: ua }]);
    if (error) throw error;
    return { statusCode: 200, headers: cors(), body: JSON.stringify({ ok: true }) };
  } catch (e) {
    return { statusCode: 500, headers: cors(), body: JSON.stringify({ error: e.message }) };
  }
};
