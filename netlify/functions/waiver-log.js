// netlify/functions/waiver-log.js
const { createClient } = require('@supabase/supabase-js');

const cors = () => ({
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization'
});

exports.handler = async (event) => {
  // Preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: cors(), body: 'ok' };
  }
  // Method guard
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: cors(), body: 'Method Not Allowed' };
  }

  // Env guard
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE;
  if (!url || !key) {
    return {
      statusCode: 500,
      headers: cors(),
      body: JSON.stringify({ error: 'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE' })
    };
  }

  // Parse body
  let body = {};
  try { body = JSON.parse(event.body || '{}'); } catch {}

  // ✅ REQUIRE NAME
  const rawName = (body.name || '').toString().trim();
  if (!rawName) {
    return {
      statusCode: 400,
      headers: cors(),
      body: JSON.stringify({ error: 'Name is required to accept the waiver.' })
    };
  }
  const name = rawName.slice(0, 120);

  // Meta: IP + User Agent (use Netlify header if available)
  const ip = event.headers['x-nf-client-connection-ip']
          || event.headers['x-forwarded-for']
          || event.headers['client-ip']
          || '';
  const ua = event.headers['user-agent'] || '';

  try {
    const supabase = createClient(url, key);
    // Minimal insert to match your existing table columns
    const { error } = await supabase
      .from('waivers')
      .insert([{ name, ip_address: ip, user_agent: ua }]);

    if (error) throw error;

    return { statusCode: 200, headers: cors(), body: JSON.stringify({ ok: true }) };
  } catch (e) {
    return { statusCode: 500, headers: cors(), body: JSON.stringify({ error: e.message }) };
  }
};
