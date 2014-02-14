var originalLookup = Ember.lookup, lookup;
var originalLog, logCalls;
var view;

var appendView = function() {
  Ember.run(function() { view.appendTo('#qunit-fixture'); });
};


module("Handlebars {{log}} helper", {
  setup: function() {
    Ember.lookup = lookup = { Ember: Ember };

    originalLog = Ember.Logger.log;
    logCalls = [];
    Ember.Logger.log = function() { logCalls.push.apply(logCalls, arguments); };
  },

  teardown: function() {
    if (view) {
      Ember.run(function() {
        view.destroy();
      });
      view = null;
    }

    Ember.Logger.log = originalLog;
    Ember.lookup = originalLookup;
  }
});

test("should be able to log multiple properties", function() {
  var context = {
    value: 'one',
    valueTwo: 'two'
  };

  view = Ember.View.create({
    context: context,
    template: Ember.Handlebars.compile('{{log value valueTwo}}')
  });

  appendView();

  equal(view.$().text(), "", "shouldn't render any text");
  equal(logCalls[0], 'one');
  equal(logCalls[1], 'two');
});

if (Ember.FEATURES.isEnabled("ember-handlebars-log-primitives")) {
  test("should be able to log primitives", function() {
    var context = {
      value: 'one',
      valueTwo: 'two'
    };

    view = Ember.View.create({
      context: context,
      template: Ember.Handlebars.compile('{{log value "foo" 0 valueTwo true}}')
    });

    appendView();

    equal(view.$().text(), "", "shouldn't render any text");
    strictEqual(logCalls[0], 'one');
    strictEqual(logCalls[1], 'foo');
    strictEqual(logCalls[2], 0);
    strictEqual(logCalls[3], 'two');
    strictEqual(logCalls[4], true);
  });
}
