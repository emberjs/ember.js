import { MatchCallback } from 'route-recognizer';
import Router, { Route, Transition } from 'router';
import { Dict, Maybe } from 'router/core';
import RouteInfo from 'router/route-info';
import { Promise } from 'rsvp';
import {
  createHandler,
  flushBackburner,
  module,
  test,
  TestRouter,
  transitionTo,
  trigger,
} from './test_helpers';

let router: Router<Route>, handlers: Dict<Route>, expectedUrl: Maybe<string>;
let scenarios = [
  {
    name: 'Sync Get Handler',
    getHandler: function (name: string) {
      return handlers[name] || (handlers[name] = createHandler('empty'));
    },
  },
  {
    name: 'Async Get Handler',
    getHandler: function (name: string) {
      return Promise.resolve(handlers[name] || (handlers[name] = createHandler('empty')));
    },
  },
];

scenarios.forEach(function (scenario) {
  module('Query Params (' + scenario.name + ')', {
    setup: function (assert: Assert) {
      handlers = {};
      expectedUrl = undefined;

      map(assert, function (match) {
        match('/index').to('index');
        match('/parent').to('parent', function (match) {
          match('/').to('parentIndex');
          match('/child').to('parentChild');
        });
      });
    },
  });

  function map(assert: Assert, fn: MatchCallback) {
    class QPRouter extends TestRouter {
      routeDidChange() {}
      routeWillChange() {}
      didTransition() {}
      willTransition() {}
      triggerEvent(
        handlerInfos: RouteInfo<Route>[],
        ignoreFailure: boolean,
        name: string,
        args: any[]
      ) {
        trigger(handlerInfos, ignoreFailure, name, ...args);
      }
      replaceURL(name: string) {
        this.updateURL(name);
      }
      getRoute(name: string) {
        return scenario.getHandler(name);
      }
      getSerializer(): never {
        throw new Error('never');
      }
      updateURL(newUrl: string) {
        if (expectedUrl) {
          assert.equal(newUrl, expectedUrl, 'The url is ' + newUrl + ' as expected');
        }
      }
    }
    router = new QPRouter();
    router.map(fn);
  }

  function consumeAllFinalQueryParams(params: Dict<unknown>, finalParams: Dict<unknown>[]) {
    for (let key in params) {
      let value = params[key];
      delete params[key];
      finalParams.push({ key: key, value: value });
    }
    return true;
  }

  test('a change in query params fires a queryParamsDidChange event', function (assert) {
    assert.expect(7);

    let count = 0;
    handlers.index = createHandler('index', {
      setup: function () {
        assert.equal(
          count,
          0,
          "setup should be called exactly once since we're only changing query params after the first transition"
        );
      },
      events: {
        finalizeQueryParamChange: consumeAllFinalQueryParams,

        queryParamsDidChange: function (changed: Dict<unknown>, all: Dict<unknown>) {
          switch (count) {
            case 0:
              assert.ok(false, "shouldn't fire on first trans");
              break;
            case 1:
              assert.deepEqual(changed, { foo: '5' });
              assert.deepEqual(all, { foo: '5' });
              break;
            case 2:
              assert.deepEqual(changed, { bar: '6' });
              assert.deepEqual(all, { foo: '5', bar: '6' });
              break;
            case 3:
              assert.deepEqual(changed, { foo: '8', bar: '9' });
              assert.deepEqual(all, { foo: '8', bar: '9' });
              break;
          }
        },
      },
    });

    transitionTo(router, '/index');
    count = 1;
    transitionTo(router, '/index?foo=5');
    count = 2;
    transitionTo(router, '/index?foo=5&bar=6');
    count = 3;
    transitionTo(router, '/index?foo=8&bar=9');
  });

  test('transitioning between routes fires a queryParamsDidChange event', function (assert) {
    assert.expect(8);
    let count = 0;
    handlers.parent = createHandler('parent', {
      events: {
        finalizeQueryParamChange: consumeAllFinalQueryParams,
        queryParamsDidChange: function (changed: Dict<unknown>, all: Dict<unknown>) {
          switch (count) {
            case 0:
              assert.ok(false, "shouldn't fire on first trans");
              break;
            case 1:
              assert.deepEqual(changed, { foo: '5' });
              assert.deepEqual(all, { foo: '5' });
              break;
            case 2:
              assert.deepEqual(changed, { bar: '6' });
              assert.deepEqual(all, { foo: '5', bar: '6' });
              break;
            case 3:
              assert.deepEqual(changed, { foo: '8', bar: '9' });
              assert.deepEqual(all, { foo: '8', bar: '9' });
              break;
            case 4:
              assert.deepEqual(changed, { foo: '10', bar: '11' });
              assert.deepEqual(all, { foo: '10', bar: '11' });
          }
        },
      },
    });

    handlers.parentChild = createHandler('parentChild', {
      events: {
        finalizeQueryParamChange: function () {
          // Do nothing since this handler isn't consuming the QPs
          return true;
        },

        queryParamsDidChange: function () {
          return true;
        },
      },
    });
    transitionTo(router, '/parent/child');
    count = 1;
    transitionTo(router, '/parent/child?foo=5');
    count = 2;
    transitionTo(router, '/parent/child?foo=5&bar=6');
    count = 3;
    transitionTo(router, '/parent/child?foo=8&bar=9');
    count = 4;
    transitionTo(router, '/parent?foo=10&bar=11');
  });

  test('Refreshing the route when changing only query params should correctly set queryParamsOnly', function (assert) {
    assert.expect(16);

    let initialTransition = true;

    let expectReplace: boolean;

    router.updateURL = function () {
      assert.notOk(expectReplace, 'Expected replace but update was called');
    };

    router.replaceURL = function () {
      assert.ok(expectReplace, 'Replace was called but update was expected');
    };

    handlers.index = createHandler('index', {
      events: {
        finalizeQueryParamChange: function (
          _params: Dict<unknown>,
          _finalParams: Dict<unknown>[],
          transition: Transition
        ) {
          if (initialTransition) {
            assert.notOk(transition.queryParamsOnly, 'should not be query params only transition');
            initialTransition = false;
          } else {
            assert.ok(transition.queryParamsOnly, 'should be query params only transition');
          }
        },

        queryParamsDidChange: function () {
          router.refresh();
        },
      },
    });

    handlers.child = createHandler('child', {
      events: {
        finalizeQueryParamChange: function (
          _params: Dict<unknown>,
          _finalParams: Dict<unknown>,
          transition: Transition
        ) {
          assert.notOk(transition.queryParamsOnly, 'should be normal transition');
          return true;
        },
      },
    });

    expectReplace = false;

    let transition = transitionTo(router, '/index');
    assert.notOk(
      transition.queryParamsOnly,
      'Initial transition is not query params only transition'
    );

    transition = transitionTo(router, '/index?foo=123');

    assert.ok(
      transition.queryParamsOnly,
      'Second transition with updateURL intent is query params only'
    );

    expectReplace = true;
    transition = router.replaceWith('/index?foo=456');
    flushBackburner();

    assert.ok(
      transition.queryParamsOnly,
      'Third transition with replaceURL intent is query params only'
    );
    expectReplace = false;

    transition = transitionTo(router, '/parent/child?foo=789');
    assert.notOk(
      transition.queryParamsOnly,
      'Fourth transition with transitionTo intent is not query params only'
    );

    transition = transitionTo(router, '/parent/child?foo=901');
    assert.ok(
      transition.queryParamsOnly,
      'Firth transition with transitionTo intent is query params only'
    );

    transition = transitionTo(router, '/index?foo=123');
    assert.notOk(
      transition.queryParamsOnly,
      'Firth transition with transitionTo intent is not query params only'
    );
  });

  test('a handler can opt into a full-on transition by calling refresh', function (assert) {
    assert.expect(3);

    let count = 0;
    handlers.index = createHandler('index', {
      model: function () {
        switch (count) {
          case 0:
            assert.ok(true, 'model called in initial transition');
            break;
          case 1:
            assert.ok(true, 'model called during refresh');
            break;
          case 2:
            assert.ok(true, 'model called during refresh w 2 QPs');
            break;
          default:
            assert.ok(false, "shouldn't have been called for " + count);
        }
      },
      events: {
        queryParamsDidChange: function () {
          if (count === 0) {
            assert.ok(false, "shouldn't fire on first trans");
          } else {
            router.refresh(this as Route);
          }
        },
        finalizeQueryParamChange: consumeAllFinalQueryParams,
      },
    });

    transitionTo(router, '/index');
    count = 1;
    transitionTo(router, '/index?foo=5');
    count = 2;
    transitionTo(router, '/index?foo=5&wat=lol');
  });

  test('at the end of a query param change a finalizeQueryParamChange event is fired', function (assert) {
    assert.expect(5);

    let eventHandled = false;
    let count = 0;
    handlers.index = createHandler('index', {
      setup: function () {
        assert.notOk(eventHandled, 'setup should happen before eventHandled');
      },
      events: {
        finalizeQueryParamChange: function (all: Dict<unknown>) {
          eventHandled = true;
          switch (count) {
            case 0:
              assert.deepEqual(all, {});
              break;
            case 1:
              assert.deepEqual(all, { foo: '5' });
              break;
            case 2:
              assert.deepEqual(all, { foo: '5', bar: '6' });
              break;
            case 3:
              assert.deepEqual(all, { foo: '8', bar: '9' });
              break;
          }
        },
      },
    });

    transitionTo(router, '/index');
    count = 1;
    transitionTo(router, '/index?foo=5');
    count = 2;
    transitionTo(router, '/index?foo=5&bar=6');
    count = 3;
    transitionTo(router, '/index?foo=8&bar=9');
  });

  test('failing to consume QPs in finalize event tells the router it no longer has those params', function (assert) {
    assert.expect(2);

    handlers.index = createHandler('index', {
      setup: function () {
        assert.ok(true, 'setup was entered');
      },
    });

    transitionTo(router, '/index?foo=8&bar=9');

    assert.deepEqual(router.state!.queryParams, {});
  });

  test('consuming QPs in finalize event tells the router those params are active', function (assert) {
    assert.expect(1);

    handlers.index = createHandler('index', {
      events: {
        finalizeQueryParamChange: function (params: Dict<unknown>, finalParams: Dict<unknown>[]) {
          finalParams.push({ key: 'foo', value: params.foo });
        },
      },
    });

    transitionTo(router, '/index?foo=8&bar=9');
    assert.deepEqual(router.state!.queryParams, { foo: '8' });
  });

  test("can hide query params from URL if they're marked as visible=false in finalizeQueryParamChange", function (assert) {
    assert.expect(2);

    handlers.index = createHandler('index', {
      events: {
        finalizeQueryParamChange: function (params: Dict<unknown>, finalParams: Dict<unknown>[]) {
          finalParams.push({ key: 'foo', value: params.foo, visible: false });
          finalParams.push({ key: 'bar', value: params.bar });
        },
      },
    });

    expectedUrl = '/index?bar=9';
    transitionTo(router, '/index?foo=8&bar=9');
    assert.deepEqual(router.state!.queryParams, { foo: '8', bar: '9' });
  });

  test('transitionTo() works with single query param arg', function (assert) {
    assert.expect(2);

    handlers.index = createHandler('index', {
      events: {
        finalizeQueryParamChange: function (params: Dict<unknown>, finalParams: Dict<unknown>[]) {
          finalParams.push({ key: 'foo', value: params.foo });
          finalParams.push({ key: 'bar', value: params.bar });
        },
      },
    });

    transitionTo(router, '/index?bar=9&foo=8');
    assert.deepEqual(router.state!.queryParams, { foo: '8', bar: '9' });

    expectedUrl = '/index?foo=123';
    transitionTo(router, { queryParams: { foo: '123' } });
  });

  test('handleURL will NOT follow up with a replace URL if query params are already in sync', function (assert) {
    assert.expect(0);

    router.replaceURL = function (url) {
      assert.ok(false, "query params are in sync, this replaceURL shouldn't happen: " + url);
    };

    router.handleURL('/index');
  });

  test('model hook receives queryParams', function (assert) {
    assert.expect(1);

    handlers.index = createHandler('index', {
      model: function (params: Dict<unknown>) {
        assert.deepEqual(params, { queryParams: { foo: '5' } });
      },
    });

    transitionTo(router, '/index?foo=5');
  });

  test('can cause full transition by calling refresh within queryParamsDidChange', function (assert) {
    assert.expect(5);

    let modelCount = 0;
    handlers.index = createHandler('index', {
      model: function (params: Dict<unknown>) {
        ++modelCount;
        if (modelCount === 1) {
          assert.deepEqual(params, { queryParams: { foo: '5' } });
        } else if (modelCount === 2) {
          assert.deepEqual(params, { queryParams: { foo: '6' } });
        }
      },
      events: {
        queryParamsDidChange: function () {
          router.refresh(this as Route);
        },
      },
    });

    assert.equal(modelCount, 0);
    transitionTo(router, '/index?foo=5');
    assert.equal(modelCount, 1);
    transitionTo(router, '/index?foo=6');
    assert.equal(modelCount, 2);
  });

  test('can retry a query-params refresh', function (assert) {
    let causeRedirect = false;

    map(assert, function (match) {
      match('/index').to('index');
      match('/login').to('login');
    });

    assert.expect(11);

    let redirect = false;
    let indexTransition: Transition;
    handlers.index = createHandler('index', {
      model: function (_params: Dict<unknown>, transition: Transition) {
        if (redirect) {
          indexTransition = transition;
          router.transitionTo('login');
        }
      },
      setup: function () {
        assert.ok(true, 'index#setup');
      },
      events: {
        queryParamsDidChange: function () {
          assert.ok(true, 'index#queryParamsDidChange');
          redirect = causeRedirect;
          router.refresh(this as Route);
        },
        finalizeQueryParamChange: function (params: Dict<unknown>, finalParams: Dict<unknown>[]) {
          (finalParams as any).foo = params.foo; // TODO wat
          finalParams.push({ key: 'foo', value: params.foo });
        },
      },
    });

    handlers.login = createHandler('login', {
      setup: function () {
        assert.ok(true, 'login#setup');
      },
    });

    expectedUrl = '/index?foo=abc';
    transitionTo(router, '/index?foo=abc');
    causeRedirect = true;
    expectedUrl = '/login';
    transitionTo(router, '/index?foo=def');
    flushBackburner();
    causeRedirect = false;
    redirect = false;
    assert.ok(indexTransition!, 'index transition was saved');
    indexTransition!.retry();
    expectedUrl = '/index?foo=def';
  });

  test('tests whether query params to transitionTo are considered active', function (assert) {
    assert.expect(6);

    handlers.index = createHandler('index', {
      events: {
        finalizeQueryParamChange: function (params: Dict<unknown>, finalParams: Dict<unknown>[]) {
          finalParams.push({ key: 'foo', value: params.foo });
          finalParams.push({ key: 'bar', value: params.bar });
        },
      },
    });

    transitionTo(router, '/index?foo=8&bar=9');
    assert.deepEqual(router.state!.queryParams, { foo: '8', bar: '9' });
    assert.ok(
      router.isActive('index', { queryParams: { foo: '8', bar: '9' } }),
      'The index handler is active'
    );
    assert.ok(
      router.isActive('index', { queryParams: { foo: 8, bar: 9 } }),
      'Works when property is number'
    );
    assert.notOk(
      router.isActive('index', { queryParams: { foo: '9' } }),
      'Only supply one changed query param'
    );
    assert.notOk(
      router.isActive('index', {
        queryParams: { foo: '8', bar: '10', baz: '11' },
      }),
      'A new query param was added'
    );
    assert.notOk(
      router.isActive('index', { queryParams: { foo: '8', bar: '11' } }),
      'A query param changed'
    );
  });

  test('tests whether array query params to transitionTo are considered active', function (assert) {
    assert.expect(7);

    handlers.index = createHandler('index', {
      events: {
        finalizeQueryParamChange: function (params: Dict<unknown>, finalParams: Dict<unknown>[]) {
          finalParams.push({ key: 'foo', value: params.foo });
        },
      },
    });

    transitionTo(router, '/index?foo[]=1&foo[]=2');
    assert.deepEqual(router.state!.queryParams, { foo: ['1', '2'] });
    assert.ok(
      router.isActive('index', { queryParams: { foo: ['1', '2'] } }),
      'The index handler is active'
    );
    assert.ok(
      router.isActive('index', { queryParams: { foo: [1, 2] } }),
      'Works when array has numeric elements'
    );
    assert.notOk(router.isActive('index', { queryParams: { foo: ['2', '1'] } }), 'Change order');
    assert.notOk(
      router.isActive('index', { queryParams: { foo: ['1', '2', '3'] } }),
      'Change Length'
    );
    assert.notOk(router.isActive('index', { queryParams: { foo: ['3', '4'] } }), 'Change Content');
    assert.notOk(router.isActive('index', { queryParams: { foo: [] } }), 'Empty Array');
  });
});
