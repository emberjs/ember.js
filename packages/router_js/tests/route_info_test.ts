import type { Transition } from '../index';
import type { Dict } from '../lib/core';
import type { IModel, ClassicRoute } from '../lib/route-info';
import {
  ResolvedRouteInfo,
  toReadOnlyRouteInfo,
  UnresolvedRouteInfoByObject,
  UnresolvedRouteInfoByParam,
} from '../lib/route-info';
import InternalTransition, { STATE_SYMBOL } from '../lib/transition';
import { associateManagedRoute } from '../lib/route-manager';
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

  class TestRouteInfo extends UnresolvedRouteInfoByObject<ClassicRoute<Dorkleton>> {
    __routeHandler?: ClassicRoute<Dorkleton>;
    get route(): ClassicRoute<Dorkleton> {
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

QUnit.module('RouteInfo - non-gating manager');

// Builds a handler whose manager mimics a manager that does not gate
// getInvokable on enterPromise, so a route becomes resolved and renders
// (e.g. a loading substate) before its `enter` settles with the context.
// The `enter` hook is supplied per test.
function createNonGatingHandler(
  name: string,
  enter: (bucket: any, args: any) => Promise<unknown>
): ClassicRoute {
  let manager = {
    capabilities: { classicInterop: false },
    willEnter() {},
    enter,
    // Resolves immediately, without awaiting enterPromise. This is the
    // behaviour that makes the context unavailable at becomeResolved time.
    getInvokable() {
      return resolve(undefined);
    },
  };

  let handler = createHandler(name);
  associateManagedRoute(handler, manager as never, { route: handler, invokable: undefined });
  return handler;
}

QUnit.test(
  'resolved routeInfo.context syncs with the enter result when getInvokable does not gate on enterPromise',
  async function (assert) {
    assert.expect(3);

    let router = new TestRouter();
    let model = { id: 'real-model' };

    let resolveEnter!: (value: unknown) => void;
    let enterPromise = new Promise<unknown>((res) => {
      resolveEnter = res;
    });

    let handler = createNonGatingHandler('async-parent', () => enterPromise);
    let routeInfo = new UnresolvedRouteInfoByParam(router, 'async-parent', [], {}, handler);

    let transition = { isAborted: false } as unknown as InternalTransition<ClassicRoute>;

    let resolved = await routeInfo.resolve(transition);

    // becomeResolved ran before `enter` settled, so the snapshot is empty.
    assert.equal(resolved.context, undefined, 'context is undefined until enter settles');

    resolveEnter(model);
    await enterPromise;
    await resolve();

    assert.equal(resolved.context, model, 'resolved context syncs once enter settles');
    assert.equal(
      transition.resolvedModels!['async-parent'],
      model,
      'transition.resolvedModels is kept in sync for modelFor'
    );
  }
);

QUnit.test('getAncestorContext resolves with the ancestor enter result', async function (assert) {
  assert.expect(1);

  let router = new TestRouter();
  let ancestorModel = { id: 'ancestor-model' };

  // The ancestor's enter resolved with the model, but its `context` property
  // was never populated.
  let ancestorInfo = {
    name: 'parent',
    enterPromise: resolve(ancestorModel),
    context: undefined,
  };

  let captured: ((routeInfo: any) => Promise<unknown>) | undefined;
  let handler = createNonGatingHandler('parent.child', (_bucket, args) => {
    captured = args.getAncestorContext;
    return resolve(undefined);
  });
  let childInfo = new UnresolvedRouteInfoByParam(router, 'parent.child', [], {}, handler);

  let transition = { isAborted: false } as unknown as InternalTransition<ClassicRoute>;
  // Seed the transition state so getAncestorContext can find the ancestor.
  transition[STATE_SYMBOL] = { routeInfos: [ancestorInfo] } as never;

  await childInfo.resolve(transition);

  let result = await captured!({ name: 'parent' });
  assert.equal(result, ancestorModel, 'getAncestorContext resolves with the ancestor enter result');
});
