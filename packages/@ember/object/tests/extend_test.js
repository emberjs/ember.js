import { computed, get } from '@ember/object';
import EmberObject, { observer } from '@ember/object';
import { moduleFor, AbstractTestCase, runLoopSettled } from 'internal-test-helpers';
import { classicExtend, classicReopenClass } from '@ember/object/lib/classic';

moduleFor(
  'EmberObject.extend',
  class extends AbstractTestCase {
    ['@test Basic extend'](assert) {
      let SomeClass = classicExtend(EmberObject, { foo: 'BAR' });
      assert.ok(SomeClass.isClass, 'A class has isClass of true');
      let obj = SomeClass.create();
      assert.equal(obj.foo, 'BAR');
    }

    ['@test Sub-subclass'](assert) {
      let SomeClass = classicExtend(EmberObject, { foo: 'BAR' });
      let AnotherClass = classicExtend(SomeClass, { bar: 'FOO' });
      let obj = AnotherClass.create();
      assert.equal(obj.foo, 'BAR');
      assert.equal(obj.bar, 'FOO');
    }

    ['@test Overriding a method several layers deep'](assert) {
      let SomeClass = classicExtend(EmberObject, {
        fooCnt: 0,
        foo() {
          this.fooCnt++;
        },

        barCnt: 0,
        bar() {
          this.barCnt++;
        },
      });

      let AnotherClass = classicExtend(SomeClass, {
        barCnt: 0,
        bar() {
          this.barCnt++;
          this._super(...arguments);
        },
      });

      let FinalClass = classicExtend(AnotherClass, {
        fooCnt: 0,
        foo() {
          this.fooCnt++;
          this._super(...arguments);
        },
      });

      let obj = FinalClass.create();
      obj.foo();
      obj.bar();
      assert.equal(obj.fooCnt, 2, 'should invoke both');
      assert.equal(obj.barCnt, 2, 'should invoke both');

      // Try overriding on create also
      obj = classicExtend(FinalClass, {
        foo() {
          this.fooCnt++;
          this._super(...arguments);
        },
      }).create();

      obj.foo();
      obj.bar();
      assert.equal(obj.fooCnt, 3, 'should invoke final as well');
      assert.equal(obj.barCnt, 2, 'should invoke both');
    }

    ['@test With concatenatedProperties'](assert) {
      let SomeClass = classicExtend(EmberObject, {
        things: 'foo',
        concatenatedProperties: ['things'],
      });
      let AnotherClass = classicExtend(SomeClass, { things: 'bar' });
      let YetAnotherClass = classicExtend(SomeClass, { things: 'baz' });
      let some = SomeClass.create();
      let another = AnotherClass.create();
      let yetAnother = YetAnotherClass.create();
      assert.deepEqual(some.get('things'), ['foo'], 'base class should have just its value');
      assert.deepEqual(
        another.get('things'),
        ['foo', 'bar'],
        "subclass should have base class' and its own"
      );
      assert.deepEqual(
        yetAnother.get('things'),
        ['foo', 'baz'],
        "subclass should have base class' and its own"
      );
    }

    ['@test With concatenatedProperties class properties'](assert) {
      let SomeClass = classicExtend(EmberObject);
      classicReopenClass(SomeClass, {
        concatenatedProperties: ['things'],
        things: 'foo',
      });
      let AnotherClass = classicExtend(SomeClass);
      classicReopenClass(AnotherClass, { things: 'bar' });
      let YetAnotherClass = classicExtend(SomeClass);
      classicReopenClass(YetAnotherClass, { things: 'baz' });
      let some = SomeClass.create();
      let another = AnotherClass.create();
      let yetAnother = YetAnotherClass.create();
      assert.deepEqual(
        get(some.constructor, 'things'),
        ['foo'],
        'base class should have just its value'
      );
      assert.deepEqual(
        get(another.constructor, 'things'),
        ['foo', 'bar'],
        "subclass should have base class' and its own"
      );
      assert.deepEqual(
        get(yetAnother.constructor, 'things'),
        ['foo', 'baz'],
        "subclass should have base class' and its own"
      );
    }

    async ['@test Overriding a computed property with an observer'](assert) {
      let Parent = classicExtend(EmberObject, {
        foo: computed(function () {
          return 'FOO';
        }),
      });

      let seen = [];

      let Child = classicExtend(Parent, {
        foo: observer('bar', function () {
          seen.push(this.get('bar'));
        }),
      });

      let child = Child.create({ bar: 0 });

      assert.deepEqual(seen, []);

      child.set('bar', 1);
      await runLoopSettled();

      assert.deepEqual(seen, [1]);

      child.set('bar', 2);
      await runLoopSettled();

      assert.deepEqual(seen, [1, 2]);

      child.destroy();
    }
  }
);
