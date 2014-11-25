import run from 'ember-metal/run_loop';
import Ember from 'ember-metal/core';
import EmberView from 'ember-views/views/view';
import EmberHandlebars from 'ember-handlebars-compiler';
import htmlbarsCompile from 'ember-htmlbars/system/compile';

var compile, view, originalLookup, lookup;

if (Ember.FEATURES.isEnabled('ember-htmlbars')) {
  compile = htmlbarsCompile;
} else {
  compile = EmberHandlebars.compile;
}

var originalLookup = Ember.lookup;

function appendView(view) {
  run(view, 'appendTo', '#qunit-fixture');
}

QUnit.module('ember-htmlbars: Integration with Globals', {
  setup: function() {
    Ember.lookup = lookup = {};
  },

  teardown: function() {
    run(function() {
      if (view) {
        view.destroy();
      }

      view = null;
    });

    Ember.lookup = lookup = originalLookup;
  }
});

test('should read from globals (DEPRECATED)', function() {
  Ember.lookup.Global = 'Klarg';
  view = EmberView.create({
    template: compile('{{Global}}')
  });

  expectDeprecation(function(){
    appendView(view);
  }, 'Global lookup of Global from a Handlebars template is deprecated.');

  equal(view.$().text(), Ember.lookup.Global);
});

test('should read from globals with a path (DEPRECATED)', function() {
  Ember.lookup.Global = { Space: 'Klarg' };
  view = EmberView.create({
    template: compile('{{Global.Space}}')
  });

  expectDeprecation(function(){
    appendView(view);
  }, 'Global lookup of Global.Space from a Handlebars template is deprecated.');
  equal(view.$().text(), Ember.lookup.Global.Space);
});

test('with context, should read from globals (DEPRECATED)', function() {
  Ember.lookup.Global = 'Klarg';
  view = EmberView.create({
    context: {},
    template: compile('{{Global}}')
  });

  expectDeprecation(function(){
    appendView(view);
  }, 'Global lookup of Global from a Handlebars template is deprecated.');
  equal(view.$().text(), Ember.lookup.Global);
});

test('with context, should read from globals with a path (DEPRECATED)', function() {
  Ember.lookup.Global = { Space: 'Klarg' };
  view = EmberView.create({
    context: {},
    template: compile('{{Global.Space}}')
  });

  expectDeprecation(function(){
    appendView(view);
  }, 'Global lookup of Global.Space from a Handlebars template is deprecated.');
  equal(view.$().text(), Ember.lookup.Global.Space);
});
