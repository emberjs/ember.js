var originalFlag, originalWarn, warnings;

function matches(msg, substr) {
  ok(msg.indexOf(substr) !== -1);
}

module("Backported accessors", {
  setup: function() {
    originalFlag = Ember.ENV.ACCESSORS;
    originalWarn = Ember.Logger.warn;
    warnings = [];
    Ember.Logger.warn = function(msg) {
      warnings.push(msg.replace("WARNING: ", ""));
    };
  },
  teardown: function() {
    Ember.ENV.ACCESSORS = originalFlag;
    Ember.Logger.warn = originalWarn;
  }
});

test("get does not warn on keys with dots in 0.9 mode", function() {
  Ember.ENV.ACCESSORS = null;
  var o = { 'foo.bar': 'baz' };
  Ember.get(o, 'foo.bar');
  equal(warnings.length, 0);
});

test("get warns with dots in key name on the 0.9 mode with warnings", function() {
  Ember.ENV.ACCESSORS = '0.9-dotted-properties';
  var o = { 'foo.bar': 'baz' };
  equal(Ember.get(o, 'foo.bar'), 'baz');
  equal(warnings.length, 1);
  matches(warnings[0], "The behavior of `get` has changed in Ember 1.0. It will no longer support keys with periods in them.");
});

test("set warns with dots in key name on the 0.9 mode with warnings", function() {
  Ember.ENV.ACCESSORS = '0.9-dotted-properties';
  var o = { 'foo.bar': 'baz' };
  Ember.set(o, 'foo.bar', 'baz');
  equal(warnings.length, 1);
  matches(warnings[0], "The behavior of `set` has changed in Ember 1.0. It will no longer support keys with periods in them.");
});

test("getPath warns on the 1.0 mode", function() {
  Ember.ENV.ACCESSORS = '1.0';
  var o = { foo: {bar: 'baz'} };
  equal(Ember.getPath(o, 'foo.bar'), 'baz');
  equal(warnings.length, 1);
  matches(warnings[0], "DEPRECATION: getPath is deprecated since get now supports paths");
});

test("setPath warns on the 1.0 mode", function() {
  Ember.ENV.ACCESSORS = '1.0';
  var o = { foo: {bar: 'baz'} };
  Ember.setPath(o, 'foo.bar', 'qux');
  equal(warnings.length, 1);
  matches(warnings[0], "DEPRECATION: setPath is deprecated since set now supports paths");
});

test("get follows paths on the 1.0 mode", function() {
  Ember.ENV.ACCESSORS = '1.0';
  var o = { foo: {bar: 'baz'} };
  equal(Ember.get(o, 'foo.bar'), 'baz');
  equal(warnings.length, 0);
});

test("set follows paths on the 1.0 mode", function() {
  Ember.ENV.ACCESSORS = '1.0';
  var o = { foo: {bar: 'baz'} };
  Ember.set(o, 'foo.bar', 'qux');
  equal(o.foo.bar, 'qux');
  equal(warnings.length, 0);
});

test("trySetPath warns on the 1.0 mode", function() {
  Ember.ENV.ACCESSORS = '1.0';
  var o = { foo: {bar: 'baz'} };
  Ember.trySetPath(o, 'foo.bar', 'qux');
  equal(o.foo.bar, 'qux');
  equal(warnings.length, 1);
  matches(warnings[0], "DEPRECATION: trySetPath has been renamed to trySet");
});

test("trySet exists and follows paths", function() {
  Ember.ENV.ACCESSORS = '1.0';
  var o = { foo: {bar: 'baz'} };
  Ember.trySet(o, 'foo.bar', 'qux');
  equal(o.foo.bar, 'qux');
  equal(warnings.length, 0);
});