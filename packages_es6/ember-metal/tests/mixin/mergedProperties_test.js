/*globals setup */

module('Ember.Mixin mergedProperties');

test('defining mergedProperties should merge future version', function() {

  var MixinA = Ember.Mixin.create({
    mergedProperties: ['foo'],
    foo: { a: true, b: true, c: true }
  });

  var MixinB = Ember.Mixin.create({
    foo: { d: true, e: true, f: true }
  });

  var obj = Ember.mixin({}, MixinA, MixinB);
  deepEqual(Ember.get(obj, 'foo'), 
    { a: true, b: true, c: true, d: true, e: true, f: true });
});

test('defining mergedProperties on future mixin should merged into past', function() {

  var MixinA = Ember.Mixin.create({
    foo: { a: true, b: true, c: true }
  });

  var MixinB = Ember.Mixin.create({
    mergedProperties: ['foo'],
    foo: { d: true, e: true, f: true }
  });

  var obj = Ember.mixin({}, MixinA, MixinB);
  deepEqual(Ember.get(obj, 'foo'), 
    { a: true, b: true, c: true, d: true, e: true, f: true });
});

test('defining mergedProperties with null properties should keep properties null', function() {

  var MixinA = Ember.Mixin.create({
    mergedProperties: ['foo'],
    foo: null
  });

  var MixinB = Ember.Mixin.create({
    foo: null
  });

  var obj = Ember.mixin({}, MixinA, MixinB);
  equal(Ember.get(obj, 'foo'), null);
});

test("mergedProperties' properties can get overwritten", function() {

  var MixinA = Ember.Mixin.create({
    mergedProperties: ['foo'],
    foo: { a: 1 }
  });

  var MixinB = Ember.Mixin.create({
    foo: { a: 2 }
  });

  var obj = Ember.mixin({}, MixinA, MixinB);
  deepEqual(Ember.get(obj, 'foo'), { a: 2 });
});

test('mergedProperties should be concatenated', function() {

  var MixinA = Ember.Mixin.create({
    mergedProperties: ['foo'],
    foo: { a: true, b: true, c: true }
  });

  var MixinB = Ember.Mixin.create({
    mergedProperties: 'bar',
    foo: { d: true, e: true, f: true },
    bar: { a: true, l: true }
  });

  var MixinC = Ember.Mixin.create({
    bar: { e: true, x: true }
  });

  var obj = Ember.mixin({}, MixinA, MixinB, MixinC);
  deepEqual(Ember.get(obj, 'mergedProperties'), ['foo', 'bar'], 'get mergedProperties');
  deepEqual(Ember.get(obj, 'foo'), { a: true, b: true, c: true, d: true, e: true, f: true }, "get foo");
  deepEqual(Ember.get(obj, 'bar'), { a: true, l: true, e: true, x: true }, "get bar");
});

test("mergedProperties' overwriting methods can call _super", function() {

  expect(4);

  var MixinA = Ember.Mixin.create({
    mergedProperties: ['foo'],
    foo: {
      meth: function(a) {
        equal(a, "WOOT", "_super successfully called MixinA's `foo.meth` method");
        return "WAT";
      }
    }
  });

  var MixinB = Ember.Mixin.create({
    foo: {
      meth: function(a) {
        ok(true, "MixinB's `foo.meth` method called");
        return this._super.apply(this, arguments);
      }
    }
  });

  var MixinC = Ember.Mixin.create({
    foo: {
      meth: function(a) {
        ok(true, "MixinC's `foo.meth` method called");
        return this._super(a);
      }
    }
  });

  var obj = Ember.mixin({}, MixinA, MixinB, MixinC);
  equal(obj.foo.meth("WOOT"), "WAT");
});
