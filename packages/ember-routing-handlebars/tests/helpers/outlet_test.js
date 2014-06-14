import Ember from 'ember-metal/core'; // TEMPLATES
import { get } from "ember-metal/property_get";
import { set } from "ember-metal/property_set";
import run from "ember-metal/run_loop";

import Container from 'container/container';
import Namespace from "ember-runtime/system/namespace";
import {
  decamelize,
  classify
} from "ember-runtime/system/string";
import Controller from "ember-runtime/controllers/controller";
import ObjectController from "ember-runtime/controllers/object_controller";
import ArrayController from "ember-runtime/controllers/array_controller";

import EmberRouter from "ember-routing/system/router";
import HashLocation from "ember-routing/location/hash_location";

import EmberHandlebars from "ember-handlebars";
import {_MetamorphView} from "ember-handlebars/views/metamorph_view";
import EmberView from "ember-routing/ext/view";
import EmberContainerView from "ember-views/views/container_view";
import jQuery from "ember-views/system/jquery";

import { outletHelper } from "ember-routing-handlebars/helpers/outlet";

var buildContainer = function(namespace) {
  var container = new Container();

  container.set = set;
  container.resolver = resolverFor(namespace);
  container.optionsForType('view', { singleton: false });
  container.optionsForType('template', { instantiate: false });
  container.register('application:main', namespace, { instantiate: false });
  container.injection('router:main', 'namespace', 'application:main');

  container.register('location:hash', HashLocation);

  container.register('controller:basic', Controller, { instantiate: false });
  container.register('controller:object', ObjectController, { instantiate: false });
  container.register('controller:array', ArrayController, { instantiate: false });

  container.typeInjection('route', 'router', 'router:main');

  return container;
};

function resolverFor(namespace) {
  return function(fullName) {
    var nameParts = fullName.split(":"),
        type = nameParts[0], name = nameParts[1];

    if (type === 'template') {
      var templateName = decamelize(name);
      if (Ember.TEMPLATES[templateName]) {
        return Ember.TEMPLATES[templateName];
      }
    }

    var className = classify(name) + classify(type);
    var factory = get(namespace, className);

    if (factory) { return factory; }
  };
}

var appendView = function(view) {
  run(function() { view.appendTo('#qunit-fixture'); });
};

var compile = EmberHandlebars.compile;
var trim = jQuery.trim;

var view, container, originalOutletHelper;

QUnit.module("Handlebars {{outlet}} helpers", {

  setup: function() {
    originalOutletHelper = EmberHandlebars.helpers['outlet'];
    EmberHandlebars.registerHelper('outlet', outletHelper);

    var namespace = Namespace.create();
    container = buildContainer(namespace);
    container.register('view:default', EmberView.extend());
    container.register('router:main', EmberRouter.extend());
  },
  teardown: function() {
    delete EmberHandlebars.helpers['outlet'];
    EmberHandlebars.helpers['outlet'] = originalOutletHelper;

    run(function () {
      if (container) {
        container.destroy();
      }
      if (view) {
        view.destroy();
      }
    });
  }
});

test("view should support connectOutlet for the main outlet", function() {
  var template = "<h1>HI</h1>{{outlet}}";
  view = EmberView.create({
    template: EmberHandlebars.compile(template)
  });

  appendView(view);

  equal(view.$().text(), 'HI');

  run(function() {
    view.connectOutlet('main', EmberView.create({
      template: compile("<p>BYE</p>")
    }));
  });

  // Replace whitespace for older IE
  equal(trim(view.$().text()), 'HIBYE');
});

test("outlet should support connectOutlet in slots in prerender state", function() {
  var template = "<h1>HI</h1>{{outlet}}";
  view = EmberView.create({
    template: EmberHandlebars.compile(template)
  });

  view.connectOutlet('main', EmberView.create({
    template: compile("<p>BYE</p>")
  }));

  appendView(view);

  equal(view.$().text(), 'HIBYE');
});

