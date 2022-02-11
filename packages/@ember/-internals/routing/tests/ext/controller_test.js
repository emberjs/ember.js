import { setOwner } from '@ember/-internals/owner';
import Controller from '@ember/controller';
import { buildOwner, moduleFor, runDestroy, AbstractTestCase } from 'internal-test-helpers';

moduleFor(
  '@ember/-internals/routing/ext/controller',
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
