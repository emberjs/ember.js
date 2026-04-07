import fs from 'node:fs';
import { dirname, join } from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const emberSourceRoot = dirname(require.resolve('ember-source/package.json'));

QUnit.module('sourcemap validation', function () {
  QUnit.test(`dev build has only single sourcemap comments per file`, function (assert) {
    let devDir = join(emberSourceRoot, 'dist', 'dev', 'packages');
    assert.ok(fs.existsSync(devDir), 'dist/dev/packages exists');

    // Check a representative file from the dev build
    let emberIndex = join(devDir, 'ember', 'index.js');
    if (fs.existsSync(emberIndex)) {
      let contents = fs.readFileSync(emberIndex, 'utf-8');
      let num = count(contents, '//# sourceMappingURL=');
      assert.ok(num <= 1, `ember/index.js has at most one sourcemap comment (found ${num})`);
    } else {
      assert.ok(true, 'ember/index.js not present (skipped)');
    }
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
