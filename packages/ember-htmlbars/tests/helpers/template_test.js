import EmberView from "ember-views/views/view";
import EmberObject from "ember-runtime/system/object";
import jQuery from "ember-views/system/jquery";
var trim = jQuery.trim;

import Container from "ember-runtime/system/container";
import compile from "ember-template-compiler/system/compile";
import { runAppend, runDestroy } from "ember-runtime/tests/utils";

var MyApp, lookup, view, container;
var originalLookup = Ember.lookup;

QUnit.module("Support for {{template}} helper", {
  setup: function() {
    Ember.lookup = lookup = { Ember: Ember };
    MyApp = lookup.MyApp = EmberObject.create({});
    container = new Container();
    container.optionsForType('template', { instantiate: false });
  },
  teardown: function() {
    runDestroy(view);
    Ember.lookup = originalLookup;
  }
});

test("should render other templates via the container (DEPRECATED)", function() {
  container.register('template:sub_template_from_container', compile('sub-template'));

  view = EmberView.create({
    container: container,
    template: compile('This {{template "sub_template_from_container"}} is pretty great.')
  });

  expectDeprecation(/The `template` helper has been deprecated in favor of the `partial` helper./);

  runAppend(view);

  equal(trim(view.$().text()), "This sub-template is pretty great.");
});

test("should use the current view's context (DEPRECATED)", function() {
  container.register('template:person_name', compile("{{firstName}} {{lastName}}"));

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
