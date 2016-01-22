import { computed } from 'ember-metal/computed';
import { defineProperty } from 'ember-metal/properties';
import { get } from 'ember-metal/property_get';
import { set } from 'ember-metal/property_set';
import { isWatching } from 'ember-metal/watching';
import { A as emberA } from 'ember-runtime/system/native_array';
import ObjectProxy from 'ember-runtime/system/object_proxy';
import ArrayProxy from 'ember-runtime/system/array_proxy';
import PromiseProxyMixin from 'ember-runtime/mixins/promise_proxy';
import RSVP from 'ember-runtime/ext/rsvp';
import run from 'ember-metal/run_loop';

const ArrayPromiseProxy = ArrayProxy.reopen(PromiseProxyMixin);
const ObjectPromiseProxy = ObjectProxy.reopen(PromiseProxyMixin);

let a1, a2, a3, a4, obj;

QUnit.module('chain watching', {
  setup() {
    a1 = { foo: true,  id: 1 };
    a2 = { foo: true,  id: 2 };

    a3 = { foo: false, id: 3 };
    a4 = { foo: false, id: 4 };

    obj = { };
    defineProperty(obj, 'a', computed('array.@each.foo', function() {
      return this.array.map(item => get(item, 'foo'));
    }));
  }
});

QUnit.test('replace array (no overlap)', function() {
  set(obj, 'array', emberA([a1, a2]));
  get(obj, 'a'); // kick CP

  ok(isWatching(a1, 'foo'), 'BEFORE: a1.foo is watched');
  ok(isWatching(a2, 'foo'), 'BEFORE: a2.foo is watched');
  ok(!isWatching(a3, 'foo'), 'BEFORE: a3.foo is NOT watched');
  ok(!isWatching(a4, 'foo'), 'BEFORE: a4.foo is NOT watched');

  set(obj, 'array', [a3, a4]);
  get(obj, 'a'); // kick CP

  ok(!isWatching(a1, 'foo'), 'AFTER: a1.foo is NOT watched');
  ok(!isWatching(a2, 'foo'), 'AFTER: a2.foo is NOT watched');
  ok(isWatching(a3, 'foo'), 'AFTER: a3.foo is watched');
  ok(isWatching(a4, 'foo'), 'AFTER: a4.foo is watched');
});

QUnit.test('replace array (overlap)', function() {
  set(obj, 'array', emberA([a1, a2, a3]));
  get(obj, 'a'); // kick CP

  ok(isWatching(a1, 'foo'), 'BEFORE: a1.foo is watched');
  ok(isWatching(a2, 'foo'), 'BEFORE: a2.foo is watched');
  ok(isWatching(a3, 'foo'), 'BEFORE: a3.foo is watched');
  ok(!isWatching(a4, 'foo'), 'BEFORE: a4.foo is NOT watched');

  set(obj, 'array', [a2, a3, a4]);
  get(obj, 'a'); // kick CP

  ok(!isWatching(a1, 'foo'), 'AFTER: a1.foo is NOT watched');
  ok(isWatching(a2, 'foo'), 'AFTER: a2.foo is watched');
  ok(isWatching(a3, 'foo'), 'AFTER: a3.foo is watched');
  ok(isWatching(a4, 'foo'), 'AFTER: a4.foo is watched');
});

QUnit.test('splice array (no overlap)', function() {
  let array = emberA([a1, a2]);

  set(obj, 'array', array);
  get(obj, 'a'); // kick CP

  ok(isWatching(a1, 'foo'), 'BEFORE: a1.foo is watched');
  ok(isWatching(a2, 'foo'), 'BEFORE: a2.foo is watched');
  ok(!isWatching(a3, 'foo'), 'BEFORE: a3.foo is NOT watched');
  ok(!isWatching(a4, 'foo'), 'BEFORE: a4.foo is NOT watched');

  array.replace(0, 2, [a3, a4]);
  get(obj, 'a'); // kick CP

  ok(!isWatching(a1, 'foo'), 'AFTER: a1.foo is NOT watched');
  ok(!isWatching(a2, 'foo'), 'AFTER: a2.foo is NOT watched');
  ok(isWatching(a3, 'foo'), 'AFTER: a3.foo is watched');
  ok(isWatching(a4, 'foo'), 'AFTER: a4.foo is watched');
});

