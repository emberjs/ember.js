import { setOwner } from '@ember/-internals/owner';
import Controller from '@ember/controller';
import {
  buildOwner,
  moduleFor,
  AbstractTestCase,
  ApplicationTestCase,
  runDestroy,
  runTask,
} from 'internal-test-helpers';
import { Component } from '@ember/-internals/glimmer';

/*
 In Ember 1.x, controllers subtly affect things like template scope
 and action targets in exciting and often inscrutable ways. This test
 file contains integration tests that verify the correct behavior of
 the many parts of the system that change and rely upon controller scope,
 from the runtime up to the templating layer.
*/

moduleFor(
  '@ember/controller',
  class extends AbstractTestCase {
    ["@test transitionToRoute considers an engine's mountPoint"](assert) {
      let router = {
        transitionTo(route) {
          return route;
        },
      };

      let engineInstance = buildOwner({
        ownerOptions: {
          routable: true,
          mountPoint: 'foo.bar',
        },
      });

      let controller = Controller.create({ target: router });
      setOwner(controller, engineInstance);

      expectDeprecation(() => {
        assert.strictEqual(
          controller.transitionToRoute('application'),
          'foo.bar.application',
          'properly prefixes application route'
        );
      }, /Calling transitionToRoute on a controller is deprecated/);
      expectDeprecation(() => {
        assert.strictEqual(
          controller.transitionToRoute('posts'),
          'foo.bar.posts',
          'properly prefixes child routes'
        );
      }, /Calling transitionToRoute on a controller is deprecated/);
      expectDeprecation(() => {
        assert.throws(
          () => controller.transitionToRoute('/posts'),
          'throws when trying to use a url'
        );
      }, /Calling transitionToRoute on a controller is deprecated/);

      let queryParams = {};
      expectDeprecation(() => {
        assert.strictEqual(
          controller.transitionToRoute(queryParams),
          queryParams,
          'passes query param only transitions through'
        );
      }, /Calling transitionToRoute on a controller is deprecated/);

      runDestroy(engineInstance);
    }

    ["@test replaceRoute considers an engine's mountPoint"](assert) {
      let router = {
        replaceWith(route) {
          return route;
        },
      };

      let engineInstance = buildOwner({
        ownerOptions: {
          routable: true,
          mountPoint: 'foo.bar',
        },
      });

      let controller = Controller.create({ target: router });
      setOwner(controller, engineInstance);

      expectDeprecation(() => {
        assert.strictEqual(
          controller.replaceRoute('application'),
          'foo.bar.application',
          'properly prefixes application route'
        );
      }, /Calling replaceRoute on a controller is deprecated/);
      expectDeprecation(() => {
        assert.strictEqual(
          controller.replaceRoute('posts'),
          'foo.bar.posts',
          'properly prefixes child routes'
        );
      }, /Calling replaceRoute on a controller is deprecated/);
      expectDeprecation(() => {
        assert.throws(() => controller.replaceRoute('/posts'), 'throws when trying to use a url');
      }, /Calling replaceRoute on a controller is deprecated/);

      let queryParams = {};
      expectDeprecation(() => {
        assert.strictEqual(
          controller.replaceRoute(queryParams),
          queryParams,
          'passes query param only transitions through'
        );
      }, /Calling replaceRoute on a controller is deprecated/);

      runDestroy(engineInstance);
    }
  }
);

moduleFor(
  'Template scoping examples',
  class extends ApplicationTestCase {
    ['@test Actions inside an outlet go to the associated controller'](assert) {
      this.add(
        'controller:index',
        Controller.extend({
          actions: {
            componentAction() {
              assert.ok(true, 'controller received the action');
            },
          },
        })
      );

      this.addComponent('component-with-action', {
        ComponentClass: Component.extend({
          classNames: ['component-with-action'],
          click() {
            this.action();
          },
        }),
      });

      this.addTemplate('index', '{{component-with-action action=(action "componentAction")}}');

      return this.visit('/').then(() => {
        runTask(() => this.$('.component-with-action').click());
      });
    }
  }
);
