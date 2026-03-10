import { Transition } from 'router';
import { Dict } from 'router/core';
import { Route, UnresolvedRouteInfoByObject, UnresolvedRouteInfoByParam } from 'router/route-info';
import TransitionState, { TransitionError } from 'router/transition-state';
import { Promise, resolve } from 'rsvp';
import {
  createHandler,
  createHandlerInfo,
  flushBackburner,
  module,
  test,
  TestRouter,
} from './test_helpers';

module('TransitionState');

test('it starts off with default state', function (assert) {
  let state = new TransitionState();
  assert.deepEqual(state.routeInfos, [], 'it has an array of handlerInfos');
});

test("#resolve delegates to handleInfo objects' resolve()", function (assert) {
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

  state.resolve({} as Transition).then(function (result: TransitionState<Route>) {
    assert.deepEqual(result.routeInfos, resolvedHandlerInfos);
  });
});

test('State resolution can be halted', function (assert) {
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

  state.resolve(fakeTransition).catch(function (reason: TransitionError) {
    assert.ok(reason.wasAborted, 'state resolution was correctly marked as aborted');
  });

  flushBackburner();
});

test('Integration w/ HandlerInfos', function (assert) {
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
          assert.equal(params.foo_id, '123', 'foo#model received expected params');
          return resolve(fooModel);
        },
      })
    ),
    new UnresolvedRouteInfoByObject(router, 'bar', ['bar_id'], resolve(barModel)),
  ];

  state
    .resolve(transition as Transition)
    .then(function (result: TransitionState<Route>) {
      let models = [];
      for (let i = 0; i < result.routeInfos.length; i++) {
        models.push(result.routeInfos[i].context);
      }

      assert.equal(models[0], fooModel);
      assert.equal(models[1], barModel);
      return Promise.resolve(new TransitionState());
    })
    .catch(function (error: Error) {
      assert.ok(false, 'Caught error: ' + error);
    });
});
