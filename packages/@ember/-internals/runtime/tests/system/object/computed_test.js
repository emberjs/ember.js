import {
  alias,
  computed,
  set,
  get,
  getWithDefault,
  observer,
  defineProperty,
} from '@ember/-internals/metal';
import { oneWay as reads } from '@ember/object/computed';
import { A as EmberArray, isArray } from '../../..';
import EmberObject from '../../../lib/system/object';
import { moduleFor, AbstractTestCase } from 'internal-test-helpers';

function K() {
  return this;
}

function testWithDefault(assert, expect, x, y, z) {
  assert.equal(get(x, y), expect);
  expectDeprecation(() => {
    assert.equal(getWithDefault(x, y, z), expect);
    assert.equal(x.getWithDefault(y, z), expect);
  }, /Using getWithDefault has been deprecated. Instead, consider using Ember get and explicitly checking for undefined./);
}

moduleFor(
  'EmberObject computed property',
  class extends AbstractTestCase {
    ['@test computed property on instance'](assert) {
      let MyClass = EmberObject.extend({
        foo: computed(function () {
          return 'FOO';
        }),
      });

      testWithDefault(assert, 'FOO', MyClass.create(), 'foo');
    }

    ['@test computed property on subclass'](assert) {
      let MyClass = EmberObject.extend({
        foo: computed(function () {
          return 'FOO';
        }),
      });

      let Subclass = MyClass.extend({
        foo: computed(function () {
          return 'BAR';
        }),
      });

      testWithDefault(assert, 'BAR', Subclass.create(), 'foo');
    }

    ['@test replacing computed property with regular val'](assert) {
      let MyClass = EmberObject.extend({
        foo: computed(function () {
          return 'FOO';
        }),
      });

      let Subclass = MyClass.extend({
        foo: 'BAR',
      });

      testWithDefault(assert, 'BAR', Subclass.create(), 'foo');
    }

    ['@test complex depndent keys'](assert) {
      let MyClass = EmberObject.extend({
        init() {
          this._super(...arguments);
          set(this, 'bar', { baz: 'BIFF' });
        },

        count: 0,

        foo: computed('bar.baz', function () {
          set(this, 'count', get(this, 'count') + 1);
          return get(get(this, 'bar'), 'baz') + ' ' + get(this, 'count');
        }),
      });

      let Subclass = MyClass.extend({
        count: 20,
      });

      let obj1 = MyClass.create();
      let obj2 = Subclass.create();

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

        foo: computed('bar.baz', function () {
          set(this, 'count', get(this, 'count') + 1);
          return get(get(this, 'bar'), 'baz') + ' ' + get(this, 'count');
        }),
      });

      let Subclass = MyClass.extend({
        init() {
          this._super(...arguments);
          set(this, 'bar2', { baz: 'BIFF2' });
        },

        count: 0,

        foo: computed('bar2.baz', function () {
          set(this, 'count', get(this, 'count') + 1);
          return get(get(this, 'bar2'), 'baz') + ' ' + get(this, 'count');
        }),
      });

      let obj2 = Subclass.create();

      testWithDefault(assert, 'BIFF2 1', obj2, 'foo');

      set(get(obj2, 'bar'), 'baz', 'BLARG');
      testWithDefault(assert, 'BIFF2 1', obj2, 'foo'); // should not invalidate property

      set(get(obj2, 'bar2'), 'baz', 'BLARG');
      testWithDefault(assert, 'BLARG 2', obj2, 'foo'); // should not invalidate property
    }

    ['@test can retrieve metadata for a computed property'](assert) {
      let MyClass = EmberObject.extend({
        computedProperty: computed(function () {}).meta({ key: 'keyValue' }),
      });

      assert.equal(
        get(MyClass.metaForProperty('computedProperty'), 'key'),
        'keyValue',
        'metadata saved on the computed property can be retrieved'
      );

      let ClassWithNoMetadata = EmberObject.extend({
        computedProperty: computed(function () {}),

        staticProperty: 12,
      });

      assert.equal(
        typeof ClassWithNoMetadata.metaForProperty('computedProperty'),
        'object',
        'returns empty hash if no metadata has been saved'
      );

      expectAssertion(function () {
        ClassWithNoMetadata.metaForProperty('nonexistentProperty');
      }, "metaForProperty() could not find a computed property with key 'nonexistentProperty'.");

      expectAssertion(function () {
        ClassWithNoMetadata.metaForProperty('staticProperty');
      }, "metaForProperty() could not find a computed property with key 'staticProperty'.");
    }

    ['@test overriding a computed property with null removes it from eachComputedProperty iteration'](
      assert
    ) {
      let MyClass = EmberObject.extend({
        foo: computed(function () {}),

        fooDidChange: observer('foo', function () {}),

        bar: computed(function () {}),
      });

      let SubClass = MyClass.extend({
        foo: null,
      });

      let list = [];

      SubClass.eachComputedProperty((name) => list.push(name));

      assert.deepEqual(
        list.sort(),
        ['bar'],
        'overridding with null removes from eachComputedProperty listing'
      );
    }

    ['@test can iterate over a list of computed properties for a class'](assert) {
      let MyClass = EmberObject.extend({
        foo: computed(function () {}),

        fooDidChange: observer('foo', function () {}),

        bar: computed(function () {}),

        qux: alias('foo'),
      });

      let SubClass = MyClass.extend({
        baz: computed(function () {}),
      });

      SubClass.reopen({
        bat: computed(function () {}).meta({ iAmBat: true }),
      });

      let list = [];

      MyClass.eachComputedProperty(function (name) {
        list.push(name);
      });

      assert.deepEqual(
        list.sort(),
        ['bar', 'foo', 'qux'],
        'watched and unwatched computed properties are iterated'
      );

      list = [];

      SubClass.eachComputedProperty(function (name, meta) {
        list.push(name);

        if (name === 'bat') {
          assert.deepEqual(meta, { iAmBat: true });
        } else {
          assert.deepEqual(meta, {});
        }
      });

      assert.deepEqual(
        list.sort(),
        ['bar', 'bat', 'baz', 'foo', 'qux'],
        'all inherited properties are included'
      );
    }

    ['@test list of properties updates when an additional property is added (such cache busting)'](
      assert
    ) {
      let MyClass = EmberObject.extend({
        foo: computed(K),

        fooDidChange: observer('foo', function () {}),

        bar: computed(K),
      });

      let list = [];

      MyClass.eachComputedProperty(function (name) {
        list.push(name);
      });

      assert.deepEqual(list.sort(), ['bar', 'foo'].sort(), 'expected two computed properties');

      MyClass.reopen({
        baz: computed(K),
      });

      MyClass.create().destroy(); // force apply mixins

      list = [];

      MyClass.eachComputedProperty(function (name) {
        list.push(name);
      });

      assert.deepEqual(
        list.sort(),
        ['bar', 'foo', 'baz'].sort(),
        'expected three computed properties'
      );

      defineProperty(MyClass.prototype, 'qux', computed(K));

      list = [];

      MyClass.eachComputedProperty(function (name) {
        list.push(name);
      });

      assert.deepEqual(
        list.sort(),
        ['bar', 'foo', 'baz', 'qux'].sort(),
        'expected four computed properties'
      );
    }

    ['@test Calling _super in call outside the immediate function of a CP getter works'](assert) {
      function macro(callback) {
        return computed(function () {
          return callback.call(this);
        });
      }

      let MyClass = EmberObject.extend({
        foo: computed(function () {
          return 'FOO';
        }),
      });

      let SubClass = MyClass.extend({
        foo: macro(function () {
          return this._super();
        }),
      });

      assert.ok(get(SubClass.create(), 'foo'), 'FOO', 'super value is fetched');
    }

    ['@test Calling _super in apply outside the immediate function of a CP getter works'](assert) {
      function macro(callback) {
        return computed(function () {
          return callback.apply(this);
        });
      }

      let MyClass = EmberObject.extend({
        foo: computed(function () {
          return 'FOO';
        }),
      });

      let SubClass = MyClass.extend({
        foo: macro(function () {
          return this._super();
        }),
      });

      assert.ok(get(SubClass.create(), 'foo'), 'FOO', 'super value is fetched');
    }

    ['@test observing computed.reads prop and overriding it in create() works'](assert) {
      let Obj = EmberObject.extend({
        name: reads('model.name'),
        nameDidChange: observer('name', function () {}),
      });

      let obj1 = Obj.create({ name: '1' });
      let obj2 = Obj.create({ name: '2' });

      assert.equal(obj1.get('name'), '1');
      assert.equal(obj2.get('name'), '2');

      obj1.destroy();
      obj2.destroy();
    }

    ['@test can declare dependent keys with .property()'](assert) {
      let Obj;

      expectDeprecation(() => {
        Obj = EmberObject.extend({
          foo: computed(function () {
            return this.bar;
          }).property('bar'),
        });
      }, /Setting dependency keys using the `.property\(\)` modifier has been deprecated/);

      let obj = Obj.create({ bar: 1 });

      assert.equal(obj.get('foo'), 1);

      obj.set('bar', 2);

      assert.equal(obj.get('foo'), 2);
    }

    ['@test native getters and setters work'](assert) {
      let MyClass = EmberObject.extend({
        bar: 123,

        foo: computed({
          get() {
            return this.bar;
          },

          set(key, value) {
            this.bar = value;
          },
        }),
      });

      let instance = MyClass.create();

      assert.equal(instance.foo, 123, 'getters work');
      instance.foo = 456;
      assert.equal(instance.bar, 456, 'setters work');
    }

    ['@test @each on maybe array'](assert) {
      let Normalizer = EmberObject.extend({
        options: null, // null | undefined | { value: any } | Array<{ value: any }>

        // Normalize into Array<any>
        normalized: computed('options', 'options.value', 'options.@each.value', function () {
          let { options } = this;

          if (isArray(options)) {
            return options.map((item) => item.value);
          } else if (options !== null && typeof options === 'object') {
            return [options.value];
          } else {
            return [];
          }
        }),
      });

      let n = Normalizer.create();
      assert.deepEqual(n.normalized, []);

      n.set('options', { value: 'foo' });
      assert.deepEqual(n.normalized, ['foo']);

      n.set('options.value', 'bar');
      assert.deepEqual(n.normalized, ['bar']);

      n.set('options', { extra: 'wat', value: 'baz' });
      assert.deepEqual(n.normalized, ['baz']);

      n.set('options', EmberArray([{ value: 'foo' }]));
      assert.deepEqual(n.normalized, ['foo']);

      n.options.pushObject({ value: 'bar' });
      assert.deepEqual(n.normalized, ['foo', 'bar']);

      n.options.pushObject({ extra: 'wat', value: 'baz' });
      assert.deepEqual(n.normalized, ['foo', 'bar', 'baz']);

      n.options.clear();
      assert.deepEqual(n.normalized, []);

      n.set('options', [{ value: 'foo' }, { value: 'bar' }]);
      assert.deepEqual(n.normalized, ['foo', 'bar']);

      set(n.options[0], 'value', 'FOO');
      assert.deepEqual(n.normalized, ['FOO', 'bar']);

      n.set('options', null);
      assert.deepEqual(n.normalized, []);
    }

    ['@test @each works on array with falsy values'](assert) {
      let obj = EmberObject.extend({
        falsy: [null, undefined, false, '', 0, {}],
        truthy: [true, 'foo', 123],

        falsyComputed: computed('falsy.@each.foo', () => {
          assert.ok(true, 'falsy computed');
        }),

        truthyComputed: computed('truthy.@each.foo', () => {
          assert.ok(true, 'truthy computed');
        }),
      }).create();

      // should throw no errors
      obj.falsyComputed;

      expectAssertion(() => {
        obj.truthyComputed;
      }, /When using @each to observe the array `true,foo,123`, the items in the array must be objects/);
    }

    ['@test @each works with array-likes'](assert) {
      class ArrayLike {
        constructor(arr = []) {
          this.inner = arr;
        }

        get length() {
          return this.inner.length;
        }

        objectAt(index) {
          return this.inner[index];
        }

        map(fn) {
          return this.inner.map(fn);
        }
      }

      let Normalizer = EmberObject.extend({
        options: null, // null | ArrayLike<{ value: any }>

        // Normalize into Array<any>
        normalized: computed('options.@each.value', function () {
          let options = this.options || [];
          return options.map((item) => item.value);
        }),
      });

      let n = Normalizer.create();
      assert.deepEqual(n.normalized, []);

      let options = new ArrayLike([{ value: 'foo' }]);

      n.set('options', options);
      assert.deepEqual(n.normalized, ['foo']);

      set(options.objectAt(0), 'value', 'bar');
      assert.deepEqual(n.normalized, ['bar']);
    }

    ['@test lazy computation cannot cause infinite cycles'](assert) {
      // This is based off a real world bug found in ember-cp-validations:
      // https://github.com/offirgolan/ember-cp-validations/issues/659
      let CycleObject = EmberObject.extend({
        foo: computed(function () {
          return EmberObject.extend({
            parent: this,
            alias: alias('parent.foo'),
          }).create();
        }),
        bar: computed('foo.alias', () => {}),
      });

      let obj = CycleObject.create();

      obj.bar;
      obj.foo;

      assert.ok(true);
    }
  }
);
