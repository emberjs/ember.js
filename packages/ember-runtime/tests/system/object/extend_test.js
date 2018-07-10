import { get } from 'ember-metal';
import EmberObject from '../../../system/object';

QUnit.module('EmberObject.extend');

QUnit.test('Basic extend', function() {
  let SomeClass = EmberObject.extend({ foo: 'BAR' });
  ok(SomeClass.isClass, 'A class has isClass of true');
  let obj = SomeClass.create();
  equal(obj.foo, 'BAR');
});

QUnit.test('Sub-subclass', function() {
  let SomeClass = EmberObject.extend({ foo: 'BAR' });
  let AnotherClass = SomeClass.extend({ bar: 'FOO' });
  let obj = AnotherClass.create();
  equal(obj.foo, 'BAR');
  equal(obj.bar, 'FOO');
});

QUnit.test('Overriding a method several layers deep', function() {
  let SomeClass = EmberObject.extend({
    fooCnt: 0,
    foo() { this.fooCnt++; },

    barCnt: 0,
    bar() { this.barCnt++; }
  });

  let AnotherClass = SomeClass.extend({
    barCnt: 0,
    bar() {
      this.barCnt++;
      this._super(...arguments);
    }
  });

  let FinalClass = AnotherClass.extend({
    fooCnt: 0,
    foo() {
      this.fooCnt++;
      this._super(...arguments);
    }
  });

  let obj = FinalClass.create();
  obj.foo();
  obj.bar();
  equal(obj.fooCnt, 2, 'should invoke both');
  equal(obj.barCnt, 2, 'should invoke both');

  // Try overriding on create also
  obj = FinalClass.extend({
    foo() {
      this.fooCnt++;
      this._super(...arguments);
    }
  }).create();

  obj.foo();
  obj.bar();
  equal(obj.fooCnt, 3, 'should invoke final as well');
  equal(obj.barCnt, 2, 'should invoke both');
});

QUnit.test('With concatenatedProperties', function() {
  let SomeClass = EmberObject.extend({ things: 'foo', concatenatedProperties: ['things'] });
  let AnotherClass = SomeClass.extend({ things: 'bar' });
  let YetAnotherClass = SomeClass.extend({ things: 'baz' });
  let some = SomeClass.create();
  let another = AnotherClass.create();
  let yetAnother = YetAnotherClass.create();
  deepEqual(some.get('things'), ['foo'], 'base class should have just its value');
  deepEqual(another.get('things'), ['foo', 'bar'], 'subclass should have base class\' and its own');
  deepEqual(yetAnother.get('things'), ['foo', 'baz'], 'subclass should have base class\' and its own');
});

QUnit.test('With concatenatedProperties class properties', function() {
  let SomeClass = EmberObject.extend();
  SomeClass.reopenClass({
    concatenatedProperties: ['things'],
    things: 'foo'
  });
  let AnotherClass = SomeClass.extend();
  AnotherClass.reopenClass({ things: 'bar' });
  let YetAnotherClass = SomeClass.extend();
  YetAnotherClass.reopenClass({ things: 'baz' });
  let some = SomeClass.create();
  let another = AnotherClass.create();
  let yetAnother = YetAnotherClass.create();
  deepEqual(get(some.constructor, 'things'), ['foo'], 'base class should have just its value');
  deepEqual(get(another.constructor, 'things'), ['foo', 'bar'], 'subclass should have base class\' and its own');
  deepEqual(get(yetAnother.constructor, 'things'), ['foo', 'baz'], 'subclass should have base class\' and its own');
});

