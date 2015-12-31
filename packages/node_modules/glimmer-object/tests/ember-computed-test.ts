import GlimmerObject, { computed, observer, alias } from 'glimmer-object';

interface Get {
  (obj: any, key: string): any;
}

interface Set {
  (obj: any, key: string, value: any);
}

let emberGet = function aget(x, y) { return x[y]; };
let emberSet = function aset(x, y, z) { return (x[y] = z); };

function testWithDefault(name: string, callback: (Get, Set) => void) {
  QUnit.test(name, assert => {
    callback(emberGet, emberSet);
  });
}

let EmberObject = GlimmerObject;

function K() { return this; }

QUnit.module('GlimmerObject.extend - Computed Properties');

testWithDefault('computed property on instance', function(get, set) {
  let MyClass = EmberObject.extend({
    foo: computed(function() { return 'FOO'; })
  });

  equal(get(new MyClass(), 'foo'), 'FOO');
});

testWithDefault('computed property on subclass', function(get, set) {
  let MyClass = EmberObject.extend({
    foo: computed(function() { return 'FOO'; })
  });

  let Subclass = MyClass.extend({
    foo: computed(function() { return 'BAR'; })
  });

  equal(get(new Subclass(), 'foo'), 'BAR');
});

testWithDefault('replacing computed property with regular val', function(get, set) {
  let MyClass = EmberObject.extend({
    foo: computed(function() { return 'FOO'; })
  });

  let Subclass = MyClass.extend({
    foo: 'BAR'
  });

  equal(get(new Subclass(), 'foo'), 'BAR');
});

testWithDefault('complex dependent keys', function(get, set) {
  let MyClass = EmberObject.extend({

    init() {
      this._super.apply(this, arguments);
      set(this, 'bar', { baz: 'BIFF' });
    },

    foo: computed(function() {
      return get(get(this, 'bar'), 'baz');
    }).property('bar.baz')

  });

  let Subclass = MyClass.extend({
  });

  let obj1 = new MyClass();
  let obj2 = new Subclass();

  equal(get(obj1, 'foo'), 'BIFF');
  equal(get(obj2, 'foo'), 'BIFF');

  set(get(obj1, 'bar'), 'baz', 'BLARG');

  equal(get(obj1, 'foo'), 'BLARG');
  equal(get(obj2, 'foo'), 'BIFF');

  set(get(obj2, 'bar'), 'baz', 'BOOM');

  equal(get(obj1, 'foo'), 'BLARG');
  equal(get(obj2, 'foo'), 'BOOM');
});

testWithDefault('complex dependent keys changing complex dependent keys', function(get, set) {
  let MyClass = EmberObject.extend({
    init() {
      this._super.apply(this, arguments);
      set(this, 'bar', { baz: 'BIFF' });
    },

    foo: computed(function() {
      return get(get(this, 'bar'), 'baz');
    }).property('bar.baz')
  });

  let Subclass = MyClass.extend({
    init() {
      this._super.apply(this, arguments);
      set(this, 'bar2', { baz: 'BIFF2' });
    },

    foo: computed(function() {
      return get(get(this, 'bar2'), 'baz');
    }).property('bar2.baz')
  });

  let obj2 = new Subclass();

  equal(get(obj2, 'foo'), 'BIFF2');

  set(get(obj2, 'bar'), 'baz', 'BLARG');
  equal(get(obj2, 'foo'), 'BIFF2', 'should not invalidate property');

  set(get(obj2, 'bar2'), 'baz', 'BLARG');
  equal(get(obj2, 'foo'), 'BLARG', 'should invalidate property');
});

QUnit.test('can retrieve metadata for a computed property', assert => {
  let MyClass = EmberObject.extend({
    computedProperty: computed(() => {}).meta({ key: 'keyValue' })
  });

  equal(emberGet(MyClass.metaForProperty('computedProperty'), 'key'), 'keyValue', 'metadata saved on the computed property can be retrieved');

  let ClassWithNoMetadata = EmberObject.extend({
    computedProperty: computed(function() {
    }).volatile(),

    staticProperty: 12
  });

  equal(typeof ClassWithNoMetadata.metaForProperty('computedProperty'), 'object', 'returns empty hash if no metadata has been saved');

  assert.throws(function() {
    ClassWithNoMetadata.metaForProperty('nonexistentProperty');
  }, 'metaForProperty() could not find a computed property with key \'nonexistentProperty\'.');

  assert.throws(function() {
    ClassWithNoMetadata.metaForProperty('staticProperty');
  }, 'metaForProperty() could not find a computed property with key \'staticProperty\'.');
});

QUnit.test('can iterate over a list of computed properties for a class', function() {
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

  deepEqual(list.sort(), ['bar', 'foo', 'qux'], 'watched and unwatched computed properties are iterated');

  list = [];

  SubClass.eachComputedProperty(function(name, meta) {
    list.push(name);

    if (name === 'bat') {
      deepEqual(meta, { iAmBat: true });
    } else {
      deepEqual(meta, {});
    }
  });

  deepEqual(list.sort(), ['bar', 'bat', 'baz', 'foo', 'qux'], 'all inherited properties are included');
});

QUnit.test('list of properties updates when an additional property is added (such cache busting)', function() {
  let MyClass = EmberObject.extend({
    foo: computed(K),

    fooDidChange: observer('foo', function() {}),

    bar: computed(K)
  });

  let list = [];

  MyClass.eachComputedProperty(function(name) {
    list.push(name);
  });

  deepEqual(list.sort(), ['bar', 'foo'].sort(), 'expected two computed properties');

  MyClass.reopen({
    baz: computed(K)
  });

  MyClass.create(); // force apply mixins

  list = [];

  MyClass.eachComputedProperty(function(name) {
    list.push(name);
  });

  deepEqual(list.sort(), ['bar', 'foo', 'baz'].sort(), 'expected three computed properties');
});

QUnit.test('Calling _super in call outside the immediate function of a CP getter works', function() {
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

  equal(emberGet(SubClass.create(), 'foo'), 'FOO', 'super value is fetched');
});

QUnit.test('Calling _super in apply outside the immediate function of a CP getter works', function() {
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

  equal(emberGet(SubClass.create(), 'foo'), 'FOO', 'super value is fetched');
});
