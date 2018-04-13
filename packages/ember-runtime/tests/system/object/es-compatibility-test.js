import EmberObject from '../../../lib/system/object';
import { Mixin, defineProperty, computed } from 'ember-metal';
import { moduleFor, AbstractTestCase } from 'internal-test-helpers';

moduleFor(
  'EmberObject ES Compatibility',
  class extends AbstractTestCase {
    ['@test extending an Ember.Object'](assert) {
      let calls = [];

      class MyObject extends EmberObject {
        constructor() {
          calls.push('constructor');
          super(...arguments);
          this.postInitProperty = 'post-init-property';
        }

        init() {
          calls.push('init');
          super.init(...arguments);
          this.initProperty = 'init-property';
        }
      }

      let myObject = MyObject.create({ passedProperty: 'passed-property' });

      assert.deepEqual(calls, ['constructor', 'init'], 'constructor then init called (create)');
      assert.equal(
        myObject.postInitProperty,
        'post-init-property',
        'constructor property available on instance (create)'
      );
      assert.equal(
        myObject.initProperty,
        'init-property',
        'init property available on instance (create)'
      );
      assert.equal(
        myObject.passedProperty,
        'passed-property',
        'passed property available on instance (create)'
      );
      calls = [];
      myObject = new MyObject({ passedProperty: 'passed-property' });

      assert.deepEqual(calls, ['constructor', 'init'], 'constructor then init called (new)');
      assert.equal(
        myObject.postInitProperty,
        'post-init-property',
        'constructor property available on instance (new)'
      );
      assert.equal(
        myObject.initProperty,
        'init-property',
        'init property available on instance (new)'
      );
      assert.equal(
        myObject.passedProperty,
        'passed-property',
        'passed property available on instance (new)'
      );
    }

    ['@test normal method super'](assert) {
      let calls = [];

      let Foo = EmberObject.extend({
        method() {
          calls.push('foo');
        },
      });

      let Bar = Foo.extend({
        method() {
          this._super();
          calls.push('bar');
        },
      });

      class Baz extends Bar {
        method() {
          super.method();
          calls.push('baz');
        }
      }

      let Qux = Baz.extend({
        method() {
          this._super();
          calls.push('qux');
        },
      });

      let Quux = Qux.extend({
        method() {
          this._super();
          calls.push('quux');
        },
      });

      class Corge extends Quux {
        method() {
          super.method();
          calls.push('corge');
        }
      }

      let callValues = ['foo', 'bar', 'baz', 'qux', 'quux', 'corge'];

      [Foo, Bar, Baz, Qux, Quux, Corge].forEach((Class, index) => {
        calls = [];
        new Class().method();

        assert.deepEqual(
          calls,
          callValues.slice(0, index + 1),
          'chain of static methods called with super'
        );
      });
    }

    ['@test static method super'](assert) {
      let calls;

      let Foo = EmberObject.extend();
      Foo.reopenClass({
        method() {
          calls.push('foo');
        },
      });

      let Bar = Foo.extend();
      Bar.reopenClass({
        method() {
          this._super();
          calls.push('bar');
        },
      });

      class Baz extends Bar {
        static method() {
          super.method();
          calls.push('baz');
        }
      }

      let Qux = Baz.extend();
      Qux.reopenClass({
        method() {
          this._super();
          calls.push('qux');
        },
      });

      let Quux = Qux.extend();
      Quux.reopenClass({
        method() {
          this._super();
          calls.push('quux');
        },
      });

      class Corge extends Quux {
        static method() {
          super.method();
          calls.push('corge');
        }
      }

      let callValues = ['foo', 'bar', 'baz', 'qux', 'quux', 'corge'];

      [Foo, Bar, Baz, Qux, Quux, Corge].forEach((Class, index) => {
        calls = [];
        Class.method();

        assert.deepEqual(
          calls,
          callValues.slice(0, index + 1),
          'chain of static methods called with super'
        );
      });
    }

    ['@test using mixins'](assert) {
      let Mixin1 = Mixin.create({
        property1: 'data-1',
      });

      let Mixin2 = Mixin.create({
        property2: 'data-2',
      });

      class MyObject extends EmberObject.extend(Mixin1, Mixin2) {}

      let myObject = new MyObject();
      assert.equal(myObject.property1, 'data-1', 'includes the first mixin');
      assert.equal(myObject.property2, 'data-2', 'includes the second mixin');
    }

    ['@test using instanceof'](assert) {
      class MyObject extends EmberObject {}

      let myObject1 = MyObject.create();
      let myObject2 = new MyObject();

      assert.ok(myObject1 instanceof MyObject);
      assert.ok(myObject1 instanceof EmberObject);

      assert.ok(myObject2 instanceof MyObject);
      assert.ok(myObject2 instanceof EmberObject);
    }

    ['@test extending an ES subclass of EmberObject'](assert) {
      let calls = [];

      class SubEmberObject extends EmberObject {
        constructor() {
          calls.push('constructor');
          super(...arguments);
        }

        init() {
          calls.push('init');
          super.init(...arguments);
        }
      }

      class MyObject extends SubEmberObject {}

      MyObject.create();
      assert.deepEqual(calls, ['constructor', 'init'], 'constructor then init called (create)');

      calls = [];
      new MyObject();
      assert.deepEqual(calls, ['constructor', 'init'], 'constructor then init called (new)');
    }

    ['@test calling extend on an ES subclass of EmberObject'](assert) {
      let calls = [];

      class SubEmberObject extends EmberObject {
        constructor() {
          calls.push('before constructor');
          super(...arguments);
          calls.push('after constructor');
          this.foo = 123;
        }

        init() {
          calls.push('init');
          super.init(...arguments);
        }
      }

      let MyObject = SubEmberObject.extend({});

      MyObject.create();
      assert.deepEqual(
        calls,
        ['before constructor', 'init', 'after constructor'],
        'constructor then init called (create)'
      );

      calls = [];
      new MyObject();
      assert.deepEqual(
        calls,
        ['before constructor', 'init', 'after constructor'],
        'constructor then init called (new)'
      );

      let obj = MyObject.create({
        foo: 456,
        bar: 789,
      });

      assert.equal(obj.foo, 123, 'sets class fields on instance correctly');
      assert.equal(obj.bar, 789, 'sets passed in properties on instance correctly');
    }

    ['@test calling metaForProperty on a native class works'](assert) {
      assert.expect(0);

      class SubEmberObject extends EmberObject {}

      defineProperty(
        SubEmberObject.prototype,
        'foo',
        computed('foo', {
          get() {
            return 'bar';
          },
        })
      );

      // able to get meta without throwing an error
      SubEmberObject.metaForProperty('foo');
    }
  }
);
