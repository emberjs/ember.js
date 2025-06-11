import { notifyPropertyChange } from '@ember/-internals/metal';
import { alias, oneWay as reads } from '@ember/object/computed';
import EmberObject, { defineProperty, get, set, computed, observer } from '@ember/object';
import { moduleFor, AbstractTestCase } from 'internal-test-helpers';

function K() {
  return this;
}

function testGet(assert, expect, x, y) {
  assert.equal(get(x, y), expect);
  assert.equal(get(x, y), expect);
  assert.equal(x.get(y), expect);
}

moduleFor(
  'EmberObject computed property',
  class extends AbstractTestCase {
    ['@test computed property on instance'](assert) {
      let MyClass = class extends EmberObject {
        @computed
        get foo() {
          return 'FOO';
        }
      };

      testGet(assert, 'FOO', MyClass.create(), 'foo');
    }

    ['@test computed property on subclass'](assert) {
      let MyClass = class extends EmberObject {
        @computed
        get foo() {
          return 'FOO';
        }
      };

      let Subclass = class extends MyClass {
        @computed
        get foo() {
          return 'BAR';
        }
      };

      testGet(assert, 'BAR', Subclass.create(), 'foo');
    }

    ['@test replacing computed property with regular val'](assert) {
      let MyClass = class extends EmberObject {
        @computed
        get foo() {
          return 'FOO';
        }
      };

      let Subclass = class extends MyClass {
        foo = 'BAR';
      };

      testGet(assert, 'BAR', Subclass.create(), 'foo');
    }

    ['@test complex dependent keys'](assert) {
      let MyClass = class extends EmberObject {
        init() {
          super.init(...arguments);
          set(this, 'bar', { baz: 'BIFF' });
        }

        count = 0;

        @computed('bar.baz')
        get foo() {
          set(this, 'count', get(this, 'count') + 1);
          return get(get(this, 'bar'), 'baz') + ' ' + get(this, 'count');
        }
      };

      let Subclass = class extends MyClass {
        count = 20;
      };

      let obj1 = MyClass.create();
      let obj2 = Subclass.create();

      testGet(assert, 'BIFF 1', obj1, 'foo');
      testGet(assert, 'BIFF 21', obj2, 'foo');

      set(get(obj1, 'bar'), 'baz', 'BLARG');

      testGet(assert, 'BLARG 2', obj1, 'foo');
      testGet(assert, 'BIFF 21', obj2, 'foo');

      set(get(obj2, 'bar'), 'baz', 'BOOM');

      testGet(assert, 'BLARG 2', obj1, 'foo');
      testGet(assert, 'BOOM 22', obj2, 'foo');
    }

    ['@test complex dependent keys changing complex dependent keys'](assert) {
      let MyClass = class extends EmberObject {
        init() {
          super.init(...arguments);
          set(this, 'bar', { baz: 'BIFF' });
        }

        count = 0;

        @computed('bar.baz')
        get foo() {
          set(this, 'count', get(this, 'count') + 1);
          return get(get(this, 'bar'), 'baz') + ' ' + get(this, 'count');
        }
      };

      let Subclass = class extends MyClass {
        init() {
          super.init(...arguments);
          set(this, 'bar2', { baz: 'BIFF2' });
        }

        count = 0;

        @computed('bar2.baz')
        get foo() {
          set(this, 'count', get(this, 'count') + 1);
          return get(get(this, 'bar2'), 'baz') + ' ' + get(this, 'count');
        }
      };

      let obj2 = Subclass.create();

      testGet(assert, 'BIFF2 1', obj2, 'foo');

      set(get(obj2, 'bar'), 'baz', 'BLARG');
      testGet(assert, 'BIFF2 1', obj2, 'foo'); // should not invalidate property

      set(get(obj2, 'bar2'), 'baz', 'BLARG');
      testGet(assert, 'BLARG 2', obj2, 'foo'); // should not invalidate property
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

      let ClassWithNoMetadata = class extends EmberObject {
        @computed
        get computedProperty() {
          return undefined;
        }

        staticProperty = 12;
      };

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

      let MyClass = class extends EmberObject {
        @computed
        get foo() {
          return 'FOO';
        }
      };

      let SubClass = class extends MyClass {
        @macro
        get foo() {
          return super.foo;
        }
      };

      assert.ok(get(SubClass.create(), 'foo'), 'FOO', 'super value is fetched');
    }

    ['@test Calling _super in apply outside the immediate function of a CP getter works'](assert) {
      function macro(callback) {
        return computed(function () {
          return callback.apply(this);
        });
      }

      let MyClass = class extends EmberObject {
        @computed
        get foo() {
          return 'FOO';
        }
      };

      let SubClass = class extends MyClass {
        @macro
        get foo() {
          return super.foo;
        }
      };

      assert.ok(get(SubClass.create(), 'foo'), 'FOO', 'super value is fetched');
    }

    ['@test observing prop installed with computed macro reads and overriding it in create() works'](
      assert
    ) {
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

    ['@test native getters and setters work'](assert) {
      let MyClass = class extends EmberObject {
        bar = 123;

        @computed
        get foo() {
          return this.bar;
        }

        set foo(value) {
          this.bar = value;
        }
      };

      let instance = MyClass.create();

      assert.equal(instance.foo, 123, 'getters work');
      instance.foo = 456;
      assert.equal(instance.bar, 456, 'setters work');
    }

    ['@test @each works on array with falsy values'](assert) {
      let obj = class extends EmberObject {
        falsy = [null, undefined, false, '', 0, {}];
        truthy = [true, 'foo', 123];

        @computed('falsy.@each.foo')
        get falsyComputed() {
          assert.ok(true, 'falsy computed');
          return false;
        }

        @computed('truthy.@each.foo')
        get truthyComputed() {
          assert.ok(true, 'truthy computed');
          return true;
        }
      }.create();

      // should throw no errors
      obj.falsyComputed;

      expectAssertion(() => {
        obj.truthyComputed;
      }, /When using @each to observe the array `true,foo,123`, the items in the array must be objects/);
    }

    ['@test lazy computation cannot cause infinite cycles'](assert) {
      // This is based off a real world bug found in ember-cp-validations:
      // https://github.com/offirgolan/ember-cp-validations/issues/659
      let CycleObject = class extends EmberObject {
        @computed
        get foo() {
          return class extends EmberObject {
            parent = this;
            @alias('parent.foo')
            alias;
          }.create();
        }

        @computed('foo.alias')
        get bar() {
          return true;
        }
      };

      let obj = CycleObject.create();

      obj.bar;
      obj.foo;

      assert.ok(true);
    }

    ['@test computeds can have cycles'](assert) {
      class CycleObject {
        // eslint-disable-next-line getter-return
        @computed('bar')
        get foo() {}

        // eslint-disable-next-line getter-return
        @computed('foo')
        get bar() {}
      }

      let obj = new CycleObject();

      obj.bar;
      obj.foo;

      notifyPropertyChange(obj, 'bar');

      obj.foo;

      assert.ok(true);
    }
  }
);
