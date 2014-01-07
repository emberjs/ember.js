var originalFlag, originalWarn, warnings, dispatcher, view, toggleCalledWith, sendCalledWith;

function matches(msg, substr) {
  ok(msg.indexOf(substr) !== -1);
}

module("Backported action with send", {
  setup: function() {
    originalFlag = Ember.ENV.ACTION_VIA_SEND;
    originalWarn = Ember.Logger.warn;
    toggleCalledWith = [];
    sendCalledWith = [];
    warnings = [];

    Ember.Logger.warn = function(msg) {
      warnings.push(msg.replace("WARNING: ", ""));
    };

    dispatcher = Ember.EventDispatcher.create();
    dispatcher.setup();

    window.TestNamespace = window.TestNamespace || {};
    window.TestNamespace.lightswitch = {
      isState: true,

      toggle: function(arg) {
        toggleCalledWith.push(arg);
      },

      send: function(event, context) {
        sendCalledWith.push(event);
      }
    };

    view = Ember.View.create({
      template: Ember.Handlebars.compile('<a href="#" {{action "toggle" target="TestNamespace.lightswitch"}}>Flip</a>')
    });

    Ember.run(function() { view.appendTo('#qunit-fixture'); });
  },

  teardown: function() {
    Ember.ENV.ACTION_VIA_SEND = originalFlag;
    Ember.Logger.warn = originalWarn;
    Ember.run(function() {
      delete window.TestNamespace.lightswitch;
      dispatcher.destroy();
      view.destroy();
    });
  }
});

test("on null level, doesn't warn and passes to send", function() {
  Ember.ENV.ACTION_VIA_SEND = null;
  view.$('a').trigger('click');
  equal(warnings.length, 0);
  equal(sendCalledWith.length, 1);
  equal(sendCalledWith[0], 'toggle');
});

test("on warn level, warns and passes to send", function() {
  Ember.ENV.ACTION_VIA_SEND = 'warn';
  view.$('a').trigger('click');
  equal(warnings.length, 1);
  matches(warnings[0], "The action helper will not delegate to send in Ember 1.0.");
  equal(sendCalledWith.length, 1);
  equal(sendCalledWith[0], 'toggle');
});

test("on 1.0 level, doesn't warn and doesn't pass to send", function() {
  Ember.ENV.ACTION_VIA_SEND = '1.0';
  view.$('a').trigger('click');
  equal(warnings.length, 0);
  equal(sendCalledWith.length, 0);
  equal(toggleCalledWith.length, 1);
});
