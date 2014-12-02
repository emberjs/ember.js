import Ember from "ember-metal/core"; // Ember.lookup
import EmberLogger from "ember-metal/logger";
import EmberView from "ember-views/views/view";
import EmberHandlebars from "ember-handlebars-compiler";
import htmlbarsCompile from "ember-htmlbars/system/compile";

import { appendView, destroyView } from "ember-views/tests/view_helpers";

var compile;
if (Ember.FEATURES.isEnabled('ember-htmlbars')) {
  compile = htmlbarsCompile;
} else {
  compile = EmberHandlebars.compile;
}

var originalLookup = Ember.lookup;
var lookup;
var originalLog, logCalls;
var view;

QUnit.module("Handlebars {{log}} helper", {
  setup: function() {
    Ember.lookup = lookup = { Ember: Ember };

    originalLog = EmberLogger.log;
    logCalls = [];
    EmberLogger.log = function() { logCalls.push.apply(logCalls, arguments); };
  },

  teardown: function() {
    destroyView(view);
    view = null;

    EmberLogger.log = originalLog;
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
    template: compile('{{log value valueTwo}}')
  });

  appendView(view);

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
    template: compile('{{log value "foo" 0 valueTwo true}}')
  });

  appendView(view);

  equal(view.$().text(), "", "shouldn't render any text");
  strictEqual(logCalls[0], 'one');
  strictEqual(logCalls[1], 'foo');
  strictEqual(logCalls[2], 0);
  strictEqual(logCalls[3], 'two');
  strictEqual(logCalls[4], true);
});
