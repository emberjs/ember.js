import {
  alias,
  computed,
  set,
  get,
  getWithDefault,
  observer,
  defineProperty
} from 'ember-metal';
import { oneWay as reads } from 'ember-runtime';
import EmberObject from '../../../system/object';
import { moduleFor, AbstractTestCase } from 'internal-test-helpers';

function K() { return this; }

function testWithDefault(assert, expect, x, y, z) {
  assert.equal(get(x, y), expect);
  assert.equal(getWithDefault(x, y, z), expect);
  assert.equal(x.getWithDefault(y, z), expect);
}

moduleFor('EmberObject computed property', class extends AbstractTestCase {
  ['@test computed property on instance'](assert) {
    let MyClass = EmberObject.extend({
      foo: computed(function() { return 'FOO'; })
    });

    testWithDefault(assert, 'FOO', new MyClass(), 'foo');
  }

  ['@test computed property on subclass'](assert) {
    let MyClass = EmberObject.extend({
      foo: computed(function() { return 'FOO'; })
    });

    let Subclass = MyClass.extend({
      foo: computed(function() { return 'BAR'; })
    });

    testWithDefault(assert, 'BAR', new Subclass(), 'foo');
  }

  ['@test replacing computed property with regular val'](assert) {
    let MyClass = EmberObject.extend({
      foo: computed(function() { return 'FOO'; })
    });

    let Subclass = MyClass.extend({
      foo: 'BAR'
    });

    testWithDefault(assert, 'BAR', new Subclass(), 'foo');
  }

  ['@test complex depndent keys'](assert) {
    let MyClass = EmberObject.extend({
      init() {
        this._super(...arguments);
        set(this, 'bar', { baz: 'BIFF' });
      },

      count: 0,

      foo: computed(function() {
        set(this, 'count', get(this, 'count') + 1);
        return get(get(this, 'bar'), 'baz') + ' ' + get(this, 'count');
      }).property('bar.baz')
    });

    let Subclass = MyClass.extend({
      count: 20
    });

    let obj1 = new MyClass();
    let obj2 = new Subclass();

    testWithDefault(assert, 'BIFF 1', obj1, 'foo');
    testWithDefault(assert, 'BIFF 21', obj2, 'foo');

    set(get(obj1, 'bar'), 'baz', 'BLARG');

    testWithDefault(assert, 'BLARG 2', obj1, 'foo');
    testWithDefault(assert, 'BIFF 21', obj2, 'foo');

    set(get(obj2, 'bar'), 'baz', 'BOOM');

    testWithDefault(assert, 'BLARG 2', obj1, 'foo');
    testWithDefault(assert, 'BOOM 22', obj2, 'foo');
  }

  ['@test complex dependent keys changing complex dependent keys'](assert) {
    let MyClass = EmberObject.extend({
      init() {
        this._super(...arguments);
        set(this, 'bar', { baz: 'BIFF' });
      },

      count: 0,

      foo: computed(function() {
        set(this, 'count', get(this, 'count') + 1);
        return get(get(this, 'bar'), 'baz') + ' ' + get(this, 'count');
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
        return get(get(this, 'bar2'), 'baz') + ' ' + get(this, 'count');
      }).property('bar2.baz')
    });

    let obj2 = new Subclass();

    testWithDefault(assert, 'BIFF2 1', obj2, 'foo');

    set(get(obj2, 'bar'), 'baz', 'BLARG');
    testWithDefault(assert, 'BIFF2 1', obj2, 'foo'); // should not invalidate property

    set(get(obj2, 'bar2'), 'baz', 'BLARG');
    testWithDefault(assert, 'BLARG 2', obj2, 'foo'); // should not invalidate property
  }

  ['@test can retrieve metadata for a computed property'](assert) {
    let MyClass = EmberObject.extend({
      computedProperty: computed(function() {
      }).meta({ key: 'keyValue' })
    });

    assert.equal(get(MyClass.metaForProperty('computedProperty'), 'key'), 'keyValue', 'metadata saved on the computed property can be retrieved');

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
  }

  ['@test overriding a computed property with null removes it from eachComputedProperty iteration'](assert) {
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
  }

  ['@test can iterate over a list of computed properties for a class'](assert) {
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
  }

  ['@test list of properties updates when an additional property is added (such cache busting)'](assert) {
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
  }

  ['@test Calling _super in call outside the immediate function of a CP getter works'](assert) {
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

    assert.ok(get(SubClass.create(), 'foo'), 'FOO', 'super value is fetched');
  }

  ['@test Calling _super in apply outside the immediate function of a CP getter works'](assert) {
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

    assert.ok(get(SubClass.create(), 'foo'), 'FOO', 'super value is fetched');
  }

  ['@test observing computed.reads prop and overriding it in create() works'](assert) {
    let Obj = EmberObject.extend({
      name: reads('model.name'),
      nameDidChange: observer('name', function() {})
    });

    let obj1 = Obj.create({name: '1'});
    let obj2 = Obj.create({name: '2'});

    assert.equal(obj1.get('name'), '1');
    assert.equal(obj2.get('name'), '2');
  }
});

