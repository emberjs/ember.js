import EmberView from "ember-views/views/view";
import Container from 'container/container';
import EmberHandlebars from 'ember-handlebars-compiler';
import htmlbarsCompile from "ember-htmlbars/system/compile";
import Component from "ember-views/views/component";
import { runAppend, runDestroy } from "ember-runtime/tests/utils";

var compile;
if (Ember.FEATURES.isEnabled('ember-htmlbars')) {
  compile = htmlbarsCompile;
} else {
  compile = EmberHandlebars.compile;
}

var container, view;

QUnit.module('ember-htmlbars: Ember.Handlebars.makeViewHelper compat', {
  setup: function() {
    container = new Container();
    container.optionsForType('helper', { instantiate: false });
  },

  teardown: function() {
    runDestroy(container);
    runDestroy(view);
  }
});

test('EmberHandlebars.makeViewHelper', function() {
  expect(1);

  var ViewHelperComponent = Component.extend({
    layout: compile('woot!')
  });
  var helper = EmberHandlebars.makeViewHelper(ViewHelperComponent);
  container.register('helper:view-helper', helper);

  view = EmberView.extend({
    template: compile('{{view-helper}}'),
    container: container
  }).create();

  runAppend(view);

  equal(view.$().text(), 'woot!');
});
