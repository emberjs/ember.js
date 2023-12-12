import { get } from '@ember/object';
import { RSVP } from '@ember/-internals/runtime';
import Route from '@ember/routing/route';

import { QueryParamTestCase, moduleFor } from 'internal-test-helpers';

// These tests mimic what happens with lazily loaded Engines.
moduleFor(
  'Query Params - async get handler',
  class extends QueryParamTestCase {
    get routerOptions() {
      let fetchedHandlers = (this.fetchedHandlers = []);

      return {
        location: 'test',

        init() {
          this._super(...arguments);
          this._seenHandlers = Object.create(null);
          this._handlerPromises = Object.create(null);
        },

        setupRouter() {
          let isNewSetup = this._super(...arguments);
          if (isNewSetup) {
            let { _handlerPromises: handlerPromises, _seenHandlers: seenHandlers } = this;
            let getRoute = this._routerMicrolib.getRoute;

            this._routerMicrolib.getRoute = function (routeName) {
              fetchedHandlers.push(routeName);

              // Cache the returns so we don't have more than one Promise for a
              // given handler.
              return (
                handlerPromises[routeName] ||
                (handlerPromises[routeName] = new RSVP.Promise((resolve) => {
                  setTimeout(() => {
                    let handler = getRoute(routeName);

                    seenHandlers[routeName] = handler;

                    resolve(handler);
                  }, 10);
                }))
              );
            };
          }
          return isNewSetup;
        },

        _getQPMeta(routeInfo) {
          let handler = this._seenHandlers[routeInfo.name];
          if (handler) {
            return get(handler, '_qp');
          }
        },
      };
    }

    async ['@test can render a link to an asynchronously loaded route without fetching the route'](
      assert
    ) {
      this.router.map(function () {
        this.route('post', { path: '/post/:id' });
      });

      this.setSingleQPController('post');

      let setupAppTemplate = () => {
        this.addTemplate(
          'application',
          `
          <LinkTo @route='post' @model={{1337}} @query={{hash foo='bar'}} class='post-link is-1337'>Post</LinkTo>
          <LinkTo @route='post' @model={{7331}} @query={{hash foo='boo'}} class='post-link is-7331'>Post</LinkTo>
          {{outlet}}
          `
        );
      };

      setupAppTemplate();

      await this.visitAndAssert('/');

      assert.equal(
        this.$('.post-link.is-1337').attr('href'),
        '/post/1337?foo=bar',
        'renders correctly with default QP value'
      );
      assert.equal(
        this.$('.post-link.is-7331').attr('href'),
        '/post/7331?foo=boo',
        'renders correctly with non-default QP value'
      );
      assert.deepEqual(
        this.fetchedHandlers,
        ['application', 'index'],
        `only fetched the handlers for the route we're on`
      );
    }

    ['@test can transitionTo to an asynchronously loaded route with simple query params'](assert) {
      assert.expect(6);

      this.router.map(function () {
        this.route('post', { path: '/post/:id' });
        this.route('posts');
      });

      this.setSingleQPController('post');

      let postController;
      return this.visitAndAssert('/')
        .then(() => {
          postController = this.getController('post');

          return this.transitionTo('posts').then(() => {
            this.assertCurrentPath('/posts');
          });
        })
        .then(() => {
          return this.transitionTo('post', 1337, {
            queryParams: { foo: 'boo' },
          }).then(() => {
            assert.equal(
              postController.get('foo'),
              'boo',
              'simple QP is correctly set on controller'
            );
            this.assertCurrentPath('/post/1337?foo=boo');
          });
        })
        .then(() => {
          return this.transitionTo('post', 1337, {
            queryParams: { foo: 'bar' },
          }).then(() => {
            assert.equal(
              postController.get('foo'),
              'bar',
              'simple QP is correctly set with default value'
            );
            this.assertCurrentPath('/post/1337');
          });
        });
    }

    ['@test can transitionTo to an asynchronously loaded route with array query params'](assert) {
      assert.expect(5);

      this.router.map(function () {
        this.route('post', { path: '/post/:id' });
      });

      this.setSingleQPController('post', 'comments', []);

      let postController;
      return this.visitAndAssert('/')
        .then(() => {
          postController = this.getController('post');
          return this.transitionTo('post', 1337, {
            queryParams: { comments: [1, 2] },
          }).then(() => {
            assert.deepEqual(
              postController.get('comments'),
              [1, 2],
              'array QP is correctly set with default value'
            );
            this.assertCurrentPath('/post/1337?comments=%5B1%2C2%5D');
          });
        })
        .then(() => {
          return this.transitionTo('post', 1338).then(() => {
            assert.deepEqual(
              postController.get('comments'),
              [],
              'array QP is correctly set on controller'
            );
            this.assertCurrentPath('/post/1338');
          });
        });
    }

    ['@test can transitionTo to an asynchronously loaded route with mapped query params'](assert) {
      assert.expect(7);

      this.router.map(function () {
        this.route('post', { path: '/post/:id' }, function () {
          this.route('index', { path: '/' });
        });
      });

      this.setSingleQPController('post');
      this.setMappedQPController('post.index', 'comment', 'note');

      let postController;
      let postIndexController;

      return this.visitAndAssert('/')
        .then(() => {
          postController = this.getController('post');
          postIndexController = this.getController('post.index');

          return this.transitionTo('post.index', 1337, {
            queryParams: { note: 6, foo: 'boo' },
          }).then(() => {
            assert.equal(
              postController.get('foo'),
              'boo',
              'simple QP is correctly set on controller'
            );
            assert.equal(
              postIndexController.get('comment'),
              6,
              'mapped QP is correctly set on controller'
            );
            this.assertCurrentPath('/post/1337?foo=boo&note=6');
          });
        })
        .then(() => {
          return this.transitionTo('post', 1337, {
            queryParams: { foo: 'bar' },
          }).then(() => {
            assert.equal(
              postController.get('foo'),
              'bar',
              'simple QP is correctly set with default value'
            );
            assert.equal(
              postIndexController.get('comment'),
              6,
              'mapped QP retains value scoped to model'
            );
            this.assertCurrentPath('/post/1337?note=6');
          });
        });
    }

    ['@test can transitionTo with a URL'](assert) {
      assert.expect(7);

      this.router.map(function () {
        this.route('post', { path: '/post/:id' }, function () {
          this.route('index', { path: '/' });
        });
      });

      this.setSingleQPController('post');
      this.setMappedQPController('post.index', 'comment', 'note');

      let postController;
      let postIndexController;

      return this.visitAndAssert('/')
        .then(() => {
          postController = this.getController('post');
          postIndexController = this.getController('post.index');

          return this.transitionTo('/post/1337?foo=boo&note=6').then(() => {
            assert.equal(
              postController.get('foo'),
              'boo',
              'simple QP is correctly deserialized on controller'
            );
            assert.equal(
              postIndexController.get('comment'),
              6,
              'mapped QP is correctly deserialized on controller'
            );
            this.assertCurrentPath('/post/1337?foo=boo&note=6');
          });
        })
        .then(() => {
          return this.transitionTo('/post/1337?note=6').then(() => {
            assert.equal(
              postController.get('foo'),
              'bar',
              'simple QP is correctly deserialized with default value'
            );
            assert.equal(
              postIndexController.get('comment'),
              6,
              'mapped QP retains value scoped to model'
            );
            this.assertCurrentPath('/post/1337?note=6');
          });
        });
    }

    ["@test undefined isn't serialized or deserialized into a string"](assert) {
      assert.expect(4);

      this.router.map(function () {
        this.route('example');
      });

      this.addTemplate(
        'application',
        "<LinkTo @route='example' @query={{hash foo=undefined}} id='the-link'>Example</LinkTo>"
      );

      this.setSingleQPController('example', 'foo', undefined, {
        foo: undefined,
      });

      this.add(
        'route:example',
        Route.extend({
          model(params) {
            assert.deepEqual(params, { foo: undefined });
          },
        })
      );

      return this.visitAndAssert('/').then(() => {
        assert.equal(
          this.$('#the-link').attr('href'),
          '/example',
          'renders without undefined qp serialized'
        );

        return this.transitionTo('example', {
          queryParams: { foo: undefined },
        }).then(() => {
          this.assertCurrentPath('/example');
        });
      });
    }
  }
);
