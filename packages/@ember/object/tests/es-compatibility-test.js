import CoreObject from '@ember/object/core';
import { moduleFor, AbstractTestCase } from 'internal-test-helpers';

moduleFor(
  'EmberObject ES Compatibility',
  class extends AbstractTestCase {
    ['@test extending an Ember.Object'](assert) {
      let calls = [];

      class MyObject extends CoreObject {
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
    }

    ['@test normal method super'](assert) {
      let calls = [];

      let Foo = class extends CoreObject {
        method() {
          calls.push('foo');
        }
      };

      let Bar = class extends Foo {
        method() {
          super.method();
          calls.push('bar');
        }
      };

      class Baz extends Bar {
        method() {
          super.method();
          calls.push('baz');
        }
      }

      let Qux = class extends Baz {
        method() {
          super.method();
          calls.push('qux');
        }
      };

      let Quux = class extends Qux {
        method() {
          super.method();
          calls.push('quux');
        }
      };

      class Corge extends Quux {
        method() {
          super.method();
          calls.push('corge');
        }
      }

      let callValues = ['foo', 'bar', 'baz', 'qux', 'quux', 'corge'];

      [Foo, Bar, Baz, Qux, Quux, Corge].forEach((Class, index) => {
        calls = [];
        Class.create().method();

        assert.deepEqual(
          calls,
          callValues.slice(0, index + 1),
          'chain of static methods called with super'
        );
      });
    }

    ['@test static method super'](assert) {
      let calls;

      let Foo = class extends CoreObject {
        static method() {
          calls.push('foo');
        }
      };

      let Bar = class extends Foo {
        static method() {
          super.method();
          calls.push('bar');
        }
      };

      class Baz extends Bar {
        static method() {
          super.method();
          calls.push('baz');
        }
      }

      let Qux = class extends Baz {
        static method() {
          super.method();
          calls.push('qux');
        }
      };

      let Quux = class extends Qux {
        static method() {
          super.method();
          calls.push('quux');
        }
      };

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

    ['@test using instanceof'](assert) {
      class MyObject extends CoreObject {}

      let myObject = MyObject.create();

      assert.ok(myObject instanceof MyObject);
      assert.ok(myObject instanceof CoreObject);
    }

    ['@test using CoreObject#detect'](assert) {
      let Parent = class extends CoreObject {};
      class Child extends Parent {}
      let Grandchild = class extends Child {};

      assert.ok(Parent.detect(Child), 'Parent.detect(Child)');
      assert.ok(Child.detect(Grandchild), 'Child.detect(Grandchild)');
    }

    ['@test extending an ES subclass of CoreObject'](assert) {
      let calls = [];

      class SubCoreObject extends CoreObject {
        constructor() {
          calls.push('constructor');
          super(...arguments);
        }

        init() {
          calls.push('init');
          super.init(...arguments);
        }
      }

      class MyObject extends SubCoreObject {}

      MyObject.create();
      assert.deepEqual(calls, ['constructor', 'init'], 'constructor then init called (create)');
    }

    ['@test calling extend on an ES subclass of CoreObject'](assert) {
      let calls = [];

      class SubCoreObject extends CoreObject {
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

      let MyObject = class extends SubCoreObject {};

      MyObject.create();
      assert.deepEqual(
        calls,
        ['before constructor', 'after constructor', 'init'],
        'constructor then init called (create)'
      );

      let obj = MyObject.create({
        foo: 456,
        bar: 789,
      });

      assert.equal(obj.foo, 456, 'sets class fields on instance correctly');
      assert.equal(obj.bar, 789, 'sets passed in properties on instance correctly');
    }

    // TODO: Determine if there's anything useful to test here with observer helper gone
    // '@test observes / removeObserver on / removeListener interop'(assert) {
    //   let fooDidChangeBase = 0;
    //   let fooDidChangeA = 0;
    //   let fooDidChangeB = 0;
    //   let someEventBase = 0;
    //   let someEventA = 0;
    //   let someEventB = 0;
    //   class A extends EmberObject.extend({
    //     fooDidChange: observer('foo', function () {
    //       fooDidChangeBase++;
    //     }),

    //     onSomeEvent() {
    //       someEventBase++;
    //     },
    //   }) {
    //     init() {
    //       super.init();
    //       this.foo = 'bar';
    //     }

    //     fooDidChange() {
    //       super.fooDidChange();
    //       fooDidChangeA++;
    //     }

    //     onSomeEvent() {
    //       super.onSomeEvent();
    //       someEventA++;
    //     }
    //   }

    //   class B extends A {
    //     fooDidChange() {
    //       super.fooDidChange();
    //       fooDidChangeB++;
    //     }

    //     onSomeEvent() {
    //       super.onSomeEvent();
    //       someEventB++;
    //     }
    //   }

    //   removeObserver(B.prototype, 'foo', null, 'fooDidChange');
    //   removeListener(B.prototype, 'someEvent', null, 'onSomeEvent');

    //   assert.equal(fooDidChangeBase, 0);
    //   assert.equal(fooDidChangeA, 0);
    //   assert.equal(fooDidChangeB, 0);

    //   assert.equal(someEventBase, 0);
    //   assert.equal(someEventA, 0);
    //   assert.equal(someEventB, 0);

    //   let a = A.create();
    //   set(a, 'foo', 'something');

    //   // TODO: Generator transpilation code doesn't play nice with class definitions/hoisting
    //   return runLoopSettled().then(async () => {
    //     assert.equal(fooDidChangeBase, 1);
    //     assert.equal(fooDidChangeA, 1);
    //     assert.equal(fooDidChangeB, 0);

    //     let b = B.create();
    //     set(b, 'foo', 'something');
    //     await runLoopSettled();

    //     assert.equal(fooDidChangeBase, 1);
    //     assert.equal(fooDidChangeA, 1);
    //     assert.equal(fooDidChangeB, 0);

    //     a.destroy();
    //     b.destroy();
    //   });
    // }
  }
);
