const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const path = require('node:path');
const { createRequire } = require('node:module');
const { runInNewContext } = require('node:vm');
const manifest = require('../package.json');
const lock = require('../package-lock.json');

function dependencyOf(parent, name) {
  let parentPath;
  try { parentPath = require.resolve(`${parent}/package.json`); }
  catch (error) {
    if (error.code !== 'ERR_PACKAGE_PATH_NOT_EXPORTED') throw error;
    parentPath = require.resolve(parent);
  }
  const fromParent = createRequire(parentPath);
  const installed = fromParent(`${name}/package.json`).version;
  assert.equal(installed, manifest.overrides[name], `${parent} must use the pinned ${name}`);
  return fromParent(name);
}

async function main() {
  for (const [name, version] of Object.entries(manifest.overrides)) {
    const entries = Object.entries(lock.packages).filter(([location]) =>
      location.endsWith(`node_modules/${name}`));
    assert.ok(entries.length, `${name} must exist in the lockfile`);
    entries.forEach(([location, entry]) => assert.equal(entry.version, version, location));
  }

  for (const parent of ['css-minimizer-webpack-plugin', 'rollup-plugin-terser']) {
    const serialize = dependencyOf(parent, 'serialize-javascript');
    const value = { label: '</script><script>fixture</script>', pattern: /pips/gi,
      date: new Date('2026-10-05T00:00:00Z'), transform: value => value + 1 };
    const output = serialize(value);
    assert.ok(!output.includes('</script>'), 'HTML delimiters must remain escaped');
    // Only this fixed, trusted fixture is evaluated; no input from users or the network.
    const restored = runInNewContext(`(${output})`);
    assert.equal(restored.label, value.label);
    assert.equal(restored.pattern.source, value.pattern.source);
    assert.equal(restored.pattern.flags, value.pattern.flags);
    assert.equal(restored.date.toISOString(), value.date.toISOString());
    assert.equal(restored.transform(2), 3);
  }

  const underscore = dependencyOf('jsonpath', 'underscore');
  assert.deepEqual(underscore.flatten([1, [2, [3]]]), [1, 2, 3]);
  assert.ok(underscore.isEqual({ nested: [1, 2] }, { nested: [1, 2] }));

  // http-proxy-agent awaits the connect event without consuming its return value.
  const once = dependencyOf('http-proxy-agent', '@tootallnate/once').default;
  const emitter = new EventEmitter();
  const connected = once(emitter, 'connect');
  emitter.emit('connect', 'ok');
  assert.deepEqual(await connected, ['ok']);
  assert.equal(emitter.listenerCount('connect'), 0);
  assert.equal(emitter.listenerCount('error'), 0);
  const failed = once(emitter, 'connect');
  emitter.emit('error', new Error('fixture connection failure'));
  await assert.rejects(failed, /fixture connection failure/);
  assert.equal(emitter.listenerCount('error'), 0);

  const loader = dependencyOf('react-scripts', 'resolve-url-loader');
  const fromLoader = createRequire(require.resolve('resolve-url-loader/package.json'));
  assert.equal(fromLoader('postcss/package.json').version, manifest.devDependencies.postcss);
  const css = '.fixture { color: purple; }';
  const transformed = await new Promise((resolve, reject) => {
    loader.call({
      context: path.resolve(__dirname, '../src'),
      resourcePath: path.resolve(__dirname, '../src/fixture.css'),
      getOptions: () => ({ sourceMap: false, silent: true }),
      cacheable: () => {},
      async: () => (error, content) => error ? reject(error) : resolve(content),
    }, css);
  });
  assert.equal(transformed, css);
  console.log('Build dependency compatibility checks passed.');
}

const timeout = setTimeout(() => {
  console.error('Build dependency compatibility checks timed out.');
  process.exitCode = 1;
}, 30_000);
main().then(() => clearTimeout(timeout)).catch(error => {
  clearTimeout(timeout);
  console.error(error);
  process.exitCode = 1;
});
