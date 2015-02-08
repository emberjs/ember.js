import EmberObject from "ember-runtime/system/object";
import run from "ember-metal/run_loop";
import EmberView from "ember-views/views/view";
import jQuery from "ember-views/system/jquery";
var trim = jQuery.trim;
import { Registry } from "ember-runtime/system/container";
import compile from "ember-template-compiler/system/compile";
import { runAppend, runDestroy } from "ember-runtime/tests/utils";

var MyApp, lookup, view, registry, container;
var originalLookup = Ember.lookup;

QUnit.module("Support for {{partial}} helper", {
  setup: function() {
    Ember.lookup = lookup = { Ember: Ember };
    MyApp = lookup.MyApp = EmberObject.create({});
    registry = new Registry();
    container = registry.container();
    registry.optionsForType('template', { instantiate: false });
  },
  teardown: function() {
    runDestroy(view);
    Ember.lookup = originalLookup;
  }
});

QUnit.test("should render other templates registered with the container", function() {
  registry.register('template:_subTemplateFromContainer', compile('sub-template'));

  view = EmberView.create({
    container: container,
    template: compile('This {{partial "subTemplateFromContainer"}} is pretty great.')
  });

  runAppend(view);

  equal(trim(view.$().text()), "This sub-template is pretty great.");
});

QUnit.test("should render other slash-separated templates registered with the container", function() {
  registry.register('template:child/_subTemplateFromContainer', compile("sub-template"));

  view = EmberView.create({
    container: container,
    template: compile('This {{partial "child/subTemplateFromContainer"}} is pretty great.')
  });

  runAppend(view);

  equal(trim(view.$().text()), "This sub-template is pretty great.");
});

QUnit.test("should use the current view's context", function() {
  registry.register('template:_person_name', compile("{{firstName}} {{lastName}}"));

  view = EmberView.create({
    container: container,
    template: compile('Who is {{partial "person_name"}}?')
  });
  view.set('controller', EmberObject.create({
    firstName: 'Kris',
    lastName: 'Selden'
  }));

  runAppend(view);

  equal(trim(view.$().text()), "Who is Kris Selden?");
});

QUnit.test("Quoteless parameters passed to {{template}} perform a bound property lookup of the partial name", function() {
  registry.register('template:_subTemplate', compile("sub-template"));
  registry.register('template:_otherTemplate', compile("other-template"));

  view = EmberView.create({
    container: container,
    template: compile('This {{partial view.partialName}} is pretty {{partial nonexistent}}great.'),
    partialName: 'subTemplate'
  });

  runAppend(view);

  equal(trim(view.$().text()), "This sub-template is pretty great.");

  run(function() {
    view.set('partialName', 'otherTemplate');
  });

  equal(trim(view.$().text()), "This other-template is pretty great.");

  run(function() {
    view.set('partialName', null);
  });

  equal(trim(view.$().text()), "This  is pretty great.");
});
