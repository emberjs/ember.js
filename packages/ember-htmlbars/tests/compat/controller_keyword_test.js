import EmberComponent from 'ember-views/components/component';
import { runAppend, runDestroy } from 'ember-runtime/tests/utils';
import compile from 'ember-template-compiler/system/compile';

import { registerAstPlugin, removeAstPlugin } from 'ember-htmlbars/tests/utils';
import TransformEachIntoCollection from 'ember-template-compiler/plugins/transform-each-into-collection';
import DeprecateViewAndControllerPaths from 'ember-template-compiler/plugins/deprecate-view-and-controller-paths';

let component;

QUnit.module('ember-htmlbars: compat - controller keyword (use as a path)', {
  setup() {
    registerAstPlugin(TransformEachIntoCollection);
    registerAstPlugin(DeprecateViewAndControllerPaths);

    component = null;
  },
  teardown() {
    runDestroy(component);

    removeAstPlugin(TransformEachIntoCollection);
    removeAstPlugin(DeprecateViewAndControllerPaths);
  }
});

QUnit.test('reading the controller keyword is deprecated [DEPRECATED]', function() {
  var text = 'a-prop';
  expectDeprecation(function() {
    component = EmberComponent.extend({
      prop: text,
      layout: compile('{{controller.prop}}')
    }).create();

    runAppend(component);
  }, /Using `{{controller}}` or any path based on it .* has been deprecated./);
  equal(component.$().text(), text, 'controller keyword is read');
});

QUnit.test('reading the controller keyword for hash is deprecated [DEPRECATED]', function() {
  expectDeprecation(function() {
    component = EmberComponent.extend({
      prop: true,
      layout: compile('{{if true \'hiho\' option=controller.prop}}')
    }).create();

    runAppend(component);
  }, /Using `{{controller}}` or any path based on it .* has been deprecated./);
});

QUnit.test('reading the controller keyword for param is deprecated [DEPRECATED]', function() {
  var text = 'a-prop';
  expectDeprecation(function() {
    component = EmberComponent.extend({
      prop: true,
      layout: compile(`{{if controller.prop '${text}'}}`)
    }).create();

    runAppend(component);
  }, /Using `{{controller}}` or any path based on it .* has been deprecated./);
  equal(component.$().text(), text, 'controller keyword is read');
});

QUnit.test('reading the controller keyword for param with block is deprecated [DEPRECATED]', function() {
  expectDeprecation(function() {
    component = EmberComponent.extend({
      prop: true,
      layout: compile(`{{#each controller as |things|}}{{/each}}`)
    }).create();

    runAppend(component);
  }, /Using `{{controller}}` or any path based on it .* has been deprecated./);
});
