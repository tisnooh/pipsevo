// Explicit loopback-only demo: real components, synthetic API, no production auth.
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const html = '<!doctype html><html lang="fr"><head><meta name="viewport" content="width=device-width, initial-scale=1"><title>Backtest Lab · TEST LOCAL</title></head><body><div id="root"></div><script type="module" src="/tests/backtest-preview.jsx"></script></body></html>';

async function main() {
  const { createServer, build } = await import('vite');
  const previewPlugin = {
    name: 'pipsevo-isolated-backtest-demo',
    transformIndexHtml: { order: 'pre', handler: () => html },
  };
  const options = {
    root,
    plugins: [previewPlugin],
    resolve: {
      alias: [{ find: '@/lib/api', replacement: path.join(root, 'tests/backtest-preview-api.js') }],
    },
    server: { host: '127.0.0.1', port: 4188, strictPort: true },
  };
  if (process.argv.includes('--build-only')) {
    await build({ ...options, build: { outDir: '.backtest-preview' } });
    console.log('Backtest preview rebuilt.');
    return;
  }
  const server = await createServer(options);
  await server.listen();
  console.log('Backtest test preview: http://127.0.0.1:4188/app/backtest');
}
main().catch(error => { console.error(error); process.exitCode = 1; });