QUnit.test('splice array (overlap)', function() {
  let array = emberA([a1, a2, a3]);

  set(obj, 'array', array);
  get(obj, 'a'); // kick CP

  ok(isWatching(a1, 'foo'), 'BEFORE: a1.foo is watched');
  ok(isWatching(a2, 'foo'), 'BEFORE: a2.foo is watched');
  ok(isWatching(a3, 'foo'), 'BEFORE: a3.foo is watched');
  ok(!isWatching(a4, 'foo'), 'BEFORE: a4.foo is NOT watched');

  array.replace(0, 3, [a2, a3, a4]);
  get(obj, 'a'); // kick CP

  ok(!isWatching(a1, 'foo'), 'AFTER: a1.foo is NOT watched');
  ok(isWatching(a2, 'foo'), 'AFTER: a2.foo is watched');
  ok(isWatching(a3, 'foo'), 'AFTER: a3.foo is watched');
  ok(isWatching(a4, 'foo'), 'AFTER: a4.foo is watched');
});

let a1Remote, a2Remote, a3Remote;

QUnit.module('chain watching (filter)', {
  setup() {
    a1 = { foo: true,  id: 1 };
    a2 = { foo: true,  id: 2 };

    a3 = { foo: false, id: 3 };
    a4 = { foo: false, id: 4 };

    run(_ => {
      // pre-settle the promises;
      a1Remote = ObjectPromiseProxy.create({
        promise: RSVP.Promise.resolve(a1)
      });

      a2Remote = ObjectPromiseProxy.create({
        promise: RSVP.Promise.resolve(a2)
      });

      a3Remote = ObjectPromiseProxy.create({
        promise: RSVP.Promise.resolve(a3)
      });
    });

    obj = { };

    defineProperty(obj, 'a', computed('array.@each.foo', function() {
      return this.array.filter(elt => get(elt, 'foo')).reduce((a, b) => a + get(b, 'id'), 0);
    }));
  }
});

QUnit.test('responds to change of property value on element after replacing array', function() {
  set(obj, 'array', emberA([a1, a2]));

  equal(get(obj, 'a'), 3, 'value is correct initially');

  set(a1, 'foo', false);

  equal(get(obj, 'a'), 2, 'responds to change of property on element');

  set(obj, 'array', emberA([a1, a2, a3]));

  equal(get(obj, 'a'), 2, 'responds to content array change');

  set(a1, 'foo', true);

  equal(get(obj, 'a'), 3, 'still responds to change of property on element');
  set(a3, 'foo', true);

  equal(get(obj, 'a'), 6, 'still responds to change of property on element');
});

QUnit.test('responds to change of property value on element after replacing array (object proxy)', function() {
  set(obj, 'array', emberA([
    ObjectProxy.create({ content: a1 }),
    ObjectProxy.create({ content: a2 })
  ]));

  equal(get(obj, 'a'), 3, 'value is correct initially');

  set(a1, 'foo', false);

  equal(get(obj, 'a'), 2, 'responds to change of property on element');
  set(obj, 'array', emberA([
    ObjectProxy.create({ content: a1 }),
    ObjectProxy.create({ content: a2 }),
    ObjectProxy.create({ content: a3 })
  ]));

  equal(get(obj, 'a'), 2, 'responds to content array change');

  set(a1, 'foo', true);

  equal(get(obj, 'a'), 3, 'still responds to change of property on element');
  set(a3, 'foo', true);

  equal(get(obj, 'a'), 6, 'still responds to change of property on element');
});

QUnit.test('responds to change of property value on element after replacing array (array proxy)', function() {
  set(obj, 'array', ArrayProxy.create({
    content: emberA([
      ObjectProxy.create({ content: a1 }),
      ObjectProxy.create({ content: a2 })
    ])
  }));

  equal(get(obj, 'a'), 3, 'value is correct initially');

  set(a1, 'foo', false);

  equal(get(obj, 'a'), 2, 'responds to change of property on element');
  set(obj, 'array', ArrayProxy.create({
    content: emberA([
      ObjectProxy.create({ content: a1 }),
      ObjectProxy.create({ content: a2 }),
      ObjectProxy.create({ content: a3 })
    ])
  }));

  equal(get(obj, 'a'), 2, 'responds to content array change');

  set(a1, 'foo', true);

  equal(get(obj, 'a'), 3, 'still responds to change of property on element');

  set(a3, 'foo', true);

  equal(get(obj, 'a'), 6, 'still responds to change of property on element');
});

