import type { Transition } from '../index';
import type { Dict } from '../lib/core';
import type { IModel, Route } from '../lib/route-info';
import {
  ResolvedRouteInfo,
  toReadOnlyRouteInfo,
  UnresolvedRouteInfoByObject,
  UnresolvedRouteInfoByParam,
} from '../lib/route-info';
import InternalTransition from '../lib/transition';
import URLTransitionIntent from '../lib/transition-intent/url-transition-intent';
import { resolve } from 'rsvp';
import { createHandler, createHandlerInfo, TestRouter } from './test_helpers';

QUnit.module('RouteInfo');

QUnit.test('ResolvedRouteInfo resolve to themselves', function (assert) {
  assert.expect(1);
  let router = new TestRouter();
  let routeInfo = new ResolvedRouteInfo(router, 'foo', [], {}, createHandler('empty'));
  let intent = new URLTransitionIntent(router, 'foo');

  let transition = new InternalTransition(router, intent, undefined);

  routeInfo.resolve(transition).then((resolvedRouteInfo) => {
    assert.equal(routeInfo, resolvedRouteInfo);
  });
});

QUnit.test('UnresolvedRouteInfoByParam defaults params to {}', function (assert) {
  let router = new TestRouter();
  let routeInfo = new UnresolvedRouteInfoByParam(router, 'empty', [], {});
  assert.deepEqual(routeInfo.params, {});

  let routeInfo2 = new UnresolvedRouteInfoByParam(router, 'empty', [], { foo: 5 });
  assert.deepEqual(routeInfo2.params, { foo: 5 });
});

QUnit.test('RouteInfo can be aborted mid-resolve', function (assert) {
  assert.expect(1);

  let routeInfo = createHandlerInfo('stub');

  let transition = {} as Transition;
  transition.isAborted = true;

  routeInfo
    .resolve(transition)
    .then(() => {
      assert.ok(false, 'unreachable');
    })
    .catch((e) => {
      assert.equal(e.message, 'TransitionAborted');
    });
});

QUnit.test('RouteInfo#resolve resolves with a ResolvedRouteInfo', function (assert) {
  assert.expect(1);

  let routeInfo = createHandlerInfo('stub');
  routeInfo.resolve({} as Transition).then((resolvedRouteInfo) => {
    assert.ok(resolvedRouteInfo instanceof ResolvedRouteInfo);
  });
});

QUnit.test('RouteInfo#resolve runs beforeModel hook on handler', function (assert) {
  assert.expect(1);

  let transition = {} as Transition;

  let routeInfo = createHandlerInfo('stub', {
    route: createHandler('stub', {
      beforeModel: function (currentTransition: Transition) {
        assert.equal(
          transition,
          currentTransition,
          'beforeModel was called with the payload we passed to resolve()'
        );
      },
    }),
  });

  routeInfo.resolve(transition).then(() => {
    assert.ok(true, 'routeInfo resolved successfully');
  });
});

QUnit.test('RouteInfo#resolve runs getModel hook', async function (assert) {
  assert.expect(2);

  let transition = {} as Transition;

  let routeInfo = createHandlerInfo('stub', {
    getModel(payload: Dict<unknown>) {
      assert.equal(payload, transition);
    },
  });

  routeInfo.resolve(transition).then(() => {
    assert.ok(true, 'routeInfo resolved successfully');
  });
});

/**
 * This test file was not being run before it was integrated from upstream and a number of these
 * tests were failing as soon as we started running it again.
 *
 * This test has some strange timing issues with the strange backburner wrapper it's doing in the
 * test-helpers. We could not figure this out and really the solution should be to remove the strange
 * wrapper.
 *
 * TODO: unskip this test
 */
QUnit.skip('RouteInfo#resolve runs afterModel hook on handler', function (assert) {
  assert.expect(3);

  let transition = {} as Transition;
  let model = {};

  let routeInfo = createHandlerInfo('foo', {
    route: createHandler('foo', {
      afterModel(resolvedModel: Dict<unknown>, payload: Dict<unknown>) {
        assert.equal(resolvedModel, model, 'afterModel receives the value resolved by model');
        assert.equal(payload, transition);
        return resolve(123); // 123 should get ignored
      },
    }),
    getModel() {
      return resolve(model);
    },
  });

  routeInfo.resolve(transition).then((resolvedRouteInfo) => {
    assert.equal(resolvedRouteInfo.context, model, 'RouteInfo resolved with correct model');
  });
});

QUnit.test('UnresolvedRouteInfoByParam gets its model hook called', function (assert) {
  assert.expect(2);
  let router = new TestRouter();

  let transition = {} as Transition;

  let routeInfo = new UnresolvedRouteInfoByParam(
    router,
    'empty',
    [],
    { first_name: 'Alex', last_name: 'Matchnerd' },
    createHandler('h', {
      model(params: Dict<unknown>, payload: Dict<unknown>) {
        assert.equal(payload, transition);
        assert.deepEqual(params, {
          first_name: 'Alex',
          last_name: 'Matchnerd',
        });
      },
    })
  );

  routeInfo.resolve(transition);
});

QUnit.test('UnresolvedRouteInfoByObject does NOT get its model hook called', function (assert) {
  type Dorkleton = { name: string } & IModel;

  assert.expect(1);

  class TestRouteInfo extends UnresolvedRouteInfoByObject<Route<Dorkleton>> {
    __routeHandler?: Route<Dorkleton>;
    get route(): Route<Dorkleton> {
      if (this.__routeHandler) {
        return this.__routeHandler;
      }
      return (this.__routeHandler = createHandler('unresolved', {
        model: function () {
          assert.ok(false, "I shouldn't be called because I already have a context/model");
        },
      }));
    }
    set route(_value) {
      // TODO: this stub is here because something is setting this and it breaks if there isn't a setter
    }
  }

  let routeInfo = new TestRouteInfo(
    new TestRouter(),
    'unresolved',
    ['wat'],
    resolve({ name: 'dorkletons' })
  );

  routeInfo.resolve({} as Transition).then((resolvedRouteInfo) => {
    assert.equal(resolvedRouteInfo.context!.name, 'dorkletons');
  });
});

QUnit.test('RouteInfo.find', function (assert) {
  assert.expect(3);
  let router = new TestRouter();
  let parent = new ResolvedRouteInfo(router, 'parent', [], {}, createHandler('parent'));
  let child = new ResolvedRouteInfo(router, 'child', [], {}, createHandler('child'));
  let grandChild = new ResolvedRouteInfo(router, 'grandChild', [], {}, createHandler('grandChild'));
  let [root] = toReadOnlyRouteInfo([parent, child, grandChild]);

  enum RouteInfoNames {
    parent,
    child,
    grandChild,
  }

  root!.find((routInfo, i) => {
    assert.equal(RouteInfoNames[i], routInfo.name);
    return false;
  });
});

QUnit.test('RouteInfo.find returns matched', function (assert) {
  assert.expect(3);
  let router = new TestRouter();
  let parent = new ResolvedRouteInfo(router, 'parent', [], {}, createHandler('parent'));
  let child = new ResolvedRouteInfo(router, 'child', [], {}, createHandler('child'));
  let grandChild = new ResolvedRouteInfo(router, 'grandChild', [], {}, createHandler('grandChild'));
  let [root] = toReadOnlyRouteInfo([parent, child, grandChild]);

  enum RouteInfoNames {
    parent,
    child,
    grandChild,
  }

  let childInfo = root!.find((routInfo, i) => {
    assert.equal(RouteInfoNames[i], routInfo.name);
    return routInfo.name === 'child';
  });
  assert.equal(childInfo!.name, 'child');
});
