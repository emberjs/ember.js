import { context } from 'ember-environment';
import { run } from '@ember/runloop';
import { Object as EmberObject } from 'ember-runtime';
import EmberApplication from '@ember/application';
import { moduleFor, AbstractTestCase as TestCase } from 'internal-test-helpers';

let originalLookup = context.lookup;
let registry, locator, application;

moduleFor(
  'Application Dependency Injection',
  class extends TestCase {
    constructor() {
      super();

      application = run(EmberApplication, 'create');

      application.Person = EmberObject.extend({});
      application.Orange = EmberObject.extend({});
      application.Email = EmberObject.extend({});
      application.User = EmberObject.extend({});
      application.PostIndexController = EmberObject.extend({});

      application.register('model:person', application.Person, {
        singleton: false,
      });
      application.register('model:user', application.User, {
        singleton: false,
      });
      application.register('fruit:favorite', application.Orange);
      application.register('communication:main', application.Email, {
        singleton: false,
      });
      application.register('controller:postIndex', application.PostIndexController, {
        singleton: true,
      });

      registry = application.__registry__;
      locator = application.__container__;

      context.lookup = {};
    }

    teardown() {
      super.teardown();
      run(application, 'destroy');
      registry = application = locator = null;
      context.lookup = originalLookup;
    }

    ['@test container lookup is normalized'](assert) {
      let dotNotationController = locator.lookup('controller:post.index');
      let camelCaseController = locator.lookup('controller:postIndex');

      assert.ok(dotNotationController instanceof application.PostIndexController);
      assert.ok(camelCaseController instanceof application.PostIndexController);

      assert.equal(dotNotationController, camelCaseController);
    }

    ['@test registered entities can be looked up later'](assert) {
      assert.equal(registry.resolve('model:person'), application.Person);
      assert.equal(registry.resolve('model:user'), application.User);
      assert.equal(registry.resolve('fruit:favorite'), application.Orange);
      assert.equal(registry.resolve('communication:main'), application.Email);
      assert.equal(registry.resolve('controller:postIndex'), application.PostIndexController);

      assert.equal(
        locator.lookup('fruit:favorite'),
        locator.lookup('fruit:favorite'),
        'singleton lookup worked'
      );
      assert.ok(
        locator.lookup('model:user') !== locator.lookup('model:user'),
        'non-singleton lookup worked'
      );
    }

    ['@test injections'](assert) {
      application.inject('model', 'fruit', 'fruit:favorite');
      application.inject('model:user', 'communication', 'communication:main');

      let user = locator.lookup('model:user');
      let person = locator.lookup('model:person');
      let fruit = locator.lookup('fruit:favorite');

      assert.equal(user.get('fruit'), fruit);
      assert.equal(person.get('fruit'), fruit);

      assert.ok(application.Email.detectInstance(user.get('communication')));
    }
  }
);
