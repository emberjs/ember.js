var originalFlag, originalWarn, warnings;

function matches(msg, substr) {
  ok(msg.indexOf(substr) !== -1);
}

module("Backported Ember.Handlebars.getPath", {
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

test("get does not warn in 0.9 mode", function() {
  Ember.ENV.ACCESSORS = null;
  var o = { foo: { 'bar': 'baz' } };
  Ember.Handlebars.getPath(o, 'foo.bar');
  equal(warnings.length, 0);
});

test("doesn't warn in 1.0-no-warn mode", function() {
  Ember.ENV.ACCESSORS = "1.0-no-warn";
  var o = { foo: { 'bar': 'baz' } };
  Ember.Handlebars.getPath(o, 'foo.bar');
  equal(warnings.length, 0);
});

test("warns on usage in 1.0 mode", function() {
  Ember.ENV.ACCESSORS = "1.0";
  var o = { foo: { 'bar': 'baz' } };
  Ember.Handlebars.getPath(o, 'foo.bar');
  equal(warnings.length, 1);
  matches(warnings[0], "DEPRECATION: getPath is deprecated since get now supports paths");
});
