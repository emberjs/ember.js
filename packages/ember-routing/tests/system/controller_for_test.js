import {
  Controller
} from 'ember-runtime';
import controllerFor from '../../system/controller_for';
import generateController from '../../system/generate_controller';
import { EMBER_NO_DOUBLE_EXTEND } from 'ember/features';
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

  ['@test generateController should return App.Controller if provided'](assert) {
    let MainController = Controller.extend();
    this.add('controller:basic', MainController);

    return this.visit('/').then(() => {
      let controller = generateController(this.applicationInstance, 'home');
      assert.ok(controller instanceof MainController, 'should return controller');
    });
  }

  ['@test generateController should return controller:basic if provided'](assert) {
    let controller;
    let BasicController = Controller.extend();
    this.add('controller:basic', BasicController);

    return this.visit('/').then(() => {
      controller = generateController(this.applicationInstance, 'home');

      if (EMBER_NO_DOUBLE_EXTEND) {
        assert.ok(controller instanceof BasicController, 'should return base class of controller');
      } else {
        let doubleExtendedFactory;
        ignoreDeprecation(() => {
          doubleExtendedFactory = this.applicationInstance._lookupFactory('controller:basic');
        });
        assert.ok(controller instanceof doubleExtendedFactory, 'should return double-extended controller');
      }
    });
  }
});
