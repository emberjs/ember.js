/* eslint-disable no-console */

import { module, test } from 'qunit';
import Resolver from 'ember-resolver';

module('ember-resolver withModules', function () {
  test('explicit withModules', function (assert) {
    let resolver = Resolver.withModules({
      'alpha/components/hello': {
        default: function () {
          return 'it works';
        },
      },
    }).create({ namespace: { modulePrefix: 'alpha' } });

    assert.strictEqual((0, resolver.resolve('component:hello'))(), 'it works');
  });

  test('can resolve self', function (assert) {
    let resolver = Resolver.create({ namespace: { modulePrefix: 'alpha' } });
    assert.strictEqual(resolver, resolver.resolve('resolver:current').create());
  });

  test('can addModules', function (assert) {
    let startingModules = {};
    let resolver = Resolver.withModules({}).create({
      namespace: { modulePrefix: 'alpha' },
    });

    resolver.addModules({
      'alpha/components/hello': {
        default: function () {
          return 'it works';
        },
      },
    });

    assert.strictEqual((0, resolver.resolve('component:hello'))(), 'it works');
    assert.deepEqual(
      [],
      Object.keys(startingModules),
      'did not mutate starting modules'
    );
  });
});
