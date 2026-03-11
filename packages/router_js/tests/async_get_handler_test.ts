import { Route } from 'router';
import { Dict } from 'router/core';
import { Promise } from 'rsvp';
import { createHandler, TestRouter } from './test_helpers';

function map(router: TestRouter) {
  router.map(function (match) {
    match('/index').to('index');
    match('/foo').to('foo', function (match) {
      match('/').to('fooIndex');
      match('/bar').to('fooBar');
    });
  });
}

// Intentionally use QUnit.module instead of module from test_helpers
// so that we avoid using Backburner to handle the async portions of
// the test suite
let routes: Dict<Route>;
let router: TestRouter;
QUnit.module('Async Get Handler', {
  beforeEach: function () {
    QUnit.config.testTimeout = 60000;
    routes = {};
  },

  afterEach: function () {
    QUnit.config.testTimeout = 1000;
  },
});

QUnit.test('can transition to lazily-resolved routes', function (assert) {
  let done = assert.async();

  class LazyRouter extends TestRouter {
    getRoute(name: string) {
      return new Promise(function (resolve) {
        setTimeout(function () {
          resolve(routes[name] || (routes[name] = createHandler('empty')));
        }, 1);
      });
    }
  }

  router = new LazyRouter();
  map(router);

  let fooCalled = false;
  let fooBarCalled = false;

  routes.foo = createHandler('foo', {
    model() {
      fooCalled = true;
    },
  });
  routes.fooBar = createHandler('fooBar', {
    model: function () {
      fooBarCalled = true;
    },
  });

  router.transitionTo('/foo/bar').then(function () {
    assert.ok(fooCalled, 'foo is called before transition ends');
    assert.ok(fooBarCalled, 'fooBar is called before transition ends');
    done();
  });

  assert.ok(!fooCalled, 'foo is not called synchronously');
  assert.ok(!fooBarCalled, 'fooBar is not called synchronously');
});

QUnit.test('calls hooks of lazily-resolved routes in order', function (assert) {
  let done = assert.async();
  let operations: string[] = [];

  class LazyRouter extends TestRouter {
    getRoute(name: string) {
      operations.push('get handler ' + name);
      return new Promise(function (resolve) {
        let timeoutLength = name === 'foo' ? 100 : 1;
        setTimeout(function () {
          operations.push('resolved ' + name);
          resolve(routes[name] || (routes[name] = createHandler('empty')));
        }, timeoutLength);
      });
    }
  }

  router = new LazyRouter();
  map(router);

  routes.foo = createHandler('foo', {
    model: function () {
      operations.push('model foo');
    },
  });
  routes.fooBar = createHandler('fooBar', {
    model: function () {
      operations.push('model fooBar');
    },
  });

  router.transitionTo('/foo/bar').then(function () {
    assert.deepEqual(
      operations,
      [
        'get handler foo',
        'get handler fooBar',
        'resolved fooBar',
        'resolved foo',
        'model foo',
        'model fooBar',
      ],
      'order of operations is correct'
    );
    done();
  }, null);
});
