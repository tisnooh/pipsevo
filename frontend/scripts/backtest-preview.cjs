// Explicit test-only bundle: real components, isolated API, no production auth.
const path = require('path');
const fs = require('fs');
const http = require('http');
const webpack = require('webpack');
const root = path.resolve(__dirname, '..');
const output = path.join(root, '.backtest-preview');
const compiler = webpack({
  mode: 'development', context: root, entry: path.join(root, 'tests/backtest-preview.jsx'),
  output: { path: output, filename: 'preview.js', publicPath: '/' },
  resolve: { extensions: ['.js', '.jsx'], alias: { '@/lib/api$': path.join(root, 'tests/backtest-preview-api.js'), '@': path.join(root, 'src') } },
  module: { rules: [
    { test: /\.jsx?$/, exclude: /node_modules/, use: { loader: 'babel-loader', options: { presets: ['@babel/preset-env', ['@babel/preset-react', { runtime: 'automatic' }]] } } },
    { test: /\.css$/, use: ['style-loader', 'css-loader', { loader: 'postcss-loader', options: { postcssOptions: { plugins: [require('tailwindcss')(path.join(root, 'tailwind.config.js')), require('autoprefixer')] } } }] },
  ] },
});
compiler.run((error, stats) => {
  if (error || stats.hasErrors()) { console.error(error || stats.toString({ all: false, errors: true })); process.exitCode = 1; return; }
  compiler.close(() => {});
  if (process.argv.includes('--build-only')) { console.log('Backtest preview rebuilt.'); return; }
  http.createServer((req, res) => {
    if (req.url === '/preview.js') { res.setHeader('Content-Type', 'text/javascript'); fs.createReadStream(path.join(output, 'preview.js')).pipe(res); return; }
    if (req.url.startsWith('/brand/')) {
      const file = path.resolve(root, 'public', '.' + req.url);
      if (file.startsWith(path.join(root, 'public') + path.sep) && fs.existsSync(file)) { fs.createReadStream(file).pipe(res); return; }
    }
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.end('<!doctype html><html lang="fr"><head><meta name="viewport" content="width=device-width, initial-scale=1"><title>Backtest Lab · TEST LOCAL</title></head><body><div id="root"></div><script src="/preview.js"></script></body></html>');
  }).listen(4188, '127.0.0.1', () => console.log('Backtest test preview: http://127.0.0.1:4188/app/backtest'));
});
