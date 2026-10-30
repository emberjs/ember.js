import Component from '@ember/component';
import Mixin from '@ember/object/mixin';
import EmberArray, { A, MutableArray, NativeArray, isArray, makeArray } from '@ember/array';
import MutableArrayModule from '@ember/array/mutable';
import ArrayProxy from '@ember/array/proxy';
import ObjectProxy from '@ember/object/proxy';
import Enumerable from '@ember/enumerable';
import MutableEnumerable from '@ember/enumerable/mutable';
import { computed, defineProperty, getProperties, observer, setProperties } from '@ember/object';
import { addObserver, removeObserver } from '@ember/object/observers';
import { moduleFor, AbstractTestCase } from 'internal-test-helpers';

/*
  The flag is a build-time value. Build with
  `EMBER_DROP_CLASSIC_FEATURES=true` to run this module.
*/
if (import.meta.env?.EMBER_DROP_CLASSIC_FEATURES) {
  moduleFor(
    'EMBER_DROP_CLASSIC_FEATURES build flag: classic exports',
    class extends AbstractTestCase {
      ['@test the classic exports are not exported'](assert) {
        assert.strictEqual(Component, undefined, 'Component');
        assert.strictEqual(Mixin, undefined, 'Mixin');
        assert.strictEqual(EmberArray, undefined, 'EmberArray');
        assert.strictEqual(A, undefined, 'A');
        assert.strictEqual(MutableArray, undefined, 'MutableArray');
        assert.strictEqual(MutableArrayModule, undefined, '@ember/array/mutable');
        assert.strictEqual(NativeArray, undefined, 'NativeArray');
        assert.strictEqual(ArrayProxy, undefined, 'ArrayProxy');
        assert.strictEqual(ObjectProxy, undefined, 'ObjectProxy');
        assert.strictEqual(Enumerable, undefined, 'Enumerable');
        assert.strictEqual(MutableEnumerable, undefined, 'MutableEnumerable');
        assert.strictEqual(computed, undefined, 'computed');
        assert.strictEqual(defineProperty, undefined, 'defineProperty');
        assert.strictEqual(getProperties, undefined, 'getProperties');
        assert.strictEqual(setProperties, undefined, 'setProperties');
        assert.strictEqual(observer, undefined, 'observer');
        assert.strictEqual(addObserver, undefined, 'addObserver');
        assert.strictEqual(removeObserver, undefined, 'removeObserver');
      }

      ['@test the array utilities stay'](assert) {
        assert.true(isArray([]));
        assert.deepEqual(makeArray('a'), ['a']);
      }
    }
  );
}
