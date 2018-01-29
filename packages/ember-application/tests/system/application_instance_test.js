import Engine from '../../system/engine';
import Application from '../../system/application';
import ApplicationInstance from '../../system/application-instance';
import { run } from 'ember-metal';
import { jQuery } from 'ember-views';
import { privatize as P } from 'container';
import { factory } from 'internal-test-helpers';
import { Object as EmberObject } from 'ember-runtime';
import {
  moduleFor,
  AbstractTestCase as TestCase
} from 'internal-test-helpers';

let application, appInstance;

moduleFor('ApplicationInstance', class extends TestCase {
  constructor() {
    super();

    jQuery('#qunit-fixture').html('<div id=\'one\'><div id=\'one-child\'>HI</div></div><div id=\'two\'>HI</div>');
    application = run(() => Application.create({ rootElement: '#one', router: null }));
  }

  teardown() {
    jQuery('#qunit-fixture').empty();

    if (appInstance) {
      run(appInstance, 'destroy');
    }

    if (application) {
      run(application, 'destroy');
    }
  }

  ['an application instance can be created based upon an application'](assert) {
    appInstance = run(() => appInstance = ApplicationInstance.create({ application }));

    assert.ok(appInstance, 'instance should be created');
    assert.equal(appInstance.application, application, 'application should be set to parent');
  }

  ['customEvents added to the application before setupEventDispatcher'](assert) {
    assert.expect(1);

    appInstance = run(() => ApplicationInstance.create({ application }));
    appInstance.setupRegistry();

    application.customEvents = {
      awesome: 'sauce'
    };

    let eventDispatcher = appInstance.lookup('event_dispatcher:main');
    eventDispatcher.setup = function(events) {
      assert.equal(events.awesome, 'sauce');
    };

    appInstance.setupEventDispatcher();
  }

  ['customEvents added to the application before setupEventDispatcher'](assert) {
    assert.expect(1);

    run(() => appInstance = ApplicationInstance.create({ application }));
    appInstance.setupRegistry();

    application.customEvents = {
      awesome: 'sauce'
    };

    let eventDispatcher = appInstance.lookup('event_dispatcher:main');
    eventDispatcher.setup = function(events) {
      assert.equal(events.awesome, 'sauce');
    };

    appInstance.setupEventDispatcher();
  }

  ['customEvents added to the application instance before setupEventDispatcher'](assert) {
    assert.expect(1);

    appInstance = run(() => ApplicationInstance.create({ application }));
    appInstance.setupRegistry();

    appInstance.customEvents = {
      awesome: 'sauce'
    };

    let eventDispatcher = appInstance.lookup('event_dispatcher:main');
    eventDispatcher.setup = function(events) {
      assert.equal(events.awesome, 'sauce');
    };

    appInstance.setupEventDispatcher();
  }

  ['unregistering a factory clears all cached instances of that factory'](assert) {
    assert.expect(5);

    appInstance = run(() => ApplicationInstance.create({ application }));

    let PostController1 = factory();
    let PostController2 = factory();

    appInstance.register('controller:post', PostController1);

    let postController1 = appInstance.lookup('controller:post');
    let postController1Factory = appInstance.factoryFor('controller:post');
    assert.ok(postController1 instanceof PostController1, 'precond - lookup creates instance');
    assert.equal(PostController1, postController1Factory.class, 'precond - factoryFor().class matches');

    appInstance.unregister('controller:post');
    appInstance.register('controller:post', PostController2);

    let postController2 = appInstance.lookup('controller:post');
    let postController2Factory = appInstance.factoryFor('controller:post');
    assert.ok(postController2 instanceof PostController2, 'lookup creates instance');
    assert.equal(PostController2, postController2Factory.class, 'factoryFor().class matches');

    assert.notStrictEqual(postController1, postController2, 'lookup creates a brand new instance, because the previous one was reset');
  }

  ['can build and boot a registered engine'](assert) {
    assert.expect(11);

    let ChatEngine = Engine.extend();
    let chatEngineInstance;

    application.register('engine:chat', ChatEngine);

    run(() => {
      appInstance = ApplicationInstance.create({ application });
      appInstance.setupRegistry();
      chatEngineInstance = appInstance.buildChildEngineInstance('chat');
    });

    return chatEngineInstance.boot()
      .then(() => {
        assert.ok(true, 'boot successful');

        let registrations = [
          'route:basic',
          'service:-routing',
          'service:-glimmer-environment'
        ];

        registrations.forEach(key => {
          assert.strictEqual(
            chatEngineInstance.resolveRegistration(key),
            appInstance.resolveRegistration(key),
            `Engine and parent app share registrations for '${key}'`);
        });

        let singletons = [
          'router:main',
          P`-bucket-cache:main`,
          '-view-registry:main',
          '-environment:main',
          'service:-document',
          'event_dispatcher:main'
        ];

        let env = appInstance.lookup('-environment:main');
        singletons.push(env.isInteractive ? 'renderer:-dom' : 'renderer:-inert');

        singletons.forEach(key => {
          assert.strictEqual(
            chatEngineInstance.lookup(key),
            appInstance.lookup(key),
            `Engine and parent app share singleton '${key}'`);
        });
      });
  }

  ['can build a registry via ApplicationInstance.setupRegistry() -- simulates ember-test-helpers'](assert) {
    let namespace = EmberObject.create({
      Resolver: { create: function() { } }
    });

    let registry = Application.buildRegistry(namespace);

    ApplicationInstance.setupRegistry(registry);

    assert.equal(registry.resolve('service:-document'), document);
  }
});
