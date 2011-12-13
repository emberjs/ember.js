/**
  This test file is designed to capture performance regressions related to
  deferred computation. Things like run loops, computed properties, and bindings
  should run the minimum amount of times to achieve best performance, so any
  bugs that cause them to get evaluated more than necessary should be put here.
*/

module("Computed Properties - Number of times evaluated");

test("computed properties that depend on multiple properties should run only once per run loop", function() {
  var obj = {a: 'a', b: 'b', c: 'c'};
  var count = 0;
  Ember.defineProperty(obj, 'abc', Ember.computed(function(key) {
    count++;
    return 'computed '+key;
  }).property('a', 'b', 'c'));

  Ember.beginPropertyChanges();
  Ember.set(obj, 'a', 'aa');
  Ember.set(obj, 'b', 'bb');
  Ember.set(obj, 'c', 'cc');
  Ember.endPropertyChanges();

  Ember.get(obj, 'abc');

  equal(count, 1, "The computed property is only invoked once");
});

test("computed properties that depend on multiple properties should run only once per run loop", function() {
  var obj = {a: 'a', b: 'b', c: 'c'};
  var cpCount = 0, obsCount = 0;

  Ember.defineProperty(obj, 'abc', Ember.computed(function(key) {
    cpCount++;
    return 'computed '+key;
  }).property('a', 'b', 'c'));

  Ember.addObserver(obj, 'abc', function() {
    obsCount++;
  });

  Ember.beginPropertyChanges();
  Ember.set(obj, 'a', 'aa');
  Ember.set(obj, 'b', 'bb');
  Ember.set(obj, 'c', 'cc');
  Ember.endPropertyChanges();

  Ember.get(obj, 'abc');

  equal(cpCount, 1, "The computed property is only invoked once");
  equal(obsCount, 1, "The observer is only invoked once");
});

test("computed properties are not executed if they are the last segment of an observer chain pain", function() {
  var foo = { bar: { baz: { } } };

  var count = 0;

  Ember.defineProperty(foo.bar.baz, 'bam', Ember.computed(function() {
    count++;
  }).property());

  Ember.addObserver(foo, 'bar.baz.bam', function() {});

  Ember.propertyDidChange(foo.bar.baz, 'bam');

  equal(count, 0, "should not have recomputed property");
});
