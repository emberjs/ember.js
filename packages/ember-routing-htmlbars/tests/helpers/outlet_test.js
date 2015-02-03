import Ember from 'ember-metal/core'; // TEMPLATES
import run from "ember-metal/run_loop";

import Namespace from "ember-runtime/system/namespace";

import _MetamorphView from "ember-views/views/metamorph_view";
import EmberView from "ember-routing/ext/view";
import EmberContainerView from "ember-views/views/container_view";
import jQuery from "ember-views/system/jquery";

import { outletHelper } from "ember-routing-htmlbars/helpers/outlet";

import compile from "ember-template-compiler/system/compile";
import { registerHelper } from "ember-htmlbars/helpers";
import helpers from "ember-htmlbars/helpers";
import { runAppend, runDestroy } from "ember-runtime/tests/utils";
import { buildRegistry } from "ember-routing-htmlbars/tests/utils";

var trim = jQuery.trim;

var view, registry, container, originalOutletHelper;

QUnit.module("ember-routing-htmlbars: {{outlet}} helper", {
  setup: function() {
    originalOutletHelper = helpers['outlet'];
    registerHelper('outlet', outletHelper);

    var namespace = Namespace.create();
    registry = buildRegistry(namespace);
    container = registry.container();
  },

  teardown: function() {
    delete helpers['outlet'];
    helpers['outlet'] = originalOutletHelper;

    runDestroy(container);
    runDestroy(view);
    registry = container = view = null;
  }
});

QUnit.test("view should support connectOutlet for the main outlet", function() {
  var template = "<h1>HI</h1>{{outlet}}";
  view = EmberView.create({
    template: compile(template)
  });

  runAppend(view);

  equal(view.$().text(), 'HI');

  run(function() {
    view.connectOutlet('main', EmberView.create({
      template: compile("<p>BYE</p>")
    }));
  });

  // Replace whitespace for older IE
  equal(trim(view.$().text()), 'HIBYE');
});

QUnit.test("outlet should support connectOutlet in slots in prerender state", function() {
  var template = "<h1>HI</h1>{{outlet}}";
  view = EmberView.create({
    template: compile(template)
  });

  view.connectOutlet('main', EmberView.create({
    template: compile("<p>BYE</p>")
  }));

  runAppend(view);

  equal(view.$().text(), 'HIBYE');
});

QUnit.test("outlet should support an optional name", function() {
  var template = "<h1>HI</h1>{{outlet 'mainView'}}";
  view = EmberView.create({
    template: compile(template)
  });

  runAppend(view);

  equal(view.$().text(), 'HI');

  run(function() {
    view.connectOutlet('mainView', EmberView.create({
      template: compile("<p>BYE</p>")
    }));
  });

  // Replace whitespace for older IE
  equal(trim(view.$().text()), 'HIBYE');
});


QUnit.test("outlet should correctly lookup a view", function() {

  var template,
      ContainerView,
      childView;

  ContainerView = EmberContainerView.extend();

  registry.register("view:containerView", ContainerView);

  template = "<h1>HI</h1>{{outlet view='containerView'}}";

  view = EmberView.create({
    template: compile(template),
    container : container
  });

  childView = EmberView.create({
    template: compile("<p>BYE</p>")
  });

  runAppend(view);

  equal(view.$().text(), 'HI');

  run(function() {
    view.connectOutlet('main', childView);
  });

  ok(ContainerView.detectInstance(childView._parentView), "The custom view class should be used for the outlet");

  // Replace whitespace for older IE
  equal(trim(view.$().text()), 'HIBYE');

});

QUnit.test("outlet should assert view is specified as a string", function() {

  var template = "<h1>HI</h1>{{outlet view=containerView}}";

  expectAssertion(function () {

    view = EmberView.create({
      template: compile(template),
      container : container
    });

    runAppend(view);

  });

});

QUnit.test("outlet should assert view path is successfully resolved", function() {

  var template = "<h1>HI</h1>{{outlet view='someViewNameHere'}}";

  expectAssertion(function () {

    view = EmberView.create({
      template: compile(template),
      container : container
    });

    runAppend(view);

  });

});

QUnit.test("outlet should support an optional view class", function() {
  var template = "<h1>HI</h1>{{outlet viewClass=view.outletView}}";
  view = EmberView.create({
    template: compile(template),
    outletView: EmberContainerView.extend()
  });

  runAppend(view);

  equal(view.$().text(), 'HI');

  var childView = EmberView.create({
    template: compile("<p>BYE</p>")
  });

  run(function() {
    view.connectOutlet('main', childView);
  });

  ok(view.outletView.detectInstance(childView._parentView), "The custom view class should be used for the outlet");

  // Replace whitespace for older IE
  equal(trim(view.$().text()), 'HIBYE');
});


