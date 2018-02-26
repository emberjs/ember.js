import { context } from 'ember-environment';
import { run } from 'ember-metal';
import { Object as EmberObject } from 'ember-runtime';
import Application from '../../system/application';

let EmberApplication = Application;

let originalLookup = context.lookup;
let registry, locator, application;

QUnit.module('Ember.Application Dependency Injection', {
  setup() {
    application = run(EmberApplication, 'create');

    application.Person              = EmberObject.extend({});
    application.Orange              = EmberObject.extend({});
    application.Email               = EmberObject.extend({});
    application.User                = EmberObject.extend({});
    application.PostIndexController = EmberObject.extend({});

    application.register('model:person', application.Person, { singleton: false });
    application.register('model:user', application.User, { singleton: false });
    application.register('fruit:favorite', application.Orange);
    application.register('communication:main', application.Email, { singleton: false });
    application.register('controller:postIndex', application.PostIndexController, { singleton: true });

    registry = application.__registry__;
    locator = application.__container__;

    context.lookup = {};
  },
  teardown() {
    run(application, 'destroy');
    application = locator = null;
    context.lookup = originalLookup;
  }
});

QUnit.test('container lookup is normalized', function() {
  let dotNotationController = locator.lookup('controller:post.index');
  let camelCaseController = locator.lookup('controller:postIndex');

  ok(dotNotationController instanceof application.PostIndexController);
  ok(camelCaseController instanceof application.PostIndexController);

  equal(dotNotationController, camelCaseController);
});

QUnit.test('registered entities can be looked up later', function() {
  equal(registry.resolve('model:person'), application.Person);
  equal(registry.resolve('model:user'), application.User);
  equal(registry.resolve('fruit:favorite'), application.Orange);
  equal(registry.resolve('communication:main'), application.Email);
  equal(registry.resolve('controller:postIndex'), application.PostIndexController);

  equal(locator.lookup('fruit:favorite'), locator.lookup('fruit:favorite'), 'singleton lookup worked');
  ok(locator.lookup('model:user') !== locator.lookup('model:user'), 'non-singleton lookup worked');
});


QUnit.test('injections', function() {
  application.inject('model', 'fruit', 'fruit:favorite');
  application.inject('model:user', 'communication', 'communication:main');

  let user = locator.lookup('model:user');
  let person = locator.lookup('model:person');
  let fruit = locator.lookup('fruit:favorite');

  equal(user.get('fruit'), fruit);
  equal(person.get('fruit'), fruit);

  ok(application.Email.detectInstance(user.get('communication')));
});
