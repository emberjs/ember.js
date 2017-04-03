import { Controller } from 'ember-runtime';
import { moduleFor, ApplicationTestCase } from 'internal-test-helpers';
import { Component } from 'ember-glimmer';

/*
 In Ember 1.x, controllers subtly affect things like template scope
 and action targets in exciting and often inscrutable ways. This test
 file contains integration tests that verify the correct behavior of
 the many parts of the system that change and rely upon controller scope,
 from the runtime up to the templating layer.
*/

moduleFor('Template scoping examples', class extends ApplicationTestCase {
  ['@test Actions inside an outlet go to the associated controller'](assert) {
    this.add('controller:index', Controller.extend({
      actions: {
        componentAction() {
          assert.ok(true, 'controller recieved the action');
        }
      }
    }));

    this.addComponent('component-with-action', {
      ComponentClass: Component.extend({
        classNames: ['component-with-action'],
        click() {
          this.sendAction();
        }
      }),
    });

    this.addTemplate('index', '{{component-with-action action="componentAction"}}');

    return this.visit('/').then(() => {
      this.runTask(() => this.$('.component-with-action').click());
    });
  }
});
