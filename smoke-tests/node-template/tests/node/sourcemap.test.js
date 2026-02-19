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

test('ember.js has only a single sourcemaps comment', () => {
  let jsPath = `${emberSourceRoot}/dist/ember.debug.js`;
  assert.ok(existsSync(jsPath), `${jsPath} should exist`);

  let contents = readFileSync(jsPath, 'utf-8');
  let num = count(contents, '//# sourceMappingURL=');
  assert.equal(num, 1);
});
