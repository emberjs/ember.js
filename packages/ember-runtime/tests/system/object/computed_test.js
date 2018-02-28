import {
  alias,
  computed,
  get as emberGet,
  observer,
  defineProperty
} from 'ember-metal';
import { testWithDefault } from 'internal-test-helpers';
import EmberObject from '../../../system/object';

function K() { return this; }

QUnit.module('EmberObject computed property');

testWithDefault('computed property on instance', function(get, set, assert) {
  let MyClass = EmberObject.extend({
    foo: computed(function() { return 'FOO'; })
  });

  assert.equal(get(new MyClass(), 'foo'), 'FOO');
});


testWithDefault('computed property on subclass', function(get, set, assert) {
  let MyClass = EmberObject.extend({
    foo: computed(function() { return 'FOO'; })
  });

  let Subclass = MyClass.extend({
    foo: computed(function() { return 'BAR'; })
  });

  assert.equal(get(new Subclass(), 'foo'), 'BAR');
});


testWithDefault('replacing computed property with regular val', function(get, set, assert) {
  let MyClass = EmberObject.extend({
    foo: computed(function() { return 'FOO'; })
  });

  let Subclass = MyClass.extend({
    foo: 'BAR'
  });

  assert.equal(get(new Subclass(), 'foo'), 'BAR');
});

testWithDefault('complex depndent keys', function(get, set, assert) {
  let MyClass = EmberObject.extend({

    init() {
      this._super(...arguments);
      set(this, 'bar', { baz: 'BIFF' });
    },

    count: 0,

    foo: computed(function() {
      set(this, 'count', get(this, 'count') + 1);
      return emberGet(get(this, 'bar'), 'baz') + ' ' + get(this, 'count');
    }).property('bar.baz')

  });

  let Subclass = MyClass.extend({
    count: 20
  });

  let obj1 = new MyClass();
  let obj2 = new Subclass();

  assert.equal(get(obj1, 'foo'), 'BIFF 1');
  assert.equal(get(obj2, 'foo'), 'BIFF 21');

  set(get(obj1, 'bar'), 'baz', 'BLARG');

  assert.equal(get(obj1, 'foo'), 'BLARG 2');
  assert.equal(get(obj2, 'foo'), 'BIFF 21');

  set(get(obj2, 'bar'), 'baz', 'BOOM');

  assert.equal(get(obj1, 'foo'), 'BLARG 2');
  assert.equal(get(obj2, 'foo'), 'BOOM 22');
});

testWithDefault('complex dependent keys changing complex dependent keys', function(get, set, assert) {
  let MyClass = EmberObject.extend({
    init() {
      this._super(...arguments);
      set(this, 'bar', { baz: 'BIFF' });
    },

    count: 0,

    foo: computed(function() {
      set(this, 'count', get(this, 'count') + 1);
      return emberGet(get(this, 'bar'), 'baz') + ' ' + get(this, 'count');
    }).property('bar.baz')
  });

  let Subclass = MyClass.extend({
    init() {
      this._super(...arguments);
      set(this, 'bar2', { baz: 'BIFF2' });
    },

    count: 0,

    foo: computed(function() {
      set(this, 'count', get(this, 'count') + 1);
      return emberGet(get(this, 'bar2'), 'baz') + ' ' + get(this, 'count');
    }).property('bar2.baz')
  });

  let obj2 = new Subclass();

  assert.equal(get(obj2, 'foo'), 'BIFF2 1');

  set(get(obj2, 'bar'), 'baz', 'BLARG');
  assert.equal(get(obj2, 'foo'), 'BIFF2 1', 'should not invalidate property');

  set(get(obj2, 'bar2'), 'baz', 'BLARG');
  assert.equal(get(obj2, 'foo'), 'BLARG 2', 'should invalidate property');
});

QUnit.test('can retrieve metadata for a computed property', function(assert) {
  let MyClass = EmberObject.extend({
    computedProperty: computed(function() {
    }).meta({ key: 'keyValue' })
  });

  assert.equal(emberGet(MyClass.metaForProperty('computedProperty'), 'key'), 'keyValue', 'metadata saved on the computed property can be retrieved');

  let ClassWithNoMetadata = EmberObject.extend({
    computedProperty: computed(function() {
    }).volatile(),

    staticProperty: 12
  });

  assert.equal(typeof ClassWithNoMetadata.metaForProperty('computedProperty'), 'object', 'returns empty hash if no metadata has been saved');

  expectAssertion(function() {
    ClassWithNoMetadata.metaForProperty('nonexistentProperty');
  }, 'metaForProperty() could not find a computed property with key \'nonexistentProperty\'.');

  expectAssertion(function() {
    ClassWithNoMetadata.metaForProperty('staticProperty');
  }, 'metaForProperty() could not find a computed property with key \'staticProperty\'.');
});

