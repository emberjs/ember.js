import { computed } from 'ember-metal/computed';
import { defineProperty } from 'ember-metal/properties';
import { get } from 'ember-metal/property_get';
import { set } from 'ember-metal/property_set';
import { isWatching } from 'ember-metal/watching';
import { A as emberA } from 'ember-runtime/system/native_array';

let a1, a2, a3, a4, obj;

QUnit.module('chain watching', {
  setup() {
    a1 = { foo: true,  id: 1 };
    a2 = { foo: true,  id: 2 };

    a3 = { foo: false, id: 3 };
    a4 = { foo: false, id: 4 };

    obj = { };
    defineProperty(obj, 'a', computed('array.@each.foo', function() {}));
  }
});

QUnit.test('replace array (no overlap)', function() {
  set(obj, 'array', emberA([a1, a2]));
  get(obj, 'a'); // kick CP;

  ok(isWatching(a1, 'foo'), 'BEFORE: a1.foo is watched');
  ok(isWatching(a2, 'foo'), 'BEFORE: a2.foo is watched');
  ok(!isWatching(a3, 'foo'), 'BEFORE: a3.foo is NOT watched');
  ok(!isWatching(a4, 'foo'), 'BEFORE: a4.foo is NOT watched');

  set(obj, 'array', [a3, a4]);

  ok(!isWatching(a1, 'foo'), 'AFTER: a1.foo is NOT watched');
  ok(!isWatching(a2, 'foo'), 'AFTER: a2.foo is NOT watched');
  ok(isWatching(a3, 'foo'), 'AFTER: a3.foo is watched');
  ok(isWatching(a4, 'foo'), 'AFTER: a4.foo is watched');
});

QUnit.test('replace array (overlap)', function() {
  set(obj, 'array', emberA([a1, a2, a3]));
  get(obj, 'a'); // kick CP;

  ok(isWatching(a1, 'foo'), 'BEFORE: a1.foo is watched');
  ok(isWatching(a2, 'foo'), 'BEFORE: a2.foo is watched');
  ok(isWatching(a3, 'foo'), 'BEFORE: a3.foo is watched');
  ok(!isWatching(a4, 'foo'), 'BEFORE: a4.foo is NOT watched');

  obj.set('array', [a2, a3, a4]);

  ok(!isWatching(a1, 'foo'), 'AFTER: a1.foo is NOT watched');
  ok(isWatching(a2, 'foo'), 'AFTER: a2.foo is watched');
  ok(isWatching(a3, 'foo'), 'AFTER: a3.foo is watched');
  ok(isWatching(a4, 'foo'), 'AFTER: a4.foo is watched');
});

QUnit.test('responds to change of property value on element after replacing array', function() {
  let obj = { };

  defineProperty(obj, 'a', computed('array.@each.foo', function() {
    return this.array.filter(elt => elt.foo).reduce((a, b) => a + b.id, 0);
  }));

  set(obj, 'array', emberA([a1, a2]));

  deepEqual(get(obj, 'a'), 3, 'value is correct initially');
  set(a1, 'foo', false);
  deepEqual(get(obj, 'a'), 2, 'responds to change of property on element');
  set(obj, 'array', emberA([a1, a2, a3]));
  deepEqual(get(obj, 'a'), 6, 'responds to content array change');
  set(a1, 'foo', true);
  deepEqual(get(obj, 'a'), 7, 'still responds to change of property on element');
});

