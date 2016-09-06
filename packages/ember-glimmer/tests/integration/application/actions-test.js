import { Controller } from 'ember-runtime';
import { moduleFor, ApplicationTest } from '../../utils/test-case';

moduleFor('Application test: actions', class extends ApplicationTest {
  ['@test actions in top level template application template target application controller'](assert) {
    assert.expect(1);

    this.registerController('application', Controller.extend({
      actions: {
        handleIt(arg) {
          assert.ok(true, 'controller received action properly');
        }
      }
    }));

    this.registerTemplate('application', '<button id="handle-it" {{action "handleIt"}}>Click!</button>');

    return this.visit('/')
      .then(() => {
        this.runTask(() => this.$('#handle-it').click());
      });
  }

  ['@test actions in nested outlet template target their controller'](assert) {
    assert.expect(1);

    this.registerController('application', Controller.extend({
      actions: {
        handleIt(arg) {
          assert.ok(false, 'application controller should not have received action!');
        }
      }
    }));

    this.registerController('index', Controller.extend({
      actions: {
        handleIt(arg) {
          assert.ok(true, 'controller received action properly');
        }
      }
    }));

    this.registerTemplate('index', '<button id="handle-it" {{action "handleIt"}}>Click!</button>');

    return this.visit('/')
      .then(() => {
        this.runTask(() => this.$('#handle-it').click());
      });
  }
});
