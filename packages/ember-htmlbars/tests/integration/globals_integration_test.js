import Ember from 'ember-metal/core';
import EmberView from 'ember-views/views/view';
import compile from 'ember-template-compiler/system/compile';
import { runAppend, runDestroy } from "ember-runtime/tests/utils";

var view, originalLookup, lookup;

var originalLookup = Ember.lookup;

QUnit.module('ember-htmlbars: Integration with Globals', {
  setup: function() {
    Ember.lookup = lookup = {};
  },

  teardown: function() {
    runDestroy(view);
    view = null;

    Ember.lookup = lookup = originalLookup;
  }
});

QUnit.test('should read from globals (DEPRECATED)', function() {
  Ember.lookup.Global = 'Klarg';
  view = EmberView.create({
    template: compile('{{Global}}')
  });

  expectDeprecation(function() {
    runAppend(view);
  }, 'Global lookup of Global from a Handlebars template is deprecated.');

  equal(view.$().text(), Ember.lookup.Global);
});

QUnit.test('should read from globals with a path (DEPRECATED)', function() {
  Ember.lookup.Global = { Space: 'Klarg' };
  view = EmberView.create({
    template: compile('{{Global.Space}}')
  });

  expectDeprecation(function() {
    runAppend(view);
  }, 'Global lookup of Global.Space from a Handlebars template is deprecated.');
  equal(view.$().text(), Ember.lookup.Global.Space);
});

QUnit.test('with context, should read from globals (DEPRECATED)', function() {
  Ember.lookup.Global = 'Klarg';
  view = EmberView.create({
    context: {},
    template: compile('{{Global}}')
  });

  expectDeprecation(function() {
    runAppend(view);
  }, 'Global lookup of Global from a Handlebars template is deprecated.');
  equal(view.$().text(), Ember.lookup.Global);
});

QUnit.test('with context, should read from globals with a path (DEPRECATED)', function() {
  Ember.lookup.Global = { Space: 'Klarg' };
  view = EmberView.create({
    context: {},
    template: compile('{{Global.Space}}')
  });

  expectDeprecation(function() {
    runAppend(view);
  }, 'Global lookup of Global.Space from a Handlebars template is deprecated.');
  equal(view.$().text(), Ember.lookup.Global.Space);
});
