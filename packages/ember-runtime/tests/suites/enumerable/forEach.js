require('ember-runtime/~tests/suites/enumerable');

var suite = Ember.EnumerableTests, global = this;

suite.module('forEach');

suite.test('forEach should iterate over list', function() {
  var obj = this.newObject(),
      ary = this.toArray(obj),
      found = [];

  obj.forEach(function(i) { found.push(i); });
  deepEqual(found, ary, 'items passed during forEach should match');
});


suite.test('forEach should iterate over list after mutation', function() {
  if (Ember.get(this, 'canTestMutation')) {
    expect(0);
    return ;
  }

  var obj = this.newObject(),
      ary = this.toArray(obj),
      found = [];

  obj.forEach(function(i) { found.push(i); });
  deepEqual(found, ary, 'items passed during forEach should match');

  this.mutate(obj);
  ary = this.toArray(obj);
  found = [];

  obj.forEach(function(i) { found.push(i); });
  deepEqual(found, ary, 'items passed during forEach should match');
});

suite.test('2nd target parameter', function() {
  var obj = this.newObject(), target = this;

  obj.forEach(function() {
    equal(Ember.guidFor(this), Ember.guidFor(global), 'should pass the global object as this if no context');
  });

  obj.forEach(function() {
    equal(Ember.guidFor(this), Ember.guidFor(target), 'should pass target as this if context');
  }, target);

});


suite.test('callback params', function() {
  var obj = this.newObject(),
      ary = this.toArray(obj),
      loc = 0;


  obj.forEach(function(item, idx, enumerable) {
    equal(item, ary[loc], 'item param');
    equal(idx, loc, 'idx param');
    equal(Ember.guidFor(enumerable), Ember.guidFor(obj), 'enumerable param');
    loc++;
  });

});
