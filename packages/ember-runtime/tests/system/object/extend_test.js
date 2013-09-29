var get = Ember.get;

module('Ember.Object.extend');

test('Basic extend', function() {
  var SomeClass = Ember.Object.extend({ foo: 'BAR' });
  ok(SomeClass.isClass, "A class has isClass of true");
  var obj = new SomeClass();
  equal(obj.foo, 'BAR');
});

test('Sub-subclass', function() {
  var SomeClass = Ember.Object.extend({ foo: 'BAR' });
  var AnotherClass = SomeClass.extend({ bar: 'FOO' });
  var obj = new AnotherClass();
  equal(obj.foo, 'BAR');
  equal(obj.bar, 'FOO');
});

test('Overriding a method several layers deep', function() {
  var SomeClass = Ember.Object.extend({
    fooCnt: 0,
    foo: function() { this.fooCnt++; },

    barCnt: 0,
    bar: function() { this.barCnt++; }
  });

  var AnotherClass = SomeClass.extend({
    barCnt: 0,
    bar: function() { this.barCnt++; this._super(); }
  });

  var FinalClass = AnotherClass.extend({
    fooCnt: 0,
    foo: function() { this.fooCnt++; this._super(); }
  });

  var obj = new FinalClass();
  obj.foo();
  obj.bar();
  equal(obj.fooCnt, 2, 'should invoke both');
  equal(obj.barCnt, 2, 'should invoke both');

  // Try overriding on create also
  obj = FinalClass.createWithMixins({
    foo: function() { this.fooCnt++; this._super(); }
  });

  obj.foo();
  obj.bar();
  equal(obj.fooCnt, 3, 'should invoke final as well');
  equal(obj.barCnt, 2, 'should invoke both');
});

test('With concatenatedProperties', function(){
  var SomeClass = Ember.Object.extend({ things: 'foo', concatenatedProperties: ['things'] });
  var AnotherClass = SomeClass.extend({ things: 'bar' });
  var YetAnotherClass = SomeClass.extend({ things: 'baz' });
  var some = new SomeClass();
  var another = new AnotherClass();
  var yetAnother = new YetAnotherClass();
  deepEqual(some.get('things'), ['foo'], 'base class should have just its value');
  deepEqual(another.get('things'), ['foo', 'bar'], "subclass should have base class' and it's own");
  deepEqual(yetAnother.get('things'), ['foo', 'baz'], "subclass should have base class' and it's own");
});

test('With concatenatedProperties class properties', function(){
  var SomeClass = Ember.Object.extend();
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
  deepEqual(get(another.constructor, 'things'), ['foo', 'bar'], "subclass should have base class' and it's own");
  deepEqual(get(yetAnother.constructor, 'things'), ['foo', 'baz'], "subclass should have base class' and it's own");
});

