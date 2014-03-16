import run from "ember-metal/run_loop";
import {View as EmberView} from "ember-views/views/view";
import EmberObject from "ember-runtime/system/object";
import jQuery from "ember-views/system/jquery";
var trim = jQuery.trim;

import Container from "ember-runtime/system/container";
import EmberHandlebars from "ember-handlebars-compiler";

var MyApp;
var originalLookup = Ember.lookup, lookup, TemplateTests, view, container;

module("Support for {{template}} helper", {
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

test("should render other templates via the container (DEPRECATED)", function() {
  container.register('template:sub_template_from_container', EmberHandlebars.compile('sub-template'));

  view = EmberView.create({
    container: container,
    template: EmberHandlebars.compile('This {{template "sub_template_from_container"}} is pretty great.')
  });

  expectDeprecation(/The `template` helper has been deprecated in favor of the `partial` helper./);

  run(function() {
    view.appendTo('#qunit-fixture');
  });

  equal(trim(view.$().text()), "This sub-template is pretty great.");
});

test("should use the current view's context (DEPRECATED)", function() {
  container.register('template:person_name', EmberHandlebars.compile("{{firstName}} {{lastName}}"));

  view = EmberView.create({
    container: container,
    template: EmberHandlebars.compile('Who is {{template "person_name"}}?')
  });
  view.set('controller', EmberObject.create({
    firstName: 'Kris',
    lastName: 'Selden'
  }));

  expectDeprecation(/The `template` helper has been deprecated in favor of the `partial` helper./);

  run(function() {
    view.appendTo('#qunit-fixture');
  });

  equal(trim(view.$().text()), "Who is Kris Selden?");
});
