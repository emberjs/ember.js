import makeViewHelper from 'ember-htmlbars/system/make-view-helper';
import EmberView from 'ember-views/views/view';
import { compile } from 'ember-template-compiler';
import Registry from 'container/registry';
import { runAppend, runDestroy } from 'ember-runtime/tests/utils';

import { registerKeyword, resetKeyword } from 'ember-htmlbars/tests/utils';
import viewKeyword from 'ember-htmlbars/keywords/view';

var registry, container, view, originalViewKeyword;

QUnit.module('ember-htmlbars: makeViewHelper', {
  setup() {
    originalViewKeyword = registerKeyword('view',  viewKeyword);
    registry = new Registry();
    container = registry.container();
  },
  teardown() {
    runDestroy(view);
    resetKeyword('view', originalViewKeyword);
  }
});

QUnit.test('makes helpful assertion when called with invalid arguments', function() {
  var SomeRandom = EmberView.extend({
    template: compile('Some Random Class')
  });

  SomeRandom.toString = function() {
    return 'Some Random Class';
  };

  var helper;
  expectDeprecation(function() {
    helper = makeViewHelper(SomeRandom);
  }, '`Ember.Handlebars.makeViewHelper` and `Ember.HTMLBars.makeViewHelper` are deprecated. Please refactor to normal component usage.');
  registry.register('helper:some-random', helper);

  view = EmberView.create({
    template: compile('{{some-random \'sending-params-to-view-is-invalid\'}}'),
    container
  });

  expectAssertion(function() {
    runAppend(view);
  }, 'You can only pass attributes (such as name=value) not bare values to a helper for a View found in \'Some Random Class\'');
});

QUnit.test('can properly yield', function() {
  var SomeRandom = EmberView.extend({
    layout: compile('Some Random Class - {{yield}}')
  });

  var helper;
  expectDeprecation(function() {
    helper = makeViewHelper(SomeRandom);
  }, '`Ember.Handlebars.makeViewHelper` and `Ember.HTMLBars.makeViewHelper` are deprecated. Please refactor to normal component usage.');
  registry.register('helper:some-random', helper);

  view = EmberView.create({
    template: compile('{{#some-random}}Template{{/some-random}}'),
    container
  });

  runAppend(view);

  equal(view.$().text(), 'Some Random Class - Template');
});
