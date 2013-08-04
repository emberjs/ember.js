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


