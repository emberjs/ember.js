import run from 'ember-metal/run_loop';
import Ember from 'ember-metal/core';
import EmberView from 'ember-views/views/view';
import EmberHandlebars from 'ember-handlebars';
import htmlbarsCompile from 'ember-htmlbars/system/compile';

var originalLookup, originalLog, logCalls, lookup, view, compile;

if (Ember.FEATURES.isEnabled('ember-htmlbars')) {
  compile = htmlbarsCompile;
} else {
  compile = EmberHandlebars.compile;
}

var appendView = function(view) {
  run(view, 'appendTo', '#qunit-fixture');
};

QUnit.module('ember-htmlbars: {{#log}} helper', {
  setup: function() {
    Ember.lookup = lookup = { Ember: Ember };

    originalLog = Ember.Logger.log;
    logCalls = [];
    Ember.Logger.log = function(arg) {
      logCalls.push(arg);
    };
  },

  teardown: function() {
    run(function() {
      view.destroy();
    });

    view = null;

    Ember.Logger.log = originalLog;
    Ember.lookup = originalLookup;
  }
});

test('should be able to log a property', function() {
  var context = {
    value: 'one'
  };

  view = EmberView.create({
    context: context,
    template: compile('{{log value}}')
  });

  appendView(view);

  equal(view.$().text(), '', 'shouldn\'t render any text');
  equal(logCalls[0], 'one', 'should call log with value');
});

test('should be able to log a view property', function() {
  view = EmberView.create({
    template: compile('{{log view.value}}'),
    value: 'one'
  });

  appendView(view);

  equal(view.$().text(), '', 'shouldn\'t render any text');
  equal(logCalls[0], 'one', 'should call log with value');
});

test('should be able to log `this`', function() {
  view = EmberView.create({
    context: 'one',
    template: compile('{{log this}}'),
  });

  appendView(view);

  equal(view.$().text(), '', 'shouldn\'t render any text');
  equal(logCalls[0], 'one', 'should call log with item one');
});
