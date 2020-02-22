import { buildOwner, moduleFor, AbstractTestCase } from 'internal-test-helpers';
import { setOwner } from '@ember/-internals/owner';
import RouterService from '../../lib/services/router';

moduleFor(
  'RouterService with engines',
  class extends AbstractTestCase {
    ["@test transitionTo considers an engine's mountPoint"](assert) {
      let router = {
        on() {},
        off() {},
        _doTransition(route) {
          return { route };
        },
      };

      let engineInstance = buildOwner({
        ownerOptions: {
          routable: true,
          mountPoint: 'foo.bar',
        },
      });

      let routerService = RouterService.create({ _router: router });
      setOwner(routerService, engineInstance);

      assert.strictEqual(
        routerService.transitionTo('application').route,
        'foo.bar.application',
        'properly prefixes application route'
      );
      assert.strictEqual(
        routerService.transitionTo('posts').route,
        'foo.bar.posts',
        'properly prefixes child routes'
      );
      assert.throws(() => routerService.transitionTo('/posts'), 'throws when trying to use a url');

      let queryParams = {};
      assert.strictEqual(
        routerService.transitionTo(queryParams).route,
        queryParams,
        'passes query param only transitions through'
      );
    }
  }
);
