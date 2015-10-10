import EmberObject from 'htmlbars-object';

QUnit.module('HTMLBarsObject.reopen');

QUnit.test('Basic extend', function() {
  var SomeClass = EmberObject.extend({ foo: 'BAR' });
  ok(SomeClass.isClass, 'A class has isClass of true');
  var obj: any = new SomeClass();
  equal(obj.foo, 'BAR');
});

QUnit.test('Sub-subclass', function() {
  var SomeClass = EmberObject.extend({ foo: 'BAR' });
  var AnotherClass = SomeClass.extend({ bar: 'FOO' });
  var obj: any = new AnotherClass();
  equal(obj.foo, 'BAR');
  equal(obj.bar, 'FOO');
});

QUnit.test('Overriding a method several layers deep', function() {
  var SomeClass = EmberObject.extend({
    fooCnt: 0,
    foo() { this.fooCnt++; },

    barCnt: 0,
    bar() { this.barCnt++; }
  });

  var AnotherClass = SomeClass.extend({
    barCnt: 0,
    bar() {
      this.barCnt++;
      this._super.apply(this, arguments);
    }
  });

  var FinalClass = AnotherClass.extend({
    fooCnt: 0,
    foo() {
      this.fooCnt++;
      this._super.apply(this, arguments);
    }
  });

  var obj: any = new FinalClass();
  obj.foo();
  obj.bar();
  equal(obj.fooCnt, 2, 'should invoke both');
  equal(obj.barCnt, 2, 'should invoke both');

  // Try overriding on create also
  obj = FinalClass.extend({
    foo() {
      this.fooCnt++;
      this._super.apply(this, arguments);
    }
  }).create();

  obj.foo();
  obj.bar();
  equal(obj.fooCnt, 3, 'should invoke final as well');
  equal(obj.barCnt, 2, 'should invoke both');
});

QUnit.test('With concatenatedProperties', function() {
  var SomeClass = EmberObject.extend({ things: 'foo', concatenatedProperties: ['things'] });
  var AnotherClass = SomeClass.extend({ things: 'bar' });
  var YetAnotherClass = SomeClass.extend({ things: 'baz' });
  var some = new SomeClass();
  var another = new AnotherClass();
  var yetAnother = new YetAnotherClass();
  deepEqual(some.get('things'), ['foo'], 'base class should have just its value');
  deepEqual(another.get('things'), ['foo', 'bar'], 'subclass should have base class\' and its own');
  deepEqual(yetAnother.get('things'), ['foo', 'baz'], 'subclass should have base class\' and its own');
});

function get(obj, key) {
  return obj[key];
}

QUnit.test('With concatenatedProperties class properties', function() {
  var SomeClass = EmberObject.extend();
  SomeClass.reopenClass({
    concatenatedProperties: ['things'],
    things: 'foo'
  });
  var AnotherClass = SomeClass.extend();
  AnotherClass.reopenClass({ things: 'bar' });
  var YetAnotherClass = SomeClass.extend();
  YetAnotherClass.reopenClass({ things: 'baz' });
  var some = new SomeClass();
  var another = new AnotherClass();
  var yetAnother = new YetAnotherClass();
  deepEqual(get(some.constructor, 'things'), ['foo'], 'base class should have just its value');
  deepEqual(get(another.constructor, 'things'), ['foo', 'bar'], 'subclass should have base class\' and its own');
  deepEqual(get(yetAnother.constructor, 'things'), ['foo', 'baz'], 'subclass should have base class\' and its own');
});
