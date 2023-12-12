import { context } from '@ember/-internals/environment';
import { run } from '@ember/runloop';
import EmberObject from '@ember/object';
import EmberApplication from '@ember/application';
import {
  moduleFor,
  ModuleBasedTestResolver,
  AbstractTestCase as TestCase,
} from 'internal-test-helpers';

let originalLookup = context.lookup;
let registry, locator, application;

moduleFor(
  'Application Dependency Injection',
  class extends TestCase {
    constructor() {
      super();

      application = run(EmberApplication, 'create', {
        Resolver: ModuleBasedTestResolver,
      });

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
  }
);
