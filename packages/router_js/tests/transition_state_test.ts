import type { Transition } from '../index';
import type { Dict } from '../lib/core';
import {
  type BaseRoute,
  UnresolvedRouteInfoByObject,
  UnresolvedRouteInfoByParam,
} from '../lib/route-info';
import TransitionState, { type TransitionError } from '../lib/transition-state';
import { Promise, resolve } from 'rsvp';
import { createHandler, createHandlerInfo, TestRouter } from './test_helpers';
import { associateRouteManagement } from '../lib/route-manager';

QUnit.module('TransitionState');

QUnit.test('it starts off with default state', function (assert) {
  let state = new TransitionState();
  assert.deepEqual(state.routeInfos, [], 'it has an array of handlerInfos');
});

QUnit.test("#resolve delegates to handleInfo objects' resolve()", function (assert) {
  assert.expect(3);

  let state = new TransitionState();

  let counter = 0;

  let resolvedHandlerInfos: any[] = [{}, {}];

  state.routeInfos = [
    createHandlerInfo('one', {
      resolve: function () {
        ++counter;
        assert.equal(counter, 1);
        return resolve(resolvedHandlerInfos[0]);
      },
    }),
    createHandlerInfo('two', {
      resolve: function () {
        ++counter;
        assert.equal(counter, 2);
        return resolve(resolvedHandlerInfos[1]);
      },
    }),
  ];

  state.resolve({} as Transition).then(function (result: TransitionState<BaseRoute>) {
    assert.deepEqual(result.routeInfos, resolvedHandlerInfos);
  });
});

QUnit.test('State resolution can be halted', async function (assert) {
  assert.expect(1);

  let state = new TransitionState();

  state.routeInfos = [
    createHandlerInfo('one', {
      resolve: function () {},
    }),
    createHandlerInfo('two', {
      resolve: function () {
        assert.ok(false, 'I should not be entered because we threw an error in shouldContinue');
      },
    }),
  ];

  let fakeTransition = {} as Transition;
  fakeTransition.isAborted = true;

  await state.resolve(fakeTransition).catch(function (reason: TransitionError) {
    assert.ok(reason.wasAborted, 'state resolution was correctly marked as aborted');
  });
});

QUnit.test('Integration w/ HandlerInfos', function (assert) {
  assert.expect(4);

  let state = new TransitionState();
  let router = new TestRouter();
  let fooModel = {};
  let barModel = {};
  let transition = {};

  state.routeInfos = [
    new UnresolvedRouteInfoByParam(
      router,
      'foo',
      ['foo_id'],
      { foo_id: '123' },
      createHandler('foo', {
        model: function (params: Dict<unknown>, payload: Dict<unknown>) {
          assert.equal(payload, transition);
          assert.equal(params['foo_id'], '123', 'foo#model received expected params');
          return resolve(fooModel);
        },
      })
    ),
    new UnresolvedRouteInfoByObject(router, 'bar', ['bar_id'], resolve(barModel)),
  ];

  state
    .resolve(transition as Transition)
    .then(function (result: TransitionState<BaseRoute>) {
      let models = [];
      for (let i = 0; i < result.routeInfos.length; i++) {
        models.push(result.routeInfos[i]!.context);
      }

      assert.equal(models[0], fooModel);
      assert.equal(models[1], barModel);
      return Promise.resolve(new TransitionState());
    })
    .catch(function (error: Error) {
      assert.ok(false, 'Caught error: ' + error);
    });
});

function createManagedHandler(name: string, enter: () => Promise<unknown>) {
  let manager = {
    capabilities: { classicInterop: false },
    willEnter() {},
    enter,
    getInvokable() {
      return resolve(undefined);
    },
  };

  let handler = createHandler(name);
  associateRouteManagement(handler, manager as never, { route: handler, invokable: undefined });
  return handler;
}

QUnit.test('routes load in parallel while an ancestor is still pending', async function (assert) {
  assert.expect(3);

  let router = new TestRouter();
  let order: string[] = [];

  let settleParent!: (value: unknown) => void;
  let parentEnter = new Promise<unknown>((res) => {
    settleParent = res;
  });
  let committedParentAtChildEnter: boolean | undefined;
  let transition = { isAborted: false } as unknown as Transition;

  let state = new TransitionState();
  state.routeInfos = [
    new UnresolvedRouteInfoByParam(
      router,
      'parent',
      [],
      {},
      createManagedHandler('parent', () => {
        order.push('parent:enter');
        return parentEnter;
      })
    ),
    new UnresolvedRouteInfoByParam(
      router,
      'parent.child',
      [],
      {},
      createManagedHandler('parent.child', () => {
        order.push('child:enter');
        committedParentAtChildEnter = 'parent' in (transition.resolvedModels ?? {});
        return resolve('child-model');
      })
    ),
  ];

  let done = state.resolve(transition);

  await resolve();
  await resolve();
  await resolve();

  assert.deepEqual(
    order.slice(),
    ['parent:enter', 'child:enter'],
    'the child starts loading while the parent is still pending'
  );

  settleParent('parent-model');
  await done;

  assert.deepEqual(order.slice(), ['parent:enter', 'child:enter'], 'both entered exactly once');
  assert.false(
    committedParentAtChildEnter,
    'the parent had not been committed when the child began loading'
  );
});
