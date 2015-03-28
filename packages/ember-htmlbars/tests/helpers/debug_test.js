import Ember from "ember-metal/core"; // Ember.lookup
import EmberLogger from "ember-metal/logger";
import EmberView from "ember-views/views/view";
import compile from "ember-template-compiler/system/compile";

import { runAppend, runDestroy } from "ember-runtime/tests/utils";

var originalLookup = Ember.lookup;
var lookup;
var originalLog, logCalls;
var view;

QUnit.module("Handlebars {{log}} helper", {
  setup() {
    Ember.lookup = lookup = { Ember: Ember };

    originalLog = EmberLogger.log;
    logCalls = [];
    EmberLogger.log = function() { logCalls.push.apply(logCalls, arguments); };
  },

  teardown() {
    runDestroy(view);
    view = null;

    EmberLogger.log = originalLog;
    Ember.lookup = originalLookup;
  }
});

QUnit.test("should be able to log multiple properties", function() {
  var context = {
    value: 'one',
    valueTwo: 'two'
  };

  view = EmberView.create({
    context: context,
    template: compile('{{log value valueTwo}}')
  });

  runAppend(view);

  equal(view.$().text(), "", "shouldn't render any text");
  equal(logCalls[0], 'one');
  equal(logCalls[1], 'two');
});

QUnit.test("should be able to log primitives", function() {
  var context = {
    value: 'one',
    valueTwo: 'two'
  };

  view = EmberView.create({
    context: context,
    template: compile('{{log value "foo" 0 valueTwo true}}')
  });

  runAppend(view);

  equal(view.$().text(), "", "shouldn't render any text");
  strictEqual(logCalls[0], 'one');
  strictEqual(logCalls[1], 'foo');
  strictEqual(logCalls[2], 0);
  strictEqual(logCalls[3], 'two');
  strictEqual(logCalls[4], true);
});
