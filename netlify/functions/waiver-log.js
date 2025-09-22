// netlify/functions/waiver-log.js
const { createClient } = require('@supabase/supabase-js');

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

exports.handler = async (event) => {
  // CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: CORS, body: 'ok' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: CORS, body: 'Method Not Allowed' };
  }

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE;
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE) {
    return {
      statusCode: 500,
      headers: CORS,
      body: JSON.stringify({ error: 'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE' }),
    };
  }

  // Parse body safely
  let body = {};
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'Invalid JSON body' }) };
  }

  // Require name
  const name = (body.name || '').toString().trim().slice(0, 120);
  if (!name) {
    return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'Name is required' }) };
  }

  // Optional email/contact
  const email = (body.email || '').toString().trim().slice(0, 200) || null;

  // covered_names: either an array or a newline-separated string "covered"
  let covered_names = Array.isArray(body.covered_names)
    ? body.covered_names
    : (body.covered || '')
        .toString()
        .split('\n')
        .map(s => s.trim())
        .filter(Boolean);

  // Basic normalization + length limits for each covered name
  covered_names = covered_names
    .map(s => s.slice(0, 120))
    .slice(0, 50); // hard cap just in case

  // How they agreed (optional tag)
  const method = (body.method || 'checkbox').toString().slice(0, 40);

  // Capture IP + User Agent for proof
  const ip =
    (event.headers['x-nf-client-connection-ip'] ||
     event.headers['x-forwarded-for'] ||
     event.headers['client-ip'] ||
     '')
      .toString()
      .split(',')[0]
      .trim();

  const ua = (event.headers['user-agent'] || '').toString().slice(0, 1024);

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE);

    const insertRow = {
      name,
      email,                    // your table has both email and contact; we can set both
      contact: email,
      method,
      waiver_version: 'v9',
      ip_address: ip || null,
      user_agent: ua || null,
      covered_names: covered_names.length ? covered_names : null, // TEXT[] in your schema
    };

    const { error } = await supabase.from('waivers').insert([insertRow]);
    if (error) throw error;

    return { statusCode: 200, headers: CORS, body: JSON.stringify({ ok: true }) };
  } catch (e) {
    return { statusCode: 500, headers: CORS, body: JSON.stringify({ error: e.message }) };
  }
};
