import { setOwner } from 'ember-utils';
import { Controller } from 'ember-runtime';
import { buildOwner, moduleFor, AbstractTestCase } from 'internal-test-helpers';

moduleFor(
  'ember-routing/ext/controller',
  class extends AbstractTestCase {
    ["@test transitionToRoute considers an engine's mountPoint"](assert) {
      let router = {
        transitionTo(route) {
          return route;
        }
      };

      let engineInstance = buildOwner({
        ownerOptions: {
          routable: true,
          mountPoint: 'foo.bar'
        }
      });

      let controller = Controller.create({ target: router });
      setOwner(controller, engineInstance);

      assert.strictEqual(
        controller.transitionToRoute('application'),
        'foo.bar.application',
        'properly prefixes application route'
      );
      assert.strictEqual(
        controller.transitionToRoute('posts'),
        'foo.bar.posts',
        'properly prefixes child routes'
      );
      assert.throws(
        () => controller.transitionToRoute('/posts'),
        'throws when trying to use a url'
      );

      let queryParams = {};
      assert.strictEqual(
        controller.transitionToRoute(queryParams),
        queryParams,
        'passes query param only transitions through'
      );
    }

    ["@test replaceRoute considers an engine's mountPoint"](assert) {
      let router = {
        replaceWith(route) {
          return route;
        }
      };

      let engineInstance = buildOwner({
        ownerOptions: {
          routable: true,
          mountPoint: 'foo.bar'
        }
      });

      let controller = Controller.create({ target: router });
      setOwner(controller, engineInstance);

      assert.strictEqual(
        controller.replaceRoute('application'),
        'foo.bar.application',
        'properly prefixes application route'
      );
      assert.strictEqual(
        controller.replaceRoute('posts'),
        'foo.bar.posts',
        'properly prefixes child routes'
      );
      assert.throws(
        () => controller.replaceRoute('/posts'),
        'throws when trying to use a url'
      );

      let queryParams = {};
      assert.strictEqual(
        controller.replaceRoute(queryParams),
        queryParams,
        'passes query param only transitions through'
      );
    }
  }
);
