import Ember from 'ember-metal/core';
import EmberComponent from 'ember-views/components/component';
import { runAppend, runDestroy } from 'ember-runtime/tests/utils';
import compile from 'ember-template-compiler/system/compile';

import { registerAstPlugin, removeAstPlugin } from 'ember-htmlbars/tests/utils';
import TransformEachIntoCollection from 'ember-template-compiler/plugins/transform-each-into-collection';
import AssertNoViewAndControllerPaths from 'ember-template-compiler/plugins/assert-no-view-and-controller-paths';

let component;

QUnit.module('ember-htmlbars: compat - controller keyword (use as a path)', {
  setup() {
    Ember.ENV._ENABLE_LEGACY_CONTROLLER_SUPPORT = false;
    registerAstPlugin(AssertNoViewAndControllerPaths);

    component = null;
  },
  teardown() {
    runDestroy(component);

    removeAstPlugin(AssertNoViewAndControllerPaths);
    Ember.ENV._ENABLE_LEGACY_CONTROLLER_SUPPORT = true;
  }
});

QUnit.test('reading the controller keyword fails assertion', function() {
  var text = 'a-prop';
  expectAssertion(function() {
    component = EmberComponent.extend({
      prop: text,
      layout: compile('{{controller.prop}}')
    }).create();

    runAppend(component);
  }, /Using `{{controller}}` or any path based on it .*/);
});

QUnit.module('ember-htmlbars: compat - controller keyword (use as a path) [LEGACY]', {
  setup() {
    registerAstPlugin(TransformEachIntoCollection);

    component = null;
  },
  teardown() {
    runDestroy(component);

    removeAstPlugin(TransformEachIntoCollection);
  }
});

QUnit.test('reading the controller keyword works [LEGACY]', function() {
  var text = 'a-prop';
  ignoreAssertion(function() {
    component = EmberComponent.extend({
      prop: text,
      layout: compile('{{controller.prop}}')
    }).create();
  }, /Using `{{controller}}` or any path based on it .*/);

  runAppend(component);
  equal(component.$().text(), text, 'controller keyword is read');
});

QUnit.test('reading the controller keyword for hash [LEGACY]', function() {
  ignoreAssertion(function() {
    component = EmberComponent.extend({
      prop: true,
      layout: compile('{{if true \'hiho\' option=controller.prop}}')
    }).create();

    runAppend(component);
  }, /Using `{{controller}}` or any path based on it .*/);
  ok(true, 'access keyword');
});

QUnit.test('reading the controller keyword for param [LEGACY]', function() {
  var text = 'a-prop';
  ignoreAssertion(function() {
    component = EmberComponent.extend({
      prop: true,
      layout: compile(`{{if controller.prop '${text}'}}`)
    }).create();

    runAppend(component);
  }, /Using `{{controller}}` or any path based on it .*/);
  equal(component.$().text(), text, 'controller keyword is read');
});

QUnit.test('reading the controller keyword for param with block fails assertion [LEGACY]', function() {
  ignoreAssertion(function() {
    component = EmberComponent.extend({
      prop: true,
      layout: compile(`{{#each controller as |things|}}{{/each}}`)
    }).create();

    runAppend(component);
  }, /Using `{{controller}}` or any path based on it .*/);
  ok(true, 'access keyword');
});
