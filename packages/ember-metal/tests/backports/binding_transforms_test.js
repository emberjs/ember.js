var originalFlag, originalWarn, warnings;

function matches(msg, substr) {
  ok(msg.indexOf(substr) !== -1);
}

module("Backported binding transforms", {
  setup: function() {
    originalFlag = Ember.ENV.BINDING_TRANSFORMS;
    originalWarn = Ember.Logger.warn;
    warnings = [];
    Ember.Logger.warn = function(msg) {
      warnings.push(msg.replace("WARNING: ", ""));
    };
  },
  teardown: function() {
    Ember.ENV.BINDING_TRANSFORMS = originalFlag;
    Ember.Logger.warn = originalWarn;
  }
});

test("warns on usage of Binding#transform in warn level", function() {
  Ember.ENV.BINDING_TRANSFORMS = 'warn';
  new Ember.Binding('foo.value', 'bar.value').transform({ from: function() {}, to: function() {} });
  equal(warnings.length, 1);
  matches(warnings[0], "Binding transforms have been removed from Ember 1.0. (bar.value -> foo.value)");
});

test("throws on usage of Binding#transform in 1.0 level", function() {
  Ember.ENV.BINDING_TRANSFORMS = '1.0';

  raises(function() {
    new Ember.Binding('foo.value', 'bar.value').transform({ from: function() {}, to: function() {} });
  }, /Binding transforms have been removed from Ember 1\.0\./);
});