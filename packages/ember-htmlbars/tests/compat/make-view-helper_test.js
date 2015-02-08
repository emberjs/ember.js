import EmberView from "ember-views/views/view";
import Container from 'container/container';
import compile from "ember-template-compiler/system/compile";
import makeViewHelper from "ember-htmlbars/system/make-view-helper";
import Component from "ember-views/views/component";
import { runAppend, runDestroy } from "ember-runtime/tests/utils";

var container, view;

QUnit.module('ember-htmlbars: makeViewHelper compat', {
  setup: function() {
    container = new Container();
    container.optionsForType('helper', { instantiate: false });
  },

  teardown: function() {
    runDestroy(container);
    runDestroy(view);
  }
});

test('makeViewHelper', function() {
  expect(1);

  var ViewHelperComponent = Component.extend({
    layout: compile('woot!')
  });
  var helper = makeViewHelper(ViewHelperComponent);
  container.register('helper:view-helper', helper);

  view = EmberView.extend({
    template: compile('{{view-helper}}'),
    container: container
  }).create();

  runAppend(view);

  equal(view.$().text(), 'woot!');
});