QUnit.test('responds to change of property value on element after replacing array (object promise proxy-settled)', function() {
  run(_ => {
    set(obj, 'array', ArrayProxy.create({
      content: emberA([a1Remote, a2Remote, a3Remote])
    }));
  });

  equal(get(obj, 'a'), 3, 'value is correct initially');

  set(a1, 'foo', false);

  equal(get(obj, 'a'), 2, 'responds to change of property on element');
  run(_ => {
    set(obj, 'array', ArrayProxy.create({
      content: emberA([a1Remote, a2Remote, a3Remote])
    }));
  });

  equal(get(obj, 'a'), 2, 'responds to content array change');

  set(a1, 'foo', true);

  equal(get(obj, 'a'), 3, 'still responds to change of property on element');

  set(a3, 'foo', true);

  equal(get(obj, 'a'), 6, 'still responds to change of property on element');
});

QUnit.test('responds to change of property value on element after replacing array (object promise proxy-un-settled)', function() {
  run(_ => {
    set(obj, 'array', emberA([
      ObjectPromiseProxy.create({ promise: RSVP.Promise.resolve(a1) }),
      ObjectPromiseProxy.create({ promise: RSVP.Promise.resolve(a2) })
    ]));

    equal(get(obj, 'a'), 0, 'value is correct initially');
    set(a1, 'foo', false);
    equal(get(obj, 'a'), 0, 'value is correct initially');
  });

  equal(get(obj, 'a'), 2, 'responds to change of property on element');

  run(_ => {
    set(obj, 'array', emberA([
      ObjectPromiseProxy.create({ promise: RSVP.Promise.resolve(a2) }),
      ObjectPromiseProxy.create({ promise: RSVP.Promise.resolve(a3) })
    ]));

    equal(get(obj, 'a'), 0, 'expected no change');
    set(a1, 'foo', true);
    equal(get(obj, 'a'), 0, 'expected no change');
  });

  equal(get(obj, 'a'), 2, 'still responds to change of property on element');

  set(a3, 'foo', true);

  equal(get(obj, 'a'), 5, 'still responds to change of property on element');

  set(a3, 'foo', false);

  equal(get(obj, 'a'), 2, 'still responds to change of property on element');
});

QUnit.test('responds to change of property value on element after replacing array (array promise proxy)', function() {
  run(_ => {
    set(obj, 'array', ArrayPromiseProxy.create({
      promise: RSVP.Promise.resolve(emberA([a1, a2]))
    }));
  });

  equal(get(obj, 'a'), 3, 'value is correct initially');

  set(a1, 'foo', false);

  equal(get(obj, 'a'), 2, 'responds to change of property on element');

  run(_ => {
    set(obj, 'array', ArrayPromiseProxy.create({
      promise: RSVP.Promise.resolve(emberA([a1, a2, a3]))
    }));
  });

  equal(get(obj, 'a'), 2, 'responds to content array change');

  set(a1, 'foo', true);

  equal(get(obj, 'a'), 3, 'still responds to change of property on element');

  set(a3, 'foo', true);

  equal(get(obj, 'a'), 6, 'still responds to change of property on element');
});

QUnit.test('responds to change of property value on element after replacing array (array & object promise proxy)', function() {
  run(_ => {
    set(obj, 'array', ArrayPromiseProxy.create({
      promise: RSVP.Promise.resolve(emberA([a1, a2]))
    }));
  });

  equal(get(obj, 'a'), 3, 'value is correct initially');

  set(a1, 'foo', false);

  equal(get(obj, 'a'), 2, 'responds to change of property on element');

  run(_ => {
    set(obj, 'array', ArrayPromiseProxy.create({
      promise: RSVP.Promise.resolve(emberA([a1, a2, a3]))
    }));
  });

  equal(get(obj, 'a'), 2, 'responds to content array change');

  set(a1, 'foo', true);

  equal(get(obj, 'a'), 3, 'still responds to change of property on element');

  set(a3, 'foo', true);

  equal(get(obj, 'a'), 6, 'still responds to change of property on element');
});
