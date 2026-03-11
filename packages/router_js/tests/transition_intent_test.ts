import NamedTransitionIntent from 'router/transition-intent/named-transition-intent';
import URLTransitionIntent from 'router/transition-intent/url-transition-intent';
import TransitionState from 'router/transition-state';
import { createHandler, module, test, TestRouter } from './test_helpers';

import Router, { Route } from 'router';
import { Dict } from 'router/core';
import InternalRouteInfo, {
  ResolvedRouteInfo,
  UnresolvedRouteInfoByObject,
  UnresolvedRouteInfoByParam,
} from 'router/route-info';
import { Promise } from 'rsvp';

let handlers: Dict<Route>, recognizer: any;

let scenarios = [
  {
    name: 'Sync Get Handler',
    async: false,
    getHandler: function (name: string) {
      return handlers[name] || (handlers[name] = createHandler(name));
    },
  },
  {
    name: 'Async Get Handler',
    async: true,
    getHandler: function (name: string) {
      return Promise.resolve(handlers[name] || (handlers[name] = createHandler(name)));
    },
  },
];

scenarios.forEach(function (scenario) {
  class TransitionRouter extends TestRouter {
    getRoute(name: string) {
      return scenario.getHandler(name);
    }
  }

  let router: Router<Route>;

  // Asserts that a handler from a handlerInfo equals an expected valued.
  // Returns a promise during async scenarios to wait until the handler is ready.
  function assertHandlerEquals(
    assert: Assert,
    handlerInfo: InternalRouteInfo<Route>,
    expected: Route
  ) {
    if (!scenario.async) {
      return assert.equal(handlerInfo.route, expected);
    } else {
      assert.equal(handlerInfo.route, undefined);
      return handlerInfo.routePromise.then(function (handler) {
        assert.equal(handler, expected);
      });
    }
  }

  // TODO: remove repetition, DRY in to test_helpers.
  module('TransitionIntent (' + scenario.name + ')', {
    setup: function () {
      handlers = {};

      handlers.foo = createHandler('foo');
      handlers.bar = createHandler('bar');
      handlers.articles = createHandler('articles');
      handlers.comments = createHandler('comments');

      recognizer = {
        handlersFor: function (name: string) {
          if (name === 'comments') {
            return [
              {
                handler: 'articles',
                names: ['article_id'],
              },
              {
                handler: 'comments',
                names: ['comment_id'],
              },
            ];
          }
          return;
        },
        hasRoute: function (name: string) {
          return name === 'comments';
        },
        recognize: function (url: string) {
          if (url === '/foo/bar') {
            return [
              {
                handler: 'foo',
                isDynamic: false,
                params: {},
              },
              {
                handler: 'bar',
                isDynamic: false,
                params: {},
              },
            ];
          } else if (url === '/articles/123/comments/456') {
            return [
              {
                handler: 'articles',
                isDynamic: true,
                params: { article_id: '123' },
              },
              {
                handler: 'comments',
                isDynamic: true,
                params: { comment_id: '456' },
              },
            ];
          }

          return;
        },
      };

      router = new TransitionRouter();
      router.recognizer = recognizer;
    },
  });

  test('URLTransitionIntent can be applied to an empty state', function (assert) {
    let state = new TransitionState();
    let intent = new URLTransitionIntent(router, '/foo/bar');
    let newState = intent.applyToState(state);
    let handlerInfos = newState.routeInfos;

    assert.equal(handlerInfos.length, 2);
    assert.notOk(
      handlerInfos[0].isResolved,
      'generated state consists of unresolved handler info, 1'
    );
    assert.notOk(
      handlerInfos[1].isResolved,
      'generated state consists of unresolved handler info, 2'
    );
    Promise.all([
      assertHandlerEquals(assert, handlerInfos[0], handlers.foo),
      assertHandlerEquals(assert, handlerInfos[1], handlers.bar),
    ]);
  });

  test('URLTransitionIntent applied to single unresolved URL handlerInfo', function (assert) {
    let state = new TransitionState();

    let startingHandlerInfo = new UnresolvedRouteInfoByParam(router, 'foo', [], {}, handlers.foo);

    // This single unresolved handler info will be preserved
    // in the new array of handlerInfos.
    // Reason: if it were resolved, we wouldn't want to replace it.
    // So we only want to replace if it's actually known to be
    // different.
    state.routeInfos = [startingHandlerInfo];

    let intent = new URLTransitionIntent(router, '/foo/bar');
    let newState = intent.applyToState(state);
    let handlerInfos = newState.routeInfos;

    assert.equal(handlerInfos.length, 2);
    assert.equal(
      handlerInfos[0],
      startingHandlerInfo,
      "The starting foo handlerInfo wasn't overridden because the new one wasn't any different"
    );
    assert.ok(
      handlerInfos[1] instanceof UnresolvedRouteInfoByParam,
      'generated state consists of UnresolvedHandlerInfoByParam, 2'
    );
    assertHandlerEquals(assert, handlerInfos[1], handlers.bar);
  });

  test('URLTransitionIntent applied to an already-resolved handlerInfo', function (assert) {
    let state = new TransitionState();

    let startingHandlerInfo = new ResolvedRouteInfo(router, 'foo', [], {}, handlers.foo);

    state.routeInfos = [startingHandlerInfo];

    let intent = new URLTransitionIntent(router, '/foo/bar');
    let newState = intent.applyToState(state);
    let handlerInfos = newState.routeInfos;

    assert.equal(handlerInfos.length, 2);
    assert.equal(
      handlerInfos[0],
      startingHandlerInfo,
      "The starting foo resolved handlerInfo wasn't overridden because the new one wasn't any different"
    );
    assert.ok(
      handlerInfos[1] instanceof UnresolvedRouteInfoByParam,
      'generated state consists of UnresolvedHandlerInfoByParam, 2'
    );
    assertHandlerEquals(assert, handlerInfos[1], handlers.bar);
  });

  test('URLTransitionIntent applied to an already-resolved handlerInfo (non-empty params)', function (assert) {
    let state = new TransitionState();
    let article = {};

    let startingHandlerInfo = new ResolvedRouteInfo(
      router,
      'articles',
      [],
      { article_id: 'some-other-id' },
      createHandler('articles'),
      article
    );

    state.routeInfos = [startingHandlerInfo];

    let intent = new URLTransitionIntent(router, '/articles/123/comments/456');
    let newState = intent.applyToState(state);
    let handlerInfos = newState.routeInfos;

    assert.equal(handlerInfos.length, 2);
    assert.ok(
      handlerInfos[0] !== startingHandlerInfo,
      'The starting foo resolved handlerInfo was overridden because the new had different params'
    );
    assert.ok(
      handlerInfos[1] instanceof UnresolvedRouteInfoByParam,
      'generated state consists of UnresolvedHandlerInfoByParam, 2'
    );

    assertHandlerEquals(assert, handlerInfos[1], handlers.comments);
  });

  test('URLTransitionIntent applied to an already-resolved handlerInfo of different route', function (assert) {
    let state = new TransitionState();

    let startingHandlerInfo = new ResolvedRouteInfo(router, 'alex', [], {}, handlers.foo);

    state.routeInfos = [startingHandlerInfo];

    let intent = new URLTransitionIntent(router, '/foo/bar');
    let newState = intent.applyToState(state);
    let handlerInfos = newState.routeInfos;

    assert.equal(handlerInfos.length, 2);
    assert.ok(
      handlerInfos[0] !== startingHandlerInfo,
      'The starting foo resolved handlerInfo gets overridden because the new one has a different name'
    );
    assert.ok(
      handlerInfos[1] instanceof UnresolvedRouteInfoByParam,
      'generated state consists of UnresolvedHandlerInfoByParam, 2'
    );
    assertHandlerEquals(assert, handlerInfos[1], handlers.bar);
  });

  test('NamedTransitionIntent applied to an already-resolved handlerInfo (non-empty params)', function (assert) {
    let state = new TransitionState();

    let article = {};
    let comment = {};

    let startingHandlerInfo = new ResolvedRouteInfo(
      router,
      'articles',
      [],
      { article_id: 'some-other-id' },
      createHandler('articles'),
      article
    );

    state.routeInfos = [startingHandlerInfo];

    let intent = new NamedTransitionIntent(router, 'comments', undefined, [article, comment]);

    let newState = intent.applyToState(state, false);
    let handlerInfos = newState.routeInfos;

    assert.equal(handlerInfos.length, 2);
    assert.equal(handlerInfos[0], startingHandlerInfo);
    assert.equal(handlerInfos[0].context, article);
    assert.ok(
      handlerInfos[1] instanceof UnresolvedRouteInfoByObject,
      'generated state consists of UnresolvedHandlerInfoByObject, 2'
    );
    assert.equal(handlerInfos[1].context, comment);
    assertHandlerEquals(assert, handlerInfos[1], handlers.comments);
  });
});
