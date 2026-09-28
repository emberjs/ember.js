'use strict';

const { readFileSync } = require('node:fs');
const { join } = require('node:path');

const {
  FLAGS,
  DEFAULT_FLAGS,
  resolveFlags,
  parseFlagsFromEnv,
} = require('../../broccoli/deprecated-features.cjs');

// The build-time manifest and the runtime flags package must describe the
// same set of deprecations (the browser conformance test ties the flags
// package to the DEPRECATIONS registry).
QUnit.module('deprecated-features manifest', function () {
  QUnit.test('manifest keys match the @ember/deprecated-features exports', function (assert) {
    let source = readFileSync(
      join(__dirname, '../../packages/@ember/deprecated-features/index.ts'),
      'utf8'
    );
    let exported = [...source.matchAll(/^export const (\w+) = (true|false);/gm)].map(
      (match) => match[1]
    );

    assert.deepEqual(exported.sort(), Object.keys(FLAGS).sort());
  });

  QUnit.test('resolveFlags validates names and values', function (assert) {
    assert.deepEqual(resolveFlags(), DEFAULT_FLAGS);
    assert.throws(() => resolveFlags({ NOT_A_FLAG: false }), /Unknown deprecation flag/);
    assert.throws(() => resolveFlags({ DEPRECATE_COMPARABLE_MIXIN: 'false' }), /must be a boolean/);
  });

  QUnit.test('parseFlagsFromEnv parses entries and the all shorthand', function (assert) {
    assert.deepEqual(parseFlagsFromEnv('DEPRECATE_COMPARABLE_MIXIN=false'), {
      ...DEFAULT_FLAGS,
      DEPRECATE_COMPARABLE_MIXIN: false,
    });
    assert.deepEqual(
      parseFlagsFromEnv('all=false'),
      Object.fromEntries(Object.keys(DEFAULT_FLAGS).map((name) => [name, false]))
    );
    assert.throws(() => parseFlagsFromEnv('DEPRECATE_COMPARABLE_MIXIN'), /Cannot parse/);
  });

  QUnit.test('manifest entries carry id, since, and until', function (assert) {
    for (let [name, meta] of Object.entries(FLAGS)) {
      assert.strictEqual(typeof meta.id, 'string', `${name} has an id`);
      assert.strictEqual(typeof meta.until, 'string', `${name} has an until`);
      assert.strictEqual(typeof meta.since.available, 'string', `${name} has since.available`);
    }
  });
});