test("outlet should support an optional name", function() {
  var template = "<h1>HI</h1>{{outlet mainView}}";
  view = EmberView.create({
    template: EmberHandlebars.compile(template)
  });

  appendView(view);

  equal(view.$().text(), 'HI');

  run(function() {
    view.connectOutlet('mainView', EmberView.create({
      template: compile("<p>BYE</p>")
    }));
  });

  // Replace whitespace for older IE
  equal(trim(view.$().text()), 'HIBYE');
});


test("outlet should correctly lookup a view", function() {

  var template,
      ContainerView,
      childView;

  ContainerView = EmberContainerView.extend();

  container.register("view:containerView", ContainerView);

  template = "<h1>HI</h1>{{outlet view='containerView'}}";

  view = EmberView.create({
    template: EmberHandlebars.compile(template),
    container : container
  });

  childView = EmberView.create({
    template: compile("<p>BYE</p>")
  });

  appendView(view);

  equal(view.$().text(), 'HI');

  run(function() {
    view.connectOutlet('main', childView);
  });

  ok(ContainerView.detectInstance(childView.get('_parentView')), "The custom view class should be used for the outlet");

  // Replace whitespace for older IE
  equal(trim(view.$().text()), 'HIBYE');

});

test("outlet should assert view is specified as a string", function() {

  var template = "<h1>HI</h1>{{outlet view=containerView}}";

  expectAssertion(function () {

    view = EmberView.create({
      template: EmberHandlebars.compile(template),
      container : container
    });

    appendView(view);

  });

});

test("outlet should assert view path is successfully resolved", function() {

  var template = "<h1>HI</h1>{{outlet view='someViewNameHere'}}";

  expectAssertion(function () {

    view = EmberView.create({
      template: EmberHandlebars.compile(template),
      container : container
    });

    appendView(view);

  });

});

test("outlet should support an optional view class", function() {
  var template = "<h1>HI</h1>{{outlet viewClass=view.outletView}}";
  view = EmberView.create({
    template: EmberHandlebars.compile(template),
    outletView: EmberContainerView.extend()
  });

  appendView(view);

  equal(view.$().text(), 'HI');

  var childView = EmberView.create({
    template: compile("<p>BYE</p>")
  });

  run(function() {
    view.connectOutlet('main', childView);
  });

  ok(view.outletView.detectInstance(childView.get('_parentView')), "The custom view class should be used for the outlet");

  // Replace whitespace for older IE
  equal(trim(view.$().text()), 'HIBYE');
});


test("Outlets bind to the current view, not the current concrete view", function() {
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

  appendView(view);

  run(function() {
    view.connectOutlet('main', middleView);
  });

  run(function() {
    middleView.connectOutlet('main', bottomView);
  });

  var output = jQuery('#qunit-fixture h1 ~ h2 ~ h3').text();
  equal(output, "BOTTOM", "all templates were rendered");
});

test("view should support disconnectOutlet for the main outlet", function() {
  var template = "<h1>HI</h1>{{outlet}}";
  view = EmberView.create({
    template: EmberHandlebars.compile(template)
  });

  appendView(view);

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

test("Outlets bind to the current template's view, not inner contexts", function() {
  var parentTemplate = "<h1>HI</h1>{{#if view.alwaysTrue}}{{#with this}}{{outlet}}{{/with}}{{/if}}";
  var bottomTemplate = "<h3>BOTTOM</h3>";

  view = EmberView.create({
    alwaysTrue: true,
    template: compile(parentTemplate)
  });

  var bottomView = _MetamorphView.create({
    template: compile(bottomTemplate)
  });

  appendView(view);

  run(function() {
    view.connectOutlet('main', bottomView);
  });

  var output = jQuery('#qunit-fixture h1 ~ h3').text();
  equal(output, "BOTTOM", "all templates were rendered");
});

test("should support layouts", function() {
  var template = "{{outlet}}",
      layout = "<h1>HI</h1>{{yield}}";
  view = EmberView.create({
    template: EmberHandlebars.compile(template),
    layout: EmberHandlebars.compile(layout)
  });

  appendView(view);

  equal(view.$().text(), 'HI');

  run(function() {
    view.connectOutlet('main', EmberView.create({
      template: compile("<p>BYE</p>")
    }));
  });
  // Replace whitespace for older IE
  equal(trim(view.$().text()), 'HIBYE');
});
