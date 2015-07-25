import EmberView from 'ember-views/views/view';
import Registry from 'container/registry';
import compile from 'ember-template-compiler/system/compile';
import makeViewHelper from 'ember-htmlbars/system/make-view-helper';
import Component from 'ember-views/views/component';
import { runAppend, runDestroy } from 'ember-runtime/tests/utils';

import { registerKeyword, resetKeyword } from 'ember-htmlbars/tests/utils';
import viewKeyword from 'ember-htmlbars/keywords/view';

var registry, container, view, originalViewKeyword;

QUnit.module('ember-htmlbars: compat - makeViewHelper compat', {
  setup() {
    originalViewKeyword = registerKeyword('view',  viewKeyword);

    registry = new Registry();
    container = registry.container();
  },

  teardown() {
    runDestroy(container);
    runDestroy(view);
    registry = container = view = null;

    resetKeyword('view', originalViewKeyword);
  }
});

QUnit.test('makeViewHelper', function() {
  expect(2);

  var ViewHelperComponent = Component.extend({
    layout: compile('woot!')
  });

  var helper;
  expectDeprecation(function() {
    helper = makeViewHelper(ViewHelperComponent);
  }, '`Ember.Handlebars.makeViewHelper` and `Ember.HTMLBars.makeViewHelper` are deprecated. Please refactor to normal component usage.');

  registry.register('helper:view-helper', helper);

  view = EmberView.extend({
    template: compile('{{view-helper}}'),
    container: container
  }).create();

  runAppend(view);

  equal(view.$().text(), 'woot!');
});
