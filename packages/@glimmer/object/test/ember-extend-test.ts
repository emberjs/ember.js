import EmberObject from '@glimmer/object';

QUnit.module('GlimmerObject.extend');

QUnit.test('Basic extend', assert => {
  let SomeClass = EmberObject.extend({ foo: 'BAR' });
  assert.ok(SomeClass.isClass, 'A class has isClass of true');
  let obj: any = new SomeClass();
  assert.equal(obj.foo, 'BAR');
});

QUnit.test('Sub-subclass', assert => {
  let SomeClass = EmberObject.extend({ foo: 'BAR' });
  let AnotherClass = SomeClass.extend({ bar: 'FOO' });
  let obj: any = new AnotherClass();
  assert.equal(obj.foo, 'BAR');
  assert.equal(obj.bar, 'FOO');
});

QUnit.test('Overriding a method several layers deep', assert => {
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
      this._super.apply(this, arguments);
    }
  });

  let FinalClass = AnotherClass.extend({
    fooCnt: 0,
    foo() {
      this.fooCnt++;
      this._super.apply(this, arguments);
    }
  });

  let obj: any = new FinalClass();
  obj.foo();
  obj.bar();
  assert.equal(obj.fooCnt, 2, 'should invoke both');
  assert.equal(obj.barCnt, 2, 'should invoke both');

  // Try overriding on create also
  obj = FinalClass.extend({
    foo() {
      this.fooCnt++;
      this._super.apply(this, arguments);
    }
  }).create();

  obj.foo();
  obj.bar();
  assert.equal(obj.fooCnt, 3, 'should invoke final as well');
  assert.equal(obj.barCnt, 2, 'should invoke both');
});

QUnit.test('With concatenatedProperties', assert => {
  let SomeClass = EmberObject.extend({ things: 'foo', concatenatedProperties: ['things'] });
  let AnotherClass = SomeClass.extend({ things: 'bar' });
  let YetAnotherClass = SomeClass.extend({ things: 'baz' });
  let some = new SomeClass();
  let another = new AnotherClass();
  let yetAnother = new YetAnotherClass();
  assert.deepEqual(some.get('things'), ['foo'], 'base class should have just its value');
  assert.deepEqual(another.get('things'), ['foo', 'bar'], 'subclass should have base class\' and its own');
  assert.deepEqual(yetAnother.get('things'), ['foo', 'baz'], 'subclass should have base class\' and its own');
});

function get(obj, key) {
  return obj[key];
}

QUnit.test('With concatenatedProperties class properties', assert => {
  let SomeClass = EmberObject.extend();
  SomeClass.reopenClass({
    concatenatedProperties: ['things'],
    things: 'foo'
  });
  let AnotherClass = SomeClass.extend();
  AnotherClass.reopenClass({ things: 'bar' });
  let YetAnotherClass = SomeClass.extend();
  YetAnotherClass.reopenClass({ things: 'baz' });
  let some = new SomeClass();
  let another = new AnotherClass();
  let yetAnother = new YetAnotherClass();
  assert.deepEqual(get(some.constructor, 'things'), ['foo'], 'base class should have just its value');
  assert.deepEqual(get(another.constructor, 'things'), ['foo', 'bar'], 'subclass should have base class\' and its own');
  assert.deepEqual(get(yetAnother.constructor, 'things'), ['foo', 'baz'], 'subclass should have base class\' and its own');
});
