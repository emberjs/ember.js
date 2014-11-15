import EmberObject from "ember-runtime/system/object";
import run from "ember-metal/run_loop";
import EmberView from "ember-views/views/view";
import jQuery from "ember-views/system/jquery";
var trim = jQuery.trim;
import Container from "ember-runtime/system/container";
import EmberHandlebars from "ember-handlebars-compiler";
import htmlbarsCompile from "ember-htmlbars/system/compile";

var MyApp, lookup, view, container;
var originalLookup = Ember.lookup;

var compile;
if (Ember.FEATURES.isEnabled('ember-htmlbars')) {
  compile = htmlbarsCompile;
} else {
  compile = EmberHandlebars.compile;
}

QUnit.module("Support for {{partial}} helper", {
  setup: function() {
    Ember.lookup = lookup = { Ember: Ember };
    MyApp = lookup.MyApp = EmberObject.create({});
    container = new Container();
    container.optionsForType('template', { instantiate: false });
  },
  teardown: function() {
    run(function() {
      if (view) {
        view.destroy();
      }
    });
    Ember.lookup = originalLookup;
  }
});

test("should render other templates registered with the container", function() {
  container.register('template:_subTemplateFromContainer', compile('sub-template'));

  view = EmberView.create({
    container: container,
    template: compile('This {{partial "subTemplateFromContainer"}} is pretty great.')
  });

  run(function() {
    view.appendTo('#qunit-fixture');
  });

  equal(trim(view.$().text()), "This sub-template is pretty great.");
});

test("should render other slash-separated templates registered with the container", function() {
  container.register('template:child/_subTemplateFromContainer', compile("sub-template"));

  view = EmberView.create({
    container: container,
    template: compile('This {{partial "child/subTemplateFromContainer"}} is pretty great.')
  });

  run(function() {
    view.appendTo('#qunit-fixture');
  });

  equal(trim(view.$().text()), "This sub-template is pretty great.");
});

test("should use the current view's context", function() {
  container.register('template:_person_name', compile("{{firstName}} {{lastName}}"));

  view = EmberView.create({
    container: container,
    template: compile('Who is {{partial "person_name"}}?')
  });
  view.set('controller', EmberObject.create({
    firstName: 'Kris',
    lastName: 'Selden'
  }));

  run(function() {
    view.appendTo('#qunit-fixture');
  });

  equal(trim(view.$().text()), "Who is Kris Selden?");
});

test("Quoteless parameters passed to {{template}} perform a bound property lookup of the partial name", function() {
  container.register('template:_subTemplate', compile("sub-template"));
  container.register('template:_otherTemplate', compile("other-template"));

  view = EmberView.create({
    container: container,
    template: compile('This {{partial view.partialName}} is pretty {{partial nonexistent}}great.'),
    partialName: 'subTemplate'
  });

  run(function() {
    view.appendTo('#qunit-fixture');
  });

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
