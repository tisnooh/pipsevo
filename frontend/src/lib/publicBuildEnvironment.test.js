const { PUBLIC_KEYS, publicEnvironment } = require('../../scripts/public-env.cjs');

describe('public build environment boundary', () => {
  test('preserves the reviewed public configuration keys', () => {
    const source = Object.fromEntries(PUBLIC_KEYS.map(key => [key, `public-${key}`]));
    expect(publicEnvironment(source, 'production')).toEqual({
      ...source, NODE_ENV: 'production',
    });
  });

  test('never serializes server secrets or unreviewed public-looking keys', () => {
    const secret = 'test-secret-that-must-not-reach-the-browser';
    const exposed = publicEnvironment({
      SMTP_PASSWORD: secret,
      SUPABASE_SERVICE_ROLE_KEY: secret,
      ATLAS_ANTHROPIC_API_KEY: secret,
      CRON_SECRET: secret,
      VITE_UNKNOWN_SECRET: secret,
      REACT_APP_UNKNOWN_SECRET: secret,
      REACT_APP_BACKEND_URL: 'https://api.example.test',
    }, 'production');
    expect(exposed).toEqual({
      NODE_ENV: 'production', REACT_APP_BACKEND_URL: 'https://api.example.test',
    });
    expect(JSON.stringify(exposed)).not.toContain(secret);
  });

  test('ignores non-string values and preserves the development mode', () => {
    expect(publicEnvironment({
      REACT_APP_BACKEND_URL: null,
      REACT_APP_REQUIRE_EMAIL_CONFIRMATION: false,
    }, 'development')).toEqual({ NODE_ENV: 'development' });
  });
});
