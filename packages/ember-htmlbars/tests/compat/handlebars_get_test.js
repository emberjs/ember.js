import Ember from "ember-metal/core"; // Ember.lookup
import _MetamorphView from "ember-views/views/metamorph_view";
import EmberView from "ember-views/views/view";
import run from "ember-metal/run_loop";
import handlebarsGet from "ember-htmlbars/compat/handlebars-get";
import Container from "ember-runtime/system/container";
import { appendView } from "ember-views/tests/view_helpers";

import EmberHandlebars from "ember-htmlbars/compat";

var compile = EmberHandlebars.compile;

var originalLookup = Ember.lookup;
var TemplateTests, container, lookup, view;

QUnit.module("ember-htmlbars: Ember.Handlebars.get", {
  setup: function() {
    Ember.lookup = lookup = {};
    container = new Container();
    container.optionsForType('template', { instantiate: false });
    container.optionsForType('helper', { instantiate: false });
    container.register('view:default', _MetamorphView);
    container.register('view:toplevel', EmberView.extend());
  },

  teardown: function() {
    run(function() {
        if (container) {
          container.destroy();
        }
        if (view) {
          view.destroy();
        }
        container = view = null;
    });
    Ember.lookup = lookup = originalLookup;
    TemplateTests = null;
  }
});

test('it can lookup a path from the current context', function() {
  expect(1);

  container.register('helper:handlebars-get', function(path, options) {
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

  appendView(view);
});

test('it can lookup a path from the current keywords', function() {
  expect(1);

  container.register('helper:handlebars-get', function(path, options) {
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
    template: compile('{{#with foo as bar}}{{handlebars-get "bar"}}{{/with}}')
  });

  appendView(view);
});

test('it can lookup a path from globals', function() {
  expect(1);

  lookup.Blammo = { foo: 'blah'};

  container.register('helper:handlebars-get', function(path, options) {
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

  appendView(view);
});

test('it raises a deprecation warning on use', function() {
  expect(1);

  container.register('helper:handlebars-get', function(path, options) {
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

  appendView(view);
});
