/**
 * Symbol identity of the GXT-backed `@glimmer/component` sibling.
 *
 * `@glimmer/component-gxt/reactive` re-exports the reactive primitives of the
 * GXT build: the validator shim's `createTag`, `CURRENT_TAG`, `createCache`
 * and `getValue`, and metal's `tracked` and `cached` (what `@glimmer/tracking`
 * re-exports). These tests check that they are the same objects (`===`) as the
 * ones the shim and metal export, and as the ones the GXT build resolves
 * `@glimmer/validator` and `@glimmer/tracking` to. So the sibling package adds
 * no second copy of the reactive runtime.
 *
 * Not covered: `getCustomTagFor`, which lives in the `@glimmer/manager` shim,
 * and `Tag`, which is a type, not a value.
 *
 * The compat test page loads this file only in GXT builds (`virtual:gxt-tests`).
 */
import * as reactive from '../src/reactive';
import * as shim from '@ember/-internals/gxt-backend/validator';
import { tracked as metalTracked } from '@ember/-internals/metal/lib/tracked';
import { cached as metalCached } from '@ember/-internals/metal/lib/cached';
import { createTag, CURRENT_TAG } from '@glimmer/validator';
import { cached, tracked } from '@glimmer/tracking';

QUnit.module('@glimmer/component-gxt: reactive identity', function () {
  QUnit.test('createTag is the validator shim export', function (assert) {
    assert.strictEqual(typeof reactive.createTag, 'function');
    assert.strictEqual(reactive.createTag, shim.createTag);
  });

  QUnit.test('CURRENT_TAG is the validator shim export', function (assert) {
    assert.notStrictEqual(reactive.CURRENT_TAG, undefined);
    assert.strictEqual(reactive.CURRENT_TAG, shim.CURRENT_TAG);
  });

  QUnit.test(
    '@tracked and @cached are metal exports, the cache primitives shim exports',
    function (assert) {
      assert.strictEqual(typeof reactive.tracked, 'function');
      assert.strictEqual(reactive.tracked, metalTracked);
      assert.strictEqual(reactive.cached, metalCached);
      assert.strictEqual(reactive.createCache, shim.createCache);
      assert.strictEqual(reactive.getValue, shim.getValue);
    }
  );

  QUnit.test(
    'they are the objects the GXT build resolves @glimmer/validator and @glimmer/tracking to',
    function (assert) {
      assert.strictEqual(reactive.createTag, createTag);
      assert.strictEqual(reactive.CURRENT_TAG, CURRENT_TAG);
      assert.strictEqual(reactive.tracked, tracked);
      assert.strictEqual(reactive.cached, cached);
    }
  );
});
