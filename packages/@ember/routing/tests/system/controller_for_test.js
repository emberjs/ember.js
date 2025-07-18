import Controller from '@ember/controller';
import { controllerFor, generateController } from '@ember/routing/-internals';
import { moduleFor, ApplicationTestCase } from 'internal-test-helpers';
import { getDebugFunction, setDebugFunction } from '@ember/debug';

const originalDebug = getDebugFunction('debug');
const noop = function () {};

moduleFor(
  'controllerFor',
  class extends ApplicationTestCase {
    constructor() {
      setDebugFunction('debug', noop);
      super();
    }

    teardown() {
      setDebugFunction('debug', originalDebug);
    }

    ['@test controllerFor should lookup for registered controllers'](assert) {
      this.add('controller:app', class extends Controller {});

      return this.visit('/').then(() => {
        let appInstance = this.applicationInstance;
        let appController = appInstance.lookup('controller:app');
        let controller = controllerFor(appInstance, 'app');
        assert.equal(appController, controller, 'should find app controller');
      });
    }
  }
);

moduleFor(
  'generateController',
  class extends ApplicationTestCase {
    constructor() {
      setDebugFunction('debug', noop);
      super();
    }

    teardown() {
      setDebugFunction('debug', originalDebug);
    }

    ['@test generateController should return Controller'](assert) {
      return this.visit('/').then(() => {
        let controller = generateController(this.applicationInstance, 'home');
        assert.ok(controller instanceof Controller, 'should return controller');
      });
    }

    ['@test generateController should return controller:basic if resolved'](assert) {
      let BasicController = class extends Controller {};
      this.add('controller:basic', BasicController);

      return this.visit('/').then(() => {
        let controller = generateController(this.applicationInstance, 'home');
        assert.ok(controller instanceof BasicController, 'should return controller');
      });
    }

    ['@test generateController should return controller:basic if registered'](assert) {
      let BasicController = class extends Controller {};
      this.application.register('controller:basic', BasicController);

      return this.visit('/').then(() => {
        let controller = generateController(this.applicationInstance, 'home');

        assert.ok(controller instanceof BasicController, 'should return base class of controller');
      });
    }
  }
);
