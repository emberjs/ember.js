import { MatchCallback } from 'route-recognizer';
import Router, { Route, Transition } from 'router';
import { Dict, Maybe } from 'router/core';
import RouteInfo, {
  IModel,
  RouteInfo as PublicRouteInfo,
  RouteInfoWithAttributes,
} from 'router/route-info';
import { SerializerFunc } from 'router/router';
import { logAbort, PARAMS_SYMBOL, QUERY_PARAMS_SYMBOL, STATE_SYMBOL } from 'router/transition';
import { TransitionError } from 'router/transition-state';
import { Promise, reject } from 'rsvp';
import {
  assertAbort,
  createHandler,
  flushBackburner,
  handleURL,
  isExiting,
  module,
  replaceWith,
  shouldNotHappen,
  test,
  TestRouter,
  transitionTo,
  transitionToWithAbort,
  trigger,
} from './test_helpers';

let router: Router<Route>;
let url: string | undefined;
let routes: Dict<Route>;

function isPresent(maybe: Maybe<PublicRouteInfo>): maybe is PublicRouteInfo {
  return maybe !== undefined && maybe !== null;
}

let serializers: Dict<SerializerFunc<unknown>>, expectedUrl: Maybe<string>;
let scenarios = [
  {
    name: 'Sync Get Handler',
    async: false,
    getRoute: function (name: string) {
      return routes[name] || (routes[name] = createHandler('empty'));
    },
    getSerializer: function (_name: string) {
      return undefined;
    },
  },
  {
    name: 'Async Get Handler',
    async: true,
    getRoute: function (name: string) {
      // Treat 'loading' route transitions are synchronous
      let handler = routes[name] || (routes[name] = createHandler('empty'));
      return name === 'loading' ? handler : Promise.resolve(handler);
    },
    getSerializer: function (name: string) {
      return serializers && serializers[name];
    },
  },
];

