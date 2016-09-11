import buildOwner from 'container/tests/test-helpers/build-owner';
import Controller from 'ember-runtime/controllers/controller';
import { setOwner } from 'container/owner';
import isEnabled from 'ember-metal/features';

if (isEnabled('ember-application-engines')) {
  QUnit.module('ember-routing/ext/controller');

  QUnit.test('transitionToRoute considers an engine\'s mountPoint', function() {
    expect(4);

    let router = {
      transitionTo(route) {
        return route;
      }
    };

    let engineInstance = buildOwner({
      routable: true,
      mountPoint: 'foo.bar'
    });

    let controller = Controller.create({ target: router });
    setOwner(controller, engineInstance);

    strictEqual(controller.transitionToRoute('application'), 'foo.bar.application', 'properly prefixes application route');
    strictEqual(controller.transitionToRoute('posts'), 'foo.bar.posts', 'properly prefixes child routes');
    throws(() => controller.transitionToRoute('/posts'), 'throws when trying to use a url');

    let queryParams = {};
    strictEqual(controller.transitionToRoute(queryParams), queryParams, 'passes query param only transitions through');
  });
}
