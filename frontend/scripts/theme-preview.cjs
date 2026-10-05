// Loopback-only visual regression fixture. Never uses production auth or APIs.
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const html = '<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>PipsEvo · Vérification thème locale</title></head><body><div id="root"></div><script type="module" src="/tests/theme-preview.jsx"></script></body></html>';

async function main() {
  const { createServer } = await import('vite');
  const server = await createServer({
    root,
    plugins: [{ name: 'isolated-theme-fixture', transformIndexHtml: { order: 'pre', handler: () => html } }],
    resolve: { alias: [
      { find: '@/lib/api', replacement: path.join(root, 'tests/theme-preview-api.js') },
      { find: '@/context/AuthContext', replacement: path.join(root, 'tests/theme-preview-auth.js') },
      { find: '@/features/admin/ProductOperations', replacement: path.join(root, 'tests/theme-preview-operations.jsx') },
    ] },
    server: { host: '127.0.0.1', port: 4190, strictPort: true },
  });
  await server.listen();
  console.log('Theme fixture: http://127.0.0.1:4190/app/dashboard (synthetic data, no account access)');
}
main().catch(error => { console.error(error); process.exitCode = 1; });
