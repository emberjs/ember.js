import {
  Controller
} from 'ember-runtime';
import controllerFor from '../../system/controller_for';
import generateController from '../../system/generate_controller';
import { moduleFor, ApplicationTestCase } from 'internal-test-helpers';

moduleFor('Ember.controllerFor', class extends ApplicationTestCase {
  ['@test controllerFor should lookup for registered controllers'](assert) {
    this.add('controller:app', Controller.extend());

    return this.visit('/').then(() => {
      let appInstance = this.applicationInstance;
      let appController = appInstance.lookup('controller:app');
      let controller = controllerFor(appInstance, 'app');
      assert.equal(appController, controller, 'should find app controller');
    });
  }
});

moduleFor('Ember.generateController', class extends ApplicationTestCase {
  ['@test generateController should return Ember.Controller'](assert) {
    return this.visit('/').then(() => {
      let controller = generateController(this.applicationInstance, 'home');
      assert.ok(controller instanceof Controller, 'should return controller');
    });
  }

  ['@test generateController should return controller:basic if resolved'](assert) {
    let BasicController = Controller.extend();
    this.add('controller:basic', BasicController);

    return this.visit('/').then(() => {
      let controller = generateController(this.applicationInstance, 'home');
      assert.ok(controller instanceof BasicController, 'should return controller');
    });
  }

  ['@test generateController should return controller:basic if registered'](assert) {
    let BasicController = Controller.extend();
    this.application.register('controller:basic', BasicController);

    return this.visit('/').then(() => {
      let controller = generateController(this.applicationInstance, 'home');

      assert.ok(controller instanceof BasicController, 'should return base class of controller');
    });
  }
});