QUnit.test('overriding a computed property with null removes it from eachComputedProperty iteration', function(assert) {
  let MyClass = EmberObject.extend({
    foo: computed(function() {}),

    fooDidChange: observer('foo', function() {}),

    bar: computed(function() {}),
  });

  let SubClass = MyClass.extend({
    foo: null
  });

  let list = [];

  SubClass.eachComputedProperty(name => list.push(name));

  assert.deepEqual(list.sort(), ['bar'], 'overridding with null removes from eachComputedProperty listing');
});

QUnit.test('can iterate over a list of computed properties for a class', function(assert) {
  let MyClass = EmberObject.extend({
    foo: computed(function() {}),

    fooDidChange: observer('foo', function() {}),

    bar: computed(function() {}),

    qux: alias('foo')
  });

  let SubClass = MyClass.extend({
    baz: computed(function() {})
  });

  SubClass.reopen({
    bat: computed(function() {}).meta({ iAmBat: true })
  });

  let list = [];

  MyClass.eachComputedProperty(function(name) {
    list.push(name);
  });

  assert.deepEqual(list.sort(), ['bar', 'foo', 'qux'], 'watched and unwatched computed properties are iterated');

  list = [];

  SubClass.eachComputedProperty(function(name, meta) {
    list.push(name);

    if (name === 'bat') {
      assert.deepEqual(meta, { iAmBat: true });
    } else {
      assert.deepEqual(meta, {});
    }
  });

  assert.deepEqual(list.sort(), ['bar', 'bat', 'baz', 'foo', 'qux'], 'all inherited properties are included');
});

QUnit.test('list of properties updates when an additional property is added (such cache busting)', function(assert) {
  let MyClass = EmberObject.extend({
    foo: computed(K),

    fooDidChange: observer('foo', function() {}),

    bar: computed(K)
  });

  let list = [];

  MyClass.eachComputedProperty(function(name) {
    list.push(name);
  });

  assert.deepEqual(list.sort(), ['bar', 'foo'].sort(), 'expected two computed properties');

  MyClass.reopen({
    baz: computed(K)
  });

  MyClass.create(); // force apply mixins

  list = [];

  MyClass.eachComputedProperty(function(name) {
    list.push(name);
  });

  assert.deepEqual(list.sort(), ['bar', 'foo', 'baz'].sort(), 'expected three computed properties');

  defineProperty(MyClass.prototype, 'qux', computed(K));

  list = [];

  MyClass.eachComputedProperty(function(name) {
    list.push(name);
  });

  assert.deepEqual(list.sort(), ['bar', 'foo', 'baz', 'qux'].sort(), 'expected four computed properties');
});

QUnit.test('Calling _super in call outside the immediate function of a CP getter works', function(assert) {
  function macro(callback) {
    return computed(function() {
      return callback.call(this);
    });
  }

  let MyClass = EmberObject.extend({
    foo: computed(function() {
      return 'FOO';
    })
  });

  let SubClass = MyClass.extend({
    foo: macro(function() {
      return this._super();
    })
  });

  assert.ok(emberGet(SubClass.create(), 'foo'), 'FOO', 'super value is fetched');
});

QUnit.test('Calling _super in apply outside the immediate function of a CP getter works', function(assert) {
  function macro(callback) {
    return computed(function() {
      return callback.apply(this);
    });
  }

  let MyClass = EmberObject.extend({
    foo: computed(function() {
      return 'FOO';
    })
  });

  let SubClass = MyClass.extend({
    foo: macro(function() {
      return this._super();
    })
  });

  assert.ok(emberGet(SubClass.create(), 'foo'), 'FOO', 'super value is fetched');
});

QUnit.test('observing computed.reads prop and overriding it in create() works', function(assert) {
  let Obj = EmberObject.extend({
    name: computed.reads('model.name'),
    nameDidChange: observer('name', function() {})
  });

  let obj1 = Obj.create({name: '1'});
  let obj2 = Obj.create({name: '2'});

  assert.equal(obj1.get('name'), '1');
  assert.equal(obj2.get('name'), '2');
});
