const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const manifest = require('../package.json');
const lock = require('../package-lock.json');
const { publicEnvironment, PUBLIC_KEYS } = require('./public-env.cjs');

// Fresh installs must not reintroduce the retired build toolchain.
for (const legacy of ['react-scripts', '@craco/craco', 'cra-template',
  'webpack-dev-server', 'webpack-dev-middleware', 'rollup-plugin-terser',
  'resolve-url-loader', '@emergentbase/visual-edits']) {
  assert.ok(!Object.keys(lock.packages).some(location =>
    location.endsWith(`node_modules/${legacy}`)), `${legacy} must be absent`);
}
for (const name of ['vite', '@vitejs/plugin-react', 'jest', 'babel-jest', 'jest-environment-jsdom']) {
  const version = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../node_modules', name, 'package.json'), 'utf8')).version;
  assert.equal(version, manifest.devDependencies[name], `${name} must be explicitly pinned`);
  assert.equal(lock.packages[`node_modules/${name}`].version, version);
}

const secret = 'private-build-fixture-not-for-the-browser';
const source = {
  SMTP_PASSWORD: secret, ATLAS_ANTHROPIC_API_KEY: secret,
  SUPABASE_SERVICE_ROLE_KEY: secret, CRON_SECRET: secret,
  REACT_APP_UNKNOWN_SECRET: secret,
  REACT_APP_BACKEND_URL: 'https://api.example.test',
  REACT_APP_REQUIRE_EMAIL_CONFIRMATION: 'false',
};
const exposed = publicEnvironment(source, 'production');
assert.deepEqual(exposed, {
  NODE_ENV: 'production', REACT_APP_BACKEND_URL: 'https://api.example.test',
  REACT_APP_REQUIRE_EMAIL_CONFIRMATION: 'false',
});
assert.ok(!JSON.stringify(exposed).includes(secret));

const root = path.resolve(__dirname, '..');
const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
assert.ok(index.includes('src="/src/index.jsx"'));
assert.ok(!index.includes('%PUBLIC_URL%'));
const references = new Set();
function inspect(folder) {
  for (const entry of fs.readdirSync(folder, { withFileTypes: true })) {
    const full = path.join(folder, entry.name);
    if (entry.isDirectory()) inspect(full);
    else if (/\.(js|jsx)$/.test(entry.name) && !entry.name.includes('.test.')) {
      const source = fs.readFileSync(full, 'utf8');
      for (const match of source.matchAll(/process\.env\.(REACT_APP_[A-Z0-9_]+)/g)) {
        references.add(match[1]);
      }
    }
  }
}
inspect(path.join(root, 'src'));
for (const key of references) assert.ok(PUBLIC_KEYS.includes(key), `${key} needs a reviewed public allowlist entry`);

// SPA deep links must not capture the authenticated serverless cron proxy.
const deployment = require('../vercel.json');
const rewrite = new RegExp(`^${deployment.rewrites[0].source}$`);
for (const route of ['/login', '/auth/callback', '/admin/users/test-user', '/app/backtest/session/demo', '/blog/discipline']) {
  assert.ok(rewrite.test(route), `${route} must reach the SPA`);
}
assert.ok(!rewrite.test('/api/sync-due'), 'cron proxy must not be rewritten to HTML');
assert.equal(deployment.outputDirectory, 'build');
import('../vite.config.mjs').then(({ default: buildConfig }) => {
  const resolved = buildConfig({ mode: 'production', command: 'build' });
  assert.deepEqual(resolved.envPrefix, [], 'automatic VITE_* exports must remain disabled');
  const browserEnv = JSON.parse(resolved.define['process.env']);
  for (const key of Object.keys(browserEnv)) {
    assert.ok(key === 'NODE_ENV' || PUBLIC_KEYS.includes(key), `${key} is not reviewed for browser exposure`);
  }
  console.log('Build toolchain, public environment boundary and SPA routing checks passed.');
}).catch(error => { console.error(error); process.exitCode = 1; });