QUnit.test("Outlets bind to the current view, not the current concrete view", function() {
  var parentTemplate = "<h1>HI</h1>{{outlet}}";
  var middleTemplate = "<h2>MIDDLE</h2>{{outlet}}";
  var bottomTemplate = "<h3>BOTTOM</h3>";

  view = EmberView.create({
    template: compile(parentTemplate)
  });

  var middleView = _MetamorphView.create({
    template: compile(middleTemplate)
  });

  var bottomView = _MetamorphView.create({
    template: compile(bottomTemplate)
  });

  runAppend(view);

  run(function() {
    view.connectOutlet('main', middleView);
  });

  run(function() {
    middleView.connectOutlet('main', bottomView);
  });

  var output = jQuery('#qunit-fixture h1 ~ h2 ~ h3').text();
  equal(output, "BOTTOM", "all templates were rendered");
});

QUnit.test("view should support disconnectOutlet for the main outlet", function() {
  var template = "<h1>HI</h1>{{outlet}}";
  view = EmberView.create({
    template: compile(template)
  });

  runAppend(view);

  equal(view.$().text(), 'HI');

  run(function() {
    view.connectOutlet('main', EmberView.create({
      template: compile("<p>BYE</p>")
    }));
  });

  // Replace whitespace for older IE
  equal(trim(view.$().text()), 'HIBYE');

  run(function() {
    view.disconnectOutlet('main');
  });

  // Replace whitespace for older IE
  equal(trim(view.$().text()), 'HI');
});

// TODO: Remove flag when {{with}} is fixed.
if (!Ember.FEATURES.isEnabled('ember-htmlbars')) {
// jscs:disable validateIndentation

QUnit.test("Outlets bind to the current template's view, not inner contexts [DEPRECATED]", function() {
  var parentTemplate = "<h1>HI</h1>{{#if view.alwaysTrue}}{{#with this}}{{outlet}}{{/with}}{{/if}}";
  var bottomTemplate = "<h3>BOTTOM</h3>";

  view = EmberView.create({
    alwaysTrue: true,
    template: compile(parentTemplate)
  });

  var bottomView = _MetamorphView.create({
    template: compile(bottomTemplate)
  });

  expectDeprecation(function() {
    runAppend(view);
  }, 'Using the context switching form of `{{with}}` is deprecated. Please use the keyword form (`{{with foo as bar}}`) instead.');

  run(function() {
    view.connectOutlet('main', bottomView);
  });

  var output = jQuery('#qunit-fixture h1 ~ h3').text();
  equal(output, "BOTTOM", "all templates were rendered");
});

// jscs:enable validateIndentation
}

QUnit.test("should support layouts", function() {
  var template = "{{outlet}}";
  var layout = "<h1>HI</h1>{{yield}}";

  view = EmberView.create({
    template: compile(template),
    layout: compile(layout)
  });

  runAppend(view);

  equal(view.$().text(), 'HI');

  run(function() {
    view.connectOutlet('main', EmberView.create({
      template: compile("<p>BYE</p>")
    }));
  });
  // Replace whitespace for older IE
  equal(trim(view.$().text()), 'HIBYE');
});

QUnit.test("should not throw deprecations if {{outlet}} is used without a name", function() {
  expectNoDeprecation();
  view = EmberView.create({
    template: compile("{{outlet}}")
  });
  runAppend(view);
});

QUnit.test("should not throw deprecations if {{outlet}} is used with a quoted name", function() {
  expectNoDeprecation();
  view = EmberView.create({
    template: compile("{{outlet \"foo\"}}")
  });
  runAppend(view);
});

if (Ember.FEATURES.isEnabled('ember-htmlbars')) {
  QUnit.test("should throw an assertion if {{outlet}} used with unquoted name", function() {
    view = EmberView.create({
      template: compile("{{outlet foo}}")
    });
    expectAssertion(function() {
      runAppend(view);
    }, "Using {{outlet}} with an unquoted name is not supported.");
  });
} else {
  QUnit.test("should throw a deprecation if {{outlet}} is used with an unquoted name", function() {
    view = EmberView.create({
      template: compile("{{outlet foo}}")
    });
    expectDeprecation(function() {
      runAppend(view);
    }, 'Using {{outlet}} with an unquoted name is not supported. Please update to quoted usage \'{{outlet "foo"}}\'.');
  });
}
