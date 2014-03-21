import run from "ember-metal/run_loop";
import {get} from "ember-metal/property_get";
import {set} from "ember-metal/property_set";
import {forEach} from "ember-metal/array";
import EmberObject from "ember-runtime/system/object";
import Application from "ember-application/system/application";
import Container from "ember-runtime/system/container";

var EmberApplication = Application;

var locator, originalLookup = Ember.lookup, lookup,
    application, originalModelInjections;

module("Ember.Application Dependency Injection", {
  setup: function() {
    originalModelInjections = Ember.MODEL_FACTORY_INJECTIONS;
    Ember.MODEL_FACTORY_INJECTIONS = true;

    application = run(EmberApplication, 'create');

    application.Person              = EmberObject.extend({});
    application.Orange              = EmberObject.extend({});
    application.Email               = EmberObject.extend({});
    application.User                = EmberObject.extend({});
    application.PostIndexController = EmberObject.extend({});

    application.register('model:person', application.Person, {singleton: false });
    application.register('model:user', application.User, {singleton: false });
    application.register('fruit:favorite', application.Orange);
    application.register('communication:main', application.Email, {singleton: false});
    application.register('controller:postIndex', application.PostIndexController, {singleton: true});

    locator = application.__container__;

    lookup = Ember.lookup = {};
  },
  teardown: function() {
    run(application, 'destroy');
    application = locator = null;
    Ember.lookup = originalLookup;
    Ember.MODEL_FACTORY_INJECTIONS = originalModelInjections;
  }
});

test('container lookup is normalized', function() {
  var dotNotationController = locator.lookup('controller:post.index');
  var camelCaseController = locator.lookup('controller:postIndex');

  ok(dotNotationController instanceof application.PostIndexController);
  ok(camelCaseController instanceof application.PostIndexController);

  equal(dotNotationController, camelCaseController);
});

test('Container.defaultContainer is the same as the Apps container, but emits deprecation warnings', function() {
  expectDeprecation(/Using the defaultContainer is no longer supported./);
  var routerFromContainer = locator.lookup('router:main'),
    routerFromDefaultContainer = Container.defaultContainer.lookup('router:main');

  equal(routerFromContainer, routerFromDefaultContainer, 'routers from both containers are equal');
});

test('registered entities can be looked up later', function() {
  equal(locator.resolve('model:person'), application.Person);
  equal(locator.resolve('model:user'), application.User);
  equal(locator.resolve('fruit:favorite'), application.Orange);
  equal(locator.resolve('communication:main'), application.Email);
  equal(locator.resolve('controller:postIndex'), application.PostIndexController);

  equal(locator.lookup('fruit:favorite'), locator.lookup('fruit:favorite'), 'singleton lookup worked');
  ok(locator.lookup('model:user') !== locator.lookup('model:user'), 'non-singleton lookup worked');
});


test('injections', function() {
  application.inject('model', 'fruit', 'fruit:favorite');
  application.inject('model:user', 'communication', 'communication:main');

  var user = locator.lookup('model:user'),
  person = locator.lookup('model:person'),
  fruit = locator.lookup('fruit:favorite');

  equal(user.get('fruit'), fruit);
  equal(person.get('fruit'), fruit);

  ok(application.Email.detectInstance(user.get('communication')));
});
