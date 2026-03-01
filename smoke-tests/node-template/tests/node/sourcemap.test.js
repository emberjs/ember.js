import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const emberSourceRoot = require.resolve('ember-source/package.json').replace('/package.json', '');

function count(source, find) {
  let num = 0;
  let i = -1;
  while ((i = source.indexOf(find, i + 1)) !== -1) {
    num += 1;
  }
  return num;
}

function assertSourceMap(jsPath) {
  assert.ok(existsSync(jsPath), `${jsPath} should exist`);

  let mapPath = `${jsPath}.map`;
  assert.ok(existsSync(mapPath), `${mapPath} should exist`);

  let contents = readFileSync(jsPath, 'utf-8');
  let num = count(contents, '//# sourceMappingURL=');
  assert.equal(num, 1, `${jsPath} should have exactly one sourceMappingURL comment`);

  let map = JSON.parse(readFileSync(mapPath, 'utf-8'));
  assert.ok(map.version, 'sourcemap should have a version field');
  assert.ok(Array.isArray(map.sources), 'sourcemap should have a sources array');
  assert.ok(typeof map.mappings === 'string', 'sourcemap should have mappings');
}

test('dist ES module has a valid sourcemap', () => {
  let jsPath = `${emberSourceRoot}/dist/packages/@ember/object/index.js`;
  assertSourceMap(jsPath);
});

test('dist-prod ES module has a valid sourcemap', () => {
  let jsPath = `${emberSourceRoot}/dist-prod/packages/@ember/object/index.js`;
  assertSourceMap(jsPath);
});
