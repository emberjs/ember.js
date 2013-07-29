var originalFlag, originalWarn, warnings;

module("Backported Ember.ViewState", {
  setup: function() {
    originalFlag = Ember.ENV.VIEW_STATE;
    originalWarn = Ember.Logger.warn;
    warnings = [];
    Ember.Logger.warn = function(msg) {
      warnings.push(msg.replace("WARNING: ", ""));
    };
  },
  teardown: function() {
    Ember.ENV.VIEW_STATE = originalFlag;
    Ember.Logger.warn = originalWarn;
  }
});

test("doesn't warn on null level", function() {
  Ember.ENV.VIEW_STATE = null;

  Ember.ViewState.extend();
  Ember.ViewState.create();
  equal(warnings.length, 0);
});

test("warns on warn level", function() {
  Ember.ENV.VIEW_STATE = 'warn';

  Ember.ViewState.extend();
  equal(warnings.length, 1);
  equal(warnings[0], "Ember.ViewState has been removed from Ember 1.0.");
  Ember.ViewState.create();
  equal(warnings.length, 2);
  equal(warnings[1], "Ember.ViewState has been removed from Ember 1.0.");
});

test("throws on error level", function() {
  Ember.ENV.VIEW_STATE = '1.0';

  raises(function() {
    Ember.ViewState.extend();
  }, /Ember\.ViewState has been removed from Ember 1\.0\./);

  raises(function() {
    Ember.ViewState.create();
  }, /Ember\.ViewState has been removed from Ember 1\.0\./);
});