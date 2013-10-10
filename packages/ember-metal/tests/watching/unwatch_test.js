/*globals testBoth */

require('ember-metal/~tests/props_helper');

var willCount = 0 , didCount = 0,
    willChange = Ember.propertyWillChange,
    didChange = Ember.propertyDidChange;

module('Ember.unwatch', {
  setup: function() {
    willCount = didCount = 0;
    Ember.propertyWillChange = function(cur, keyName) {
      willCount++;
      willChange.call(this, cur, keyName);
    };

    Ember.propertyDidChange = function(cur, keyName) {
      didCount++;
      didChange.call(this, cur, keyName);
    };
  },

  teardown: function() {
    Ember.propertyWillChange = willChange;
    Ember.propertyDidChange  = didChange;
  }
});

if (Ember.FEATURES.isEnabled('propertyBraceExpansion')) {
  testBoth("unwatching multiple properties specified via brace expansion", function(get, set) {
    var obj = { foo: null, bar: null, baz: null };

    Ember.watch(obj, 'foo');
    Ember.watch(obj, 'bar');
    Ember.watch(obj, 'baz');
    
    equal(Ember.isWatching(obj, 'foo'), true, "precond - initially watching foo");
    equal(Ember.isWatching(obj, 'bar'), true, "precond - initially watching bar");
    equal(Ember.isWatching(obj, 'baz'), true, "precond - initially watching baz");

    Ember.unwatch(obj, '{foo,bar,baz}');

    equal(Ember.isWatching(obj, 'foo'), false, "unwatching foo from brace expansion");
    equal(Ember.isWatching(obj, 'bar'), false, "unwatching bar from brace expansion");
    equal(Ember.isWatching(obj, 'baz'), false, "unwatching baz from brace expansion");
  });
}

testBoth('unwatching a computed property - regular get/set', function(get, set) {

  var obj = {};
  Ember.defineProperty(obj, 'foo', Ember.computed(function(keyName, value) {
    if (value !== undefined) this.__foo = value;
    return this.__foo;
  }));

  Ember.watch(obj, 'foo');
  set(obj, 'foo', 'bar');
  equal(willCount, 1, 'should have invoked willCount');
  equal(didCount, 1, 'should have invoked didCount');

  Ember.unwatch(obj, 'foo');
  willCount = didCount = 0;
  set(obj, 'foo', 'BAZ');
  equal(willCount, 0, 'should NOT have invoked willCount');
  equal(didCount, 0, 'should NOT have invoked didCount');
});


testBoth('unwatching a regular property - regular get/set', function(get, set) {

  var obj = { foo: 'BIFF' };

  Ember.watch(obj, 'foo');
  set(obj, 'foo', 'bar');
  equal(willCount, 1, 'should have invoked willCount');
  equal(didCount, 1, 'should have invoked didCount');

  Ember.unwatch(obj, 'foo');
  willCount = didCount = 0;
  set(obj, 'foo', 'BAZ');
  equal(willCount, 0, 'should NOT have invoked willCount');
  equal(didCount, 0, 'should NOT have invoked didCount');
});

test('unwatching should be nested', function() {

  var obj = { foo: 'BIFF' };

  Ember.watch(obj, 'foo');
  Ember.watch(obj, 'foo');
  Ember.set(obj, 'foo', 'bar');
  equal(willCount, 1, 'should have invoked willCount');
  equal(didCount, 1, 'should have invoked didCount');

  Ember.unwatch(obj, 'foo');
  willCount = didCount = 0;
  Ember.set(obj, 'foo', 'BAZ');
  equal(willCount, 1, 'should NOT have invoked willCount');
  equal(didCount, 1, 'should NOT have invoked didCount');

  Ember.unwatch(obj, 'foo');
  willCount = didCount = 0;
  Ember.set(obj, 'foo', 'BAZ');
  equal(willCount, 0, 'should NOT have invoked willCount');
  equal(didCount, 0, 'should NOT have invoked didCount');
});

testBoth('unwatching "length" property on an object', function(get, set) {

  var obj = { foo: 'RUN' };

  // Can watch length when it is undefined
  Ember.watch(obj, 'length');
  set(obj, 'length', '10k');
  equal(willCount, 1, 'should have invoked willCount');
  equal(didCount, 1, 'should have invoked didCount');

  // Should stop watching despite length now being defined (making object 'array-like')
  Ember.unwatch(obj, 'length');
  willCount = didCount = 0;
  set(obj, 'length', '5k');
  equal(willCount, 0, 'should NOT have invoked willCount');
  equal(didCount, 0, 'should NOT have invoked didCount');

});
