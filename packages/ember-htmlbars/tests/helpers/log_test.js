import Ember from 'ember-metal/core';
import EmberView from 'ember-views/views/view';
import compile from 'ember-template-compiler/system/compile';
import { runAppend, runDestroy } from "ember-runtime/tests/utils";

var originalLookup, originalLog, logCalls, lookup, view;

QUnit.module('ember-htmlbars: {{#log}} helper', {
  setup() {
    Ember.lookup = lookup = { Ember: Ember };

    originalLog = Ember.Logger.log;
    logCalls = [];
    Ember.Logger.log = function(arg) {
      logCalls.push(arg);
    };
  },

  teardown() {
    runDestroy(view);

    view = null;

    Ember.Logger.log = originalLog;
    Ember.lookup = originalLookup;
  }
});

QUnit.test('should be able to log a property', function() {
  var context = {
    value: 'one'
  };

  view = EmberView.create({
    context: context,
    template: compile('{{log value}}')
  });

  runAppend(view);

  equal(view.$().text(), '', 'shouldn\'t render any text');
  equal(logCalls[0], 'one', 'should call log with value');
});

QUnit.test('should be able to log a view property', function() {
  view = EmberView.create({
    template: compile('{{log view.value}}'),
    value: 'one'
  });

  runAppend(view);

  equal(view.$().text(), '', 'shouldn\'t render any text');
  equal(logCalls[0], 'one', 'should call log with value');
});

QUnit.test('should be able to log `this`', function() {
  view = EmberView.create({
    context: 'one',
    template: compile('{{log this}}')
  });

  runAppend(view);

  equal(view.$().text(), '', 'shouldn\'t render any text');
  equal(logCalls[0], 'one', 'should call log with item one');
});
