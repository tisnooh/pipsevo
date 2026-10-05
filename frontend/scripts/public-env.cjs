// Deliberate browser allowlist. Never serialize the server's process.env.
const PUBLIC_KEYS = Object.freeze([
  'REACT_APP_BACKEND_URL',
  'REACT_APP_SUPABASE_URL',
  'REACT_APP_SUPABASE_PUBLISHABLE_KEY',
  'REACT_APP_REQUIRE_EMAIL_CONFIRMATION',
  'REACT_APP_CONTACT_EMAIL',
  'REACT_APP_MT5_AUTO_SYNC_ENABLED',
]);

function publicEnvironment(source, nodeEnv) {
  const values = { NODE_ENV: nodeEnv };
  for (const key of PUBLIC_KEYS) {
    if (typeof source[key] === 'string') values[key] = source[key];
  }
  return values;
}

module.exports = { PUBLIC_KEYS, publicEnvironment };
