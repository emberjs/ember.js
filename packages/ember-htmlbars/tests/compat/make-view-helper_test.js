import EmberView from "ember-views/views/view";
import Container from 'container/container';
import run from "ember-metal/run_loop";
import EmberHandlebars from 'ember-handlebars-compiler';
import htmlbarsCompile from "ember-htmlbars/system/compile";
import Component from "ember-views/views/component";

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
    run(container, 'destroy');

    if (view) {
      run(view, 'destroy');
    }
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

  run(view, 'appendTo', '#qunit-fixture');

  equal(view.$().text(), 'woot!');
});
