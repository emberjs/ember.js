var originalFlag, originalWarn, warnings, dispatcher, view, actionCalledWith;

function matches(msg, substr) {
  ok(msg.indexOf(substr) !== -1);
}

module("Backported action helper arguments", {
  setup: function() {
    originalFlag = Ember.ENV.ACTION_ARGUMENTS;
    originalWarn = Ember.Logger.warn;
    warnings = [];
    Ember.Logger.warn = function(msg) {
      warnings.push(msg.replace("WARNING: ", ""));
    };

    dispatcher = Ember.EventDispatcher.create();
    dispatcher.setup();

    view = Ember.View.create({
      template: Ember.Handlebars.compile('<a href="#" {{action "engage"}}>Engage!</a>'),
      engage: function(event) { actionCalledWith = [].slice.call(arguments); }
    });
    Ember.run(function() { view.appendTo('#qunit-fixture'); });
    actionCalledWith = undefined;
  },
  teardown: function() {
    Ember.ENV.ACTION_ARGUMENTS = originalFlag;
    Ember.Logger.warn = originalWarn;
    Ember.run(function() {
      dispatcher.destroy();
      view.destroy();
    });
  }
});

test("on null level, doesn't warn and passes an event", function() {
  Ember.ENV.ACTION_ARGUMENTS = null;
  view.$('a').trigger('click');
  equal(warnings.length, 0);
  equal(actionCalledWith.length, 1);
  ok(actionCalledWith[0] instanceof Ember.$.Event);
});

test("on warn level, warns and passes an event", function() {
  Ember.ENV.ACTION_ARGUMENTS = 'warn';
  view.$('a').trigger('click');
  equal(warnings.length, 1);
  matches(warnings[0], "The action helper will not pass a jQuery event in Ember 1.0.");
  equal(actionCalledWith.length, 1);
  ok(actionCalledWith[0] instanceof Ember.$.Event);
});

test("on error level, throws an error if the action expects and argument", function() {
  Ember.ENV.ACTION_ARGUMENTS = '1.0-compat';
  raises(function() {
    view.$('a').trigger('click');
  }, /The action helper will not pass a jQuery event in Ember 1\.0\./);
});

test("on error level, doesn't pass an event", function() {
  Ember.ENV.ACTION_ARGUMENTS = '1.0-compat';
  view.engage = function() { actionCalledWith = [].slice.call(arguments); };
  view.$('a').trigger('click');
  equal(actionCalledWith.length, 0);
});
