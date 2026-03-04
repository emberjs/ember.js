import fs from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';

const require = createRequire(import.meta.url);
const emberSourceRoot = dirname(require.resolve('ember-source/package.json'));

QUnit.module('sourcemap validation', function () {
  QUnit.test(`ember.js has only a single sourcemaps comment`, function (assert) {
    let jsPath = join(emberSourceRoot, 'dist', 'ember.debug.js');
    assert.ok(fs.existsSync(jsPath));

    let contents = fs.readFileSync(jsPath, 'utf-8');
    let num = count(contents, '//# sourceMappingURL=');
    assert.equal(num, 1);
  });
});

function count(source, find) {
  let num = 0;

  let i = -1;
  while ((i = source.indexOf(find, i + 1)) !== -1) {
    num += 1;
  }

  return num;
}
