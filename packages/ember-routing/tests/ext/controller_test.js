import { setOwner } from 'ember-utils';
import { buildOwner } from 'internal-test-helpers';
import { Controller } from 'ember-runtime';

QUnit.module('ember-routing/ext/controller');

QUnit.test('transitionToRoute considers an engine\'s mountPoint', function() {
  expect(4);

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

  strictEqual(controller.transitionToRoute('application'), 'foo.bar.application', 'properly prefixes application route');
  strictEqual(controller.transitionToRoute('posts'), 'foo.bar.posts', 'properly prefixes child routes');
  throws(() => controller.transitionToRoute('/posts'), 'throws when trying to use a url');

  let queryParams = {};
  strictEqual(controller.transitionToRoute(queryParams), queryParams, 'passes query param only transitions through');
});
