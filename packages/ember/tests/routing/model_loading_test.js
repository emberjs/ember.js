/* eslint-disable no-console */
import { Route } from '@ember/-internals/routing';
import Controller from '@ember/controller';
import { Object as EmberObject, A as emberA } from '@ember/-internals/runtime';
import {
  moduleFor,
  ApplicationTestCase,
  getTextOf,
} from 'internal-test-helpers';
import { run } from '@ember/runloop';
import { computed, set } from '@ember/-internals/metal';

let originalConsoleError;

moduleFor(
  'Route - model loading',
  class extends ApplicationTestCase {
    constructor() {
      super(...arguments);
      this.addTemplate('home', '<h3 class="hours">Hours</h3>');
      this.addTemplate('camelot', '<section id="camelot"><h3>Is a silly place</h3></section>');
      this.addTemplate('homepage', '<h3 id="troll">Megatroll</h3><p>{{this.name}}</p>');

      this.router.map(function() {
        this.route('home', { path: '/' });
      });

      originalConsoleError = console.error;
    }

    teardown() {
      super.teardown();
      console.error = originalConsoleError;
    }

    handleURLAborts(assert, path, deprecated) {
      run(() => {
        let router = this.applicationInstance.lookup('router:main');
        let result;

        if (deprecated !== undefined) {
          expectDeprecation(() => {
            result = router.handleURL(path);
          });
        } else {
          result = router.handleURL(path);
        }

        result.then(
          function() {
            assert.ok(false, 'url: `' + path + '` was NOT to be handled');
          },
          function(reason) {
            assert.ok(
              reason && reason.message === 'TransitionAborted',
              'url: `' + path + '` was to be aborted'
            );
          }
        );
      });
    }

    get currentPath() {
      let currentPath;
      expectDeprecation(() => {
        currentPath = this.applicationInstance.lookup('controller:application').get('currentPath');
      }, 'Accessing `currentPath` on `controller:application` is deprecated, use the `currentPath` property on `service:router` instead.');
      return currentPath;
    }

    async ['@test warn on URLs not included in the route set'](assert) {
      await this.visit('/');

      await assert.rejects(this.visit('/what-is-this-i-dont-even'), /\/what-is-this-i-dont-even/);
    }

    ['@test properties that autotrack the model update when the model changes'](assert) {
      assert.expect(2);

      this.router.map(function() {
        this.route('track', { path: '/track/:id' });
      });

      class HomeRoute extends Route {
        async model({ id }) {
          return { value: id };
        }
      }

      class HomeController extends Controller {
        get derivedProperty() {
          return this.model.value || 'value is unset';
        }
      }

      this.add('route:track', HomeRoute);
      this.add('controller:track', HomeController);
      this.addTemplate('track', '<h3 class="derivedProperty">{{this.derivedProperty}}</h3>');

      return this.visit('/track/2')
        .then(() => {
          assert.equal(
            document.querySelector('h3').innerText,
            '2',
            'the derived property matches the id'
          );
        })
        .then(() => {
          return this.visit('/track/3').then(() => {
            assert.equal(
              document.querySelector('h3').innerText,
              '3',
              'the derived property matches the id'
            );
          });
        });
    }

    ['@test The Homepage with a `setupController` hook'](assert) {
      this.addTemplate(
        'home',
        `<ul>{{#each hours as |entry|}}
        <li>{{entry}}</li>
      {{/each}}
      </ul>
    `
      );

      this.add(
        'route:home',
        Route.extend({
          setupController(controller) {
            controller.set('hours', [
              'Monday through Friday: 9am to 5pm',
              'Saturday: Noon to Midnight',
              'Sunday: Noon to 6pm',
            ]);
          },
        })
      );
      return this.visit('/').then(() => {
        let text = this.$('ul li:nth-child(3)').text();

        assert.equal(
          text,
          'Sunday: Noon to 6pm',
          'The template was rendered with the hours context'
        );
      });
    }

    [`@test The route controller is still set when overriding the setupController hook`](assert) {
      this.add(
        'route:home',
        Route.extend({
          setupController() {
            // no-op
            // importantly, we are not calling this._super
          },
        })
      );

      this.add('controller:home', Controller.extend());

      return this.visit('/').then(() => {
        let homeRoute = this.applicationInstance.lookup('route:home');
        let homeController = this.applicationInstance.lookup('controller:home');

        assert.equal(
          homeRoute.controller,
          homeController,
          'route controller is the home controller'
        );
      });
    }

    ['@test the route controller can be specified via controllerName'](assert) {
      this.addTemplate('home', '<p>{{myValue}}</p>');
      this.add(
        'route:home',
        Route.extend({
          controllerName: 'myController',
        })
      );
      this.add(
        'controller:myController',
        Controller.extend({
          myValue: 'foo',
        })
      );

      return this.visit('/').then(() => {
        let homeRoute = this.applicationInstance.lookup('route:home');
        let myController = this.applicationInstance.lookup('controller:myController');
        let text = this.$('p').text();

        assert.equal(
          homeRoute.controller,
          myController,
          'route controller is set by controllerName'
        );
        assert.equal(
          text,
          'foo',
          'The homepage template was rendered with data from the custom controller'
        );
      });
    }

    [`@test The route controller specified via controllerName is used in render`](assert) {
      this.router.map(function() {
        this.route('home', { path: '/' });
      });

      this.add(
        'route:home',
        Route.extend({
          controllerName: 'myController',
          renderTemplate() {
            this.render('alternative_home');
          },
        })
      );

      this.add(
        'controller:myController',
        Controller.extend({
          myValue: 'foo',
        })
      );

      this.addTemplate('alternative_home', '<p>alternative home: {{myValue}}</p>');

      return this.visit('/').then(() => {
        let homeRoute = this.applicationInstance.lookup('route:home');
        let myController = this.applicationInstance.lookup('controller:myController');
        let text = this.$('p').text();

        assert.equal(
          homeRoute.controller,
          myController,
          'route controller is set by controllerName'
        );

        assert.equal(
          text,
          'alternative home: foo',
          'The homepage template was rendered with data from the custom controller'
        );
      });
    }

    [`@test The route controller specified via controllerName is used in render even when a controller with the routeName is available`](
      assert
    ) {
      this.router.map(function() {
        this.route('home', { path: '/' });
      });

      this.addTemplate('home', '<p>home: {{myValue}}</p>');

      this.add(
        'route:home',
        Route.extend({
          controllerName: 'myController',
        })
      );

      this.add(
        'controller:home',
        Controller.extend({
          myValue: 'home',
        })
      );

      this.add(
        'controller:myController',
        Controller.extend({
          myValue: 'myController',
        })
      );

      return this.visit('/').then(() => {
        let homeRoute = this.applicationInstance.lookup('route:home');
        let myController = this.applicationInstance.lookup('controller:myController');
        let text = this.$('p').text();

        assert.equal(
          homeRoute.controller,
          myController,
          'route controller is set by controllerName'
        );

        assert.equal(
          text,
          'home: myController',
          'The homepage template was rendered with data from the custom controller'
        );
      });
    }

    [`@test The Homepage with a 'setupController' hook modifying other controllers`](assert) {
      this.router.map(function() {
        this.route('home', { path: '/' });
      });

      this.add(
        'route:home',
        Route.extend({
          setupController(/* controller */) {
            this.controllerFor('home').set('hours', [
              'Monday through Friday: 9am to 5pm',
              'Saturday: Noon to Midnight',
              'Sunday: Noon to 6pm',
            ]);
          },
        })
      );

      this.addTemplate('home', '<ul>{{#each hours as |entry|}}<li>{{entry}}</li>{{/each}}</ul>');

      return this.visit('/').then(() => {
        let text = this.$('ul li:nth-child(3)').text();

        assert.equal(
          text,
          'Sunday: Noon to 6pm',
          'The template was rendered with the hours context'
        );
      });
    }

    [`@test The Homepage with a computed model that does not get overridden`](assert) {
      this.router.map(function() {
        this.route('home', { path: '/' });
      });

      this.add(
        'controller:home',
        Controller.extend({
          model: computed(function() {
            return [
              'Monday through Friday: 9am to 5pm',
              'Saturday: Noon to Midnight',
              'Sunday: Noon to 6pm',
            ];
          }),
        })
      );

      this.addTemplate(
        'home',
        '<ul>{{#each this.model as |passage|}}<li>{{passage}}</li>{{/each}}</ul>'
      );

      return this.visit('/').then(() => {
        let text = this.$('ul li:nth-child(3)').text();

        assert.equal(
          text,
          'Sunday: Noon to 6pm',
          'The template was rendered with the context intact'
        );
      });
    }

    [`@test The Homepage getting its controller context via model`](assert) {
      this.router.map(function() {
        this.route('home', { path: '/' });
      });

      this.add(
        'route:home',
        Route.extend({
          model() {
            return [
              'Monday through Friday: 9am to 5pm',
              'Saturday: Noon to Midnight',
              'Sunday: Noon to 6pm',
            ];
          },

          setupController(controller, model) {
            assert.equal(this.controllerFor('home'), controller);

            this.controllerFor('home').set('hours', model);
          },
        })
      );

      this.addTemplate('home', '<ul>{{#each hours as |entry|}}<li>{{entry}}</li>{{/each}}</ul>');

      return this.visit('/').then(() => {
        let text = this.$('ul li:nth-child(3)').text();

        assert.equal(
          text,
          'Sunday: Noon to 6pm',
          'The template was rendered with the hours context'
        );
      });
    }

    [`@feature(!EMBER_ROUTING_MODEL_ARG) The Specials Page getting its controller context by deserializing the params hash`](
      assert
    ) {
      this.router.map(function() {
        this.route('home', { path: '/' });
        this.route('special', { path: '/specials/:menu_item_id' });
      });

      this.add(
        'route:special',
        Route.extend({
          model(params) {
            return EmberObject.create({
              menuItemId: params.menu_item_id,
            });
          },
        })
      );

      this.addTemplate('special', '<p>{{this.model.menuItemId}}</p>');

      return this.visit('/specials/1').then(() => {
        let text = this.$('p').text();

        assert.equal(text, '1', 'The model was used to render the template');
      });
    }

    [`@feature(EMBER_ROUTING_MODEL_ARG) The Specials Page getting its model by deserializing the params hash`](
      assert
    ) {
      this.router.map(function() {
        this.route('home', { path: '/' });
        this.route('special', { path: '/specials/:menu_item_id' });
      });

      this.add(
        'route:special',
        Route.extend({
          model(params) {
            return EmberObject.create({
              menuItemId: params.menu_item_id,
            });
          },
        })
      );

      this.addTemplate('special', '<p>{{@model.menuItemId}}</p>');

      return this.visit('/specials/1').then(() => {
        let text = this.$('p').text();

        assert.equal(text, '1', 'The model was used to render the template');
      });
    }

    ['@feature(!EMBER_ROUTING_MODEL_ARG) The Specials Page defaults to looking models up via `find`']() {
      let MenuItem = EmberObject.extend();
      MenuItem.reopenClass({
        find(id) {
          return MenuItem.create({ id });
        },
      });
      this.add('model:menu_item', MenuItem);

      this.router.map(function() {
        this.route('home', { path: '/' });
        this.route('special', { path: '/specials/:menu_item_id' });
      });

      this.addTemplate('special', '{{this.model.id}}');

      return this.visit('/specials/1').then(() => {
        this.assertText('1', 'The model was used to render the template');
      });
    }

    ['@feature(EMBER_ROUTING_MODEL_ARG) The Specials Page defaults to looking models up via `find`']() {
      let MenuItem = EmberObject.extend();
      MenuItem.reopenClass({
        find(id) {
          return MenuItem.create({ id });
        },
      });
      this.add('model:menu_item', MenuItem);

      this.router.map(function() {
        this.route('home', { path: '/' });
        this.route('special', { path: '/specials/:menu_item_id' });
      });

      this.addTemplate('special', '{{@model.id}}');

      return this.visit('/specials/1').then(() => {
        this.assertText('1', 'The model was used to render the template');
      });
    }

    ['@feature(!EMBER_ROUTING_MODEL_ARG) Moving from one page to another triggers the correct callbacks'](
      assert
    ) {
      assert.expect(3);

      this.router.map(function() {
        this.route('home', { path: '/' });
        this.route('special', { path: '/specials/:menu_item_id' });
      });

      let MenuItem = EmberObject.extend();
      MenuItem.reopenClass({
        find(id) {
          return MenuItem.create({ id: id });
        },
      });
      this.add('model:menu_item', MenuItem);

      this.addTemplate('home', '<h3>Home</h3>');
      this.addTemplate('special', '<p>{{this.model.id}}</p>');

      return this.visit('/')
        .then(() => {
          this.assertText('Home', 'The app is now in the initial state');

          let promiseContext = MenuItem.create({ id: 1 });

          return this.visit('/specials/1', promiseContext);
        })
        .then(() => {
          assert.equal(this.currentURL, '/specials/1');
          this.assertText('1', 'The app is now transitioned');
        });
    }

    ['@feature(EMBER_ROUTING_MODEL_ARG) Moving from one page to another triggers the correct callbacks'](
      assert
    ) {
      assert.expect(3);

      this.router.map(function() {
        this.route('home', { path: '/' });
        this.route('special', { path: '/specials/:menu_item_id' });
      });

      let MenuItem = EmberObject.extend();
      MenuItem.reopenClass({
        find(id) {
          return MenuItem.create({ id: id });
        },
      });
      this.add('model:menu_item', MenuItem);

      this.addTemplate('home', '<h3>Home</h3>');
      this.addTemplate('special', '<p>{{@model.id}}</p>');

      return this.visit('/')
        .then(() => {
          this.assertText('Home', 'The app is now in the initial state');

          let promiseContext = MenuItem.create({ id: 1 });

          return this.visit('/specials/1', promiseContext);
        })
        .then(() => {
          assert.equal(this.currentURL, '/specials/1');
          this.assertText('1', 'The app is now transitioned');
        });
    }

    ['@feature(!EMBER_ROUTING_MODEL_ARG) Nested callbacks are not exited when moving to siblings'](
      assert
    ) {
      let rootSetup = 0;
      let rootRender = 0;
      let rootModel = 0;
      let rootSerialize = 0;
      let menuItem;
      let rootElement;

      let MenuItem = EmberObject.extend();
      MenuItem.reopenClass({
        find(id) {
          menuItem = MenuItem.create({ id: id });
          return menuItem;
        },
      });

      this.router.map(function() {
        this.route('root', { path: '/' }, function() {
          this.route('special', {
            path: '/specials/:menu_item_id',
            resetNamespace: true,
          });
        });
      });

      this.add(
        'route:root',
        Route.extend({
          model() {
            rootModel++;
            return this._super(...arguments);
          },

          setupController() {
            rootSetup++;
          },

          renderTemplate() {
            rootRender++;
          },

          serialize() {
            rootSerialize++;
            return this._super(...arguments);
          },
        })
      );

      this.add('route:loading', Route.extend({}));
      this.add('route:home', Route.extend({}));
      this.add(
        'route:special',
        Route.extend({
          model({ menu_item_id }) {
            return MenuItem.find(menu_item_id);
          },
          setupController(controller, model) {
            set(controller, 'model', model);
          },
        })
      );

      this.addTemplate('root.index', '<h3>Home</h3>');
      this.addTemplate('special', '<p>{{this.model.id}}</p>');
      this.addTemplate('loading', '<p>LOADING!</p>');

      return this.visit('/').then(() => {
        rootElement = document.getElementById('qunit-fixture');

        assert.equal(
          getTextOf(rootElement.querySelector('h3')),
          'Home',
          'The app is now in the initial state'
        );
        assert.equal(rootSetup, 1, 'The root setup was triggered');
        assert.equal(rootRender, 1, 'The root render was triggered');
        assert.equal(rootSerialize, 0, 'The root serialize was not called');
        assert.equal(rootModel, 1, 'The root model was called');

        let router = this.applicationInstance.lookup('router:main');
        let menuItem = MenuItem.create({ id: 1 });

        return router.transitionTo('special', menuItem).then(function() {
          assert.equal(rootSetup, 1, 'The root setup was not triggered again');
          assert.equal(rootRender, 1, 'The root render was not triggered again');
          assert.equal(rootSerialize, 0, 'The root serialize was not called');

          // TODO: Should this be changed?
          assert.equal(rootModel, 1, 'The root model was called again');

          assert.deepEqual(router.location.path, '/specials/1');
          assert.equal(router.currentPath, 'root.special');
        });
      });
    }

    ['@feature(EMBER_ROUTING_MODEL_ARG) Nested callbacks are not exited when moving to siblings'](
      assert
    ) {
      let rootSetup = 0;
      let rootRender = 0;
      let rootModel = 0;
      let rootSerialize = 0;
      let menuItem;
      let rootElement;

      let MenuItem = EmberObject.extend();
      MenuItem.reopenClass({
        find(id) {
          menuItem = MenuItem.create({ id: id });
          return menuItem;
        },
      });

      this.router.map(function() {
        this.route('root', { path: '/' }, function() {
          this.route('special', {
            path: '/specials/:menu_item_id',
            resetNamespace: true,
          });
        });
      });

      this.add(
        'route:root',
        Route.extend({
          model() {
            rootModel++;
            return this._super(...arguments);
          },

          setupController() {
            rootSetup++;
          },

          renderTemplate() {
            rootRender++;
          },

          serialize() {
            rootSerialize++;
            return this._super(...arguments);
          },
        })
      );

      this.add('route:loading', Route.extend({}));
      this.add('route:home', Route.extend({}));
      this.add(
        'route:special',
        Route.extend({
          model({ menu_item_id }) {
            return MenuItem.find(menu_item_id);
          },
          setupController(controller, model) {
            set(controller, 'model', model);
          },
        })
      );

      this.addTemplate('root.index', '<h3>Home</h3>');
      this.addTemplate('special', '<p>{{@model.id}}</p>');
      this.addTemplate('loading', '<p>LOADING!</p>');

      return this.visit('/').then(() => {
        rootElement = document.getElementById('qunit-fixture');

        assert.equal(
          getTextOf(rootElement.querySelector('h3')),
          'Home',
          'The app is now in the initial state'
        );
        assert.equal(rootSetup, 1, 'The root setup was triggered');
        assert.equal(rootRender, 1, 'The root render was triggered');
        assert.equal(rootSerialize, 0, 'The root serialize was not called');
        assert.equal(rootModel, 1, 'The root model was called');

        let router = this.applicationInstance.lookup('router:main');
        let menuItem = MenuItem.create({ id: 1 });

        return router.transitionTo('special', menuItem).then(function() {
          assert.equal(rootSetup, 1, 'The root setup was not triggered again');
          assert.equal(rootRender, 1, 'The root render was not triggered again');
          assert.equal(rootSerialize, 0, 'The root serialize was not called');

          // TODO: Should this be changed?
          assert.equal(rootModel, 1, 'The root model was called again');

          assert.deepEqual(router.location.path, '/specials/1');
          assert.equal(router.currentPath, 'root.special');
        });
      });
    }

    ['@test Route inherits model from parent route'](assert) {
      assert.expect(9);

      this.router.map(function() {
        this.route('the-post', { path: '/posts/:post_id' }, function() {
          this.route('comments');

          this.route('shares', { path: '/shares/:share_id', resetNamespace: true }, function() {
            this.route('share');
          });
        });
      });

      let post1 = {};
      let post2 = {};
      let post3 = {};
      let share1 = {};
      let share2 = {};
      let share3 = {};

      let posts = {
        1: post1,
        2: post2,
        3: post3,
      };
      let shares = {
        1: share1,
        2: share2,
        3: share3,
      };

      this.add(
        'route:the-post',
        Route.extend({
          model(params) {
            return posts[params.post_id];
          },
        })
      );

      this.add(
        'route:the-post.comments',
        Route.extend({
          afterModel(post /*, transition */) {
            let parent_model = this.modelFor('the-post');

            assert.equal(post, parent_model);
          },
        })
      );

      this.add(
        'route:shares',
        Route.extend({
          model(params) {
            return shares[params.share_id];
          },
        })
      );

      this.add(
        'route:shares.share',
        Route.extend({
          afterModel(share /*, transition */) {
            let parent_model = this.modelFor('shares');

            assert.equal(share, parent_model);
          },
        })
      );

      return this.visit('/posts/1/comments')
        .then(() => {
          assert.ok(true, 'url: /posts/1/comments was handled');
          return this.visit('/posts/1/shares/1');
        })
        .then(() => {
          assert.ok(true, 'url: /posts/1/shares/1 was handled');
          return this.visit('/posts/2/comments');
        })
        .then(() => {
          assert.ok(true, 'url: /posts/2/comments was handled');
          return this.visit('/posts/2/shares/2');
        })
        .then(() => {
          assert.ok(true, 'url: /posts/2/shares/2 was handled');
          return this.visit('/posts/3/comments');
        })
        .then(() => {
          assert.ok(true, 'url: /posts/3/shares was handled');
          return this.visit('/posts/3/shares/3');
        })
        .then(() => {
          assert.ok(true, 'url: /posts/3/shares/3 was handled');
        });
    }

    ['@test Routes with { resetNamespace: true } inherits model from parent route'](assert) {
      assert.expect(6);

      this.router.map(function() {
        this.route('the-post', { path: '/posts/:post_id' }, function() {
          this.route('comments', { resetNamespace: true }, function() {});
        });
      });

      let post1 = {};
      let post2 = {};
      let post3 = {};

      let posts = {
        1: post1,
        2: post2,
        3: post3,
      };

      this.add(
        'route:the-post',
        Route.extend({
          model(params) {
            return posts[params.post_id];
          },
        })
      );

      this.add(
        'route:comments',
        Route.extend({
          afterModel(post /*, transition */) {
            let parent_model = this.modelFor('the-post');

            assert.equal(post, parent_model);
          },
        })
      );

      return this.visit('/posts/1/comments')
        .then(() => {
          assert.ok(true, '/posts/1/comments');
          return this.visit('/posts/2/comments');
        })
        .then(() => {
          assert.ok(true, '/posts/2/comments');
          return this.visit('/posts/3/comments');
        })
        .then(() => {
          assert.ok(true, '/posts/3/comments');
        });
    }

    ['@test It is possible to get the model from a parent route'](assert) {
      assert.expect(6);

      this.router.map(function() {
        this.route('the-post', { path: '/posts/:post_id' }, function() {
          this.route('comments', { resetNamespace: true });
        });
      });

      let post1 = {};
      let post2 = {};
      let post3 = {};
      let currentPost;

      let posts = {
        1: post1,
        2: post2,
        3: post3,
      };

      this.add(
        'route:the-post',
        Route.extend({
          model(params) {
            return posts[params.post_id];
          },
        })
      );

      this.add(
        'route:comments',
        Route.extend({
          model() {
            assert.equal(this.modelFor('the-post'), currentPost);
          },
        })
      );

      currentPost = post1;
      return this.visit('/posts/1/comments')
        .then(() => {
          assert.ok(true, '/posts/1/comments has been handled');
          currentPost = post2;
          return this.visit('/posts/2/comments');
        })
        .then(() => {
          assert.ok(true, '/posts/2/comments has been handled');
          currentPost = post3;
          return this.visit('/posts/3/comments');
        })
        .then(() => {
          assert.ok(true, '/posts/3/comments has been handled');
        });
    }

    ['@test Parent route context change'](assert) {
      let editCount = 0;
      let editedPostIds = emberA();

      this.addTemplate('application', '{{outlet}}');
      this.addTemplate('posts', '{{outlet}}');
      this.addTemplate('post', '{{outlet}}');
      this.addTemplate('post/index', 'showing');
      this.addTemplate('post/edit', 'editing');

      this.router.map(function() {
        this.route('posts', function() {
          this.route('post', { path: '/:postId', resetNamespace: true }, function() {
            this.route('edit');
          });
        });
      });

      this.add(
        'route:posts',
        Route.extend({
          actions: {
            showPost(context) {
              this.transitionTo('post', context);
            },
          },
        })
      );

      this.add(
        'route:post',
        Route.extend({
          model(params) {
            return { id: params.postId };
          },

          serialize(model) {
            return { postId: model.id };
          },

          actions: {
            editPost() {
              this.transitionTo('post.edit');
            },
          },
        })
      );

      this.add(
        'route:post.edit',
        Route.extend({
          model() {
            let postId = this.modelFor('post').id;
            editedPostIds.push(postId);
            return null;
          },
          setup() {
            this._super(...arguments);
            editCount++;
          },
        })
      );

      return this.visit('/posts/1').then(() => {
        assert.ok(true, '/posts/1 has been handled');
        let router = this.applicationInstance.lookup('router:main');
        run(() => router.send('editPost'));
        run(() => router.send('showPost', { id: '2' }));
        run(() => router.send('editPost'));
        assert.equal(editCount, 2, 'set up the edit route twice without failure');
        assert.deepEqual(
          editedPostIds,
          ['1', '2'],
          'modelFor posts.post returns the right context'
        );
      });
    }

    ['@test ApplicationRoute with model does not proxy the currentPath'](assert) {
      // TODO: FIXME:
      let model = {};

      this.router.map(function() {
        this.route('index', { path: '/' });
      });

      this.add(
        'route:application',
        Route.extend({
          model() {
            return model;
          },
        })
      );

      return this.visit('/').then(() => {
        let routerService = this.applicationInstance.lookup('service:router');
        assert.equal(routerService.currentRouteName, 'index', 'currentPath is index');
        assert.equal(
          'currentPath' in model,
          false,
          'should have defined currentPath on controller'
        );
      });
    }

    ['@test Route model hook finds the same model as a manual find'](assert) {
      let post;
      let Post = EmberObject.extend();
      this.add('model:post', Post);
      Post.reopenClass({
        find() {
          post = this;
          return {};
        },
      });

      this.router.map(function() {
        this.route('post', { path: '/post/:post_id' });
      });

      return this.visit('/post/1').then(() => {
        assert.equal(Post, post);
      });
    }

    ['@test Routes can refresh themselves causing their model hooks to be re-run'](assert) {
      this.router.map(function() {
        this.route('parent', { path: '/parent/:parent_id' }, function() {
          this.route('child');
        });
      });

      let appcount = 0;
      this.add(
        'route:application',
        Route.extend({
          model() {
            ++appcount;
          },
        })
      );

      let parentcount = 0;
      this.add(
        'route:parent',
        Route.extend({
          model(params) {
            assert.equal(params.parent_id, '123');
            ++parentcount;
          },
          actions: {
            refreshParent() {
              this.refresh();
            },
          },
        })
      );

      let childcount = 0;
      this.add(
        'route:parent.child',
        Route.extend({
          model() {
            ++childcount;
          },
        })
      );

      let router;
      return this.visit('/')
        .then(() => {
          router = this.applicationInstance.lookup('router:main');
          assert.equal(appcount, 1);
          assert.equal(parentcount, 0);
          assert.equal(childcount, 0);
          return run(router, 'transitionTo', 'parent.child', '123');
        })
        .then(() => {
          assert.equal(appcount, 1);
          assert.equal(parentcount, 1);
          assert.equal(childcount, 1);
          return run(router, 'send', 'refreshParent');
        })
        .then(() => {
          assert.equal(appcount, 1);
          assert.equal(parentcount, 2);
          assert.equal(childcount, 2);
        });
    }
  }
);
