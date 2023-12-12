import {
  moduleFor,
  ApplicationTestCase,
  ModuleBasedTestResolver,
  strip,
  runTaskNext,
} from 'internal-test-helpers';

import { Component } from '@ember/-internals/glimmer';
import Route from '@ember/routing/route';
import { RSVP } from '@ember/-internals/runtime';
import Controller from '@ember/controller';
import Engine from '@ember/engine';
import { next } from '@ember/runloop';

import { compile } from '../../utils/helpers';

moduleFor(
  'Application test: engine rendering',
  class extends ApplicationTestCase {
    get routerOptions() {
      return {
        location: 'none',
        setupRouter() {
          this._super(...arguments);
          let getRoute = this._routerMicrolib.getRoute;
          this._enginePromises = Object.create(null);
          this._resolvedEngines = Object.create(null);

          this._routerMicrolib.getRoute = (name) => {
            let engineInfo = this._engineInfoByRoute[name];
            if (!engineInfo) {
              return getRoute(name);
            }

            let engineName = engineInfo.name;
            if (this._resolvedEngines[engineName]) {
              return getRoute(name);
            }

            let enginePromise = this._enginePromises[engineName];

            if (!enginePromise) {
              enginePromise = new RSVP.Promise((resolve) => {
                setTimeout(() => {
                  this._resolvedEngines[engineName] = true;

                  resolve();
                }, 1);
              });
              this._enginePromises[engineName] = enginePromise;
            }

            return enginePromise.then(() => getRoute(name));
          };
        },
      };
    }

    setupAppAndRoutableEngine(hooks = []) {
      let self = this;

      this.addTemplate('application', 'Application{{outlet}}');

      this.router.map(function () {
        this.mount('blog');
      });
      this.add('route-map:blog', function () {
        this.route('post', function () {
          this.route('comments');
          this.route('likes');
        });
        this.route('category', { path: 'category/:id' });
        this.route('author', { path: 'author/:id' });
      });
      this.add(
        'route:application',
        Route.extend({
          model() {
            hooks.push('application - application');
          },
        })
      );

      this.add(
        'engine:blog',
        Engine.extend({
          Resolver: ModuleBasedTestResolver,

          init() {
            this._super(...arguments);
            this.register(
              'controller:application',
              Controller.extend({
                queryParams: ['lang'],
                lang: '',
              })
            );
            this.register(
              'controller:category',
              Controller.extend({
                queryParams: ['type'],
              })
            );
            this.register(
              'controller:authorKtrl',
              Controller.extend({
                queryParams: ['official'],
              })
            );
            this.register('template:application', compile('Engine{{this.lang}}{{outlet}}'));
            this.register(
              'route:application',
              Route.extend({
                model() {
                  hooks.push('engine - application');
                },
              })
            );
            this.register(
              'route:author',
              Route.extend({
                controllerName: 'authorKtrl',
              })
            );

            if (self._additionalEngineRegistrations) {
              self._additionalEngineRegistrations.call(this);
            }
          },
        })
      );
    }

    setupAppAndRoutelessEngine(hooks) {
      this.setupRoutelessEngine(hooks);

      this.add(
        'engine:chat-engine',
        Engine.extend({
          Resolver: ModuleBasedTestResolver,

          init() {
            this._super(...arguments);
            this.register('template:application', compile('Engine'));
            this.register(
              'controller:application',
              Controller.extend({
                init() {
                  this._super(...arguments);
                  hooks.push('engine - application');
                },
              })
            );
          },
        })
      );
    }

    setupRoutelessEngine(hooks) {
      this.addTemplate('application', 'Application{{mount "chat-engine"}}');
      this.add(
        'route:application',
        Route.extend({
          model() {
            hooks.push('application - application');
          },
        })
      );
    }

    additionalEngineRegistrations(callback) {
      this._additionalEngineRegistrations = callback;
    }

    stringsEndWith(str, suffix) {
      return str.indexOf(suffix, str.length - suffix.length) !== -1;
    }

    ['@test sharing a template between engine and application has separate refinements']() {
      this.assert.expect(1);

      let sharedTemplate = compile(strip`
      <h1>{{this.contextType}}</h1>
      {{ambiguous-curlies}}

      {{outlet}}
    `);

      this.add('template:application', sharedTemplate);
      this.add(
        'controller:application',
        Controller.extend({
          contextType: 'Application',
          'ambiguous-curlies': 'Controller Data!',
        })
      );

      this.router.map(function () {
        this.mount('blog');
      });
      this.add('route-map:blog', function () {});

      this.add(
        'engine:blog',
        Engine.extend({
          Resolver: ModuleBasedTestResolver,

          init() {
            this._super(...arguments);

            this.register(
              'controller:application',
              Controller.extend({
                contextType: 'Engine',
              })
            );
            this.register('template:application', sharedTemplate);
            this.register(
              'template:components/ambiguous-curlies',
              compile(strip`
        <p>Component!</p>
      `)
            );
          },
        })
      );

      return this.visit('/blog').then(() => {
        this.assertText('ApplicationEngineComponent!');
      });
    }

    ['@test sharing a layout between engine and application has separate refinements']() {
      this.assert.expect(1);

      let sharedLayout = compile(strip`
        {{ambiguous-curlies}}
      `);

      let sharedComponent = Component.extend({
        layout: sharedLayout,
      });

      this.addTemplate(
        'application',
        strip`
          <h1>Application</h1>
          {{my-component ambiguous-curlies="Local Data!"}}
          {{outlet}}
        `
      );

      this.add('component:my-component', sharedComponent);

      this.router.map(function () {
        this.mount('blog');
      });
      this.add('route-map:blog', function () {});

      this.add(
        'engine:blog',
        Engine.extend({
          Resolver: ModuleBasedTestResolver,

          init() {
            this._super(...arguments);
            this.register(
              'template:application',
              compile(strip`
                <h1>Engine</h1>
                {{my-component}}
                {{outlet}}
              `)
            );
            this.register('component:my-component', sharedComponent);
            this.register(
              'template:components/ambiguous-curlies',
              compile(strip`
                <p>Component!</p>
              `)
            );
          },
        })
      );

      return this.visit('/blog').then(() => {
        this.assertText('ApplicationEngineComponent!');
      });
    }

    ['@test visit() with `shouldRender: true` returns a promise that resolves when application and engine templates have rendered'](
      assert
    ) {
      assert.expect(2);

      let hooks = [];

      this.setupAppAndRoutableEngine(hooks);

      return this.visit('/blog', { shouldRender: true }).then(() => {
        this.assertText('ApplicationEngine');

        this.assert.deepEqual(
          hooks,
          ['application - application', 'engine - application'],
          'the expected model hooks were fired'
        );
      });
    }

    ['@test visit() with `shouldRender: false` returns a promise that resolves without rendering'](
      assert
    ) {
      assert.expect(2);

      let hooks = [];

      this.setupAppAndRoutableEngine(hooks);

      return this.visit('/blog', { shouldRender: false }).then(() => {
        assert.strictEqual(
          document.getElementById('qunit-fixture').children.length,
          0,
          `there are no elements in the qunit-fixture element`
        );

        this.assert.deepEqual(
          hooks,
          ['application - application', 'engine - application'],
          'the expected model hooks were fired'
        );
      });
    }

    ['@test visit() with `shouldRender: true` returns a promise that resolves when application and routeless engine templates have rendered'](
      assert
    ) {
      assert.expect(2);

      let hooks = [];

      this.setupAppAndRoutelessEngine(hooks);

      return this.visit('/', { shouldRender: true }).then(() => {
        this.assertText('ApplicationEngine');

        this.assert.deepEqual(
          hooks,
          ['application - application', 'engine - application'],
          'the expected hooks were fired'
        );
      });
    }

    ['@test deactivate should be called on Engine Routes before destruction'](assert) {
      assert.expect(3);

      this.setupAppAndRoutableEngine();

      this.add(
        'engine:blog',
        Engine.extend({
          Resolver: ModuleBasedTestResolver,

          init() {
            this._super(...arguments);
            this.register('template:application', compile('Engine{{outlet}}'));
            this.register(
              'route:application',
              Route.extend({
                deactivate() {
                  assert.notOk(this.isDestroyed, 'Route is not destroyed');
                  assert.notOk(this.isDestroying, 'Route is not being destroyed');
                },
              })
            );
          },
        })
      );

      return this.visit('/blog').then(() => {
        this.assertText('ApplicationEngine');
      });
    }

    ['@test engine should lookup and use correct controller']() {
      this.setupAppAndRoutableEngine();

      return this.visit('/blog?lang=English').then(() => {
        this.assertText('ApplicationEngineEnglish');
      });
    }

    ['@test error substate route works for the application route of an Engine'](assert) {
      assert.expect(2);

      let errorEntered = RSVP.defer();

      this.setupAppAndRoutableEngine();
      this.additionalEngineRegistrations(function () {
        this.register(
          'route:application_error',
          Route.extend({
            activate() {
              next(errorEntered.resolve);
            },
          })
        );
        this.register('template:application_error', compile('Error! {{@model.message}}'));
        this.register(
          'route:post',
          Route.extend({
            model() {
              return RSVP.reject(new Error('Oh, noes!'));
            },
          })
        );
      });

      return this.visit('/')
        .then(() => {
          this.assertText('Application');
          return this.transitionTo('blog.post');
        })
        .then(() => {
          return errorEntered.promise;
        })
        .then(() => {
          this.assertText('ApplicationError! Oh, noes!');
        });
    }

    ['@test error route works for the application route of an Engine'](assert) {
      assert.expect(2);

      let errorEntered = RSVP.defer();

      this.setupAppAndRoutableEngine();
      this.additionalEngineRegistrations(function () {
        this.register(
          'route:error',
          Route.extend({
            activate() {
              next(errorEntered.resolve);
            },
          })
        );
        this.register('template:error', compile('Error! {{@model.message}}'));
        this.register(
          'route:post',
          Route.extend({
            model() {
              return RSVP.reject(new Error('Oh, noes!'));
            },
          })
        );
      });

      return this.visit('/')
        .then(() => {
          this.assertText('Application');
          return this.transitionTo('blog.post');
        })
        .then(() => {
          return errorEntered.promise;
        })
        .then(() => {
          this.assertText('ApplicationEngineError! Oh, noes!');
        });
    }

    ['@test error substate route works for a child route of an Engine'](assert) {
      assert.expect(2);

      let errorEntered = RSVP.defer();

      this.setupAppAndRoutableEngine();
      this.additionalEngineRegistrations(function () {
        this.register(
          'route:post_error',
          Route.extend({
            activate() {
              next(errorEntered.resolve);
            },
          })
        );
        this.register('template:post_error', compile('Error! {{@model.message}}'));
        this.register(
          'route:post',
          Route.extend({
            model() {
              return RSVP.reject(new Error('Oh, noes!'));
            },
          })
        );
      });

      return this.visit('/')
        .then(() => {
          this.assertText('Application');
          return this.transitionTo('blog.post');
        })
        .then(() => {
          return errorEntered.promise;
        })
        .then(() => {
          this.assertText('ApplicationEngineError! Oh, noes!');
        });
    }

    ['@test error route works for a child route of an Engine'](assert) {
      assert.expect(2);

      let errorEntered = RSVP.defer();

      this.setupAppAndRoutableEngine();
      this.additionalEngineRegistrations(function () {
        this.register(
          'route:post.error',
          Route.extend({
            activate() {
              next(errorEntered.resolve);
            },
          })
        );
        this.register('template:post.error', compile('Error! {{@model.message}}'));
        this.register(
          'route:post.comments',
          Route.extend({
            model() {
              return RSVP.reject(new Error('Oh, noes!'));
            },
          })
        );
      });

      return this.visit('/')
        .then(() => {
          this.assertText('Application');
          return this.transitionTo('blog.post.comments');
        })
        .then(() => {
          return errorEntered.promise;
        })
        .then(() => {
          this.assertText('ApplicationEngineError! Oh, noes!');
        });
    }

    ['@test loading substate route works for the application route of an Engine'](assert) {
      assert.expect(3);
      let done = assert.async();

      let loadingEntered = RSVP.defer();
      let resolveLoading = RSVP.defer();

      this.setupAppAndRoutableEngine();
      this.additionalEngineRegistrations(function () {
        this.register(
          'route:application_loading',
          Route.extend({
            activate() {
              next(loadingEntered.resolve);
            },
          })
        );
        this.register('template:application_loading', compile('Loading'));
        this.register('template:post', compile('Post'));
        this.register(
          'route:post',
          Route.extend({
            model() {
              return resolveLoading.promise;
            },
          })
        );
      });

      return this.visit('/').then(() => {
        this.assertText('Application');
        let transition = this.transitionTo('blog.post');

        loadingEntered.promise.then(() => {
          this.assertText('ApplicationLoading');
          resolveLoading.resolve();

          return runTaskNext().then(() => {
            this.assertText('ApplicationEnginePost');
            done();
          });
        });

        return transition;
      });
    }

    ['@test loading route works for the application route of an Engine'](assert) {
      assert.expect(3);
      let done = assert.async();

      let loadingEntered = RSVP.defer();
      let resolveLoading = RSVP.defer();

      this.setupAppAndRoutableEngine();
      this.additionalEngineRegistrations(function () {
        this.register(
          'route:loading',
          Route.extend({
            activate() {
              next(loadingEntered.resolve);
            },
          })
        );
        this.register('template:loading', compile('Loading'));
        this.register('template:post', compile('Post'));
        this.register(
          'route:post',
          Route.extend({
            model() {
              return resolveLoading.promise;
            },
          })
        );
      });

      return this.visit('/').then(() => {
        this.assertText('Application');
        let transition = this.transitionTo('blog.post');

        loadingEntered.promise.then(() => {
          this.assertText('ApplicationEngineLoading');
          resolveLoading.resolve();

          return runTaskNext().then(() => {
            this.assertText('ApplicationEnginePost');
            done();
          });
        });

        return transition;
      });
    }

    ['@test loading substate route works for a child route of an Engine'](assert) {
      assert.expect(3);

      let resolveLoading;

      this.setupAppAndRoutableEngine();
      this.additionalEngineRegistrations(function () {
        this.register('template:post', compile('{{outlet}}'));
        this.register('template:post.comments', compile('Comments'));
        this.register('template:post.likes_loading', compile('Loading'));
        this.register('template:post.likes', compile('Likes'));
        this.register(
          'route:post.likes',
          Route.extend({
            model() {
              return new RSVP.Promise((resolve) => {
                resolveLoading = resolve;
              });
            },
          })
        );
      });

      return this.visit('/blog/post/comments').then(() => {
        this.assertText('ApplicationEngineComments');
        let transition = this.transitionTo('blog.post.likes');

        runTaskNext().then(() => {
          this.assertText('ApplicationEngineLoading');
          resolveLoading();
        });

        return transition
          .then(() => runTaskNext())
          .then(() => this.assertText('ApplicationEngineLikes'));
      });
    }

    ['@test loading route works for a child route of an Engine'](assert) {
      assert.expect(3);
      let done = assert.async();

      let loadingEntered = RSVP.defer();
      let resolveLoading = RSVP.defer();

      this.setupAppAndRoutableEngine();
      this.additionalEngineRegistrations(function () {
        this.register('template:post', compile('{{outlet}}'));
        this.register('template:post.comments', compile('Comments'));
        this.register(
          'route:post.loading',
          Route.extend({
            activate() {
              next(loadingEntered.resolve);
            },
          })
        );
        this.register('template:post.loading', compile('Loading'));
        this.register('template:post.likes', compile('Likes'));
        this.register(
          'route:post.likes',
          Route.extend({
            model() {
              return resolveLoading.promise;
            },
          })
        );
      });

      return this.visit('/blog/post/comments').then(() => {
        this.assertText('ApplicationEngineComments');
        let transition = this.transitionTo('blog.post.likes');

        loadingEntered.promise.then(() => {
          this.assertText('ApplicationEngineLoading');
          resolveLoading.resolve();

          return runTaskNext().then(() => {
            this.assertText('ApplicationEngineLikes');
            done();
          });
        });

        return transition;
      });
    }

    ["@test query params don't have stickiness by default between model"](assert) {
      assert.expect(1);

      let tmpl = '<LinkTo @route="category" @model={{1337}}>Category 1337</LinkTo>';

      this.setupAppAndRoutableEngine();
      this.additionalEngineRegistrations(function () {
        this.register('template:category', compile(tmpl));
      });

      return this.visit('/blog/category/1?type=news').then(() => {
        let suffix = '/blog/category/1337';
        let href = this.element.querySelector('a').href;

        // check if link ends with the suffix
        assert.ok(this.stringsEndWith(href, suffix));
      });
    }

    '@test query params only transitions work properly'(assert) {
      assert.expect(1);

      let tmpl = '<LinkTo @query={{hash type="news"}}>News</LinkTo>';

      this.setupAppAndRoutableEngine();
      this.additionalEngineRegistrations(function () {
        this.register('template:category', compile(tmpl));
      });

      return this.visit('/blog/category/1').then(() => {
        let suffix = '/blog/category/1?type=news';
        let href = this.element.querySelector('a').href;

        // check if link ends with the suffix
        assert.ok(this.stringsEndWith(href, suffix));
      });
    }

    async ['@test query params in customized controllerName have stickiness by default between model'](
      assert
    ) {
      assert.expect(2);
      let tmpl =
        '<LinkTo @route="author" @model={{1337}} class="author-1337">Author 1337</LinkTo><LinkTo @route="author" @model=1 class="author-1">Author 1</LinkTo>';
      this.setupAppAndRoutableEngine();
      this.additionalEngineRegistrations(function () {
        this.register('template:author', compile(tmpl));
      });

      await this.visit('/blog/author/1?official=true');

      let suffix1 = '/blog/author/1?official=true';
      let href1 = this.element.querySelector('.author-1').href;
      let suffix1337 = '/blog/author/1337';
      let href1337 = this.element.querySelector('.author-1337').href;

      // check if link ends with the suffix
      assert.ok(this.stringsEndWith(href1, suffix1), `${href1} ends with ${suffix1}`);
      assert.ok(this.stringsEndWith(href1337, suffix1337), `${href1337} ends with ${suffix1337}`);
    }

    ['@test visit() routable engine which errors on init'](assert) {
      assert.expect(1);

      let hooks = [];

      this.additionalEngineRegistrations(function () {
        this.register(
          'route:application',
          Route.extend({
            init() {
              throw new Error('Whoops! Something went wrong...');
            },
          })
        );
      });

      this.setupAppAndRoutableEngine(hooks);

      return this.visit('/', { shouldRender: true })
        .then(() => {
          return this.visit('/blog');
        })
        .catch((error) => {
          assert.equal(error.message, 'Whoops! Something went wrong...');
        });
    }

    ['@test visit() with `shouldRender: true` queryParams are properly deserialized for lazy routes'](
      assert
    ) {
      assert.expect(2);

      let hooks = [];

      this.setupAppAndRoutableEngine(hooks);

      this.add(
        'engine:blog',
        Engine.extend({
          Resolver: ModuleBasedTestResolver,

          init() {
            this._super(...arguments);
            this.register(
              'controller:application',
              Controller.extend({
                queryParams: ['lazyQueryParam'],
              })
            );

            this.register(
              'template:application',
              compile('Engine<div class="lazy-query-param">{{this.lazyQueryParam}}</div>{{outlet}}')
            );

            this.register(
              'route:application',
              Route.extend({
                queryParams: {
                  lazyQueryParam: {
                    defaultValue: null,
                  },
                },
                deserializeQueryParam() {
                  hooks.push('engine - deserialize query param');
                  return 'foo';
                },
                model() {
                  hooks.push('engine - application');
                },
              })
            );
          },
        })
      );

      return this.visit('/blog?lazyQueryParam=bar', { shouldRender: true }).then(() => {
        assert.deepEqual(
          hooks,
          ['application - application', 'engine - deserialize query param', 'engine - application'],
          'the expected hooks were fired'
        );
        assert.strictEqual(this.element.querySelector('.lazy-query-param').innerHTML, 'foo');
      });
    }
  }
);
