import EmberView from "ember-views/views/view";
import EmberObject from "ember-runtime/system/object";
import jQuery from "ember-views/system/jquery";
var trim = jQuery.trim;

import { Registry } from "ember-runtime/system/container";
import compile from "ember-template-compiler/system/compile";
import { runAppend, runDestroy } from "ember-runtime/tests/utils";

var MyApp, lookup, view, registry, container;
var originalLookup = Ember.lookup;

QUnit.module("Support for {{template}} helper", {
  setup() {
    Ember.lookup = lookup = { Ember: Ember };
    MyApp = lookup.MyApp = EmberObject.create({});
    registry = new Registry();
    container = registry.container();
    registry.optionsForType('template', { instantiate: false });
  },
  teardown() {
    runDestroy(view);
    runDestroy(container);
    registry = container = view = null;
    Ember.lookup = originalLookup;
  }
});

QUnit.skip("should render other templates via the container (DEPRECATED)", function() {
  registry.register('template:sub_template_from_container', compile('sub-template'));

  view = EmberView.create({
    container: container,
    template: compile('This {{template "sub_template_from_container"}} is pretty great.')
  });

  expectDeprecation(/The `template` helper has been deprecated in favor of the `partial` helper./);

  runAppend(view);

  equal(trim(view.$().text()), "This sub-template is pretty great.");
});

QUnit.skip("should use the current view's context (DEPRECATED)", function() {
  registry.register('template:person_name', compile("{{firstName}} {{lastName}}"));

  view = EmberView.create({
    container: container,
    template: compile('Who is {{template "person_name"}}?')
  });
  view.set('controller', EmberObject.create({
    firstName: 'Kris',
    lastName: 'Selden'
  }));

  expectDeprecation(/The `template` helper has been deprecated in favor of the `partial` helper./);

  runAppend(view);

  equal(trim(view.$().text()), "Who is Kris Selden?");
});
