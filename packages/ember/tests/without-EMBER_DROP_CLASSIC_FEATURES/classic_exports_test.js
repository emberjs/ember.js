import Component from '@ember/component';
import Mixin from '@ember/object/mixin';
import EmberArray, { A, MutableArray, NativeArray } from '@ember/array';
import MutableArrayModule from '@ember/array/mutable';
import ArrayProxy from '@ember/array/proxy';
import ObjectProxy from '@ember/object/proxy';
import Enumerable from '@ember/enumerable';
import MutableEnumerable from '@ember/enumerable/mutable';
import { defineProperty, getProperties, observer, setProperties } from '@ember/object';
import { addObserver, removeObserver } from '@ember/object/observers';
import PrivateComponent from '@ember/-internals/glimmer/lib/component';
import PrivateMixin from '@ember/object/lib/mixin';
import PrivateEmberArray, {
  A as privateA,
  MutableArray as PrivateMutableArray,
  NativeArray as PrivateNativeArray,
} from '@ember/array/lib/ember-array';
import PrivateArrayProxy from '@ember/array/lib/array-proxy';
import PrivateObjectProxy from '@ember/object/lib/object-proxy';
import PrivateEnumerable from '@ember/enumerable/lib/enumerable';
import PrivateMutableEnumerable from '@ember/enumerable/lib/mutable-enumerable';
import { observer as privateObserver } from '@ember/object/lib/observer';
import { defineProperty as privateDefineProperty } from '@ember/-internals/metal/lib/properties';
import privateGetProperties from '@ember/-internals/metal/lib/get_properties';
import privateSetProperties from '@ember/-internals/metal/lib/set_properties';
import {
  addObserver as privateAddObserver,
  removeObserver as privateRemoveObserver,
} from '@ember/-internals/metal/lib/observer';
import { moduleFor, AbstractTestCase } from 'internal-test-helpers';

/*
  The tests of these APIs import the private modules, so that they also run
  in builds with the flag. This module checks that the public exports are the
  same values. It runs only in builds without the flag.
*/
if (!import.meta.env?.EMBER_DROP_CLASSIC_FEATURES) {
  moduleFor(
    'without EMBER_DROP_CLASSIC_FEATURES: classic exports',
    class extends AbstractTestCase {
      ['@test the public exports are the classic implementations'](assert) {
        assert.strictEqual(Component, PrivateComponent, 'Component');
        assert.strictEqual(Mixin, PrivateMixin, 'Mixin');
        assert.strictEqual(EmberArray, PrivateEmberArray, 'EmberArray');
        assert.strictEqual(A, privateA, 'A');
        assert.strictEqual(MutableArray, PrivateMutableArray, 'MutableArray');
        assert.strictEqual(MutableArrayModule, PrivateMutableArray, '@ember/array/mutable');
        assert.strictEqual(NativeArray, PrivateNativeArray, 'NativeArray');
        assert.strictEqual(ArrayProxy, PrivateArrayProxy, 'ArrayProxy');
        assert.strictEqual(ObjectProxy, PrivateObjectProxy, 'ObjectProxy');
        assert.strictEqual(Enumerable, PrivateEnumerable, 'Enumerable');
        assert.strictEqual(MutableEnumerable, PrivateMutableEnumerable, 'MutableEnumerable');
        assert.strictEqual(defineProperty, privateDefineProperty, 'defineProperty');
        assert.strictEqual(getProperties, privateGetProperties, 'getProperties');
        assert.strictEqual(setProperties, privateSetProperties, 'setProperties');
        assert.strictEqual(observer, privateObserver, 'observer');
        assert.strictEqual(addObserver, privateAddObserver, 'addObserver');
        assert.strictEqual(removeObserver, privateRemoveObserver, 'removeObserver');
      }
    }
  );
}
