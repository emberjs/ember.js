import Ember from "ember-metal/core"; // Ember.lookup
import EmberLogger from "ember-metal/logger";
import run from "ember-metal/run_loop";
import {View as EmberView} from "ember-views/views/view";
import EmberHandlebars from "ember-handlebars-compiler";
import {logHelper} from "ember-handlebars/helpers/debug";

var originalLookup = Ember.lookup, lookup;
var originalLog, logCalls;
var originalLogHelper;
var view;

var appendView = function() {
  run(function() { view.appendTo('#qunit-fixture'); });
};


module("Handlebars {{log}} helper", {
  setup: function() {
    Ember.lookup = lookup = { Ember: Ember };

    originalLogHelper = EmberHandlebars.helpers.log;
    EmberHandlebars.registerHelper("log", logHelper);

    originalLog = EmberLogger.log;
    logCalls = [];
    EmberLogger.log = function() { logCalls.push.apply(logCalls, arguments); };
  },

  teardown: function() {
    if (view) {
      run(function() {
        view.destroy();
      });
      view = null;
    }

    EmberLogger.log = originalLog;
    EmberHandlebars.helpers.log = originalLogHelper;
    Ember.lookup = originalLookup;
  }
});

test("should be able to log multiple properties", function() {
  var context = {
    value: 'one',
    valueTwo: 'two'
  };

  view = EmberView.create({
    context: context,
    template: EmberHandlebars.compile('{{log value valueTwo}}')
  });

  appendView();

  equal(view.$().text(), "", "shouldn't render any text");
  equal(logCalls[0], 'one');
  equal(logCalls[1], 'two');
});

test("should be able to log primitives", function() {
  var context = {
    value: 'one',
    valueTwo: 'two'
  };

  view = EmberView.create({
    context: context,
    template: EmberHandlebars.compile('{{log value "foo" 0 valueTwo true}}')
  });

  appendView();

  equal(view.$().text(), "", "shouldn't render any text");
  strictEqual(logCalls[0], 'one');
  strictEqual(logCalls[1], 'foo');
  strictEqual(logCalls[2], 0);
  strictEqual(logCalls[3], 'two');
  strictEqual(logCalls[4], true);
});