scenarios.forEach(function (scenario) {
  module('The router (' + scenario.name + ')', {
    setup: function (assert: Assert) {
      routes = {};
      expectedUrl = undefined;
      url = undefined;

      map(assert, function (match) {
        match('/index').to('index');
        match('/about').to('about');
        match('/faq').to('faq');
        match('/nested').to('nestedParent', function (match) {
          match('/').to('nestedChild');
        });
        match('/posts', function (match) {
          match('/:id').to('showPost');
          match('/:postId/:commentId').to('showComment');
          match('/on/:date').to('showPostsForDate');
          match('/admin/:id').to('admin', function (match) {
            match('/posts').to('adminPosts');
            match('/posts/:post_id').to('adminPost');
          });
          match('/').to('postIndex', function (match) {
            match('/all').to('showAllPosts');

            // TODO: Support canonical: true
            match('/').to('showAllPosts');
            match('/popular').to('showPopularPosts');
            match('/filter/:filter_id').to('showFilteredPosts');
          });
        });
      });
    },
  });

  function map(assert: Assert, fn: MatchCallback) {
    class Router extends TestRouter {
      routeDidChange() {}
      routeWillChange() {}
      didTransition() {}
      willTransition() {}
      replaceURL(name: string) {
        this.updateURL(name);
      }
      triggerEvent(
        handlerInfos: RouteInfo<Route>[],
        ignoreFailure: boolean,
        name: string,
        args: any[]
      ) {
        trigger(handlerInfos, ignoreFailure, name, ...args);
      }

      getRoute(name: string) {
        return scenario.getRoute(name);
      }

      getSerializer(name: string) {
        return scenario.getSerializer(name);
      }

      updateURL(newUrl: string) {
        if (expectedUrl) {
          assert.equal(newUrl, expectedUrl, 'The url is ' + newUrl + ' as expected');
        }

        url = newUrl;
      }
    }

    router = new Router();

    router.map(fn);
  }

  test('Mapping adds named routes to the end', function (assert) {
    url = router.recognizer.generate('showPost', { id: 1 });
    assert.equal(url, '/posts/1');

    url = router.recognizer.generate('showAllPosts');
    assert.equal(url, '/posts');

    url = router.recognizer.generate('showComment', {
      postId: 1,
      commentId: 2,
    });
    assert.equal(url, '/posts/1/2');

    url = router.generate('showComment', 1, 2);
    assert.equal(url, '/posts/1/2');
  });

  test('Handling an invalid URL returns a rejecting promise', function (assert) {
    router.handleURL('/unknown').then(shouldNotHappen(assert), function (e: Error) {
      assert.equal(e.name, 'UnrecognizedURLError', 'error.name is UnrecognizedURLError');
    });
  });

  function routePath(infos: RouteInfo<Route>[]) {
    let path = [];

    for (let i = 0, l = infos.length; i < l; i++) {
      path.push(infos[i].name);
    }

    return path.join('.');
  }

  test('Handling a URL triggers model on the handler and passes the result into the setup method', function (assert) {
    assert.expect(4);

    let post = { post: true };

    routes = {
      showPost: createHandler('showPost', {
        model: function (params: Dict<unknown>) {
          assert.deepEqual(params, { id: '1', queryParams: {} }, 'showPost#model called with id 1');
          return post;
        },

        setup: function (object: Dict<unknown>) {
          assert.strictEqual(object, post, 'setup was called with expected model');
          assert.equal(
            routes.showPost.context,
            post,
            'context was properly set on showPost handler'
          );
        },
      }),
    };

    router.didTransition = function (infos) {
      assert.equal(routePath(infos), 'showPost');
    };

    router.handleURL('/posts/1');
  });

  test('isActive should not break on initial intermediate route', function (assert) {
    assert.expect(1);
    router.intermediateTransitionTo('/posts/admin/1/posts');
    assert.ok(router.isActive('admin', '1'));
  });

  test('Handling a URL passes in query params', function (assert) {
    assert.expect(3);

    routes = {
      index: createHandler('index', {
        model: function (_params: string[], transition: Transition) {
          assert.deepEqual(transition[QUERY_PARAMS_SYMBOL], {
            sort: 'date',
            filter: 'true',
          });
        },
        events: {
          finalizeQueryParamChange: function (params: string[], finalParams: Dict<unknown>[]) {
            assert.ok(true, 'finalizeQueryParamChange');
            // need to consume the params so that the router
            // knows that they're active
            finalParams.push({ key: 'sort', value: params.sort });
            finalParams.push({ key: 'filter', value: params.filter });
          },
        },
      }),
    };

    router.handleURL('/index?sort=date&filter');
    flushBackburner();
    assert.deepEqual(router.state!.queryParams, {
      sort: 'date',
      filter: 'true',
    });
  });

  test('handleURL accepts slash-less URLs', function (assert) {
    assert.expect(1);

    routes = {
      showAllPosts: createHandler('showAllPosts', {
        setup: function () {
          assert.ok(true, "showAllPosts' setup called");
        },
      }),
    };

    router.handleURL('posts/all');
  });

  test('handleURL accepts query params', function (assert) {
    assert.expect(1);

    routes = {
      showAllPosts: createHandler('showAllPosts', {
        setup: function () {
          assert.ok(true, "showAllPosts' setup called");
        },
      }),
    };

    router.handleURL('/posts/all?sort=name&sortDirection=descending');
  });

  test("redirect hook shouldn't get called on parent routes", function (assert) {
    map(assert, function (match) {
      match('/').to('app', function (match) {
        match('/').to('index');
        match('/other').to('other');
      });
    });

    let appRedirects = 0;
    routes = {
      app: createHandler('app', {
        redirect: function () {
          appRedirects++;
        },
      }),
    };

    transitionTo(router, '/');
    assert.equal(appRedirects, 1);
    transitionTo(router, 'other');
    assert.equal(appRedirects, 1);
  });

  test('when transitioning with the same context, setup should only be called once', function (assert) {
    let parentSetupCount = 0,
      childSetupCount = 0;

    let context = { id: 1 };

    map(assert, function (match) {
      match('/').to('index');
      match('/posts/:id').to('post', function (match) {
        match('/details').to('postDetails');
      });
    });

    routes = {
      post: createHandler('post', {
        setup: function () {
          parentSetupCount++;
        },
      }),

      postDetails: createHandler('postDetails', {
        setup: function () {
          childSetupCount++;
        },
      }),
    };

    transitionTo(router, '/');

    assert.equal(parentSetupCount, 0, 'precondition - parent not setup');
    assert.equal(childSetupCount, 0, 'precondition - child not setup');

    transitionTo(router, 'postDetails', context);

    assert.equal(parentSetupCount, 1, 'after initial transition parent is setup once');
    assert.equal(childSetupCount, 1, 'after initial transition child is setup once');

    transitionTo(router, 'postDetails', context);

    assert.equal(parentSetupCount, 1, 'after duplicate transition, parent is still setup once');
    assert.equal(childSetupCount, 1, 'after duplicate transition, child is still setup once');
  });

  test('basic route change events', function (assert) {
    assert.expect(11);
    map(assert, function (match) {
      match('/').to('index');
      match('/posts/:id').to('post', function (match) {
        match('/details').to('postDetails');
      });
    });

    let enteredWillChange = 0;
    let enteredDidChange = 0;
    routes = {
      post: createHandler('post', {
        model() {
          return { title: 'The Title' };
        },
      }),
      postDetails: createHandler('postDetails', {
        model() {
          return { body: 'The Content' };
        },
      }),
    };

    router.routeWillChange = (transition: Transition) => {
      enteredWillChange++;

      if (isPresent(transition.to)) {
        assert.equal(transition.to.localName, 'postDetails');
        assert.equal(transition.from, null);
        assert.equal(transition.to.parent!.localName, 'post');
        assert.equal((transition.to as any).attributes, undefined);
      }
    };

    router.routeDidChange = (transition: Transition) => {
      enteredDidChange++;
      let to = transition.to! as RouteInfoWithAttributes;
      if (isPresent(transition.to)) {
        assert.equal(to.localName, 'postDetails');
        assert.equal(transition.from!, null);
        assert.equal(to.parent!.localName, 'post');
        assert.deepEqual(to.attributes, { body: 'The Content' });
        assert.deepEqual((to.parent! as RouteInfoWithAttributes).attributes, {
          title: 'The Title',
        });
      }
    };

    router.transitionTo('/posts/1/details').then(() => {
      assert.equal(enteredWillChange, 1);
      assert.equal(enteredDidChange, 1);
    });
  });

  test('basic events with route metadata', function (assert) {
    assert.expect(10);
    map(assert, function (match) {
      match('/').to('index');
      match('/profile').to('profile');
      match('/posts/:id').to('post', function (match) {
        match('/details').to('postDetails');
      });
    });

    routes = {
      post: createHandler('post', {
        buildRouteInfoMetadata() {
          return 'post-page';
        },
        model() {
          return { title: 'The Title' };
        },
      }),
      profile: createHandler('profile', {
        buildRouteInfoMetadata() {
          return 'profile-page';
        },
      }),
      postDetails: createHandler('postDetails', {
        buildRouteInfoMetadata() {
          return 'post-details-page';
        },
        model() {
          return { body: 'The Content' };
        },
      }),
    };

    router.routeWillChange = (transition: Transition) => {
      if (!isPresent(transition.from) && isPresent(transition.to)) {
        if (scenario.async) {
          assert.equal(transition.to.metadata, null, 'initial to leaf');
          assert.equal(transition.to.parent!.metadata, null, 'initial to leaf');
        } else {
          assert.equal(transition.to.metadata, 'post-details-page');
          assert.equal(transition.to.parent!.metadata, 'post-page');
        }
      }

      if (isPresent(transition.from) && isPresent(transition.to)) {
        if (scenario.async) {
          assert.equal(transition.from.metadata, 'post-details-page', 'from leaf');
          assert.equal(transition.from.parent!.metadata, 'post-page', 'from parent');
          assert.equal(transition.to.metadata, null, 'to leaf');
        } else {
          assert.equal(transition.from.metadata, 'post-details-page');
          assert.equal(transition.from.parent!.metadata, 'post-page');
          assert.equal(transition.to.metadata, 'profile-page');
        }
      }
    };

    router.routeDidChange = (transition: Transition) => {
      if (!isPresent(transition.from) && isPresent(transition.to)) {
        assert.equal(transition.to.metadata, 'post-details-page', 'initial to leaf');
        assert.equal(transition.to.parent!.metadata, 'post-page', 'initial to parent');
      }

      if (isPresent(transition.from) && isPresent(transition.to)) {
        assert.equal(transition.from.metadata, 'post-details-page', 'from: /profile visited');
        assert.equal(
          transition.from.parent!.metadata,
          'post-page',
          'from: /profile visited parent'
        );
        assert.equal(transition.to.metadata, 'profile-page', 'to: /profile');
      }
    };

    router.transitionTo('/posts/1/details').then(() => {
      return router.transitionTo('/profile');
    });
  });

  test('basic route change events with replacement', function (assert) {
    assert.expect(14);
    map(assert, function (match) {
      match('/').to('index');
      match('/posts/:id').to('post', function (match) {
        match('/details').to('postDetails');
      });
      match('/post-details/:id').to('canonicalPostDetails');
    });

    let enteredWillChange = 0;
    let enteredDidChange = 0;
    routes = {
      post: createHandler('post'),
      postDetails: createHandler('postDetails'),
      canonicalPostDetails: createHandler('canonicalPostDetails'),
    };

    let replacement = false;

    router.routeWillChange = (transition: Transition) => {
      enteredWillChange++;
      if (isPresent(transition.to)) {
        if (replacement) {
          assert.equal(transition.to.localName, 'canonicalPostDetails');
          assert.equal(isPresent(transition.from) && transition.from.localName, 'postDetails');
          assert.equal(transition.to!.parent!, null);
        } else {
          assert.equal(transition.to!.localName, 'postDetails');
          assert.equal(transition.from!, null);
          assert.equal(transition.to!.parent!.localName, 'post');
        }
      }
    };

    router.routeDidChange = (transition: Transition) => {
      enteredDidChange++;
      if (isPresent(transition.to)) {
        if (replacement) {
          assert.equal(transition.to!.localName, 'canonicalPostDetails');
          assert.equal(isPresent(transition.from) && transition.from.localName, 'postDetails');
          assert.equal(transition.to!.parent, null);
        } else {
          assert.equal(transition.to!.localName, 'postDetails');
          assert.equal(transition.from!, null);
          assert.equal(transition.to!.parent!.localName, 'post');
        }
      }
    };

    router
      .transitionTo('/posts/1/details')
      .then(() => {
        replacement = true;
        return router.replaceWith('/post-details/1');
      })
      .then(() => {
        assert.equal(enteredWillChange, 2);
        assert.equal(enteredDidChange, 2);
      });
  });

  test('basic route change events with nested replacement', function (assert) {
    assert.expect(12);
    map(assert, function (match) {
      match('/').to('index');
      match('/posts/:id').to('post', function (match) {
        match('/details').to('postDetails');
      });
      match('/post-details/:id').to('canonicalPostDetails');
    });

    let enteredWillChange = 0;
    let enteredDidChange = 0;
    routes = {
      post: createHandler('post'),
      postDetails: createHandler('postDetails', {
        model() {
          router.replaceWith('/post-details/1');
          replacement = true;
        },
      }),
      canonicalPostDetails: createHandler('canonicalPostDetails'),
    };

    let replacement = false;

    router.routeWillChange = (transition: Transition) => {
      enteredWillChange++;
      if (isPresent(transition.to)) {
        if (replacement) {
          assert.equal(transition.to.localName, 'canonicalPostDetails');
          assert.equal(transition.from!, null);
          assert.equal(transition.to.parent!, null);
        } else {
          assert.equal(transition.to.localName, 'postDetails');
          assert.equal(transition.from!, null);
          assert.equal(transition.to.parent!.localName, 'post');
          replacement = true;
        }
      }
    };

    router.routeDidChange = (transition: Transition) => {
      enteredDidChange++;
      assert.equal(transition.to!.localName, 'canonicalPostDetails');
      assert.equal(transition.from!, null);
      assert.equal(transition.to!.parent, null);
    };

    router
      .transitionTo('/posts/1/details')
      .catch((err: any) => {
        assert.equal(err.name, 'TransitionAborted');
        return router.activeTransition as any;
      })
      .then(() => {
        assert.equal(enteredWillChange, 2);
        assert.equal(enteredDidChange, 1);
      });
  });

  test('basic route change events with params', function (assert) {
    assert.expect(26);
    map(assert, function (match) {
      match('/').to('index');
      match('/posts/:id').to('post');
    });

    let enteredWillChange = 0;
    let enteredDidChange = 0;
    routes = {
      index: createHandler('index', {
        model() {
          return Promise.resolve('Index');
        },
      }),
      post: createHandler('post', {
        model(params: Dict<any>) {
          return Promise.resolve(params.id);
        },
      }),
    };

    let newParam = false;

    router.routeWillChange = (transition: Transition) => {
      enteredWillChange++;
      assert.deepEqual(transition.to!.paramNames, ['id']);
      if (newParam) {
        assert.equal(transition.to!.localName, 'post');
        assert.equal(isPresent(transition.from) && transition.from.localName, 'post');
        assert.deepEqual(isPresent(transition.from) && transition.from.attributes, '1');
        assert.deepEqual(transition.to!.params, { id: '2' });
        assert.equal(url, '/posts/1');
      } else {
        assert.equal(transition.to!.localName, 'post');
        assert.equal(transition.from, null);
        assert.notOk(url);
        assert.deepEqual(transition.to!.params, { id: '1' });
      }
    };

    router.routeDidChange = (transition: Transition) => {
      enteredDidChange++;
      let to = transition.to! as RouteInfoWithAttributes;
      assert.deepEqual(transition.to!.paramNames, ['id']);
      if (newParam) {
        assert.equal(to.localName, 'post');
        assert.equal(isPresent(transition.from) && transition.from.localName, 'post');
        assert.deepEqual(to.params, { id: '2' });
        assert.deepEqual(to.attributes, '2');
        assert.deepEqual(isPresent(transition.from) && transition.from.attributes, '1');
        assert.equal(url, '/posts/2');
      } else {
        assert.equal(to.localName, 'post');
        assert.equal(transition.from, null);
        assert.equal(url, '/posts/1');
        assert.deepEqual(to.params, { id: '1' });
        assert.deepEqual(to.attributes, '1');
      }
    };

    router
      .transitionTo('/posts/1')
      .then(() => {
        newParam = true;
        return router.transitionTo('/posts/2');
      })
      .then(() => {
        assert.equal(enteredWillChange, 2);
        assert.equal(enteredDidChange, 2);
      });
  });

  test('top-level recognizeAndLoad url', function (assert) {
    map(assert, function (match) {
      match('/').to('index');
    });

    routes = {
      index: createHandler('index', {
        model() {
          return { name: 'index', data: 1 };
        },
      }),
    };
    assert.notOk(router.activeTransition, 'Does not start with an active transition');

    router.replaceURL = () => {
      assert.ok(false, 'Should not replace the URL');
    };

    router.updateURL = () => {
      assert.ok(false, 'Should not update the URL');
    };

    router.recognizeAndLoad('/').then((routeInfoWithAttributes: RouteInfoWithAttributes) => {
      assert.notOk(router.activeTransition, 'Does not create an active transition');
      if (routeInfoWithAttributes === null) {
        assert.ok(false);
        return;
      }
      assert.equal(routeInfoWithAttributes.name, 'index');
      assert.equal(routeInfoWithAttributes.localName, 'index');
      assert.equal(routeInfoWithAttributes.parent, null);
      assert.equal(routeInfoWithAttributes.child, null);
      assert.deepEqual(routeInfoWithAttributes.attributes, { name: 'index', data: 1 });
      assert.deepEqual(routeInfoWithAttributes.queryParams, {});
      assert.deepEqual(routeInfoWithAttributes.params, {});
      assert.deepEqual(routeInfoWithAttributes.paramNames, []);
    });
  });

  test('top-level parameterized recognizeAndLoad', function (assert) {
    map(assert, function (match) {
      match('/posts/:id').to('posts');
    });

    routes = {
      posts: createHandler('posts', {
        model(params: { id: string }) {
          return { name: 'posts', data: params.id };
        },
      }),
    };
    assert.notOk(router.activeTransition, 'Does not start with an active transition');

    router.replaceURL = () => {
      assert.ok(false, 'Should not replace the URL');
    };

    router.updateURL = () => {
      assert.ok(false, 'Should not update the URL');
    };

    router
      .recognizeAndLoad('/posts/123')
      .then((routeInfoWithAttributes: RouteInfoWithAttributes) => {
        assert.notOk(router.activeTransition, 'Does not create an active transition');
        if (routeInfoWithAttributes === null) {
          assert.ok(false);
          return;
        }
        assert.equal(routeInfoWithAttributes.name, 'posts');
        assert.equal(routeInfoWithAttributes.localName, 'posts');
        assert.equal(routeInfoWithAttributes.parent, null);
        assert.equal(routeInfoWithAttributes.child, null);
        assert.deepEqual(routeInfoWithAttributes.attributes, { name: 'posts', data: '123' });
        assert.deepEqual(routeInfoWithAttributes.queryParams, {});
        assert.deepEqual(routeInfoWithAttributes.params, { id: '123' });
        assert.deepEqual(routeInfoWithAttributes.paramNames, ['id']);
      });
  });

  test('nested recognizeAndLoad', function (assert) {
    routes = {
      postIndex: createHandler('postIndex'),
      showPopularPosts: createHandler('showPopularPosts', {
        model() {
          return { name: 'showPopularPosts', data: 123 };
        },
      }),
    };
    assert.notOk(router.activeTransition, 'Does not start with an active transition');

    router.replaceURL = () => {
      assert.ok(false, 'Should not replace the URL');
    };

    router.updateURL = () => {
      assert.ok(false, 'Should not update the URL');
    };

    router
      .recognizeAndLoad('/posts/popular')
      .then((routeInfoWithAttributes: RouteInfoWithAttributes) => {
        assert.notOk(router.activeTransition, 'Does not create an active transition');
        if (routeInfoWithAttributes === null) {
          assert.ok(false);
          return;
        }
        assert.equal(routeInfoWithAttributes.name, 'showPopularPosts');
        assert.equal(routeInfoWithAttributes.localName, 'showPopularPosts');
        assert.equal(routeInfoWithAttributes.parent!.name, 'postIndex');
        assert.equal(routeInfoWithAttributes.child, null);
        assert.deepEqual(routeInfoWithAttributes.attributes, {
          name: 'showPopularPosts',
          data: 123,
        });
        assert.deepEqual(routeInfoWithAttributes.queryParams, {});
        assert.deepEqual(routeInfoWithAttributes.params, {});
        assert.deepEqual(routeInfoWithAttributes.paramNames, []);
      });
  });

  test('nested params recognizeAndLoad', function (assert) {
    routes = {
      postIndex: createHandler('postIndex'),
      showFilteredPosts: createHandler('showFilteredPosts', {
        model(params: { filter_id: string }) {
          return { name: 'showFilteredPosts', data: params.filter_id };
        },
      }),
    };
    assert.notOk(router.activeTransition, 'Does not start with an active transition');

    router.replaceURL = () => {
      assert.ok(false, 'Should not replace the URL');
    };

    router.updateURL = () => {
      assert.ok(false, 'Should not update the URL');
    };

    router
      .recognizeAndLoad('/posts/filter/1')
      .then((routeInfoWithAttributes: RouteInfoWithAttributes) => {
        assert.notOk(router.activeTransition, 'Does not create an active transition');
        if (routeInfoWithAttributes === null) {
          assert.ok(false);
          return;
        }
        assert.equal(routeInfoWithAttributes.name, 'showFilteredPosts');
        assert.equal(routeInfoWithAttributes.localName, 'showFilteredPosts');
        assert.equal(routeInfoWithAttributes.parent!.name, 'postIndex');
        assert.equal(routeInfoWithAttributes.child, null);
        assert.deepEqual(routeInfoWithAttributes.attributes, {
          name: 'showFilteredPosts',
          data: '1',
        });
        assert.deepEqual(routeInfoWithAttributes.queryParams, {});
        assert.deepEqual(routeInfoWithAttributes.params, { filter_id: '1' });
        assert.deepEqual(routeInfoWithAttributes.paramNames, ['filter_id']);
      });
  });

  test('top-level QPs recognizeAndLoad', function (assert) {
    routes = {
      showAllPosts: createHandler('showAllPosts', {
        model() {
          return { name: 'showAllPosts', data: 'qp' };
        },
      }),
    };
    assert.notOk(router.activeTransition, 'Does not start with an active transition');

    router.replaceURL = () => {
      assert.ok(false, 'Should not replace the URL');
    };

    router.updateURL = () => {
      assert.ok(false, 'Should not update the URL');
    };

    router
      .recognizeAndLoad('/posts/?a=b')
      .then((routeInfoWithAttributes: RouteInfoWithAttributes) => {
        assert.notOk(router.activeTransition, 'Does not create an active transition');
        if (routeInfoWithAttributes === null) {
          assert.ok(false);
          return;
        }
        assert.equal(routeInfoWithAttributes.name, 'showAllPosts');
        assert.equal(routeInfoWithAttributes.localName, 'showAllPosts');
        assert.equal(routeInfoWithAttributes.parent!.name, 'postIndex');
        assert.equal(routeInfoWithAttributes.child, null);
        assert.deepEqual(routeInfoWithAttributes.attributes, {
          name: 'showAllPosts',
          data: 'qp',
        });
        assert.deepEqual(routeInfoWithAttributes.queryParams, { a: 'b' });
        assert.deepEqual(routeInfoWithAttributes.params, {});
        assert.deepEqual(routeInfoWithAttributes.paramNames, []);
      });
  });

  test('top-level params and QPs recognizeAndLoad', function (assert) {
    routes = {
      postsIndex: createHandler('postsIndex'),
      showFilteredPosts: createHandler('showFilteredPosts', {
        model(params: { filter_id: string }) {
          return { name: 'showFilteredPosts', data: params.filter_id };
        },
      }),
    };
    assert.notOk(router.activeTransition, 'Does not start with an active transition');

    router.replaceURL = () => {
      assert.ok(false, 'Should not replace the URL');
    };

    router.updateURL = () => {
      assert.ok(false, 'Should not update the URL');
    };

    router
      .recognizeAndLoad('/posts/filter/123?a=b')
      .then((routeInfoWithAttributes: RouteInfoWithAttributes) => {
        assert.notOk(router.activeTransition, 'Does not create an active transition');
        if (routeInfoWithAttributes === null) {
          assert.ok(false);
          return;
        }
        assert.equal(routeInfoWithAttributes.name, 'showFilteredPosts');
        assert.equal(routeInfoWithAttributes.localName, 'showFilteredPosts');
        assert.equal(routeInfoWithAttributes.parent!.name, 'postIndex');
        assert.equal(routeInfoWithAttributes.child, null);
        assert.deepEqual(routeInfoWithAttributes.attributes, {
          name: 'showFilteredPosts',
          data: '123',
        });
        assert.deepEqual(routeInfoWithAttributes.queryParams, { a: 'b' });
        assert.deepEqual(routeInfoWithAttributes.params, { filter_id: '123' });
        assert.deepEqual(routeInfoWithAttributes.paramNames, ['filter_id']);
      });
  });

  test('unrecognized url rejects', function (assert) {
    router.recognizeAndLoad('/fixzzz').then(
      () => {
        assert.ok(false, 'never here');
      },
      (reason: string) => {
        assert.equal(reason, `URL /fixzzz was not recognized`);
      }
    );
  });

  test('top-level recognize url', function (assert) {
    map(assert, function (match) {
      match('/').to('index');
    });

    routes = {
      post: createHandler('post'),
    };
    assert.notOk(router.activeTransition, 'Does not start with an active transition');
    let routeInfo = router.recognize('/');

    assert.notOk(router.activeTransition, 'Does not create an active transition');

    if (routeInfo === null) {
      assert.ok(false);
      return;
    }

    router.replaceURL = () => {
      assert.ok(false, 'Should not replace the URL');
    };

    router.updateURL = () => {
      assert.ok(false, 'Should not update the URL');
    };

    assert.equal(routeInfo.name, 'index');
    assert.equal(routeInfo.localName, 'index');
    assert.equal(routeInfo.parent, null);
    assert.equal(routeInfo.child, null);
    assert.deepEqual(routeInfo.queryParams, {});
    assert.deepEqual(routeInfo.params, {});
    assert.deepEqual(routeInfo.paramNames, []);
  });

  test('top-level recognize url with params', function (assert) {
    map(assert, function (match) {
      match('/posts/:id').to('post');
    });

    routes = {
      post: createHandler('post'),
    };

    assert.notOk(router.activeTransition, 'Does not start with an active transition');

    let routeInfo = router.recognize('/posts/123');

    assert.notOk(router.activeTransition, 'Does not create an active transition');

    if (routeInfo === null) {
      assert.ok(false);
      return;
    }

    router.replaceURL = () => {
      assert.ok(false, 'Should not replace the URL');
    };

    router.updateURL = () => {
      assert.ok(false, 'Should not update the URL');
    };

    assert.equal(routeInfo.name, 'post');
    assert.equal(routeInfo.localName, 'post');
    assert.equal(routeInfo.parent, null);
    assert.equal(routeInfo.child, null);
    assert.deepEqual(routeInfo.queryParams, {});
    assert.deepEqual(routeInfo.params, { id: '123' });
    assert.deepEqual(routeInfo.paramNames, ['id']);
  });

  test('nested recognize url', function (assert) {
    routes = {
      postIndex: createHandler('postIndex'),
      showPopularPosts: createHandler('showPopularPosts'),
    };
    assert.notOk(router.activeTransition, 'Does not start with an active transition');

    let routeInfo = router.recognize('/posts/popular');

    assert.notOk(router.activeTransition, 'Does not create an active transition');

    if (routeInfo === null) {
      assert.ok(false);
      return;
    }

    router.replaceURL = () => {
      assert.ok(false, 'Should not replace the URL');
    };

    router.updateURL = () => {
      assert.ok(false, 'Should not update the URL');
    };

    assert.equal(routeInfo.name, 'showPopularPosts');
    assert.equal(routeInfo.localName, 'showPopularPosts');
    assert.equal(routeInfo.parent!.name, 'postIndex');
    assert.equal(routeInfo.child, null);
    assert.deepEqual(routeInfo.queryParams, {});
    assert.deepEqual(routeInfo.params, {});
    assert.deepEqual(routeInfo.paramNames, []);
  });

  test('nested recognize url with params', function (assert) {
    routes = {
      postIndex: createHandler('postIndex'),
      showFilteredPosts: createHandler('showFilteredPosts'),
    };
    assert.notOk(router.activeTransition, 'Does not start with an active transition');

    let routeInfo = router.recognize('/posts/filter/123');

    assert.notOk(router.activeTransition, 'Does not create an active transition');

    if (routeInfo === null) {
      assert.ok(false);
      return;
    }

    router.replaceURL = () => {
      assert.ok(false, 'Should not replace the URL');
    };

    router.updateURL = () => {
      assert.ok(false, 'Should not update the URL');
    };

    assert.equal(routeInfo.name, 'showFilteredPosts');
    assert.equal(routeInfo.localName, 'showFilteredPosts');
    assert.equal(routeInfo.parent!.name, 'postIndex');
    assert.equal(routeInfo.child, null);
    assert.deepEqual(routeInfo.queryParams, {});
    assert.deepEqual(routeInfo.params, { filter_id: '123' });
    assert.deepEqual(routeInfo.paramNames, ['filter_id']);
  });

  test('top-level recognize url with QPs', function (assert) {
    map(assert, function (match) {
      match('/').to('index');
    });

    routes = {
      index: createHandler('index'),
    };

    assert.notOk(router.activeTransition, 'Does not start with an active transition');

    let routeInfo = router.recognize('/?a=123');

    assert.notOk(router.activeTransition, 'Does not create an active transition');

    if (routeInfo === null) {
      assert.ok(false);
      return;
    }

    router.replaceURL = () => {
      assert.ok(false, 'Should not replace the URL');
    };

    router.updateURL = () => {
      assert.ok(false, 'Should not update the URL');
    };

    assert.equal(routeInfo.name, 'index');
    assert.equal(routeInfo.localName, 'index');
    assert.equal(routeInfo.parent, null);
    assert.equal(routeInfo.child, null);
    assert.deepEqual(routeInfo.queryParams, { a: '123' });
    assert.deepEqual(routeInfo.params, {});
    assert.deepEqual(routeInfo.paramNames, []);
  });

  test('nested recognize url with QPs', function (assert) {
    routes = {
      postIndex: createHandler('postIndex'),
      showPopularPosts: createHandler('showPopularPosts'),
    };

    assert.notOk(router.activeTransition, 'Does not start with an active transition');

    let routeInfo = router.recognize('/posts/popular?fizz=bar');

    assert.notOk(router.activeTransition, 'Does not create an active transition');

    if (routeInfo === null) {
      assert.ok(false);
      return;
    }

    router.replaceURL = () => {
      assert.ok(false, 'Should not replace the URL');
    };

    router.updateURL = () => {
      assert.ok(false, 'Should not update the URL');
    };

    assert.equal(routeInfo.name, 'showPopularPosts');
    assert.equal(routeInfo.localName, 'showPopularPosts');
    assert.equal(routeInfo.parent!.name, 'postIndex');
    assert.equal(routeInfo.child, null);
    assert.deepEqual(routeInfo.queryParams, { fizz: 'bar' });
    assert.deepEqual(routeInfo.params, {});
    assert.deepEqual(routeInfo.paramNames, []);
  });

  test('nested recognize url with QPs and params', function (assert) {
    routes = {
      postIndex: createHandler('postIndex'),
      showFilteredPosts: createHandler('showFilteredPosts'),
    };

    assert.notOk(router.activeTransition, 'Does not start with an active transition');

    let routeInfo = router.recognize('/posts/filter/123?fizz=bar');

    assert.notOk(router.activeTransition, 'Does not create an active transition');

    if (routeInfo === null) {
      assert.ok(false);
      return;
    }

    router.replaceURL = () => {
      assert.ok(false, 'Should not replace the URL');
    };

    router.updateURL = () => {
      assert.ok(false, 'Should not update the URL');
    };

    assert.equal(routeInfo.name, 'showFilteredPosts');
    assert.equal(routeInfo.localName, 'showFilteredPosts');
    assert.equal(routeInfo.parent!.name, 'postIndex');
    assert.equal(routeInfo.child, null);
    assert.deepEqual(routeInfo.queryParams, { fizz: 'bar' });
    assert.deepEqual(routeInfo.params, { filter_id: '123' });
    assert.deepEqual(routeInfo.paramNames, ['filter_id']);
  });

  test('unrecognized url returns null', function (assert) {
    map(assert, function (match) {
      match('/').to('index');
      match('/posts/:id').to('post');
    });

    routes = {
      post: createHandler('post'),
    };
    let routeInfo = router.recognize('/fixzzz');
    assert.equal(routeInfo, null, 'Unrecognized url');
  });

  test('basic route change events with nested params', function (assert) {
    assert.expect(14);
    map(assert, function (match) {
      match('/').to('index');
      match('/posts/:id/foo').to('post');
    });

    let enteredWillChange = 0;
    let enteredDidChange = 0;
    routes = {
      post: createHandler('post'),
    };

    let newParam = false;

    router.routeWillChange = (transition: Transition) => {
      enteredWillChange++;
      if (newParam) {
        assert.equal(transition.to!.localName, 'post');
        assert.equal(isPresent(transition.from) && transition.from.localName, 'post');
        assert.deepEqual(transition.to!.params, { id: '2' });
      } else {
        assert.equal(transition.to!.localName, 'post');
        assert.equal(transition.from, null);
        assert.deepEqual(transition.to!.params, { id: '1' });
      }
    };

    router.routeDidChange = (transition: Transition) => {
      enteredDidChange++;
      if (newParam) {
        assert.equal(transition.to!.localName, 'post');
        assert.equal(isPresent(transition.from) && transition.from.localName, 'post');
        assert.deepEqual(transition.to!.params, { id: '2' });
      } else {
        assert.equal(transition.to!.localName, 'post');
        assert.equal(transition.from, null);
        assert.deepEqual(transition.to!.params, { id: '1' });
      }
    };

    router
      .transitionTo('/posts/1/foo')
      .then(() => {
        newParam = true;
        return router.transitionTo('/posts/2/foo');
      })
      .then(() => {
        assert.equal(enteredWillChange, 2);
        assert.equal(enteredDidChange, 2);
      });
  });

  test('basic route change events with query params', function (assert) {
    assert.expect(20);
    map(assert, function (match) {
      match('/').to('index');
      match('/posts/:id').to('post');
    });

    let enteredWillChange = 0;
    let enteredDidChange = 0;
    routes = {
      post: createHandler('post'),
    };

    let newParam = false;

    router.routeWillChange = (transition: Transition) => {
      enteredWillChange++;
      if (newParam) {
        assert.equal(transition.to!.localName, 'post');
        assert.equal(isPresent(transition.from) && transition.from.localName, 'post');
        assert.deepEqual(transition.to!.queryParams, { trk: 'b' });
        assert.deepEqual(isPresent(transition.from) && transition.from!.queryParams, { trk: 'a' });
      } else {
        assert.equal(transition.to!.localName, 'post');
        assert.equal(transition.from, null);
        assert.deepEqual(transition.to!.queryParams, { trk: 'a' });
      }

      assert.deepEqual(transition.to!.params, { id: '1' });
    };

    router.routeDidChange = (transition: Transition) => {
      enteredDidChange++;
      if (newParam) {
        assert.equal(transition.to!.localName, 'post');
        assert.equal(isPresent(transition.from) && transition.from.localName, 'post');
        assert.deepEqual(transition.to!.queryParams, { trk: 'b' });
        assert.deepEqual(isPresent(transition.from) && transition.from!.queryParams, { trk: 'a' });
      } else {
        assert.equal(transition.to!.localName, 'post');
        assert.equal(transition.from, null);
        assert.deepEqual(transition.to!.queryParams, { trk: 'a' });
      }

      assert.deepEqual(transition.to!.params, { id: '1' });
    };

    router
      .transitionTo('/posts/1?trk=a')
      .then(() => {
        newParam = true;
        return router.transitionTo('/posts/1?trk=b');
      })
      .then(() => {
        assert.equal(enteredWillChange, 2);
        assert.equal(enteredDidChange, 2);
      });
  });

  test('basic route to one with query params', function (assert) {
    assert.expect(8);
    map(assert, function (match) {
      match('/').to('index');
      match('/search').to('search');
    });

    routes = {
      search: createHandler('search'),
    };

    let newParam = false;

    router.routeWillChange = (transition: Transition) => {
      if (newParam) {
        assert.deepEqual(transition.to!.queryParams, { term: 'b' }, 'going to page with qps');
        assert.deepEqual(
          isPresent(transition.from) && transition.from!.queryParams,
          {},
          'from never has qps'
        );
      } else {
        assert.equal(transition.from, null);
        assert.deepEqual(transition.to!.queryParams, {});
      }
    };

    router.routeDidChange = (transition: Transition) => {
      if (newParam) {
        assert.deepEqual(transition.to!.queryParams, { term: 'b' });
        assert.deepEqual(isPresent(transition.from) && transition.from!.queryParams, {});
      } else {
        assert.equal(transition.from, null);
        assert.deepEqual(transition.to!.queryParams, {});
      }
    };

    router.transitionTo('/').then(() => {
      newParam = true;
      return router.transitionTo('search', { queryParams: { term: 'b' } });
    });
  });

  test('calling recognize should not affect the transition.from query params for subsequent transitions', function (assert) {
    assert.expect(12);
    map(assert, function (match) {
      match('/').to('index');
      match('/search').to('search');
    });

    routes = {
      search: createHandler('search'),
    };

    let firstParam = false;
    let secondParam = false;

    router.routeWillChange = (transition: Transition) => {
      if (secondParam) {
        assert.deepEqual(transition.to!.queryParams, { term: 'c' }, 'going to next page with qps');
        assert.deepEqual(
          isPresent(transition.from) && transition.from!.queryParams,
          { term: 'b' },
          'has previous qps'
        );
      } else if (firstParam) {
        assert.deepEqual(transition.to!.queryParams, { term: 'b' }, 'going to page with qps');
        assert.deepEqual(
          isPresent(transition.from) && transition.from!.queryParams,
          {},
          'from never has qps'
        );
      } else {
        assert.equal(transition.from, null);
        assert.deepEqual(transition.to!.queryParams, {});
      }
    };

    router.routeDidChange = (transition: Transition) => {
      if (secondParam) {
        assert.deepEqual(transition.to!.queryParams, { term: 'c' });
        assert.deepEqual(isPresent(transition.from) && transition.from!.queryParams, { term: 'b' });
      } else if (firstParam) {
        assert.deepEqual(transition.to!.queryParams, { term: 'b' });
        assert.deepEqual(isPresent(transition.from) && transition.from!.queryParams, {});
      } else {
        assert.equal(transition.from, null);
        assert.deepEqual(transition.to!.queryParams, {});
      }
    };

    router
      .transitionTo('/')
      .then(() => {
        firstParam = true;
        return router.transitionTo('search', { queryParams: { term: 'b' } });
      })
      .then(() => {
        secondParam = true;
        router.recognize('/search?wat=foo');
        return router.transitionTo({ queryParams: { term: 'c' } });
      });
  });

  test('redirects route events', function (assert) {
    assert.expect(19);
    map(assert, function (match) {
      match('/').to('index');
      match('/posts', function (match) {
        match('/:id').to('post');
        match('/details').to('postDetails');
      });
      match('/foo', function (match) {
        match('/').to('foo', function (match) {
          match('/bar').to('bar');
        });
      });
      match('/ok').to('ok');
    });

    let redirected1 = false;
    let redirected2 = false;
    let initial = true;
    let enteredWillChange = 0;
    let enteredDidChange = 0;

    routes = {
      post: createHandler('post', {
        model() {
          redirected1 = true;
          router.transitionTo('/foo/bar');
        },
      }),
      foo: createHandler('foo', {
        model() {
          redirected1 = false;
          redirected2 = true;
          router.transitionTo('/ok');
        },
      }),
      ok: createHandler('ok'),
      bar: createHandler('bar'),
      postDetails: createHandler('postDetails'),
    };

    router.routeWillChange = (transition: Transition) => {
      enteredWillChange++;
      if (initial) {
        assert.equal(transition.to!.localName, 'index');
        assert.equal(transition.from!, null);
        assert.equal(transition.to!.parent, null);
      } else if (redirected1) {
        assert.equal(transition.to!.localName, 'bar');
        assert.equal(isPresent(transition.from) && transition.from.localName, 'index');
        assert.equal(transition.to!.parent!.localName, 'foo');
      } else if (redirected2) {
        assert.equal(transition.to!.localName, 'ok');
        assert.equal(isPresent(transition.from) && transition.from.localName, 'index');
        assert.equal(transition.to!.parent!, null);
      } else {
        assert.equal(transition.to!.localName, 'post');
        assert.equal(isPresent(transition.from) && transition.from.localName, 'index');
        assert.equal(transition.to!.parent, null);
      }
    };

    router.routeDidChange = (transition: Transition) => {
      enteredDidChange++;
      if (initial) {
        assert.equal(transition.to!.localName, 'index');
        assert.equal(transition.from!, null);
        initial = false;
      } else {
        assert.equal(transition.to!.localName, 'ok');
        assert.equal(isPresent(transition.from) && transition.from.localName, 'index');
      }
    };

    router
      .transitionTo('/')
      .then(() => {
        return router.transitionTo('/posts/1');
      })
      .catch((err: any) => {
        console.log(err);
        assert.equal(err.name, 'TransitionAborted');
        return router.activeTransition as any;
      })
      .then(() => {
        assert.equal(enteredWillChange, 4);
        assert.equal(enteredDidChange, 2);
      });
  });

  test('abort route events', function (assert) {
    assert.expect(19);
    map(assert, function (match) {
      match('/').to('index');
      match('/posts', function (match) {
        match('/:id').to('post');
        match('/details').to('postDetails');
      });
      match('/foo', function (match) {
        match('/').to('foo', function (match) {
          match('/bar').to('bar');
        });
      });
    });

    let redirected = false;
    let initial = true;
    let aborted = false;
    let enteredWillChange = 0;
    let enteredDidChange = 0;

    routes = {
      post: createHandler('post', {
        model() {
          redirected = true;
          router.transitionTo('/foo/bar');
        },
      }),
      foo: createHandler('foo', {
        model(_model: any, transition: Transition) {
          aborted = true;
          redirected = false;
          transition.abort();
        },
      }),
      bar: createHandler('bar'),
      postDetails: createHandler('postDetails'),
    };

    router.routeWillChange = (transition: Transition) => {
      enteredWillChange++;
      if (initial) {
        assert.equal(transition.to!.localName, 'index');
        assert.equal(transition.from!, null);
        assert.equal(transition.to!.parent, null);
      } else if (redirected) {
        assert.equal(transition.to!.localName, 'bar');
        assert.equal(isPresent(transition.from) && transition.from.localName, 'index');
        assert.equal(transition.to!.parent!.localName, 'foo');
      } else if (aborted) {
        assert.equal(transition.isAborted, true);
        assert.equal(transition.to, transition.from);
        assert.equal(transition.to!.localName, 'index');
      } else {
        assert.equal(transition.to!.localName, 'post');
        assert.equal(isPresent(transition.from) && transition.from.localName, 'index');
        assert.equal(transition.to!.parent, null);
      }
    };

    router.routeDidChange = (transition: Transition) => {
      enteredDidChange++;
      if (initial) {
        assert.equal(transition.to!.localName, 'index');
        assert.equal(transition.from!, null);
        initial = false;
      } else {
        assert.equal(transition.to!.localName, 'index');
        assert.equal(isPresent(transition.from) && transition.from.localName, 'index');
      }
    };

    router
      .transitionTo('/')
      .then(() => {
        return router.transitionTo('/posts/1');
      })
      .catch((err: any) => {
        assert.equal(err.name, 'TransitionAborted');
        return router.activeTransition as any;
      })
      .then(() => {
        assert.equal(enteredWillChange, 4);
        assert.equal(enteredDidChange, 2);
      });
  });

  test('abort query param only', function (assert) {
    assert.expect(6);
    map(assert, function (match) {
      match('/').to('index');
    });

    routes = {
      search: createHandler('search'),
    };

    let newParam = false;
    let initial = true;

    router.updateURL = function (updateUrl) {
      url = updateUrl;
      if (!initial) {
        assert.ok(false, 'updateURL should not be called');
      }
    };

    router.routeWillChange = (transition: Transition) => {
      if (!transition.isAborted) {
        if (newParam) {
          assert.deepEqual(transition.to!.queryParams, { term: 'b' }, 'going to page with qps');
          assert.deepEqual(
            isPresent(transition.from) && transition.from!.queryParams,
            {},
            'from never has qps'
          );
        } else {
          assert.strictEqual(transition.from, null, 'null transition from');
          assert.deepEqual(transition.to!.queryParams, {}, 'empty transition queryParams');
        }
      }
      if (!initial) {
        if (!transition.isAborted) {
          newParam = false;
          transition.abort();
        }
      }
    };

    router.routeDidChange = (transition: Transition) => {
      if (!transition.isAborted) {
        assert.strictEqual(transition.from, null, 'routeDidChange null from transition');
        assert.deepEqual(transition.to!.queryParams, {}, 'routeDidChange empty queryParams');
      }
    };

    router.transitionTo('/').then(() => {
      newParam = true;
      initial = false;
      return router.transitionTo({ queryParams: { term: 'b' } });
    });
  });

  test('always has a transition through the substates', function (assert) {
    map(assert, function (match) {
      match('/').to('index');
      match('/posts', function (match) {
        match('/:id').to('post');
        match('/details').to('postDetails');
      });
      match('/foo', function (match) {
        match('/').to('foo', function (match) {
          match('/bar').to('bar');
        });
      });
      match('/err').to('fooError');
    });

    let enterSubstate = false;
    let initial = true;
    let isAborted = false;
    let errorHandled = false;
    let enteredWillChange = 0;
    let enteredDidChange = 0;

    routes = {
      post: createHandler('post', {
        beforeModel(transition: Transition) {
          isAborted = true;
          transition.abort();
          enterSubstate = true;
          router.intermediateTransitionTo('fooError');
        },
      }),
      foo: createHandler('foo'),
    };

    router.transitionDidError = (error: TransitionError, transition: Transition) => {
      if (error.wasAborted || transition.isAborted) {
        return logAbort(transition);
      } else {
        transition.trigger(false, 'error', error.error, transition, error.route);
        if (errorHandled) {
          transition.rollback();
          router.routeDidChange(transition);
          return transition;
        } else {
          transition.abort();
          return error.error;
        }
      }
    };

    router.routeWillChange = (transition: Transition) => {
      enteredWillChange++;
      if (initial) {
        assert.equal(transition.to!.localName, 'index', 'initial');
        assert.equal(transition.from!, null, 'initial');
        assert.equal(transition.to!.parent, null, 'initial');
      } else if (isAborted) {
        assert.equal(transition.to!.localName, 'index', 'aborted');
        assert.equal(isPresent(transition.from) && transition.from!.localName, 'index', 'aborted');
      } else if (enterSubstate) {
        assert.equal(transition.to!.localName, 'fooError', 'substate');
        assert.equal(isPresent(transition.from) && transition.from!.localName, 'index', 'substate');
        assert.equal(transition.to!.parent!.localName, 'foo', 'substate');
      } else {
        assert.equal(transition.to!.localName, 'post', 'to post');
        assert.equal(isPresent(transition.from) && transition.from!.localName, 'index', 'to post');
        assert.equal(transition.to!.parent, null, 'to post');
      }
    };

    router.routeDidChange = (transition: Transition) => {
      enteredDidChange++;
      if (initial) {
        assert.equal(transition.to!.localName, 'index', 'initial');
        assert.equal(transition.from!, null, 'initial');
        initial = false;
      } else if (isAborted) {
        assert.equal(transition.to!.localName, 'index', 'aborted');
        assert.equal(isPresent(transition.from) && transition.from!.localName, 'index', 'aborted');
        isAborted = false;
      } else {
        assert.equal(transition.to!.localName, 'bar');
        assert.equal(isPresent(transition.from) && transition.from!.localName, 'index');
      }
    };

    router
      .transitionTo('/')
      .then(() => {
        return router.transitionTo('/posts/1');
      })
      .catch((err: any) => {
        assert.equal(err.name, 'TransitionAborted');
        return router.activeTransition as any;
      })
      .finally(() => {
        assert.equal(enteredWillChange, 4);
        assert.equal(enteredDidChange, 2);
      });
  });

  test('error route events', function (assert) {
    map(assert, function (match) {
      match('/').to('index');
      match('/posts', function (match) {
        match('/:id').to('post');
        match('/details').to('postDetails');
      });
      match('/foo', function (match) {
        match('/').to('foo', function (match) {
          match('/bar').to('bar');
        });
      });
      match('/err').to('fooError');
    });

    let redirected = false;
    let initial = true;
    let errored = false;
    let errorHandled = false;
    let enteredWillChange = 0;
    let enteredDidChange = 0;

    routes = {
      post: createHandler('post', {
        model() {
          redirected = true;
          router.transitionTo('/foo/bar');
        },
      }),
      foo: createHandler('foo', {
        model() {
          errored = true;
          redirected = false;
          throw new Error('boom');
        },
        events: {
          error() {
            errorHandled = true;
            router.intermediateTransitionTo('fooError');
          },
        },
      }),
      fooError: createHandler('fooError'),
      bar: createHandler('bar'),
      postDetails: createHandler('postDetails'),
    };

    router.transitionDidError = (error: TransitionError, transition: Transition) => {
      if (error.wasAborted || transition.isAborted) {
        return logAbort(transition);
      } else {
        transition.trigger(false, 'error', error.error, transition, error.route);
        if (errorHandled) {
          transition.rollback();
          router.toInfos(transition, router.state!.routeInfos, true);
          router.routeDidChange(transition);
          return transition;
        } else {
          transition.abort();
          return error.error;
        }
      }
    };

    router.routeWillChange = (transition: Transition) => {
      enteredWillChange++;
      if (initial) {
        assert.equal(transition.to!.localName, 'index');
        assert.equal(transition.from!, null);
        assert.equal(transition.to!.parent, null);
      } else if (redirected) {
        assert.equal(transition.to!.localName, 'bar');
        assert.equal(isPresent(transition.from) && transition.from!.localName, 'index');
        assert.equal(transition.to!.parent!.localName, 'foo');
      } else if (errored) {
        assert.equal(transition.isAborted, false);
        assert.equal(isPresent(transition.from) && transition.from!.localName, 'index');
        assert.equal(transition.to!.localName, 'fooError');
      } else {
        assert.equal(transition.to!.localName, 'post');
        assert.equal(isPresent(transition.from) && transition.from!.localName, 'index');
        assert.equal(transition.to!.parent, null);
      }
    };

    router.routeDidChange = (transition: Transition) => {
      enteredDidChange++;
      if (initial) {
        assert.equal(transition.to!.localName, 'index');
        assert.equal(transition.from!, null);
        initial = false;
      } else {
        assert.equal(transition.to!.localName, 'fooError');
        assert.equal(isPresent(transition.from) && transition.from!.localName, 'index');
      }
    };

    router
      .transitionTo('/')
      .then(() => {
        return router.transitionTo('/posts/1');
      })
      .catch((err: any) => {
        assert.equal(err.name, 'TransitionAborted');
        return router.activeTransition as any;
      })
      .finally(() => {
        assert.equal(enteredWillChange, 4);
        assert.equal(enteredDidChange, 2);
      });
  });

  test("when transitioning to a new parent and child state, the parent's context should be available to the child's model", function (assert) {
    type Post = IModel;

    assert.expect(1);
    let contexts: Array<Post | undefined> = [];

    map(assert, function (match) {
      match('/').to('index');
      match('/posts/:id').to('post', function (match) {
        match('/details').to('postDetails');
      });
    });

    routes = {
      post: createHandler<Post>('post', {
        model: function () {
          return contexts;
        },
      }),

      postDetails: createHandler<Post>('postDetails', {
        name: 'postDetails',
        afterModel: function (_model: Post, transition: Transition) {
          contexts.push(transition.resolvedModels.post as Post | undefined);
        },
      }),
    };

    router
      .handleURL('/')
      .then(function () {
        // This is a crucial part of the test
        // In some cases, calling `generate` was preventing `model` from being called
        router.generate('postDetails', { id: 1 });

        return router.transitionTo('postDetails', { id: 1 });
      }, shouldNotHappen(assert))
      .then<any, Error>(function (value) {
        assert.deepEqual(contexts, [{ id: 1 }], 'parent context is available');
        return value;
      }, shouldNotHappen(assert));
  });

  test('handleURL: Handling a nested URL triggers each handler', function (assert) {
    assert.expect(37);

    let posts: Dict<unknown>[] = [];
    let allPosts = { all: true };
    let popularPosts = { popular: true };
    let amazingPosts = { id: 'amazing' };
    let sadPosts = { id: 'sad' };

    let counter = 0;

    let postIndexHandler = createHandler('postIndex', {
      model: function (params: Dict<unknown>, transition: Transition) {
        assert.equal(transition.from, null, 'initial transition');
        assert.equal(transition.to && transition.to.localName, 'showAllPosts', 'going to leaf');
        // this will always get called, since it's at the root
        // of all of the routes tested here
        assert.deepEqual(
          params,
          { queryParams: {} },
          'params should be empty in postIndexHandler#model'
        );
        return posts;
      },

      setup: function (context: unknown) {
        if (counter === 0) {
          assert.equal(
            postIndexHandler.context,
            posts,
            'postIndexHandler context should be set up in postIndexHandler#setup'
          );
          assert.strictEqual(
            context,
            posts,
            'The object passed in to postIndexHandler#setup should be posts'
          );
        } else {
          assert.ok(false, 'Should not get here');
        }
      },
    });

    let showAllPostsHandler = createHandler('showAllPosts', {
      model(params: Dict<unknown>, transition: Transition) {
        if (counter > 0 && counter < 4) {
          assert.equal(
            postIndexHandler.context,
            posts,
            'postIndexHandler context should be set up in showAllPostsHandler#model'
          );
        }

        if (counter < 4) {
          assert.equal(transition.from, null, 'initial transition');
          assert.equal(transition.to && transition.to.localName, 'showAllPosts', 'at leaf');
          assert.deepEqual(
            params,
            { queryParams: {} },
            'params should be empty in showAllPostsHandler#model'
          );
          return allPosts;
        } else {
          assert.ok(false, 'Should not get here');
        }

        return;
      },

      setup(context: Dict<unknown>) {
        if (counter === 0) {
          assert.equal(
            postIndexHandler.context,
            posts,
            'postIndexHandler context should be set up in showAllPostsHandler#setup'
          );
          assert.equal(
            showAllPostsHandler.context,
            allPosts,
            'showAllPostsHandler context should be set up in showAllPostsHandler#setup'
          );
          assert.strictEqual(
            context,
            allPosts,
            'The object passed in should be allPosts in showAllPostsHandler#setup'
          );
        } else {
          assert.ok(false, 'Should not get here');
        }
      },
    });

    let showPopularPostsHandler = createHandler('showPopularPosts', {
      model: function (params: Dict<unknown>) {
        if (counter < 3) {
          assert.ok(false, 'Should not get here');
        } else if (counter === 3) {
          assert.equal(
            postIndexHandler.context,
            posts,
            'postIndexHandler context should be set up in showPopularPostsHandler#model'
          );
          assert.deepEqual(
            params,
            { queryParams: {} },
            'params should be empty in showPopularPostsHandler#serialize'
          );
          return popularPosts;
        } else {
          assert.ok(false, 'Should not get here');
        }

        return;
      },

      setup: function (context: Dict<unknown>) {
        if (counter === 3) {
          assert.equal(
            postIndexHandler.context,
            posts,
            'postIndexHandler context should be set up in showPopularPostsHandler#setup'
          );
          assert.equal(
            showPopularPostsHandler.context,
            popularPosts,
            'showPopularPostsHandler context should be set up in showPopularPostsHandler#setup'
          );
          assert.strictEqual(
            context,
            popularPosts,
            'The object passed to showPopularPostsHandler#setup should be popular posts'
          );
        } else {
          assert.ok(false, 'Should not get here');
        }
      },
    });

    let showFilteredPostsHandler = createHandler('showFilteredPosts', {
      model: function (params: Dict<unknown>, transition: Transition) {
        if (counter < 4) {
          assert.ok(false, 'Should not get here');
        } else if (counter === 4) {
          assert.equal(transition.from && transition.from.localName, 'showPopularPosts');
          assert.equal(
            postIndexHandler.context,
            posts,
            'postIndexHandler context should be set up in showFilteredPostsHandler#model'
          );
          assert.deepEqual(
            params,
            { filter_id: 'amazing', queryParams: {} },
            "params should be { filter_id: 'amazing' } in showFilteredPostsHandler#model"
          );
          return amazingPosts;
        } else if (counter === 5) {
          assert.equal(
            transition.from && transition.from.localName,
            'showFilteredPosts',
            'came from same route'
          );
          assert.equal(
            transition.to && transition.to.localName,
            'showFilteredPosts',
            'going to same route'
          );
          assert.equal(transition.from?.params?.filter_id, 'amazing', 'old params');
          assert.equal(transition.to?.params?.filter_id, 'sad', 'new params');
          assert.equal(
            postIndexHandler.context,
            posts,
            'postIndexHandler context should be posts in showFilteredPostsHandler#model'
          );
          assert.deepEqual(
            params,
            { filter_id: 'sad', queryParams: {} },
            "params should be { filter_id: 'sad' } in showFilteredPostsHandler#model"
          );
          return sadPosts;
        } else {
          assert.ok(false, 'Should not get here');
        }

        return;
      },

      setup: function (context: Dict<unknown>) {
        if (counter === 4) {
          assert.equal(postIndexHandler.context, posts);
          assert.equal(showFilteredPostsHandler.context, amazingPosts);
          assert.strictEqual(context, amazingPosts);
        } else if (counter === 5) {
          assert.equal(postIndexHandler.context, posts);
          assert.equal(showFilteredPostsHandler.context, sadPosts);
          assert.strictEqual(context, sadPosts);
        } else {
          assert.ok(false, 'Should not get here');
        }
      },
    });

    routes = {
      postIndex: postIndexHandler,
      showAllPosts: showAllPostsHandler,
      showPopularPosts: showPopularPostsHandler,
      showFilteredPosts: showFilteredPostsHandler,
    };

    router
      .transitionTo('/posts')
      .then(function () {
        assert.ok(true, '1: Finished, trying /posts/all');
        counter++;
        return router.transitionTo('/posts/all');
      }, shouldNotHappen(assert))
      .then(function () {
        assert.ok(true, '2: Finished, trying /posts');
        counter++;
        return router.transitionTo('/posts');
      }, shouldNotHappen(assert))
      .then(function () {
        assert.ok(true, '3: Finished, trying /posts/popular');
        counter++;
        return router.transitionTo('/posts/popular');
      }, shouldNotHappen(assert))
      .then(function () {
        assert.ok(true, '4: Finished, trying /posts/filter/amazing');
        counter++;
        return router.transitionTo('/posts/filter/amazing');
      }, shouldNotHappen(assert))
      .then(function () {
        assert.ok(true, '5: Finished, trying /posts/filter/sad');
        counter++;
        return router.transitionTo('/posts/filter/sad');
      }, shouldNotHappen(assert))
      .then(function () {
        assert.ok(true, '6: Finished!');
      }, shouldNotHappen(assert));
  });

  test('it can handle direct transitions to named routes', function (assert) {
    let allPosts = { all: true };
    let popularPosts = { popular: true };
    let amazingPosts = { filter: 'amazing' };
    let sadPosts = { filter: 'sad' };

    let postIndexHandler = createHandler('postIndex', {
      model: function () {
        return allPosts;
      },

      serialize: function () {
        return {};
      },
    });

    let showAllPostsHandler = createHandler('showAllPosts', {
      model: function () {
        //assert.ok(!params, 'params is falsy for non dynamic routes');
        return allPosts;
      },

      serialize: function () {
        return {};
      },

      setup: function (context: Dict<unknown>) {
        assert.strictEqual(context, allPosts, 'showAllPosts should get correct setup');
      },
    });

    let showPopularPostsHandler = createHandler('showPopularPosts', {
      model: function () {
        return popularPosts;
      },

      serialize: function () {
        return {};
      },

      setup: function (context: Dict<unknown>) {
        assert.strictEqual(
          context,
          popularPosts,
          'showPopularPosts#setup should be called with the deserialized value'
        );
      },
    });

    let showFilteredPostsHandler = createHandler('showFilteredPosts', {
      model: function (params: Dict<unknown>) {
        if (!params) {
          return;
        }
        if (params.filter_id === 'amazing') {
          return amazingPosts;
        } else if (params.filter_id === 'sad') {
          return sadPosts;
        }
        return;
      },

      serialize: function (context: Dict<unknown>, params: string[]) {
        assert.deepEqual(params, ['filter_id'], 'showFilteredPosts should get correct serialize');
        return { filter_id: context.filter };
      },

      setup: function (context: Dict<unknown>) {
        if (counter === 2) {
          assert.strictEqual(
            context,
            amazingPosts,
            'showFilteredPosts should get setup with amazingPosts'
          );
        } else if (counter === 3) {
          assert.strictEqual(
            context,
            sadPosts,
            'showFilteredPosts should get setup setup with sadPosts'
          );
        }
      },
    });

    routes = {
      postIndex: postIndexHandler,
      showAllPosts: showAllPostsHandler,
      showPopularPosts: showPopularPostsHandler,
      showFilteredPosts: showFilteredPostsHandler,
    };

    router.updateURL = function (url) {
      let expected: Dict<string> = {
        0: '/posts',
        1: '/posts/popular',
        2: '/posts/filter/amazing',
        3: '/posts/filter/sad',
        4: '/posts',
      };

      assert.equal(url, expected[counter], 'updateURL should be called with correct url');
    };

    let counter = 0;

    router
      .handleURL('/posts')
      .then(function () {
        return router.transitionTo('showAllPosts');
      }, shouldNotHappen(assert))
      .then(function () {
        counter++;
        return router.transitionTo('showPopularPosts');
      }, shouldNotHappen(assert))
      .then(function () {
        counter++;
        return router.transitionTo('showFilteredPosts', amazingPosts);
      }, shouldNotHappen(assert))
      .then(function () {
        counter++;
        return router.transitionTo('showFilteredPosts', sadPosts);
      }, shouldNotHappen(assert))
      .then(function () {
        counter++;
        return router.transitionTo('showAllPosts');
      }, shouldNotHappen(assert));
  });

  test('replaceWith calls replaceURL', function (assert) {
    let updateCount = 0,
      replaceCount = 0;

    router.updateURL = function () {
      updateCount++;
    };

    router.replaceURL = function () {
      replaceCount++;
    };

    router
      .handleURL('/posts')
      .then(function () {
        return router.replaceWith('about');
      })
      .then(function () {
        assert.equal(updateCount, 0, 'should not call updateURL');
        assert.equal(replaceCount, 1, 'should call replaceURL once');
      });
  });

  test('applyIntent returns a tentative state based on a named transition', function (assert) {
    transitionTo(router, '/posts');
    let state = router.applyIntent('faq', []);
    assert.ok(state.routeInfos.length);
  });

  test('Moving to a new top-level route triggers exit callbacks', function (assert) {
    assert.expect(6);

    let allPosts = { posts: 'all' };
    let postsStore: Dict<any> = { 1: { id: 1 }, 2: { id: 2 } };
    let currentId: number;
    let currentPath: string;

    routes = {
      showAllPosts: createHandler('showAllPosts', {
        model: function () {
          return allPosts;
        },

        setup: function (posts: Dict<unknown>, transition: Transition) {
          assert.ok(!isExiting((this as unknown) as Route, transition.routeInfos));
          assert.equal(
            posts,
            allPosts,
            'The correct context was passed into showAllPostsHandler#setup'
          );
          currentPath = 'postIndex.showAllPosts';
        },

        exit: function (transition: Transition) {
          assert.ok(isExiting((this as unknown) as Route, transition.routeInfos));
        },
      }),

      showPost: createHandler('showPost', {
        model: function (params: Dict<unknown>) {
          let id = parseInt(params.id as string, 10);
          return postsStore[id];
        },

        serialize: function (post: Dict<unknown>) {
          return { id: post.id };
        },

        setup: function (post: Dict<unknown>) {
          currentPath = 'showPost';
          assert.equal(post.id, currentId, 'The post id is ' + currentId);
        },
      }),
    };

    router
      .handleURL('/posts')
      .then(function () {
        expectedUrl = '/posts/1';
        currentId = 1;
        return router.transitionTo('showPost', postsStore[1]);
      }, shouldNotHappen(assert))
      .then(function () {
        assert.equal(routePath(router.currentRouteInfos!), currentPath);
      }, shouldNotHappen(assert));
  });

  test('pivotHandler is exposed on Transition object', function (assert) {
    assert.expect(3);

    routes = {
      showAllPosts: createHandler('showAllPosts', {
        beforeModel: function (transition: Transition) {
          assert.ok(!transition.pivotHandler, 'First route transition has no pivot route');
        },
      }),

      showPopularPosts: createHandler('showPopularPosts', {
        beforeModel: function (transition: Transition) {
          assert.equal(
            transition.pivotHandler,
            routes.postIndex,
            'showAllPosts -> showPopularPosts pivotHandler is postIndex'
          );
        },
      }),

      postIndex: createHandler('postIndex'),

      about: createHandler('about', {
        beforeModel: function (transition: Transition) {
          assert.ok(!transition.pivotHandler, 'top-level transition has no pivotHandler');
        },
      }),
    };

    router
      .handleURL('/posts')
      .then(function () {
        return router.transitionTo('showPopularPosts');
      })
      .then(function () {
        return router.transitionTo('about');
      });
  });

  test('transition.resolvedModels after redirects b/w routes', function (assert) {
    type Application = { app: boolean } & IModel;

    assert.expect(3);

    map(assert, function (match) {
      match('/').to('application', function (match) {
        match('/peter').to('peter');
        match('/wagenet').to('wagenet');
      });
    });

    let app = { app: true };

    routes = {
      application: createHandler<Application>('application', {
        model: function () {
          assert.ok(true, 'application#model');
          return app;
        },
      }),

      peter: createHandler('peter', {
        model: function (_params: Dict<unknown>, transition: Transition) {
          assert.deepEqual(
            transition.resolvedModels.application as Application,
            app,
            'peter: resolvedModel correctly stored in resolvedModels for parent route'
          );
          router.transitionTo('wagenet');
        },
      }),
      wagenet: createHandler('wagenet', {
        model: function (_params: Dict<unknown>, transition: Transition) {
          assert.deepEqual(
            transition.resolvedModels.application as Application | undefined,
            app,
            'wagenet: resolvedModel correctly stored in resolvedModels for parent route'
          );
        },
      }),
    };

    transitionTo(router, '/peter');
  });

  test('transition.resolvedModels after redirects within the same route', function (assert) {
    type Admin = IModel & { admin: boolean };

    let admin = { admin: true },
      redirect = true;

    routes = {
      admin: createHandler<Admin>('admin', {
        model: function () {
          assert.ok(true, 'admin#model');
          return admin;
        },
      }),

      adminPosts: createHandler('adminPosts', {
        model: function (_params: Dict<unknown>, transition: Transition) {
          assert.deepEqual(
            transition.resolvedModels.admin as Admin | undefined,
            admin,
            'resolvedModel correctly stored in resolvedModels for parent route'
          );
          if (redirect) {
            redirect = false;
            router.transitionTo('adminPosts');
          }
        },
      }),
    };

    transitionTo(router, '/posts/admin/1/posts');
  });

  test(`transition.to.find's callback is always called with defined routeInfo`, function (assert) {
    type Application = { app: boolean } & IModel;

    assert.expect(3);

    map(assert, function (match) {
      match('/').to('application', function (match) {
        match('/peter').to('peter', function (match) {
          match('/wagenet').to('wagenet');
        });
      });
    });

    routes = {
      application: createHandler<Application>('application'),
      peter: createHandler('peter'),
      wagenet: createHandler('wagenet', {
        model: function (_params: Dict<unknown>, transition: Transition) {
          transition.to!.find((routeInfo) => {
            assert.ok(routeInfo, 'routeInfo is defined');
            return false;
          });
        },
      }),
    };

    transitionTo(router, '/peter/wagenet');
  });

  test('Moving to the same route with a different parent dynamic segment re-runs model', function (assert) {
    let admins: Dict<any> = { 1: { id: 1 }, 2: { id: 2 } },
      adminPosts: Dict<any> = { 1: { id: 1 }, 2: { id: 2 } };

    routes = {
      admin: createHandler('admin', {
        currentModel: -1,
        model: function (params: Dict<unknown>) {
          return (this.currentModel = admins[params.id as string]);
        },
      }),

      adminPosts: createHandler('adminPosts', {
        model: function () {
          return adminPosts[(routes.admin as any).currentModel.id];
        },
      }),
    };

    transitionTo(router, '/posts/admin/1/posts');
    assert.equal(routes.admin.context, admins[1]);
    assert.equal(routes.adminPosts.context, adminPosts[1]);

    transitionTo(router, '/posts/admin/2/posts');
    assert.equal(routes.admin.context, admins[2]);
    assert.equal(routes.adminPosts.context, adminPosts[2]);
  });

  test('Moving to a sibling route only triggers exit callbacks on the current route (when transitioned internally)', function (assert) {
    assert.expect(8);

    let allPosts = { posts: 'all' };

    let showAllPostsHandler = createHandler('showAllPosts', {
      model: function () {
        return allPosts;
      },

      setup: function (posts: Dict<unknown>) {
        assert.equal(
          posts,
          allPosts,
          'The correct context was passed into showAllPostsHandler#setup'
        );
      },

      enter: function () {
        assert.ok(true, 'The sibling handler should be entered');
      },

      exit: function () {
        assert.ok(true, 'The sibling handler should be exited');
      },
    });

    let filters: Dict<unknown> = {};

    let showFilteredPostsHandler = createHandler('showFilteredPosts', {
      enter: function () {
        assert.ok(true, 'The new handler was entered');
      },

      exit: function () {
        assert.ok(false, 'The new handler should not be exited');
      },

      model: function (params: Dict<unknown>) {
        let id = params.filter_id as string;
        if (!filters[id]) {
          filters[id] = { id: id };
        }

        return filters[id];
      },

      serialize: function (filter: Dict<unknown>) {
        assert.equal(filter.id, 'favorite', "The filter should be 'favorite'");
        return { filter_id: filter.id };
      },

      setup: function (filter: Dict<unknown>) {
        assert.equal(
          filter.id,
          'favorite',
          'showFilteredPostsHandler#setup was called with the favorite filter'
        );
      },
    });

    let postIndexHandler = createHandler('postIndex', {
      enter: function () {
        assert.ok(true, 'The outer handler was entered only once');
      },

      exit: function () {
        assert.ok(false, 'The outer handler was not exited');
      },
    });

    routes = {
      postIndex: postIndexHandler,
      showAllPosts: showAllPostsHandler,
      showFilteredPosts: showFilteredPostsHandler,
    };

    router.handleURL('/posts').then(function () {
      expectedUrl = '/posts/filter/favorite';
      return router.transitionTo('showFilteredPosts', { id: 'favorite' });
    });
  });

  test('Moving to a sibling route only triggers exit callbacks on the current route (when transitioned via a URL change)', function (assert) {
    assert.expect(7);

    let allPosts = { posts: 'all' };

    let showAllPostsHandler = createHandler('showAllPostsHandler', {
      model: function () {
        return allPosts;
      },

      setup: function (posts: Dict<unknown>) {
        assert.equal(
          posts,
          allPosts,
          'The correct context was passed into showAllPostsHandler#setup'
        );
      },

      enter: function () {
        assert.ok(true, 'The sibling handler should be entered');
      },

      exit: function () {
        assert.ok(true, 'The sibling handler should be exited');
      },
    });

    let filters: Dict<unknown> = {};

    let showFilteredPostsHandler = createHandler('showFilteredPosts', {
      enter: function () {
        assert.ok(true, 'The new handler was entered');
      },

      exit: function () {
        assert.ok(false, 'The new handler should not be exited');
      },

      model: function (params: Dict<unknown>) {
        assert.equal(params.filter_id, 'favorite', "The filter should be 'favorite'");

        let id = params.filter_id as string;
        if (!filters[id]) {
          filters[id] = { id: id };
        }

        return filters[id];
      },

      serialize: function (filter: Dict<unknown>) {
        return { filter_id: filter.id };
      },

      setup: function (filter: Dict<unknown>) {
        assert.equal(
          filter.id,
          'favorite',
          'showFilteredPostsHandler#setup was called with the favorite filter'
        );
      },
    });

    let postIndexHandler = createHandler('postIndex', {
      enter: function () {
        assert.ok(true, 'The outer handler was entered only once');
      },

      exit: function () {
        assert.ok(false, 'The outer handler was not exited');
      },
    });

    routes = {
      postIndex: postIndexHandler,
      showAllPosts: showAllPostsHandler,
      showFilteredPosts: showFilteredPostsHandler,
    };

    router.handleURL('/posts');

    flushBackburner();

    expectedUrl = '/posts/filter/favorite';
    router.handleURL(expectedUrl);
  });

  test('events can be targeted at the current handler', function (assert) {
    assert.expect(2);

    routes = {
      showPost: createHandler('showPost', {
        enter: function () {
          assert.ok(true, 'The show post handler was entered');
        },

        events: {
          expand: function () {
            assert.equal(this, routes.showPost, 'The handler is the `this` for the event');
          },
        },
      }),
    };

    transitionTo(router, '/posts/1');

    router.trigger('expand');
  });

  test('event triggering is pluggable', function (assert) {
    routes = {
      showPost: createHandler('showPost', {
        enter: function () {
          assert.ok(true, 'The show post handler was entered');
        },

        actions: {
          expand: function () {
            assert.equal(this, routes.showPost, 'The handler is the `this` for the event');
          },
        },
      }),
    };
    router.triggerEvent = function (
      handlerInfos: RouteInfo<Route>[],
      ignoreFailure: boolean,
      name: string,
      args: any[]
    ) {
      if (!handlerInfos) {
        if (ignoreFailure) {
          return;
        }
        throw new Error("Could not trigger event '" + name + "'. There are no active handlers");
      }

      for (let i = handlerInfos.length - 1; i >= 0; i--) {
        let handlerInfo = handlerInfos[i],
          handler = handlerInfo.route as any;

        if (handler.actions && handler.actions[name]) {
          if (handler.actions[name].apply(handler, args) !== true) {
            return;
          }
        }
      }
    };
    router.handleURL('/posts/1').then(function () {
      router.trigger('expand');
    });
  });

  test('Unhandled events raise an exception', function (assert) {
    router.handleURL('/posts/1');

    assert.throws(function () {
      router.trigger('doesnotexist');
    }, /doesnotexist/);
  });

  test('events can be targeted at a parent handler', function (assert) {
    assert.expect(3);

    routes = {
      postIndex: createHandler('postIndex', {
        enter: function () {
          assert.ok(true, 'The post index handler was entered');
        },

        events: {
          expand: function () {
            assert.equal(this, routes.postIndex, 'The handler is the `this` in events');
          },
        },
      }),
      showAllPosts: createHandler('showAllPosts', {
        enter: function () {
          assert.ok(true, 'The show all posts handler was entered');
        },
      }),
    };

    transitionTo(router, '/posts');
    router.trigger('expand');
  });

  test('events can bubble up to a parent handler via `return true`', function (assert) {
    assert.expect(4);

    routes = {
      postIndex: createHandler('postIndex', {
        enter: function () {
          assert.ok(true, 'The post index handler was entered');
        },

        events: {
          expand: function () {
            assert.equal(this, routes.postIndex, 'The handler is the `this` in events');
          },
        },
      }),
      showAllPosts: createHandler('showAllPosts', {
        enter: function () {
          assert.ok(true, 'The show all posts handler was entered');
        },
        events: {
          expand: function () {
            assert.equal(this, routes.showAllPosts, 'The handler is the `this` in events');
            return true;
          },
        },
      }),
    };

    router.handleURL('/posts').then(function () {
      router.trigger('expand');
    });
  });

  test("handled-then-bubbled events don't throw an exception if uncaught by parent route", function (assert) {
    assert.expect(3);

    routes = {
      postIndex: createHandler('postIndex', {
        enter: function () {
          assert.ok(true, 'The post index handler was entered');
        },
      }),

      showAllPosts: createHandler('showAllPosts', {
        enter: function () {
          assert.ok(true, 'The show all posts handler was entered');
        },
        events: {
          expand: function () {
            assert.equal(this, routes.showAllPosts, 'The handler is the `this` in events');
            return true;
          },
        },
      }),
    };

    transitionTo(router, '/posts');
    router.trigger('expand');
  });

  test('events only fire on the closest handler', function (assert) {
    assert.expect(5);

    routes = {
      postIndex: createHandler('postIndex', {
        enter: function () {
          assert.ok(true, 'The post index handler was entered');
        },

        events: {
          expand: function () {
            assert.ok(false, 'Should not get to the parent handler');
          },
        },
      }),

      showAllPosts: createHandler('showAllPosts', {
        enter: function () {
          assert.ok(true, 'The show all posts handler was entered');
        },

        events: {
          expand: function (passedContext1: Dict<unknown>, passedContext2: Dict<unknown>) {
            assert.equal(context1, passedContext1, 'A context is passed along');
            assert.equal(context2, passedContext2, 'A second context is passed along');
            assert.equal(this, routes.showAllPosts, 'The handler is passed into events as `this`');
          },
        },
      }),
    };

    let context1: Dict<unknown> = {},
      context2: Dict<unknown> = {};
    router.handleURL('/posts').then(function () {
      router.trigger('expand', context1, context2);
    });
  });

  test("Date params aren't treated as string/number params", function (assert) {
    assert.expect(1);

    routes = {
      showPostsForDate: createHandler('showPostsForDate', {
        serialize: function (date: Date) {
          return {
            date: date.getFullYear() + '-' + date.getMonth() + '-' + date.getDate(),
          };
        },

        model: function () {
          assert.ok(false, "model shouldn't be called; the date is the provided model");
        },
      }),
    };

    if (scenario.async) {
      serializers = {
        showPostsForDate: function (date: any) {
          return {
            date: date.getFullYear() + '-' + date.getMonth() + '-' + date.getDate(),
          };
        },
      };
    }

    let result = router.generate('showPostsForDate', new Date(1815, 5, 18));
    assert.equal(result, '/posts/on/1815-5-18');
  });

  test('getSerializer takes precedence over handler.serialize', function (assert) {
    assert.expect(2);

    router.getSerializer = function () {
      return function (date: any) {
        assert.ok(true, 'getSerializer called');
        return {
          date: date.getFullYear() + '-' + date.getMonth() + '-' + date.getDate(),
        };
      };
    };

    routes = {
      showPostsForDate: createHandler('showPostsForDate', {
        serialize: function () {
          assert.ok(false, "serialize method shouldn't be called");
          return {};
        },

        model: function () {
          assert.ok(false, "model shouldn't be called; the date is the provided model");
        },
      }),
    };

    assert.equal(router.generate('showPostsForDate', new Date(1815, 5, 18)), '/posts/on/1815-5-18');
  });

  test('the serializer method is unbound', function (assert) {
    assert.expect(1);

    router.getSerializer = function () {
      return function (this: void, date: any) {
        assert.equal(this, undefined);
        return {
          date: date.getFullYear() + '-' + date.getMonth() + '-' + date.getDate(),
        };
      };
    };

    router.generate('showPostsForDate', new Date(1815, 5, 18));
  });

  test('params are known by a transition up front', function (assert) {
    assert.expect(2);

    routes = {
      postIndex: createHandler('postIndex', {
        model: function (_params: Dict<unknown>, transition: Transition) {
          assert.deepEqual(transition[PARAMS_SYMBOL], {
            postIndex: {},
            showFilteredPosts: { filter_id: 'sad' },
          });
        },
      }),
      showFilteredPosts: createHandler('showFilteredPosts', {
        model: function (_params: Dict<unknown>, transition: Transition) {
          assert.deepEqual(transition[PARAMS_SYMBOL], {
            postIndex: {},
            showFilteredPosts: { filter_id: 'sad' },
          });
        },
      }),
    };

    transitionTo(router, '/posts/filter/sad', 'blorg');
  });

  test('transitionTo uses the current context if you are already in a handler with a context that is not changing', function (assert) {
    let admin = { id: 47 },
      adminPost = { id: 74 };

    routes = {
      admin: createHandler('admin', {
        serialize: function (object: Dict<unknown>) {
          assert.equal(object.id, 47, 'The object passed to serialize is correct');
          return { id: 47 };
        },

        model: function (params: Dict<unknown>) {
          assert.equal(params.id, 47, 'The object passed to serialize is correct');
          return admin;
        },
      }),

      adminPost: createHandler('adminPost', {
        serialize: function (object: Dict<unknown>) {
          return { post_id: object.id };
        },

        model: function (params: Dict<unknown>) {
          assert.equal(params.id, 74, 'The object passed to serialize is correct');
          return adminPost;
        },
      }),
    };

    expectedUrl = '/posts/admin/47/posts/74';
    transitionTo(router, 'adminPost', admin, adminPost);

    expectedUrl = '/posts/admin/47/posts/75';
    transitionTo(router, 'adminPost', { id: 75 });
  });

  test('check for mid-transition correctness', function (assert) {
    let posts: Dict<any> = {
      1: { id: 1 },
      2: { id: 2 },
      3: { id: 3 },
    };

    let showPostHandler = createHandler('showPost', {
      serialize: function (object: Dict<unknown>) {
        return (object && { id: object.id }) || null;
      },

      model: function (params: Dict<unknown>) {
        let id = params.id as string;
        return posts[id];
      },
    });

    routes = {
      showPost: showPostHandler,
    };

    // Get a reference to the transition, mid-transition.
    router.willTransition = function () {
      let midTransitionState = router.activeTransition![STATE_SYMBOL];

      // Make sure that the activeIntent doesn't match post 300.
      let isPost300Targeted = router.isActiveIntent(
        'showPost',
        [300],
        undefined,
        midTransitionState
      );
      assert.notOk(isPost300Targeted, 'Post 300 should not match post 3.');
    };

    // Go to post 3. This triggers our test.
    transitionTo(router, '/posts/3');
  });

  test('tests whether arguments to transitionTo are considered active', function (assert) {
    let admin = { id: 47 },
      adminPost = { id: 74 },
      posts: Dict<any> = {
        1: { id: 1 },
        2: { id: 2 },
        3: { id: 3 },
      };

    let adminHandler = createHandler('admin', {
      serialize: function () {
        return { id: 47 };
      },

      model: function () {
        return admin;
      },
    });

    let adminPostHandler = createHandler('adminPost', {
      serialize: function (object: Dict<unknown>) {
        return { post_id: object.id };
      },

      model: function () {
        return adminPost;
      },
    });

    let showPostHandler = createHandler('showPost', {
      serialize: function (object: Dict<unknown>) {
        return (object && { id: object.id }) || null;
      },

      model: function (params: Dict<unknown>) {
        return posts[params.id as string];
      },
    });

    routes = {
      admin: adminHandler,
      adminPost: adminPostHandler,
      showPost: showPostHandler,
    };

    transitionTo(router, '/posts/1');
    assert.ok(router.isActive('showPost'), 'The showPost handler is active');
    assert.ok(
      router.isActive('showPost', posts[1]),
      'The showPost handler is active with the appropriate context'
    );
    assert.ok(
      !router.isActive('showPost', posts[2]),
      'The showPost handler is inactive when the context is different'
    );
    assert.ok(!router.isActive('adminPost'), 'The adminPost handler is inactive');
    assert.ok(
      !router.isActive('showPost', null),
      'The showPost handler is inactive with a null context'
    );

    transitionTo(router, 'adminPost', admin, adminPost);
    assert.ok(router.isActive('adminPost'), 'The adminPost handler is active');
    assert.ok(
      router.isActive('adminPost', adminPost),
      'The adminPost handler is active with the current context'
    );
    assert.ok(
      router.isActive('adminPost', admin, adminPost),
      'The adminPost handler is active with the current and parent context'
    );
    assert.ok(router.isActive('admin'), 'The admin handler is active');
    assert.ok(router.isActive('admin', admin), 'The admin handler is active with its context');
  });

  test('calling generate on a non-dynamic route does not blow away parent contexts', function (assert) {
    map(assert, function (match) {
      match('/projects').to('projects', function (match) {
        match('/').to('projectsIndex');
        match('/project').to('project', function (match) {
          match('/').to('projectIndex');
        });
      });
    });

    let projects = {};

    routes = {
      projects: createHandler('projects', {
        model: function () {
          return projects;
        },
      }),
    };

    router.handleURL('/projects').then(function () {
      assert.equal(routes.projects.context, projects, 'projects handler has correct context');
      router.generate('projectIndex');
      assert.equal(routes.projects.context, projects, 'projects handler retains correct context');
    });
  });

  test('calling transitionTo on a dynamic parent route causes non-dynamic child context to be updated', function (assert) {
    type Project = { project_id: string } & IModel;

    map(assert, function (match) {
      match('/project/:project_id').to('project', function (match) {
        match('/').to('projectIndex');
      });
    });

    let projectHandler = createHandler<Project>('project', {
      model: function (params: Dict<unknown>) {
        delete params.queryParams;
        return params;
      },
    });

    let projectIndexHandler = createHandler<Project>('projectIndex', {
      model: function (_params: Dict<unknown>, transition: Transition) {
        return transition.resolvedModels.project;
      },
    });

    routes = {
      project: projectHandler,
      projectIndex: projectIndexHandler,
    };

    transitionTo(router, '/project/1');
    assert.deepEqual(
      projectHandler.context,
      { project_id: '1' },
      'project handler retains correct context'
    );
    assert.deepEqual(
      projectIndexHandler.context,
      { project_id: '1' },
      'project index handler has correct context'
    );

    router.generate('projectIndex', { project_id: '2' });

    assert.deepEqual(
      projectHandler.context,
      { project_id: '1' },
      'project handler retains correct context'
    );
    assert.deepEqual(
      projectIndexHandler.context,
      { project_id: '1' },
      'project index handler retains correct context'
    );

    transitionTo(router, 'projectIndex', { project_id: '2' });
    assert.deepEqual(
      projectHandler.context,
      { project_id: '2' },
      'project handler has updated context'
    );
    assert.deepEqual(
      projectIndexHandler.context,
      { project_id: '2' },
      'project index handler has updated context'
    );
  });

  test('reset exits and clears the current and target route handlers', function (assert) {
    let postIndexExited = false;
    let showAllPostsExited = false;
    let steps = 0;

    assert.equal(++steps, 1);
    let postIndexHandler = createHandler('postIndex', {
      exit: function () {
        postIndexExited = true;
        assert.equal(++steps, 4);
      },
    });
    let showAllPostsHandler = createHandler('showAllPosts', {
      exit: function () {
        showAllPostsExited = true;
        assert.equal(++steps, 3);
      },
    });
    routes = {
      postIndex: postIndexHandler,
      showAllPosts: showAllPostsHandler,
    };

    transitionTo(router, '/posts/all');

    assert.equal(++steps, 2);
    router.reset();

    assert.ok(postIndexExited, 'Post index handler did not exit');
    assert.ok(showAllPostsExited, 'Show all posts handler did not exit');
    assert.equal(router.currentRouteInfos, null, 'currentHandlerInfos should be null');
  });

  test('any of the model hooks can redirect with or without promise', function (assert) {
    assert.expect(26);
    let setupShouldBeEntered = false;
    let returnPromise = false;
    let redirectTo: string;

    function redirectToAbout() {
      if (returnPromise) {
        return reject().then(null, function () {
          router.transitionTo(redirectTo);
        });
      } else {
        router.transitionTo(redirectTo);
      }
      return;
    }

    routes = {
      index: createHandler('index', {
        beforeModel: redirectToAbout,
        model: redirectToAbout,
        afterModel: redirectToAbout,

        setup: function () {
          assert.ok(setupShouldBeEntered, 'setup should be entered at this time');
        },
      }),

      about: createHandler('about', {
        setup: function () {
          assert.ok(true, "about handler's setup function was called");
        },
      }),

      borf: createHandler('borf', {
        setup: function () {
          assert.ok(true, 'borf setup entered');
        },
      }),
    };

    function testStartup(assert: Assert, firstExpectedURL?: string) {
      map(assert, function (match) {
        match('/').to('index');
        match('/about').to('about');
        match('/foo').to('foo');
        match('/borf').to('borf');
      });

      redirectTo = 'about';

      // Perform a redirect on startup.
      expectedUrl = firstExpectedURL || '/about';
      transitionTo(router, '/');

      expectedUrl = '/borf';
      redirectTo = 'borf';

      transitionTo(router, 'index');
    }

    testStartup(assert);

    returnPromise = true;
    testStartup(assert);

    delete routes.index.beforeModel;
    returnPromise = false;
    testStartup(assert);

    returnPromise = true;
    testStartup(assert);

    delete routes.index.model;
    returnPromise = false;
    testStartup(assert);

    returnPromise = true;
    testStartup(assert);

    delete routes.index.afterModel;
    setupShouldBeEntered = true;
    testStartup(assert, '/');
  });

  test('transitionTo with a promise pauses the transition until resolve, passes resolved context to setup', function (assert) {
    routes = {
      index: createHandler('index'),
      showPost: createHandler('showPost', {
        setup: function (context: Dict<unknown>) {
          assert.deepEqual(context, { id: 1 }, 'setup receives a resolved context');
        },
      }),
    };

    transitionTo(router, '/index');

    transitionTo(
      router,
      'showPost',
      new Promise(function (resolve) {
        resolve({ id: 1 });
      })
    );
  });

  test('error handler gets called for errors in validation hooks', function (assert) {
    assert.expect(25);
    let setupShouldBeEntered = false;
    let expectedReason = { reason: 'No funciona, mon frere.' };

    function throwAnError() {
      return reject(expectedReason);
    }

    routes = {
      index: createHandler('index', {
        beforeModel: throwAnError,
        model: throwAnError,
        afterModel: throwAnError,

        events: {
          error: function (reason: string) {
            assert.equal(
              reason,
              expectedReason,
              "the value passed to the error handler is what was 'thrown' from the hook"
            );
          },
        },

        setup: function () {
          assert.ok(setupShouldBeEntered, 'setup should be entered at this time');
        },
      }),

      about: createHandler('about', {
        setup: function () {
          assert.ok(true, "about handler's setup function was called");
        },
      }),
    };

    function testStartup(assert: Assert) {
      map(assert, function (match) {
        match('/').to('index');
        match('/about').to('about');
      });

      // Perform a redirect on startup.
      return router.handleURL('/').then(null, function (reason: string) {
        assert.equal(
          reason,
          expectedReason,
          'handleURL error reason is what was originally thrown'
        );

        return router
          .transitionTo('index')
          .then(shouldNotHappen(assert), function (newReason: string) {
            assert.equal(
              newReason,
              expectedReason,
              'transitionTo error reason is what was originally thrown'
            );
          });
      });
    }

    testStartup(assert)
      .then(function () {
        return testStartup(assert);
      })
      .then(function () {
        delete routes.index.beforeModel;
        return testStartup(assert);
      })
      .then(function () {
        return testStartup(assert);
      })
      .then(function () {
        delete routes.index.model;
        return testStartup(assert);
      })
      .then(function () {
        return testStartup(assert);
      })
      .then(function () {
        delete routes.index.afterModel;
        setupShouldBeEntered = true;
        return testStartup(assert);
      });
  });

  test("Errors shouldn't be handled after proceeding to next child route", function (assert) {
    assert.expect(3);

    map(assert, function (match) {
      match('/parent').to('parent', function (match) {
        match('/articles').to('articles');
        match('/login').to('login');
      });
    });

    routes = {
      articles: createHandler('articles', {
        beforeModel: function () {
          assert.ok(true, 'articles beforeModel was entered');
          return reject('blorg');
        },
        events: {
          error: function () {
            assert.ok(true, 'error handled in articles');
            router.transitionTo('login');
          },
        },
      }),

      login: createHandler('login', {
        setup: function () {
          assert.ok(true, 'login#setup');
        },
      }),

      parent: createHandler('parent', {
        events: {
          error: function () {
            assert.ok(false, "handled error shouldn't bubble up to parent route");
          },
        },
      }),
    };

    router.handleURL('/parent/articles');
  });

  test("Error handling shouldn't trigger for transitions that are already aborted", function (assert) {
    assert.expect(1);

    map(assert, function (match) {
      match('/slow_failure').to('slow_failure');
      match('/good').to('good');
    });

    routes = {
      slow_failure: createHandler('showFailure', {
        model: function () {
          return new Promise(function (_res, rej) {
            router.transitionTo('good');
            rej();
          });
        },
        events: {
          error: function () {
            assert.ok(false, "error handling shouldn't fire");
          },
        },
      }),

      good: createHandler('good', {
        setup: function () {
          assert.ok(true, 'good#setup');
        },
      }),
    };

    router.handleURL('/slow_failure');
    flushBackburner();
  });

  test('Transitions to the same destination as the active transition just return the active transition', function (assert) {
    assert.expect(1);

    let transition0 = router.handleURL('/index');
    let transition1 = router.handleURL('/index');
    assert.equal(transition0, transition1);
    flushBackburner();
  });

  test('can redirect from error handler', function (assert) {
    assert.expect(4);

    let errorCount = 0;

    routes = {
      index: createHandler('index'),

      showPost: createHandler('showPost', {
        model: function () {
          return reject('borf!');
        },
        events: {
          error: function (e: Error) {
            errorCount++;

            assert.equal(e, 'borf!', 'received error thrown from model');

            // Redirect to index.
            router.transitionTo('index').then(function () {
              if (errorCount === 1) {
                // transition back here to test transitionTo error handling.
                return router
                  .transitionTo('showPost', reject('borf!'))
                  .then(shouldNotHappen(assert), function (e: Error) {
                    assert.equal(e, 'borf!', 'got thing');
                  });
              }
              return;
            }, shouldNotHappen(assert));
          },
        },

        setup: function () {
          assert.ok(false, 'should not get here');
        },
      }),
    };

    router.handleURL('/posts/123').then(shouldNotHappen(assert), function (reason: string) {
      assert.equal(reason, 'borf!', 'expected reason received from first failed transition');
    });
  });

  test('can redirect from setup/enter', function (assert) {
    assert.expect(5);

    routes = {
      index: createHandler('index', {
        enter: function () {
          assert.ok(true, 'index#enter called');
          router.transitionTo('about').then(secondAttempt, shouldNotHappen(assert));
        },
        setup: function () {
          assert.ok(true, 'index#setup called');
          router.transitionTo('/about').then(thirdAttempt, shouldNotHappen(assert));
        },
        events: {
          error: function () {
            assert.ok(false, 'redirects should not call error hook');
          },
        },
      }),
      about: createHandler('about', {
        setup: function () {
          assert.ok(true, 'about#setup was entered');
        },
      }),
    };

    router.handleURL('/index').then(shouldNotHappen(assert), assertAbort(assert));

    function secondAttempt() {
      delete routes.index.enter;
      router.transitionTo('index').then(shouldNotHappen(assert), assertAbort(assert));
    }

    function thirdAttempt() {
      delete routes.index.setup;
      router.transitionTo('index').then(null, shouldNotHappen(assert));
    }
  });

  test('redirecting to self from validation hooks should no-op (and not infinite loop)', function (assert) {
    assert.expect(2);

    let count = 0;

    routes = {
      index: createHandler('index', {
        afterModel: function () {
          if (count++ > 10) {
            assert.ok(false, 'infinite loop occurring');
          } else {
            assert.ok(count <= 2, 'running index no more than twice');
            router.transitionTo('index');
          }
        },
        setup: function () {
          assert.ok(true, 'setup was called');
        },
      }),
    };

    router.handleURL('/index');
  });

  test('Transition#method(null) prevents URLs from updating', function (assert) {
    assert.expect(1);

    routes = {
      about: createHandler('about', {
        setup: function () {
          assert.ok(true, 'about#setup was called');
        },
      }),
    };

    router.updateURL = function () {
      assert.ok(false, "updateURL shouldn't have been called");
    };

    // Test multiple calls to method in a row.
    router.handleURL('/index').method(null);
    router.handleURL('/index').method(null);
    flushBackburner();

    router.transitionTo('about').method(null);
    flushBackburner();
  });

  test('redirecting to self from enter hooks should no-op (and not infinite loop)', function (assert) {
    assert.expect(1);

    let count = 0;

    routes = {
      index: createHandler('index', {
        setup: function () {
          if (count++ > 10) {
            assert.ok(false, 'infinite loop occurring');
          } else {
            assert.ok(true, 'setup was called');
            router.transitionTo('index');
          }
        },
      }),
    };

    router.handleURL('/index');
  });

  test('redirecting to child handler from validation hooks should no-op (and not infinite loop)', function (assert) {
    assert.expect(4);

    routes = {
      postIndex: createHandler('postIndex', {
        beforeModel: function () {
          assert.ok(true, 'postIndex beforeModel called');
          router.transitionTo('showAllPosts');
        },
      }),

      showAllPosts: createHandler('showAllPosts', {
        beforeModel: function () {
          assert.ok(true, 'showAllPosts beforeModel called');
        },
      }),

      showPopularPosts: createHandler('showPopularPosts', {
        beforeModel: function () {
          assert.ok(true, 'showPopularPosts beforeModel called');
        },
      }),
    };

    router.handleURL('/posts/popular').then(
      function () {
        assert.ok(false, 'redirected handleURL should not succeed');
      },
      function () {
        assert.ok(true, 'redirected handleURL should fail');
      }
    );
  });

  function startUpSetup(assert: Assert) {
    routes = {
      index: createHandler('index', {
        setup: function () {
          assert.ok(true, 'index setup called');
        },
      }),
      about: createHandler('about', {
        setup: function () {
          assert.ok(true, 'about setup called');
        },
      }),
      faq: createHandler('faq', {
        setup: function () {
          assert.ok(true, 'faq setup called');
        },
      }),
    };
  }

  test('transitionTo with named transition can be called at startup', function (assert) {
    assert.expect(2);

    startUpSetup(assert);

    router.transitionTo('index').then(
      function () {
        assert.ok(true, 'success handler called');
      },
      function () {
        assert.ok(false, 'failure handle should not be called');
      }
    );
  });

  test('transitionTo with URL transition can be called at startup', function (assert) {
    assert.expect(2);

    startUpSetup(assert);

    router.transitionTo('/index').then(
      function () {
        assert.ok(true, 'success handler called');
      },
      function () {
        assert.ok(false, 'failure handle should not be called');
      }
    );
  });

  test('transitions fire a didTransition event on the destination route', function (assert) {
    assert.expect(1);

    routes = {
      about: createHandler('about', {
        events: {
          didTransition: function () {
            assert.ok(true, "index's didTransition was called");
          },
        },
      }),
    };

    router.handleURL('/index').then(function () {
      router.transitionTo('about');
    }, shouldNotHappen(assert));
  });

  test('willTransition function fired before route change', function (assert) {
    assert.expect(1);

    let beforeModelNotCalled = true;

    routes = {
      about: createHandler('about', {
        beforeModel: function () {
          beforeModelNotCalled = false;
        },
      }),
    };

    router.willTransition = function () {
      assert.ok(beforeModelNotCalled, 'about beforeModel hook should not be called at this time');
    };

    router.handleURL('/about');
  });

  test('willTransition function fired with handler infos passed in', function (assert) {
    assert.expect(2);

    router.handleURL('/about').then(function () {
      router.willTransition = function (fromInfos, toInfos) {
        assert.equal(
          routePath(fromInfos),
          'about',
          'first argument should be the old handler infos'
        );
        assert.equal(
          routePath(toInfos),
          'postIndex.showPopularPosts',
          'second argument should be the new handler infos'
        );
      };

      router.handleURL('/posts/popular');
    });
  });

  test('willTransition function fired with cancellable transition passed in', function (assert) {
    assert.expect(2);

    router.handleURL('/index').then(function () {
      router.willTransition = function (_fromInfos, _toInfos, transition) {
        assert.ok(true, "index's transitionTo was called");
        transition.abort();
      };

      return router.transitionTo('about').then(shouldNotHappen(assert), assertAbort(assert));
    });
  });

  test('transitions can be aborted in the willTransition event', function (assert) {
    assert.expect(3);

    routes = {
      index: createHandler('index', {
        setup: function () {
          assert.ok(true, 'index setup called');
        },
        events: {
          willTransition: function (transition: Transition) {
            assert.ok(true, "index's transitionTo was called");
            transition.abort();
          },
        },
      }),
      about: createHandler('about', {
        setup: function () {
          assert.ok(true, 'about setup called');
        },
      }),
    };

    router.handleURL('/index').then(function () {
      return router.transitionTo('about').then(shouldNotHappen(assert), assertAbort(assert));
    });
  });

  test('transitions can redirected in the willTransition event', function (assert) {
    assert.expect(2);

    let destFlag = true;

    routes = {
      index: createHandler('index', {
        setup: function () {
          assert.ok(true, 'index setup called');
        },
        events: {
          willTransition: function () {
            // Router code must be careful here not to refire
            // `willTransition` when a transition is already
            // underway, else infinite loop.
            let dest = destFlag ? 'about' : 'faq';
            destFlag = !destFlag;
            router.transitionTo(dest);
          },
        },
      }),
      about: createHandler('about', {
        setup: function () {
          assert.ok(true, 'about setup called');
        },
      }),
      faq: createHandler('faq', {
        setup: function () {
          assert.ok(false, 'faq setup should not be called');
        },
      }),
    };

    router.handleURL('/index').then(function () {
      router.transitionTo('faq');
    });
  });

  test('transitions that abort and enter into a substate', function (assert) {
    assert.expect(3);

    routes = {
      index: createHandler('index'),
      about: createHandler('about', {
        setup: function () {
          assert.ok(true, 'about setup called');
        },
        events: {
          willTransition: function (transition: Transition) {
            assert.ok(true, 'willTransition');
            transition.abort();
            router.intermediateTransitionTo('faq');
          },
        },
      }),
      faq: createHandler('faq', {
        setup: function () {
          assert.ok(true, 'faq setup called');
        },
      }),
    };

    router.handleURL('/about').then(() => {
      return router.transitionTo('index');
    });
  });

  test('aborted transitions can be saved and later retried', function (assert) {
    assert.expect(9);

    let shouldPrevent = true,
      transitionToAbout,
      lastTransition: Transition,
      retryTransition: Transition;

    routes = {
      index: createHandler('index', {
        setup: function () {
          assert.ok(true, 'index setup called');
        },
        events: {
          willTransition: function (transition: Transition) {
            assert.ok(true, "index's willTransition was called");
            if (shouldPrevent) {
              transition.data.foo = 'hello';
              (transition as any).foo = 'hello';
              transition.abort();
              lastTransition = transition;
            } else {
              assert.ok(!(transition as any).foo, 'no foo property exists on new transition');
              assert.equal(
                transition.data.foo,
                'hello',
                'values stored in data hash of old transition persist when retried'
              );
            }
          },
        },
      }),
      about: createHandler('about', {
        setup: function () {
          assert.ok(true, 'about setup called');
        },
      }),
    };

    router.handleURL('/index').then(function () {
      router
        .transitionTo('about')
        .then(shouldNotHappen(assert), function () {
          assert.ok(true, 'transition was blocked');
          shouldPrevent = false;
          transitionToAbout = lastTransition;
          retryTransition = transitionToAbout.retry();
          assert.equal(retryTransition.urlMethod, 'update');
          return retryTransition;
        })
        .then(function () {
          assert.ok(true, 'transition succeeded via .retry()');
        }, shouldNotHappen(assert));
    });
  });

  test('aborted transitions can be saved and later retried asynchronously', function (assert) {
    assert.expect(2);

    let abortedTransition: Transition;
    let shouldPrevent = true;
    routes = {
      index: createHandler('index', {
        events: {
          willTransition: function (transition: Transition) {
            if (shouldPrevent) {
              abortedTransition = transition.abort();
              router.intermediateTransitionTo('loading');
            }
          },
        },
      }),
      about: createHandler('about', {
        setup: function () {
          assert.ok(true, 'about setup called');
        },
      }),
      loading: createHandler('loading', {
        setup: function () {
          assert.ok(true, 'loading setup called');
        },
      }),
    };

    router.handleURL('/index').then(function () {
      return router
        .transitionTo('about')
        .then(shouldNotHappen(assert), function () {
          shouldPrevent = false;
          return new Promise((resolve) => {
            let transition = abortedTransition.retry();
            resolve(transition);
          });
        })
        .then(function () {
          assert.ok(true, 'transition succeeded via .retry()');
        }, shouldNotHappen(assert))
        .catch(shouldNotHappen(assert));
    });
  });

  test('if an aborted transition is retried, it preserves the urlMethod of the original one', function (assert) {
    assert.expect(9);

    let shouldPrevent = true,
      transitionToAbout,
      lastTransition: Transition,
      retryTransition: Transition;

    routes = {
      index: createHandler('index', {
        setup: function () {
          assert.ok(true, 'index setup called');
        },
        events: {
          willTransition: function (transition: Transition) {
            assert.ok(true, "index's willTransition was called");
            if (shouldPrevent) {
              transition.data.foo = 'hello';
              (transition as any).foo = 'hello';
              transition.abort();
              lastTransition = transition;
            } else {
              assert.ok(!(transition as any).foo, 'no foo property exists on new transition');
              assert.equal(
                transition.data.foo,
                'hello',
                'values stored in data hash of old transition persist when retried'
              );
            }
          },
        },
      }),
      about: createHandler('about', {
        setup: function () {
          assert.ok(true, 'about setup called');
        },
      }),
    };

    router.handleURL('/index').then(function () {
      router
        .replaceWith('about')
        .then(shouldNotHappen(assert), function () {
          assert.ok(true, 'transition was blocked');
          shouldPrevent = false;
          transitionToAbout = lastTransition;
          retryTransition = transitionToAbout.retry();
          assert.equal(retryTransition.urlMethod, 'replace');
          return transitionToAbout.retry();
        })
        .then(function () {
          assert.ok(true, 'transition succeeded via .retry()');
        }, shouldNotHappen(assert));
    });
  });

  test('if an initial transition is aborted during validation phase and later retried', function (assert) {
    assert.expect(7);

    let shouldRedirectToLogin = true;
    let currentURL = '/login';
    let urlStack: string[][] = [];
    let lastTransition: Transition;

    map(assert, function (match) {
      match('/').to('index');
      match('/login').to('login');
    });

    router.updateURL = function (url) {
      urlStack.push(['updateURL', url]);
      currentURL = url;
    };

    router.replaceURL = function (url) {
      urlStack.push(['replaceURL', url]);
      currentURL = url;
    };

    routes = {
      index: createHandler('index', {
        beforeModel: function (transition: Transition) {
          assert.ok(true, 'index model called');
          if (shouldRedirectToLogin) {
            lastTransition = transition;
            return router.transitionTo('/login');
          }
          return;
        },
      }),
      login: createHandler('login', {
        setup: function () {
          assert.ok('login setup called');
        },
      }),
    };

    // use `handleURL` to emulate initial transition properly
    handleURL(router, '/')
      .then(shouldNotHappen(assert, 'initial transition aborted'), function () {
        assert.equal(currentURL, '/login', 'currentURL matches');
        assert.deepEqual(urlStack, [['replaceURL', '/login']]);

        shouldRedirectToLogin = false;
        return lastTransition.retry();
      })
      .then(function () {
        assert.equal(currentURL, '/', 'after retry currentURL is updated');
        assert.deepEqual(urlStack, [
          ['replaceURL', '/login'],
          ['updateURL', '/'],
        ]);
      }, shouldNotHappen(assert, 'final catch'));
  });

  test('completed transitions can be saved and later retried', function (assert) {
    assert.expect(8);

    let post = { id: '123' },
      savedTransition: Transition;

    routes = {
      showPost: createHandler('showPost', {
        afterModel: function (model: Dict<unknown>, transition: Transition) {
          if (savedTransition === undefined) {
            assert.equal(transition.from && transition.from.localName, 'index', 'starting point');
          } else {
            assert.equal(
              transition.from && transition.from.localName,
              'about',
              'new starting point'
            );
          }

          assert.equal(transition.to && transition.to.localName, 'showPost', 'to points at leaf');
          assert.equal(model, post, "showPost's afterModel got the expected post model");
          savedTransition = transition;
        },
      }),
      index: createHandler('index', {
        model(_params: Dict<unknown>, transition: Transition) {
          assert.equal(transition.from, null);
        },
      }),
      about: createHandler('about', {
        setup: function () {
          assert.ok(true, 'setup was entered');
        },
      }),
    };

    router
      .handleURL('/index')
      .then(function () {
        return router.transitionTo('showPost', post);
      })
      .then(function () {
        return router.transitionTo('about');
      })
      .then(function () {
        return savedTransition.retry();
      });
  });

  function setupAuthenticatedExample(assert: Assert) {
    map(assert, function (match) {
      match('/index').to('index');
      match('/login').to('login');

      match('/admin').to('admin', function (match) {
        match('/about').to('about');
        match('/posts/:post_id').to('adminPost');
      });
    });

    let isLoggedIn = false,
      lastRedirectedTransition: Transition;

    routes = {
      index: createHandler('index'),
      login: createHandler('login', {
        events: {
          logUserIn: function () {
            isLoggedIn = true;
            lastRedirectedTransition.retry();
          },
        },
      }),
      admin: createHandler('admin', {
        beforeModel: function (transition: Transition) {
          lastRedirectedTransition = transition;
          assert.ok(true, 'beforeModel redirect was called');
          if (!isLoggedIn) {
            router.transitionTo('login');
          }
        },
      }),
      about: createHandler('about', {
        setup: function () {
          assert.ok(isLoggedIn, 'about was entered only after user logged in');
        },
      }),
      adminPost: createHandler('adminPost', {
        model: function (params: Dict<unknown>) {
          assert.deepEqual(
            params,
            { post_id: '5', queryParams: {} },
            'adminPost received params previous transition attempt'
          );
          return 'adminPost';
        },
        setup: function (model: Dict<unknown>) {
          assert.equal(model, 'adminPost', 'adminPost was entered with correct model');
        },
      }),
    };
  }

  test('authenticated routes: starting on non-auth route', function (assert) {
    assert.expect(8);

    setupAuthenticatedExample(assert);

    transitionTo(router, '/index');
    transitionToWithAbort(assert, router, 'about');
    transitionToWithAbort(assert, router, 'about');
    transitionToWithAbort(assert, router, '/admin/about');

    // Log in. This will retry the last failed transition to 'about'.
    router.trigger('logUserIn');
  });

  test('authenticated routes: starting on auth route', function (assert) {
    assert.expect(8);

    setupAuthenticatedExample(assert);

    transitionToWithAbort(assert, router, '/admin/about');
    transitionToWithAbort(assert, router, '/admin/about');
    transitionToWithAbort(assert, router, 'about');

    // Log in. This will retry the last failed transition to 'about'.
    router.trigger('logUserIn');
  });

  test('authenticated routes: starting on parameterized auth route', function (assert) {
    assert.expect(5);

    setupAuthenticatedExample(assert);

    transitionToWithAbort(assert, router, '/admin/posts/5');

    // Log in. This will retry the last failed transition to '/posts/5'.
    router.trigger('logUserIn');
  });

  test('An instantly aborted transition fires no hooks', function (assert) {
    assert.expect(8);

    let hooksShouldBeCalled = false;

    routes = {
      index: createHandler('index', {
        beforeModel: function (transition: Transition) {
          assert.equal(
            transition.from,
            null,
            'from is "null" on initial transitions even with aborts'
          );
          assert.ok(hooksShouldBeCalled, 'index beforeModel hook should be called at this time');
        },
      }),
      about: createHandler('about', {
        beforeModel: function () {
          assert.ok(hooksShouldBeCalled, 'about beforeModel hook should be called at this time');
        },
      }),
    };

    router
      .transitionTo('index')
      .abort()
      .then(shouldNotHappen(assert), function () {
        assert.ok(true, 'Failure handler called for index');
        return router.transitionTo('/index').abort();
      })
      .then<Error, Transition>(shouldNotHappen(assert), function () {
        assert.ok(true, 'Failure handler called for /index');
        hooksShouldBeCalled = true;
        return router.transitionTo('index');
      })
      .then<Transition, never>(function () {
        assert.ok(true, 'Success handler called for index');
        hooksShouldBeCalled = false;
        return router.transitionTo('about').abort();
      }, shouldNotHappen(assert))
      .then<Error, Transition>(shouldNotHappen(assert), function () {
        assert.ok(true, 'failure handler called for about');
        return router.transitionTo('/about').abort();
      })
      .then(shouldNotHappen(assert), function () {
        assert.ok(true, 'failure handler called for /about');
        hooksShouldBeCalled = true;
        return router.transitionTo('/about');
      });
  });

  test('a successful transition resolves with the target handler', function (assert) {
    assert.expect(2);

    // Note: this is extra convenient for Ember where you can all
    // .transitionTo right on the route.

    routes = {
      index: createHandler('index', { borfIndex: true }),
      about: createHandler('about', { borfAbout: true }),
    };

    router
      .handleURL('/index')
      .then(function (route: Route) {
        assert.ok((route as any)['borfIndex'], 'resolved to index handler');
        return router.transitionTo('about');
      }, shouldNotHappen(assert))
      .then(function (result: Dict<unknown>) {
        assert.ok(result.borfAbout, 'resolved to about handler');
      });
  });

  test('transitions have a .promise property', function (assert) {
    assert.expect(2);

    router
      .handleURL('/index')
      .promise!.then(function () {
        let promise = router.transitionTo('about').abort().promise;
        assert.ok(promise, 'promise exists on aborted transitions');
        return promise;
      }, shouldNotHappen(assert))
      .then(shouldNotHappen(assert), function () {
        assert.ok(true, 'failure handler called');
      });
  });

  test('the serialize function is bound to the correct object when called', function (assert) {
    assert.expect(scenario.async ? 0 : 1);

    routes = {
      showPostsForDate: createHandler('showPostsForDate', {
        serialize: function (date: any) {
          assert.equal(this, routes.showPostsForDate);
          return {
            date: date.getFullYear() + '-' + date.getMonth() + '-' + date.getDate(),
          };
        },
      }),
    };

    router.generate('showPostsForDate', new Date(1815, 5, 18));
  });

  test('transitionTo will soak up resolved parent models of active transition', function (assert) {
    assert.expect(5);

    let admin = { id: 47 },
      adminPost = { id: 74 },
      adminSetupShouldBeEntered = false;

    function adminPromise() {
      return new Promise(function (res) {
        res(admin);
      });
    }

    let adminHandler = createHandler('admin', {
      serialize: function (object: Dict<unknown>) {
        assert.equal(object.id, 47, 'The object passed to serialize is correct');
        return { id: 47 };
      },

      model: function (params: Dict<unknown>) {
        assert.equal(params.id, 47, 'The object passed to serialize is correct');
        return admin;
      },

      setup: function () {
        assert.ok(adminSetupShouldBeEntered, "adminHandler's setup should be called at this time");
      },
    });

    let adminPostHandler = createHandler('adminPost', {
      serialize: function (object: Dict<unknown>) {
        return { post_id: object.id };
      },

      setup: function () {
        assert.equal(
          adminHandler.context,
          admin,
          'adminPostHandler receives resolved soaked promise from previous transition'
        );
      },

      model: function () {
        return adminPost;
      },
    });

    let adminPostsHandler = createHandler('adminPosts', {
      beforeModel: function () {
        adminSetupShouldBeEntered = true;
        router.transitionTo('adminPost', adminPost);
      },
    });

    let indexHandler = createHandler('index', {
      setup: function () {
        assert.ok(true, 'index entered');
      },
    });

    routes = {
      index: indexHandler,
      admin: adminHandler,
      adminPost: adminPostHandler,
      adminPosts: adminPostsHandler,
    };

    router.transitionTo('index').then(function () {
      router
        .transitionTo('adminPosts', adminPromise())
        .then(shouldNotHappen(assert), assertAbort(assert));
    });
  });

  test("transitionTo will soak up resolved all models of active transition, including present route's resolved model", function (assert) {
    assert.expect(2);

    let modelCalled = 0,
      hasRedirected = false;

    map(assert, function (match) {
      match('/post').to('post', function (match) {
        match('/').to('postIndex');
        match('/new').to('postNew');
      });
    });

    let postHandler = createHandler('post', {
      model: function () {
        assert.equal(modelCalled++, 0, "postHandler's model should only be called once");
        return { title: 'Hello world' };
      },

      redirect: function () {
        if (!hasRedirected) {
          hasRedirected = true;
          router.transitionTo('postNew');
        }
      },
    });

    routes = {
      post: postHandler,
      postIndex: createHandler('postIndex'),
      postNew: createHandler('postNew'),
    };

    router.transitionTo('postIndex').then(shouldNotHappen(assert), assertAbort(assert));
  });

  test("can reference leaf '/' route by leaf or parent name", function (assert) {
    map(assert, function (match) {
      match('/').to('app', function (match) {
        match('/').to('index');
        match('/nest').to('nest', function (match) {
          match('/').to('nest.index');
        });
      });
    });

    function assertOnRoute(name: string) {
      let last = router.currentRouteInfos![router.currentRouteInfos!.length - 1];
      assert.equal(last.name, name);
    }

    transitionTo(router, 'app');
    assertOnRoute('index');
    transitionTo(router, 'nest');
    assertOnRoute('nest.index');
    transitionTo(router, 'app');
    assertOnRoute('index');
  });

  test('resolved models can be swapped out within afterModel', function (assert) {
    assert.expect(3);

    let modelPre = {},
      modelPost = {};

    routes = {
      index: createHandler('index', {
        model: function () {
          return modelPre;
        },
        afterModel: function (resolvedModel: Dict<unknown>, transition: Transition) {
          assert.equal(
            resolvedModel,
            transition.resolvedModels.index,
            "passed-in resolved model equals model in transition's hash"
          );
          assert.equal(
            resolvedModel,
            modelPre,
            'passed-in resolved model equals model returned from `model`'
          );
          transition.resolvedModels.index = modelPost;
        },
        setup: function (model: Dict<unknown>) {
          assert.equal(
            model,
            modelPost,
            'the model passed to `setup` is the one substituted in afterModel'
          );
        },
      }),
    };

    router.transitionTo('index');
  });

  test('String/number args in transitionTo are treated as url params', function (assert) {
    assert.expect(11);

    let adminParams = { id: '1' },
      adminModel = { id: '1' },
      adminPostModel = { id: '2' };

    routes = {
      admin: createHandler('admin', {
        model: function (params: Dict<unknown>) {
          delete params.queryParams;
          assert.deepEqual(
            params,
            adminParams,
            'admin handler gets the number passed in via transitionTo, converts to string'
          );
          return adminModel;
        },
      }),
      adminPost: createHandler('adminPost', {
        model: function (params: Dict<unknown>) {
          delete params.queryParams;
          assert.deepEqual(
            params,
            { post_id: '2' },
            'adminPost handler gets the string passed in via transitionTo'
          );
          return adminPostModel;
        },
        setup: function () {
          assert.ok(true, 'adminPost setup was entered');
        },
      }),
    };

    router
      .handleURL('/index')
      .then(function () {
        expectedUrl = '/posts/admin/1/posts/2';
        return router.transitionTo('adminPost', 1, '2');
      })
      .then(function () {
        assert.ok(router.isActive('adminPost', 1, '2'), 'adminPost is active via params');
        assert.ok(
          router.isActive('adminPost', 1, adminPostModel),
          'adminPost is active via contexts'
        );

        adminParams = { id: '0' };
        expectedUrl = '/posts/admin/0/posts/2';
        return router.transitionTo('adminPost', 0, '2');
      })
      .then(function () {
        assert.ok(router.isActive('adminPost', 0, '2'), 'adminPost is active via params');
        assert.ok(
          router.isActive('adminPost', 0, adminPostModel),
          'adminPost is active via contexts'
        );
      }, shouldNotHappen(assert));
  });

  test("Transitions returned from beforeModel/model/afterModel hooks aren't treated as pausing promises", function (assert) {
    assert.expect(6);

    routes = {
      index: createHandler('index', {
        beforeModel: function () {
          assert.ok(true, 'index beforeModel called');
          return router.transitionTo('index');
        },
        model: function () {
          assert.ok(true, 'index model called');
          return router.transitionTo('index');
        },
        afterModel: function () {
          assert.ok(true, 'index afterModel called');
          return router.transitionTo('index');
        },
      }),
    };

    function testStartup(assert: Assert) {
      map(assert, function (match) {
        match('/index').to('index');
      });

      return router.handleURL('/index');
    }

    testStartup(assert)
      .then(function () {
        delete routes.index.beforeModel;
        return testStartup(assert);
      })
      .then(function () {
        delete routes.index.model;
        return testStartup(assert);
      })
      .then(function () {
        delete routes.index.afterModel;
        return testStartup(assert);
      });
  });

  /* TODO: revisit this idea
  test("exceptions thrown from model hooks aren't swallowed", function(assert) {
  assert.expect(7);

  enableErrorHandlingDeferredActionQueue();

  let anError = {};
  function throwAnError() {
    throw anError;
  }

  let routeWasEntered = false;

  handlers = {
    index: {
      beforeModel: throwAnError,
      model: throwAnError,
      afterModel: throwAnError,
      setup: function(model) {
        routeWasEntered = true;
      }
    }
  };

  let hooks = ['beforeModel', 'model', 'afterModel'];

  while(hooks.length) {
    let transition = router.transitionTo('index');
    flush(anError);
    transition.abort();
    assert.ok(!routeWasEntered, "route hasn't been entered yet");
    delete handlers.index[hooks.shift()];
  }

  router.transitionTo('index');
  flush(anError);

  assert.ok(routeWasEntered, "route was finally entered");
  });
  */

  test('Transition#followRedirects() returns a promise that fulfills when any redirecting transitions complete', function (assert) {
    assert.expect(3);

    routes.about = createHandler('about', {
      redirect: function () {
        router.transitionTo('faq').then(null, shouldNotHappen(assert));
      },
    });

    router
      .transitionTo('/index')
      .followRedirects()
      .then(function (handler: Route) {
        assert.equal(
          handler,
          routes.index,
          'followRedirects works with non-redirecting transitions'
        );

        return router.transitionTo('about').followRedirects();
      })
      .then(function (handler: Route) {
        assert.equal(
          handler,
          routes.faq,
          'followRedirects promise resolved with redirected faq handler'
        );

        (routes.about as Route).beforeModel = function (transition: Transition) {
          transition.abort();
          return undefined;
        };

        // followRedirects should just reject for non-redirecting transitions.
        return router
          .transitionTo('about')
          .followRedirects()
          .then(shouldNotHappen(assert), assertAbort(assert));
      });
  });

  test('Transition#followRedirects() works correctly when redirecting from an async model hook', function (assert) {
    assert.expect(2);

    routes.index = createHandler('index', {
      beforeModel: function () {
        return Promise.resolve(true).then(() => {
          return router.transitionTo('about');
        });
      },
    });

    routes.about = createHandler('about', {
      setup: function () {
        assert.ok(true, 'about#setup was called');
      },
    });

    router
      .transitionTo('/index')
      .followRedirects()
      .then(function (handler: Route) {
        assert.equal(
          handler,
          routes.about,
          'followRedirects works with redirect from async hook transitions'
        );
      });
  });

  test("Returning a redirecting Transition from a model hook doesn't cause things to explode", function (assert) {
    assert.expect(2);

    routes.index = createHandler('index', {
      beforeModel: function () {
        return router.transitionTo('about');
      },
    });

    routes.about = createHandler('about', {
      setup: function () {
        assert.ok(true, 'about#setup was called');
      },
    });

    router.transitionTo('/index').then(null, assertAbort(assert));
  });

  test('Generate works w queryparams', function (assert) {
    assert.equal(router.generate('index'), '/index', 'just index');
    assert.equal(
      router.generate('index', { queryParams: { foo: '123' } }),
      '/index?foo=123',
      'just index'
    );
    assert.equal(
      router.generate('index', { queryParams: { foo: '123', bar: '456' } }),
      '/index?bar=456&foo=123',
      'just index'
    );
  });

  if (scenario.async) {
    test('Generate does not invoke getHandler', function (assert) {
      let originalGetHandler = router.getRoute;
      router.getRoute = function () {
        assert.ok(false, 'getHandler should not be called');
        return createHandler('empty');
      };

      assert.equal(router.generate('index'), '/index', 'just index');
      assert.equal(
        router.generate('index', { queryParams: { foo: '123' } }),
        '/index?foo=123',
        'just index'
      );
      assert.equal(
        router.generate('index', { queryParams: { foo: '123', bar: '456' } }),
        '/index?bar=456&foo=123',
        'just index'
      );

      router.getRoute = originalGetHandler;
    });
  }

  test('errors in enter/setup hooks fire `error`', function (assert) {
    assert.expect(4);

    let count = 0;

    routes = {
      index: createHandler('index', {
        enter: function () {
          throw 'OMG ENTER';
        },
        setup: function () {
          throw 'OMG SETUP';
        },
        events: {
          error: function (e: Error) {
            if (count === 0) {
              assert.equal(e, 'OMG ENTER', "enter's throw value passed to error hook");
            } else if (count === 1) {
              assert.equal(e, 'OMG SETUP', "setup's throw value passed to error hook");
            } else {
              assert.ok(false, 'should not happen');
            }
          },
        },
      }),
    };

    router
      .handleURL('/index')
      .then(shouldNotHappen(assert), function (reason: string) {
        assert.equal(reason, 'OMG ENTER', "enters's error was propagated");
        count++;
        delete routes.index.enter;
        return router.handleURL('/index');
      })
      .then<Error, void>(shouldNotHappen(assert), function (reason: string) {
        assert.equal(reason, 'OMG SETUP', "setup's error was propagated");
        delete routes.index.setup;
      });
  });

  test('invalidating parent model with different string/numeric parameters invalidates children', function (assert) {
    map(assert, function (match) {
      match('/:p').to('parent', function (match) {
        match('/:c').to('child');
      });
    });

    assert.expect(8);

    let count = 0;
    routes = {
      parent: createHandler('parent', {
        model: function (params: Dict<unknown>) {
          assert.ok(true, 'parent model called');
          return { id: params.p };
        },
        setup: function (model: Dict<unknown>) {
          if (count === 0) {
            assert.deepEqual(model, { id: '1' });
          } else {
            assert.deepEqual(model, { id: '2' });
          }
        },
      }),
      child: createHandler('child', {
        model: function (params: Dict<unknown>) {
          assert.ok(true, 'child model called');
          return { id: params.c };
        },
        setup: function (model: Dict<unknown>) {
          if (count === 0) {
            assert.deepEqual(model, { id: '1' });
          } else {
            assert.deepEqual(model, { id: '1' });
          }
        },
      }),
    };

    transitionTo(router, 'child', '1', '1');
    count = 1;
    transitionTo(router, 'child', '2', '1');
  });

  test('intents make use of previous transition state in case not enough contexts are provided to retry a transition', function (assert) {
    assert.expect(3);

    map(assert, function (match) {
      match('/').to('application', function (match) {
        match('/users/:user').to('user', function (match) {
          match('/index').to('userIndex');
          match('/auth').to('auth');
        });
        match('/login').to('login');
      });
    });

    let hasAuthed = false,
      savedTransition: Transition,
      didFinish = false;
    routes = {
      auth: createHandler('auth', {
        beforeModel: function (transition: Transition) {
          if (!hasAuthed) {
            savedTransition = transition;
            router.transitionTo('login');
          }
        },
        setup: function () {
          didFinish = true;
        },
      }),
    };

    transitionTo(router, 'userIndex', { user: 'machty' });

    // Then attempt to transition into auth; this will redirect.
    transitionTo(router, 'auth');
    assert.ok(savedTransition!, 'transition was saved');

    hasAuthed = true;
    savedTransition!.retry();
    flushBackburner();

    assert.ok(didFinish, 'did enter auth route');
    assert.equal((routes.user.context as any).user, 'machty', 'User was remembered upon retry');
  });

  test('A failed transition calls the catch and finally callbacks', function (assert) {
    assert.expect(2);

    map(assert, function (match) {
      match('/').to('application', function (match) {
        match('/bad').to('badRoute');
      });
    });

    routes = {
      badRoute: createHandler('badRoute', {
        beforeModel: function () {
          return new Promise(function (_resolve, reject) {
            reject('example reason');
          });
        },
      }),
    };

    router
      .handleURL('/bad')
      .catch(function () {
        assert.ok(true, 'catch callback was called');
      })
      .finally(function () {
        assert.ok(true, 'finally callback was called');
      });
    flushBackburner();
  });

  test('A successful transition calls the finally callback', function (assert) {
    assert.expect(1);

    map(assert, function (match) {
      match('/').to('application', function (match) {
        match('/example').to('exampleRoute');
      });
    });

    router.handleURL('/example').finally(function () {
      assert.ok(true, 'finally callback was called');
    });
  });

  test('transition sets isActive by default', function (assert) {
    assert.expect(2);

    map(assert, function (match) {
      match('/').to('application', function (match) {
        match('/example').to('exampleRoute');
      });
    });

    let transition = router.handleURL('/example');

    assert.equal(transition.isActive, true);
    assert.equal(transition.isAborted, false);
  });

  test('transition sets isActive to false when aborted', function (assert) {
    assert.expect(4);

    map(assert, function (match) {
      match('/').to('application', function (match) {
        match('/example').to('exampleRoute');
      });
    });

    let transition = router.handleURL('/example');

    assert.equal(transition.isActive, true, 'precond');
    assert.equal(transition.isAborted, false, 'precond');

    transition.abort();

    assert.equal(transition.isActive, false, 'isActive should be false after abort');
    assert.equal(transition.isAborted, true, 'isAborted is set to true after abort');
  });

  if (scenario.async) {
    test('getHandler is invoked synchronously when returning Promises', function (assert) {
      assert.expect(2);

      let count = 0;
      let handlerCount = 2;

      routes = {
        postIndex: createHandler('postIndex'),
        showAllPosts: createHandler('showAllPosts'),
      };

      router.getRoute = function (name) {
        count++;

        return Promise.resolve(scenario.getRoute.call(null, name)).then(function (handler: Route) {
          assert.equal(count, handlerCount);
          return handler;
        });
      };

      router.transitionTo('/posts/all');
    });
  }

  module('Multiple dynamic segments per route (' + scenario.name + ')');

  test('Multiple string/number params are soaked up', function (assert) {
    assert.expect(3);

    map(assert, function (match) {
      match('/:foo_id/:bar_id').to('bar');
    });

    routes = {
      bar: createHandler('bar', {
        model: function () {
          return {};
        },
      }),
    };

    expectedUrl = '/omg/lol';
    transitionTo(router, 'bar', 'omg', 'lol');

    expectedUrl = '/omg/heehee';
    transitionTo(router, 'bar', 'heehee');

    expectedUrl = '/lol/no';
    transitionTo(router, 'bar', 'lol', 'no');
  });

  module('isActive (' + scenario.name + ')', {
    setup: function (assert: Assert) {
      routes = {
        parent: createHandler('parent', {
          serialize: function (obj: Dict<unknown>) {
            return {
              one: obj.one,
              two: obj.two,
            };
          },
        }),
        child: createHandler('child', {
          serialize: function (obj: Dict<unknown>) {
            return {
              three: obj.three,
              four: obj.four,
            };
          },
        }),
      };

      // When using an async getHandler serializers need to be loaded separately
      if (scenario.async) {
        serializers = {
          parent: function (obj) {
            let castObj = obj as Dict<unknown>;
            // TODO: Review this
            return {
              one: castObj.one,
              two: castObj.two,
            };
          },
          child: function (obj) {
            let castObj = obj as Dict<unknown>;
            return {
              three: castObj.three,
              four: castObj.four,
            };
          },
        };
      }

      map(assert, function (match) {
        match('/:one/:two').to('parent', function (match) {
          match('/:three/:four').to('child');
        });
      });

      expectedUrl = null;

      transitionTo(router, 'child', 'a', 'b', 'c', 'd');
    },
  });

  test('isActive supports multiple soaked up string/number params (via params)', function (assert) {
    assert.ok(router.isActive('child'), 'child');
    assert.ok(router.isActive('parent'), 'parent');

    assert.ok(router.isActive('child', 'd'), 'child d');
    assert.ok(router.isActive('child', 'c', 'd'), 'child c d');
    assert.ok(router.isActive('child', 'b', 'c', 'd'), 'child b c d');
    assert.ok(router.isActive('child', 'a', 'b', 'c', 'd'), 'child a b c d');

    assert.ok(!router.isActive('child', 'e'), '!child e');
    assert.ok(!router.isActive('child', 'c', 'e'), '!child c e');
    assert.ok(!router.isActive('child', 'e', 'd'), '!child e d');
    assert.ok(!router.isActive('child', 'x', 'x'), '!child x x');
    assert.ok(!router.isActive('child', 'b', 'c', 'e'), '!child b c e');
    assert.ok(!router.isActive('child', 'b', 'e', 'd'), 'child b e d');
    assert.ok(!router.isActive('child', 'e', 'c', 'd'), 'child e c d');
    assert.ok(!router.isActive('child', 'a', 'b', 'c', 'e'), 'child a b c e');
    assert.ok(!router.isActive('child', 'a', 'b', 'e', 'd'), 'child a b e d');
    assert.ok(!router.isActive('child', 'a', 'e', 'c', 'd'), 'child a e c d');
    assert.ok(!router.isActive('child', 'e', 'b', 'c', 'd'), 'child e b c d');

    assert.ok(router.isActive('parent', 'b'), 'parent b');
    assert.ok(router.isActive('parent', 'a', 'b'), 'parent a b');

    assert.ok(!router.isActive('parent', 'c'), '!parent c');
    assert.ok(!router.isActive('parent', 'a', 'c'), '!parent a c');
    assert.ok(!router.isActive('parent', 'c', 'b'), '!parent c b');
    assert.ok(!router.isActive('parent', 'c', 't'), '!parent c t');
  });

  test('isActive supports multiple soaked up string/number params (via serialized objects)', function (assert) {
    assert.ok(router.isActive('child', { three: 'c', four: 'd' }), 'child(3:c, 4:d)');
    assert.ok(!router.isActive('child', { three: 'e', four: 'd' }), '!child(3:e, 4:d)');
    assert.ok(!router.isActive('child', { three: 'c', four: 'e' }), '!child(3:c, 4:e)');
    assert.ok(!router.isActive('child', { three: 'c' }), '!child(3:c)');
    assert.ok(!router.isActive('child', { four: 'd' }), '!child(4:d)');
    assert.ok(!router.isActive('child', {}), '!child({})');

    assert.ok(router.isActive('parent', { one: 'a', two: 'b' }), 'parent(1:a, 2:b)');
    assert.ok(!router.isActive('parent', { one: 'e', two: 'b' }), '!parent(1:e, 2:b)');
    assert.ok(!router.isActive('parent', { one: 'a', two: 'e' }), '!parent(1:a, 2:e)');
    assert.ok(!router.isActive('parent', { one: 'a' }), '!parent(1:a)');
    assert.ok(!router.isActive('parent', { two: 'b' }), '!parent(2:b)');

    assert.ok(
      router.isActive('child', { one: 'a', two: 'b' }, { three: 'c', four: 'd' }),
      'child(1:a, 2:b, 3:c, 4:d)'
    );
    assert.ok(
      !router.isActive('child', { one: 'e', two: 'b' }, { three: 'c', four: 'd' }),
      '!child(1:e, 2:b, 3:c, 4:d)'
    );
    assert.ok(
      !router.isActive('child', { one: 'a', two: 'b' }, { three: 'c', four: 'e' }),
      '!child(1:a, 2:b, 3:c, 4:e)'
    );
  });

  test('isActive supports multiple soaked up string/number params (mixed)', function (assert) {
    assert.ok(router.isActive('child', 'a', 'b', { three: 'c', four: 'd' }));
    assert.ok(router.isActive('child', 'b', { three: 'c', four: 'd' }));
    assert.ok(!router.isActive('child', 'a', { three: 'c', four: 'd' }));
    assert.ok(router.isActive('child', { one: 'a', two: 'b' }, 'c', 'd'));
    assert.ok(router.isActive('child', { one: 'a', two: 'b' }, 'd'));
    assert.ok(!router.isActive('child', { one: 'a', two: 'b' }, 'c'));

    assert.ok(!router.isActive('child', 'a', 'b', { three: 'e', four: 'd' }));
    assert.ok(!router.isActive('child', 'b', { three: 'e', four: 'd' }));
    assert.ok(!router.isActive('child', { one: 'e', two: 'b' }, 'c', 'd'));
    assert.ok(!router.isActive('child', { one: 'e', two: 'b' }, 'd'));
  });

  module('Preservation of params between redirects (' + scenario.name + ')', {
    setup: function (assert: Assert) {
      expectedUrl = null;

      map(assert, function (match) {
        match('/').to('index');
        match('/:foo_id').to('foo', function (match) {
          match('/').to('fooIndex');
          match('/:bar_id').to('bar', function (match) {
            match('/').to('barIndex');
          });
        });
      });

      routes = {
        foo: createHandler('foo', {
          modelCount: undefined,
          model: function (params: Dict<unknown>) {
            this.modelCount = this.modelCount ? (this as any).modelCount + 1 : 1;
            return { id: params.foo_id };
          },
          afterModel: function () {
            router.transitionTo('barIndex', '789');
          },
        }),

        bar: createHandler('bar', {
          model: function (params: Dict<unknown>) {
            this.modelCount = this.modelCount ? (this as any).modelCount + 1 : 1;
            return { id: params.bar_id };
          },
        }),
      };
    },
  });

  test("Starting on '/' root index", function (assert) {
    transitionTo(router, '/');

    // Should call model for foo and bar
    expectedUrl = '/123/789';
    transitionTo(router, 'barIndex', '123', '456');

    assert.equal(
      (routes.foo as any).modelCount,
      2,
      'redirect in foo#afterModel should run foo#model twice (since validation failed)'
    );

    assert.deepEqual(routes.foo.context, { id: '123' });
    assert.deepEqual(routes.bar.context, { id: '789' }, 'bar should have redirected to bar 789');

    // Try setting foo's context to 200; this should redirect
    // bar to '789' but preserve the new foo 200.
    expectedUrl = '/200/789';
    transitionTo(router, 'fooIndex', '200');

    assert.equal(
      (routes.foo as any).modelCount,
      4,
      'redirect in foo#afterModel should re-run foo#model'
    );

    assert.deepEqual(routes.foo.context, { id: '200' });
    assert.deepEqual(routes.bar.context, { id: '789' }, 'bar should have redirected to bar 789');
  });

  test("Starting on '/' root index, using redirect", function (assert) {
    (routes.foo.redirect as any) = routes.foo.afterModel;
    delete routes.foo.afterModel;

    transitionTo(router, '/');

    // Should call model for foo and bar
    expectedUrl = '/123/789';
    transitionTo(router, 'barIndex', '123', '456');

    assert.equal(
      (routes.foo as any).modelCount,
      1,
      'redirect in foo#redirect should NOT run foo#model (since validation succeeded)'
    );

    assert.deepEqual(routes.foo.context, { id: '123' });
    assert.deepEqual(routes.bar.context, { id: '789' }, 'bar should have redirected to bar 789');

    // Try setting foo's context to 200; this should redirect
    // bar to '789' but preserve the new foo 200.
    expectedUrl = '/200/789';
    transitionTo(router, 'fooIndex', '200');

    assert.equal(
      (routes.foo as any).modelCount,
      2,
      'redirect in foo#redirect should NOT foo#model'
    );

    assert.deepEqual(routes.foo.context, { id: '200' });
    assert.deepEqual(routes.bar.context, { id: '789' }, 'bar should have redirected to bar 789');
  });

  test('Starting on non root index', function (assert) {
    transitionTo(router, '/123/456');
    assert.deepEqual(routes.foo.context, { id: '123' });
    assert.deepEqual(routes.bar.context, { id: '789' }, 'bar should have redirected to bar 789');

    // Try setting foo's context to 200; this should redirect
    // bar to '789' but preserve the new foo 200.
    expectedUrl = '/200/789';

    transitionTo(router, 'fooIndex', '200');

    assert.deepEqual(routes.foo.context, { id: '200' });
    assert.deepEqual(routes.bar.context, { id: '789' }, 'bar should have redirected to bar 789');
  });

  /* TODO revisit
  test("A failed handler's setup shouldn't prevent future transitions", function(assert) {
  assert.expect(2);

  enableErrorHandlingDeferredActionQueue();

  map(assert, function(match) {
    match("/parent").to('parent', function(match) {
      match("/articles").to('articles');
      match("/login").to('login');
    });
  });

  let error = new Error("blorg");

  handlers = {
    articles: {
      setup: function() {
        assert.ok(true, "articles setup was entered");
        throw error;
      },
      events: {
        error: function() {
          assert.ok(true, "error handled in articles");
          router.transitionTo('login');
        }
      }
    },

    login: {
      setup: function() {
        start();
      }
    }
  };

  router.handleURL('/parent/articles');
  flush(error);
  });
  */

  test("beforeModel shouldn't be refired with incorrect params during redirect", function (assert) {
    // Source: https://github.com/emberjs/ember.js/issues/3407

    assert.expect(3);

    map(assert, function (match) {
      match('/').to('index');
      match('/people/:id').to('people', function (match) {
        match('/').to('peopleIndex');
        match('/home').to('peopleHome');
      });
    });

    let peopleModels: any[] = [null, {}, {}];
    let peopleBeforeModelCalled = false;

    routes = {
      people: createHandler('people', {
        beforeModel: function () {
          assert.ok(!peopleBeforeModelCalled, 'people#beforeModel should only be called once');
          peopleBeforeModelCalled = true;
        },
        model: function (params: Dict<unknown>) {
          assert.ok(params.id, 'people#model called');
          return peopleModels[params.id as number];
        },
      }),
      peopleIndex: createHandler('peopleIndex', {
        afterModel: function () {
          router.transitionTo('peopleHome');
        },
      }),
      peopleHome: createHandler('peopleHome', {
        setup: function () {
          assert.ok(true, 'I was entered');
        },
      }),
    };

    transitionTo(router, '/');
    transitionTo(router, 'peopleIndex', '1');
  });

  module('URL-less routes (' + scenario.name + ')', {
    setup: function (assert: Assert) {
      routes = {};
      expectedUrl = null;

      map(assert, function (match) {
        match('/index').to('index');
        match('/admin').to('admin', function (match) {
          match('/posts').to('adminPosts');
          match('/articles').to('adminArticles');
        });
      });
    },
  });

  test("Transitioning into a route marked as inaccessibleByURL doesn't update the URL", function (assert) {
    assert.expect(1);

    routes = {
      adminPosts: createHandler('adminPosts', {
        inaccessibleByURL: true,
      }),
    };

    router
      .handleURL('/index')
      .then(function () {
        url = '/index';
        return router.transitionTo('adminPosts');
      })
      .then(function () {
        assert.equal(url, '/index');
      });
  });

  test("Transitioning into a route with a parent route marked as inaccessibleByURL doesn't update the URL", function (assert) {
    assert.expect(2);

    routes = {
      admin: createHandler('admin', {
        inaccessibleByURL: true,
      }),
    };

    transitionTo(router, '/index');
    url = '/index';
    transitionTo(router, 'adminPosts');
    assert.equal(url, '/index');
    transitionTo(router, 'adminArticles');
    assert.equal(url, '/index');
  });

  test('Handling a URL on a route marked as inaccessible behaves like a failed url match', function (assert) {
    assert.expect(1);

    routes = {
      admin: createHandler('admin', {
        inaccessibleByURL: true,
      }),
    };

    router
      .handleURL('/index')
      .then(function () {
        return router.handleURL('/admin/posts');
      })
      .then<Error, void>(shouldNotHappen(assert), function (e: Error) {
        assert.equal(e.name, 'UnrecognizedURLError', 'error.name is UnrecognizedURLError');
      });
  });

  module('Intermediate transitions (' + scenario.name + ')', {
    setup: function (assert: Assert) {
      routes = {};
      expectedUrl = null;

      map(assert, function (match) {
        match('/').to('application', function (match) {
          //match("/").to("index");
          match('/foo').to('foo');
          match('/loading').to('loading');
        });
      });
    },
  });

  test('intermediateTransitionTo() has the correct RouteInfo objects', function (assert) {
    assert.expect(9);
    routes = {
      application: createHandler('application'),
      foo: createHandler('foo', {
        model: function () {
          router.intermediateTransitionTo('loading');
          return new Promise(function (resolve) {
            resolve();
          });
        },
      }),
      loading: createHandler('loading'),
    };

    let enteredCount = 0;
    router.routeWillChange = (transition: Transition) => {
      if (enteredCount === 0) {
        assert.equal(transition.to!.name, 'foo', 'going to');
        assert.equal(transition.to!.queryParams.qux, '42', 'going to with query params');
      } else if (enteredCount === 1) {
        assert.equal(transition.to!.name, 'loading', 'entering');
        assert.equal(transition.to!.queryParams.qux, '42', 'intermediate also has query params');
        // https://github.com/emberjs/ember.js/issues/14438
        assert.equal(transition[STATE_SYMBOL].routeInfos.length, 2, 'with routeInfos present');
      }
      enteredCount++;
      assert.equal(transition.from, null);
    };

    router.routeDidChange = (transition: Transition) => {
      assert.equal(transition.to!.name, 'foo', 'landed at');
      assert.equal(enteredCount, 2);
    };

    transitionTo(router, '/foo?qux=42');
  });

  test("intermediateTransitionTo() forces an immediate intermediate transition that doesn't cancel currently active async transitions", function (assert) {
    assert.expect(11);

    let counter = 1,
      willResolves: Route[],
      appModel = {},
      fooModel = {};

    function counterAt(expectedValue: number, description: string) {
      assert.equal(counter, expectedValue, 'Step ' + expectedValue + ': ' + description);
      counter++;
    }

    routes = {
      application: createHandler('application', {
        model: function () {
          return appModel;
        },
        setup: function (obj: Dict<unknown>) {
          counterAt(1, 'application#setup');
          assert.equal(obj, appModel, 'application#setup is passed the return value from model');
        },
        events: {
          willResolveModel: function (_transition: Transition, handler: Route) {
            assert.equal(
              willResolves.shift(),
              handler,
              'willResolveModel event fired and passed expanded handler'
            );
          },
        },
      }),
      foo: createHandler('foo', {
        model: function () {
          router.intermediateTransitionTo('loading');
          counterAt(3, 'intermediate transition finished within foo#model');

          return new Promise(function (resolve) {
            counterAt(4, "foo's model promise resolves");
            resolve(fooModel);
          });
        },
        setup: function (obj: Dict<unknown>) {
          counterAt(6, 'foo#setup');
          assert.equal(obj, fooModel, 'foo#setup is passed the resolve model promise');
        },
      }),
      loading: createHandler('loading', {
        model: function () {
          assert.ok(false, "intermediate transitions don't call model hooks");
        },
        setup: function () {
          counterAt(2, 'loading#setup');
        },
        exit: function () {
          counterAt(5, 'loading state exited');
        },
      }),
    };

    willResolves = [routes.application, routes.foo];

    transitionTo(router, '/foo');

    counterAt(7, 'original transition promise resolves');
  });

  test('Calling transitionTo during initial transition in validation hook should use replaceURL', function (assert) {
    assert.expect(4);
    map(assert, function (match) {
      match('/foo').to('foo');
      match('/bar').to('bar');
    });

    let fooModelCount = 0,
      barModelCount = 0;

    router.updateURL = function (updateUrl) {
      url = updateUrl;
      assert.ok(false, 'The url was not correctly replaced on initial transition');
    };

    router.replaceURL = function (replaceURL) {
      url = replaceURL;
      assert.ok(true, 'The url was replaced correctly on initial transition');
    };

    let fooHandler = createHandler('foo', {
      model: function () {
        fooModelCount++;
        router.transitionTo('/bar');
      },
    });

    let barHandler = createHandler('bar', {
      model: function () {
        barModelCount++;
      },
    });

    routes = {
      foo: fooHandler,
      bar: barHandler,
    };

    transitionTo(router, '/foo');

    assert.equal(url, '/bar');
    assert.equal(fooModelCount, 1);
    assert.equal(barModelCount, 1);
  });

  test('Calling transitionTo during initial transition in validation hook with multiple redirects should use replaceURL', function (assert) {
    assert.expect(5);
    map(assert, function (match) {
      match('/foo').to('foo');
      match('/bar').to('bar');
      match('/baz').to('baz');
    });

    let fooModelCount = 0,
      barModelCount = 0,
      bazModelCount = 0;

    router.updateURL = function (updateUrl) {
      url = updateUrl;
      assert.ok(false, 'The url was not correctly replaced on initial transition');
    };

    router.replaceURL = function (replaceURL) {
      url = replaceURL;
      assert.ok(true, 'The url was replaced correctly on initial transition');
    };

    let fooHandler = createHandler('foo', {
      model: function () {
        fooModelCount++;
        router.transitionTo('/bar');
      },
    });

    let barHandler = createHandler('bar', {
      model: function () {
        barModelCount++;
        router.transitionTo('/baz');
      },
    });

    let bazHandler = createHandler('baz', {
      model: function () {
        bazModelCount++;
      },
    });

    routes = {
      foo: fooHandler,
      bar: barHandler,
      baz: bazHandler,
    };

    transitionTo(router, '/foo');

    assert.equal(url, '/baz');
    assert.equal(fooModelCount, 1);
    assert.equal(barModelCount, 1);
    assert.equal(bazModelCount, 1);
  });

  test('Calling transitionTo after initial transition in validation hook should use updateUrl', function (assert) {
    assert.expect(8);

    map(assert, function (match) {
      match('/foo').to('foo');
      match('/bar').to('bar');
    });

    let fooModelCount = 0,
      barModelCount = 0;

    router.updateURL = function (updateUrl) {
      url = updateUrl;
      assert.ok(true, 'updateURL should be used');
    };

    router.replaceURL = function (replaceURL) {
      url = replaceURL;
      assert.ok(false, 'replaceURL should not be used');
    };

    let fooHandler = createHandler('foo', {
      model: function () {
        fooModelCount++;
        router.transitionTo('/bar');
      },
    });

    let barHandler = createHandler('bar', {
      model: function () {
        barModelCount++;
      },
    });

    routes = {
      foo: fooHandler,
      bar: barHandler,
    };

    transitionTo(router, '/bar');

    assert.equal(url, '/bar');
    assert.equal(barModelCount, 1, 'Bar model should be called once');
    assert.equal(fooModelCount, 0, 'Foo model should not be called');

    transitionTo(router, '/foo');

    assert.equal(url, '/bar');
    assert.equal(barModelCount, 2, 'Bar model should be called twice');
    assert.equal(fooModelCount, 1, 'Foo model should be called once');
  });

  test('Calling transitionTo after initial transition in validation hook with multiple redirects should use updateUrl', function (assert) {
    assert.expect(10);

    map(assert, function (match) {
      match('/foo').to('foo');
      match('/bar').to('bar');
      match('/baz').to('baz');
    });

    let fooModelCount = 0,
      barModelCount = 0,
      bazModelCount = 0;

    router.updateURL = function (updateUrl) {
      url = updateUrl;
      assert.ok(true, 'updateURL should be used');
    };

    router.replaceURL = function (replaceURL) {
      url = replaceURL;
      assert.ok(false, 'replaceURL should not be used');
    };

    let fooHandler = createHandler('foo', {
      model: function () {
        fooModelCount++;
        router.transitionTo('/bar');
      },
    });

    let barHandler = createHandler('bar', {
      model: function () {
        barModelCount++;
        router.transitionTo('/baz');
      },
    });

    let bazHandler = createHandler('baz', {
      model: function () {
        bazModelCount++;
      },
    });

    routes = {
      foo: fooHandler,
      bar: barHandler,
      baz: bazHandler,
    };

    transitionTo(router, '/baz');

    assert.equal(url, '/baz');
    assert.equal(bazModelCount, 1, 'Baz model should be called once');
    assert.equal(fooModelCount, 0, 'Foo model should not be called');
    assert.equal(barModelCount, 0, 'Bar model should not be called');

    transitionTo(router, '/foo');

    assert.equal(url, '/baz');
    assert.equal(bazModelCount, 2, 'Baz model should be called twice');
    assert.equal(fooModelCount, 1, 'Foo model should be called once');
    assert.equal(barModelCount, 1, 'Bar model should be called once');
  });

  test('Calling replaceWith during initial transition in validation hook should use replaceURL', function (assert) {
    assert.expect(4);
    map(assert, function (match) {
      match('/foo').to('foo');
      match('/bar').to('bar');
    });

    let fooModelCount = 0,
      barModelCount = 0;

    router.updateURL = function (updateUrl) {
      url = updateUrl;
      assert.ok(false, 'The url was not correctly replaced on initial transition');
    };

    router.replaceURL = function (replaceURL) {
      url = replaceURL;
      assert.ok(true, 'The url was replaced correctly on initial transition');
    };

    let fooHandler = createHandler('foo', {
      model: function () {
        fooModelCount++;
        router.replaceWith('/bar');
      },
    });

    let barHandler = createHandler('bar', {
      model: function () {
        barModelCount++;
      },
    });

    routes = {
      foo: fooHandler,
      bar: barHandler,
    };

    transitionTo(router, '/foo');

    assert.equal(url, '/bar');
    assert.equal(fooModelCount, 1);
    assert.equal(barModelCount, 1);
  });

  test('Calling replaceWith during initial transition in validation hook with multiple redirects should use replaceURL', function (assert) {
    assert.expect(5);
    map(assert, function (match) {
      match('/foo').to('foo');
      match('/bar').to('bar');
      match('/baz').to('baz');
    });

    let fooModelCount = 0,
      barModelCount = 0,
      bazModelCount = 0;

    router.updateURL = function (updateUrl) {
      url = updateUrl;
      assert.ok(false, 'The url was not correctly replaced on initial transition');
    };

    router.replaceURL = function (replaceURL) {
      url = replaceURL;
      assert.ok(true, 'The url was replaced correctly on initial transition');
    };

    let fooHandler = createHandler('foo', {
      model: function () {
        fooModelCount++;
        router.replaceWith('/bar');
      },
    });

    let barHandler = createHandler('bar', {
      model: function () {
        barModelCount++;
        router.replaceWith('/baz');
      },
    });

    let bazHandler = createHandler('baz', {
      model: function () {
        bazModelCount++;
      },
    });

    routes = {
      foo: fooHandler,
      bar: barHandler,
      baz: bazHandler,
    };

    transitionTo(router, '/foo');

    assert.equal(url, '/baz');
    assert.equal(fooModelCount, 1, 'should call foo model once');
    assert.equal(barModelCount, 1, 'should call bar model once');
    assert.equal(bazModelCount, 1, 'should call baz model once');
  });

  test('Calling replaceWith after initial transition in validation hook should use updateUrl', function (assert) {
    assert.expect(8);

    map(assert, function (match) {
      match('/foo').to('foo');
      match('/bar').to('bar');
    });

    let fooModelCount = 0,
      barModelCount = 0;

    router.updateURL = function (updateUrl) {
      url = updateUrl;
      assert.ok(true, 'updateURL should be used');
    };

    router.replaceURL = function (replaceURL) {
      url = replaceURL;
      assert.ok(false, 'replaceURL should not be used');
    };

    let fooHandler = createHandler('foo', {
      model: function () {
        fooModelCount++;
        router.replaceWith('/bar');
      },
    });
    let barHandler = createHandler('bar', {
      model: function () {
        barModelCount++;
      },
    });

    routes = {
      foo: fooHandler,
      bar: barHandler,
    };

    transitionTo(router, '/bar');

    assert.equal(url, '/bar');
    assert.equal(barModelCount, 1, 'Bar model should be called once');
    assert.equal(fooModelCount, 0, 'Foo model should not be called');

    transitionTo(router, '/foo');

    assert.equal(url, '/bar');
    assert.equal(barModelCount, 2, 'Bar model should be called twice');
    assert.equal(fooModelCount, 1, 'Foo model should be called once');
  });

  test('Calling replaceWith after initial transition in validation hook with multiple redirects should use updateUrl', function (assert) {
    assert.expect(10);

    map(assert, function (match) {
      match('/foo').to('foo');
      match('/bar').to('bar');
      match('/baz').to('baz');
    });

    let fooModelCount = 0,
      barModelCount = 0,
      bazModelCount = 0;

    router.updateURL = function (updateUrl) {
      url = updateUrl;
      assert.ok(true, 'updateURL should be used');
    };

    router.replaceURL = function (replaceURL) {
      url = replaceURL;
      assert.ok(false, 'replaceURL should not be used');
    };

    let fooHandler = createHandler('foo', {
      model: function () {
        fooModelCount++;
        router.replaceWith('/bar');
      },
    });

    let barHandler = createHandler('bar', {
      model: function () {
        barModelCount++;
        router.replaceWith('/baz');
      },
    });

    let bazHandler = createHandler('baz', {
      model: function () {
        bazModelCount++;
      },
    });

    routes = {
      foo: fooHandler,
      bar: barHandler,
      baz: bazHandler,
    };

    transitionTo(router, '/baz');

    assert.equal(url, '/baz');
    assert.equal(bazModelCount, 1, 'Bar model should be called once');
    assert.equal(fooModelCount, 0, 'Foo model should not be called');
    assert.equal(barModelCount, 0, 'Baz model should not be called');

    transitionTo(router, '/foo');

    assert.equal(url, '/baz');
    assert.equal(bazModelCount, 2, 'Baz model should be called twice');
    assert.equal(fooModelCount, 1, 'Foo model should be called once');
    assert.equal(barModelCount, 1, 'Bar model should be called once');
  });

  test('Calling replaceWith after initial replace in validation hook with multiple redirects should use replaceUrl', function (assert) {
    map(assert, function (match) {
      match('/foo').to('foo');
      match('/bar').to('bar');
      match('/baz').to('baz');
      match('/qux').to('qux');
    });

    let fooModelCount = 0,
      barModelCount = 0,
      bazModelCount = 0,
      history: string[] = [];

    router.updateURL = function (updateUrl) {
      url = updateUrl;
      history.push(url);
    };

    router.replaceURL = function (replaceURL) {
      url = replaceURL;
      if (history.length === 0) {
        assert.ok(false, 'should not replace on initial');
      }
      history[history.length - 1] = url;
    };

    let fooHandler = createHandler('foo', {
      model: function () {
        fooModelCount++;
        router.replaceWith('/bar');
      },
    });

    let barHandler = createHandler('bar', {
      model: function () {
        barModelCount++;
        router.replaceWith('/baz');
      },
    });

    let bazHandler = createHandler('baz', {
      model: function () {
        bazModelCount++;
      },
    });

    let quxHandler = createHandler('qux', {
      model: function () {},
    });

    routes = {
      foo: fooHandler,
      bar: barHandler,
      baz: bazHandler,
      qux: quxHandler,
    };

    transitionTo(router, '/qux');

    assert.equal(history.length, 1, 'only one history item');
    assert.equal(history[0], '/qux', 'history item is /qux');

    replaceWith(router, '/foo');

    assert.equal(history.length, 1, 'still only one history item, replaced the previous');
    assert.equal(history[0], '/baz', 'history item is /foo');
    assert.equal(fooModelCount, 1, 'Foo model should be called once');
    assert.equal(barModelCount, 1, 'Bar model should be called once');
    assert.equal(bazModelCount, 1, 'Baz model should be called once');
  });

  test('Mixing multiple types of redirect during initial transition should work', function (assert) {
    assert.expect(10);

    map(assert, function (match) {
      match('/foo').to('foo');
      match('/bar').to('bar');
      match('/baz').to('baz');
    });

    let fooModelCount = 0,
      barModelCount = 0,
      bazModelCount = 0;

    router.updateURL = function (updateUrl) {
      url = updateUrl;
      assert.ok(true, 'updateURL should be used');
    };

    router.replaceURL = function (replaceURL) {
      url = replaceURL;
      assert.ok(false, 'replaceURL should not be used');
    };

    let fooHandler = createHandler('foo', {
      model: function () {
        fooModelCount++;
        router.replaceWith('/bar');
      },
    });

    let barHandler = createHandler('bar', {
      model: function () {
        barModelCount++;
        router.transitionTo('/baz');
      },
    });

    let bazHandler = createHandler('baz', {
      model: function () {
        bazModelCount++;
      },
    });

    routes = {
      foo: fooHandler,
      bar: barHandler,
      baz: bazHandler,
    };

    transitionTo(router, '/baz');

    assert.equal(url, '/baz');
    assert.equal(bazModelCount, 1, 'Bar model should be called once');
    assert.equal(fooModelCount, 0, 'Foo model should not be called');
    assert.equal(barModelCount, 0, 'Baz model should not be called');

    transitionTo(router, '/foo');

    assert.equal(url, '/baz');
    assert.equal(bazModelCount, 2, 'Baz model should be called twice');
    assert.equal(fooModelCount, 1, 'Foo model should be called once');
    assert.equal(barModelCount, 1, 'Bar model should be called once');
  });

  test('Mixing multiple types of redirects after initial transition should work', function (assert) {
    assert.expect(12);

    map(assert, function (match) {
      match('/foo').to('foo');
      match('/bar').to('bar');
      match('/baz').to('baz');
    });

    let fooModelCount = 0,
      barModelCount = 0,
      bazModelCount = 0,
      updateUrlCount = 0,
      replaceUrlCount = 0;

    router.updateURL = function (updateUrl) {
      url = updateUrl;
      updateUrlCount++;
    };

    router.replaceURL = function (replaceURL) {
      url = replaceURL;
      replaceUrlCount++;
    };

    let fooHandler = createHandler('foo', {
      model: function () {
        fooModelCount++;
        router.replaceWith('/bar');
      },
    });

    let barHandler = createHandler('bar', {
      model: function () {
        barModelCount++;
        router.transitionTo('/baz');
      },
    });

    let bazHandler = createHandler('baz', {
      model: function () {
        bazModelCount++;
      },
    });

    routes = {
      foo: fooHandler,
      bar: barHandler,
      baz: bazHandler,
    };

    transitionTo(router, '/baz');
    // actually replaceURL probably makes more sense here, but it's an initial
    // transition to a route that the page loaded on, so it's a no-op and doesn't
    // cause a problem
    assert.equal(replaceUrlCount, 0, 'replaceURL should not be used');
    assert.equal(updateUrlCount, 1, 'updateURL should be used for initial transition');
    assert.equal(url, '/baz');
    assert.equal(bazModelCount, 1, 'Baz model should be called once');
    assert.equal(fooModelCount, 0, 'Foo model should not be called');
    assert.equal(barModelCount, 0, 'Bar model should not be called');

    transitionTo(router, '/foo');

    assert.equal(replaceUrlCount, 0, 'replaceURL should not be used');
    assert.equal(updateUrlCount, 2, 'updateURL should be used for subsequent transition');
    assert.equal(url, '/baz');
    assert.equal(bazModelCount, 2, 'Baz model should be called twice');
    assert.equal(fooModelCount, 1, 'Foo model should be called once');
    assert.equal(barModelCount, 1, 'Bar model should be called once');
  });

  test('Calling replaceWith after initial transition outside validation hook should use replaceURL', function (assert) {
    assert.expect(7);

    map(assert, function (match) {
      match('/foo').to('foo');
      match('/bar').to('bar');
    });

    let fooModelCount = 0,
      barModelCount = 0;

    router.updateURL = function (updateUrl) {
      url = updateUrl;
      assert.equal(updateUrl, '/foo', 'incorrect url for updateURL');
    };

    router.replaceURL = function (replaceUrl) {
      url = replaceUrl;
      assert.equal(replaceUrl, '/bar', 'incorrect url for replaceURL');
    };

    let fooHandler = createHandler('foo', {
      model: function () {
        fooModelCount++;
      },
    });
    let barHandler = createHandler('bar', {
      model: function () {
        barModelCount++;
      },
    });

    routes = {
      foo: fooHandler,
      bar: barHandler,
    };

    transitionTo(router, '/foo');

    assert.equal(url, '/foo', 'failed initial transition');
    assert.equal(fooModelCount, 1, 'Foo model should be called once');
    assert.equal(barModelCount, 0, 'Bar model should not be called');

    router.replaceWith('/bar');
    flushBackburner();

    assert.equal(fooModelCount, 1, 'Foo model should be called once');
    assert.equal(barModelCount, 1, 'Bar model should be called once');
  });

  test('Calling transitionTo after initial transition outside validation hook should use updateUrl', function (assert) {
    assert.expect(7);

    map(assert, function (match) {
      match('/foo').to('foo');
      match('/bar').to('bar');
    });

    let fooModelCount = 0,
      barModelCount = 0;

    router.updateURL = function (updateUrl) {
      url = updateUrl;
      assert.ok(true, 'updateURL is used');
    };

    router.replaceURL = function (replaceURL) {
      url = replaceURL;
      assert.ok(false, 'replaceURL should not be used');
    };

    let fooHandler = createHandler('foo', {
      model: function () {
        fooModelCount++;
      },
    });
    let barHandler = createHandler('bar', {
      model: function () {
        barModelCount++;
      },
    });

    routes = {
      foo: fooHandler,
      bar: barHandler,
    };

    transitionTo(router, '/foo');

    assert.equal(url, '/foo', 'failed initial transition');
    assert.equal(fooModelCount, 1, 'Foo model should be called once');
    assert.equal(barModelCount, 0, 'Bar model should not be called');

    transitionTo(router, '/bar');

    assert.equal(fooModelCount, 1, 'Foo model should be called once');
    assert.equal(barModelCount, 1, 'Bar model should be called once');
  });

  test('transitioning to the same route with different context should not reenter the route', function (assert) {
    map(assert, function (match) {
      match('/project/:project_id').to('project');
    });

    let projectEnterCount = 0;
    let projectSetupCount = 0;
    let projectHandler = createHandler('project', {
      model: function (params: Dict<unknown>) {
        delete params.queryParams;
        return params;
      },
      enter: function () {
        projectEnterCount++;
      },
      setup: function () {
        projectSetupCount++;
      },
    });

    routes = {
      project: projectHandler,
    };

    transitionTo(router, '/project/1');
    assert.equal(projectEnterCount, 1, 'project handler should have been entered once');
    assert.equal(projectSetupCount, 1, 'project handler should have been setup once');

    transitionTo(router, '/project/2');
    assert.equal(projectEnterCount, 1, 'project handler should still have been entered only once');
    assert.equal(projectSetupCount, 2, 'project handler should have been setup twice');
  });

  test('synchronous transition errors can be detected synchronously', function (assert) {
    map(assert, function (match) {
      match('/').to('root');
    });

    router.getRoute = function () {
      throw new Error('boom!');
    };

    assert.equal((transitionTo(router, '/').error as Error).message, 'boom!');
  });
});
