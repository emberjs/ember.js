import Ember from "ember-metal/core"; // Ember.lookup
import _MetamorphView from "ember-views/views/metamorph_view";
import EmberView from "ember-views/views/view";
import handlebarsGet from "ember-htmlbars/compat/handlebars-get";
import { Registry } from "ember-runtime/system/container";
import { runAppend, runDestroy } from "ember-runtime/tests/utils";

import EmberHandlebars from "ember-htmlbars/compat";

var compile = EmberHandlebars.compile;

var originalLookup = Ember.lookup;
var TemplateTests, registry, container, lookup, view;

QUnit.module("ember-htmlbars: Ember.Handlebars.get", {
  setup() {
    Ember.lookup = lookup = {};
    registry = new Registry();
    container = registry.container();
    registry.optionsForType('template', { instantiate: false });
    registry.optionsForType('helper', { instantiate: false });
    registry.register('view:default', _MetamorphView);
    registry.register('view:toplevel', EmberView.extend());
  },

  teardown() {
    runDestroy(container);
    runDestroy(view);
    registry = container = view = null;

    Ember.lookup = lookup = originalLookup;
    TemplateTests = null;
  }
});

QUnit.test('it can lookup a path from the current context', function() {
  expect(1);

  registry.register('helper:handlebars-get', function(path, options) {
    var context = options.contexts && options.contexts[0] || this;

    ignoreDeprecation(function() {
      equal(handlebarsGet(context, path, options), 'bar');
    });
  });

  view = EmberView.create({
    container: container,
    controller: {
      foo: 'bar'
    },
    template: compile('{{handlebars-get "foo"}}')
  });

  runAppend(view);
});

QUnit.test('it can lookup a path from the current keywords', function() {
  expect(1);

  registry.register('helper:handlebars-get', function(path, options) {
    var context = options.contexts && options.contexts[0] || this;

    ignoreDeprecation(function() {
      equal(handlebarsGet(context, path, options), 'bar');
    });
  });

  view = EmberView.create({
    container: container,
    controller: {
      foo: 'bar'
    },
    template: compile('{{#with foo as |bar|}}{{handlebars-get "bar"}}{{/with}}')
  });

  runAppend(view);
});

QUnit.test('it can lookup a path from globals', function() {
  expect(1);

  lookup.Blammo = { foo: 'blah' };

  registry.register('helper:handlebars-get', function(path, options) {
    var context = options.contexts && options.contexts[0] || this;

    ignoreDeprecation(function() {
      equal(handlebarsGet(context, path, options), lookup.Blammo.foo);
    });
  });

  view = EmberView.create({
    container: container,
    controller: { },
    template: compile('{{handlebars-get "Blammo.foo"}}')
  });

  runAppend(view);
});

QUnit.test('it raises a deprecation warning on use', function() {
  expect(1);

  registry.register('helper:handlebars-get', function(path, options) {
    var context = options.contexts && options.contexts[0] || this;

    expectDeprecation(function() {
      handlebarsGet(context, path, options);
    }, 'Usage of Ember.Handlebars.get is deprecated, use a Component or Ember.Handlebars.makeBoundHelper instead.');
  });

  view = EmberView.create({
    container: container,
    controller: {
      foo: 'bar'
    },
    template: compile('{{handlebars-get "foo"}}')
  });

  runAppend(view);
});
