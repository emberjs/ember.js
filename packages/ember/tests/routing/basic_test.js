import { getOwner } from 'ember-utils';
import Logger from 'ember-console';
import {
  Controller,
  RSVP,
  Object as EmberObject,
  A as emberA
} from 'ember-runtime';
import { Route } from 'ember-routing';
import {
  run,
  get,
  Mixin,
  observer
} from 'ember-metal';
import {
  Component,
  setTemplates,
  setTemplate
} from 'ember-glimmer';
import { ENV } from 'ember-environment';
import { compile } from 'ember-template-compiler';
import { Application, Engine } from 'ember-application';
import { Transition } from 'router';
import { getTextOf } from 'internal-test-helpers';

let Router, App, router, registry, container, originalLoggerError, originalRenderSupport, rootElement;

function bootApplication() {
  router = container.lookup('router:main');
  run(App, 'advanceReadiness');
}

function handleURL(assert, path) {
  return run(() => {
    return router.handleURL(path).then(function(value) {
      assert.ok(true, 'url: `' + path + '` was handled');
      return value;
    }, function(reason) {
      assert.ok(false, 'failed to visit:`' + path + '` reason: `' + QUnit.jsDump.parse(reason));
      throw reason;
    });
  });
}

QUnit.module('Basic Routing', {
  beforeEach() {
    run(() => {
      App = Application.create({
        name: 'App',
        rootElement: '#qunit-fixture'
      });

      rootElement = document.getElementById('qunit-fixture');

      App.deferReadiness();

      App.Router.reopen({
        location: 'none'
      });

      Router = App.Router;

      App.LoadingRoute = Route.extend({
      });

      registry = App.__registry__;
      container = App.__container__;

      setTemplate('application', compile('{{outlet}}'));
      setTemplate('home', compile('<h3 class="hours">Hours</h3>'));
      setTemplate('homepage', compile('<h3 class="megatroll">Megatroll</h3><p>{{model.home}}</p>'));
      setTemplate('camelot', compile('<section><h3 class="silly">Is a silly place</h3></section>'));

      originalLoggerError = Logger.error;
      originalRenderSupport = ENV._ENABLE_RENDER_SUPPORT;

      ENV._ENABLE_RENDER_SUPPORT = true;
    });
  },

  afterEach() {
    run(() => {
      App.destroy();
      App = null;

      setTemplates({});
      Logger.error = originalLoggerError;
      ENV._ENABLE_RENDER_SUPPORT = originalRenderSupport;
    });
  }
});

QUnit.test('Generated route should be an instance of App.Route if provided', function(assert) {
  let generatedRoute;

  Router.map(function() {
    this.route('posts');
  });

  App.Route = Route.extend();

  bootApplication();

  handleURL(assert, '/posts');

  generatedRoute = container.lookup('route:posts');

  assert.ok(generatedRoute instanceof App.Route, 'should extend the correct route');
});

QUnit.test('Nested index route is not overridden by parent\'s implicit index route', function(assert) {
  Router.map(function() {
    this.route('posts', function() {
      this.route('index', { path: ':category' });
    });
  });

  bootApplication();

  run(() => router.transitionTo('posts', { category: 'emberjs' }));

  assert.deepEqual(router.location.path, '/posts/emberjs');
});

QUnit.test('Application template does not duplicate when re-rendered', function(assert) {
  setTemplate('application', compile('<h3 class="render-once">I render once</h3>{{outlet}}'));

  Router.map(function() {
    this.route('posts');
  });

  App.ApplicationRoute = Route.extend({
    model() {
      return emberA();
    }
  });

  bootApplication();

  // should cause application template to re-render
  handleURL(assert, '/posts');

  assert.equal(getTextOf(rootElement.querySelector('h3.render-once')), "I render once");
});

QUnit.test('Child routes should render inside the application template if the application template causes a redirect', function(assert) {
  setTemplate('application', compile('<h3>App</h3> {{outlet}}'));
  setTemplate('posts', compile('posts'));

  Router.map(function() {
    this.route('posts');
    this.route('photos');
  });

  App.ApplicationRoute = Route.extend({
    afterModel() {
      this.transitionTo('posts');
    }
  });

  bootApplication();

  assert.equal(rootElement.textContent.trim(), 'App posts');
});

QUnit.test('The template is not re-rendered when the route\'s context changes', function(assert) {
  Router.map(function() {
    this.route('page', { path: '/page/:name' });
  });

  App.PageRoute = Route.extend({
    model(params) {
      return EmberObject.create({ name: params.name });
    }
  });

  let insertionCount = 0;
  App.FooBarComponent = Component.extend({
    didInsertElement() {
      insertionCount += 1;
    }
  });

  setTemplate('page', compile(
    '<p>{{model.name}}{{foo-bar}}</p>'
  ));

  bootApplication();

  handleURL(assert, '/page/first');

  assert.equal(getTextOf(rootElement.querySelector('p')), 'first');
  assert.equal(insertionCount, 1);

  handleURL(assert, '/page/second');

  assert.equal(getTextOf(rootElement.querySelector('p')), 'second');
  assert.equal(insertionCount, 1, 'view should have inserted only once');

  run(() => router.transitionTo('page', EmberObject.create({ name: 'third' })));

  assert.equal(getTextOf(rootElement.querySelector('p')), 'third');
  assert.equal(insertionCount, 1, 'view should still have inserted only once');
});

QUnit.test('The template is not re-rendered when two routes present the exact same template & controller', function(assert) {
  Router.map(function() {
    this.route('first');
    this.route('second');
    this.route('third');
    this.route('fourth');
  });

  // Note add a component to test insertion

  let insertionCount = 0;
  App.XInputComponent = Component.extend({
    didInsertElement() {
      insertionCount += 1;
    }
  });

  App.SharedRoute = Route.extend({
    setupController() {
      this.controllerFor('shared').set('message', 'This is the ' + this.routeName + ' message');
    },

    renderTemplate() {
      this.render('shared', { controller: 'shared' });
    }
  });

  App.FirstRoute  = App.SharedRoute.extend();
  App.SecondRoute = App.SharedRoute.extend();
  App.ThirdRoute  = App.SharedRoute.extend();
  App.FourthRoute = App.SharedRoute.extend();

  App.SharedController = Controller.extend();

  setTemplate('shared', compile(
    '<p>{{message}}{{x-input}}</p>'
  ));

  bootApplication();

  handleURL(assert, '/first');

  assert.equal(getTextOf(rootElement.querySelector('p')), 'This is the first message');
  assert.equal(insertionCount, 1, 'expected one assertion');

  // Transition by URL
  handleURL(assert, '/second');

  assert.equal(getTextOf(rootElement.querySelector('p')), 'This is the second message');
  assert.equal(insertionCount, 1, 'expected one assertion');

  // Then transition directly by route name
  run(() => {
    router.transitionTo('third').then(function() {
      assert.ok(true, 'expected transition');
    }, function(reason) {
      assert.ok(false, 'unexpected transition failure: ', QUnit.jsDump.parse(reason));
    });
  });

  assert.equal(getTextOf(rootElement.querySelector('p')), 'This is the third message');
  assert.equal(insertionCount, 1, 'expected one assertion');

  // Lastly transition to a different view, with the same controller and template
  handleURL(assert, '/fourth');
  assert.equal(insertionCount, 1, 'expected one assertion');

  assert.equal(getTextOf(rootElement.querySelector('p')), 'This is the fourth message');
});

QUnit.test('ApplicationRoute with model does not proxy the currentPath', function(assert) {
  let model = {};
  let currentPath;

  App.ApplicationRoute = Route.extend({
    model() { return model; }
  });

  App.ApplicationController = Controller.extend({
    currentPathDidChange: observer('currentPath', function() {
      currentPath = get(this, 'currentPath');
    })
  });

  bootApplication();

  assert.equal(currentPath, 'index', 'currentPath is index');
  assert.equal('currentPath' in model, false, 'should have defined currentPath on controller');
});

QUnit.test('Promises encountered on app load put app into loading state until resolved', function(assert) {
  assert.expect(2);

  let deferred = RSVP.defer();

  App.IndexRoute = Route.extend({
    model() {
      return deferred.promise;
    }
  });

  setTemplate('index', compile('<p>INDEX</p>'));
  setTemplate('loading', compile('<p>LOADING</p>'));

  bootApplication();

  assert.equal(getTextOf(rootElement.querySelector('p')), 'LOADING', 'The loading state is displaying.');
  run(deferred.resolve);
  assert.equal(getTextOf(rootElement.querySelector('p')), 'INDEX', 'The index route is display.');
});

QUnit.test('Route should tear down multiple outlets', function(assert) {
  setTemplate('application', compile('{{outlet \'menu\'}}{{outlet}}{{outlet \'footer\'}}'));
  setTemplate('posts', compile('{{outlet}}'));
  setTemplate('users', compile('users'));
  setTemplate('posts/index', compile('<p class="posts-index">postsIndex</p>'));
  setTemplate('posts/menu', compile('<div class="posts-menu">postsMenu</div>'));
  setTemplate('posts/footer', compile('<div class="posts-footer">postsFooter</div>'));

  Router.map(function() {
    this.route('posts', function() {});
    this.route('users', function() {});
  });

  App.PostsRoute = Route.extend({
    renderTemplate() {
      this.render('posts/menu', {
        into: 'application',
        outlet: 'menu'
      });

      this.render();

      this.render('posts/footer', {
        into: 'application',
        outlet: 'footer'
      });
    }
  });

  bootApplication();

  handleURL(assert, '/posts');

  assert.equal(getTextOf(rootElement.querySelector('div.posts-menu')), 'postsMenu', 'The posts/menu template was rendered');
  assert.equal(getTextOf(rootElement.querySelector('p.posts-index')), 'postsIndex', 'The posts/index template was rendered');
  assert.equal(getTextOf(rootElement.querySelector('div.posts-footer')), 'postsFooter', 'The posts/footer template was rendered');

  handleURL(assert, '/users');

  assert.equal(rootElement.querySelector('div.posts-menu'), null, 'The posts/menu template was removed');
  assert.equal(rootElement.querySelector('p.posts-index'), null, 'The posts/index template was removed');
  assert.equal(rootElement.querySelector('div.posts-footer'), null, 'The posts/footer template was removed');
});

QUnit.test('Route will assert if you try to explicitly render {into: ...} a missing template', function() {
  expectDeprecation(/Rendering into a {{render}} helper that resolves to an {{outlet}} is deprecated./);

  Router.map(function() {
    this.route('home', { path: '/' });
  });

  App.HomeRoute = Route.extend({
    renderTemplate() {
      this.render({ into: 'nonexistent' });
    }
  });

  expectAssertion(() => bootApplication(), 'You attempted to render into \'nonexistent\' but it was not found');
});

QUnit.test('Route supports clearing outlet explicitly', function(assert) {
  setTemplate('application', compile('{{outlet}}{{outlet \'modal\'}}'));
  setTemplate('posts', compile('{{outlet}}'));
  setTemplate('users', compile('users'));
  setTemplate('posts/index', compile('<div class="posts-index">postsIndex {{outlet}}</div>'));
  setTemplate('posts/modal', compile('<div class="posts-modal">postsModal</div>'));
  setTemplate('posts/extra', compile('<div class="posts-extra">postsExtra</div>'));

  Router.map(function() {
    this.route('posts', function() {});
    this.route('users', function() {});
  });

  App.PostsRoute = Route.extend({
    actions: {
      showModal() {
        this.render('posts/modal', {
          into: 'application',
          outlet: 'modal'
        });
      },
      hideModal() {
        this.disconnectOutlet({ outlet: 'modal', parentView: 'application' });
      }
    }
  });

  App.PostsIndexRoute = Route.extend({
    actions: {
      showExtra() {
        this.render('posts/extra', {
          into: 'posts/index'
        });
      },
      hideExtra() {
        this.disconnectOutlet({ parentView: 'posts/index' });
      }
    }
  });

  bootApplication();

  handleURL(assert, '/posts');

  assert.equal(getTextOf(rootElement.querySelector('div.posts-index')), 'postsIndex', 'The posts/index template was rendered');

  run(() => router.send('showModal'));

  assert.equal(getTextOf(rootElement.querySelector('div.posts-modal')), 'postsModal', 'The posts/modal template was rendered');

  run(() => router.send('showExtra'));

  assert.equal(getTextOf(rootElement.querySelector('div.posts-extra')), 'postsExtra', 'The posts/extra template was rendered');

  run(() => router.send('hideModal'));

  assert.equal(rootElement.querySelector('div.posts-modal'), null, 'The posts/modal template was removed');

  run(() => router.send('hideExtra'));

  assert.equal(rootElement.querySelector('div.posts-extra'), null, 'The posts/extra template was removed');
  run(function() {
    router.send('showModal');
  });
  assert.equal(getTextOf(rootElement.querySelector('div.posts-modal')), 'postsModal', 'The posts/modal template was rendered');
  run(function() {
    router.send('showExtra');
  });
  assert.equal(getTextOf(rootElement.querySelector('div.posts-extra')), 'postsExtra', 'The posts/extra template was rendered');

  handleURL(assert, '/users');

  assert.equal(rootElement.querySelector('div.posts-index'), null, 'The posts/index template was removed');
  assert.equal(rootElement.querySelector('div.posts-modal'), null, 'The posts/modal template was removed');
  assert.equal(rootElement.querySelector('div.posts-extra'), null, 'The posts/extra template was removed');
});

QUnit.test('Route supports clearing outlet using string parameter', function(assert) {
  setTemplate('application', compile('{{outlet}}{{outlet \'modal\'}}'));
  setTemplate('posts', compile('{{outlet}}'));
  setTemplate('users', compile('users'));
  setTemplate('posts/index', compile('<div class="posts-index">postsIndex {{outlet}}</div>'));
  setTemplate('posts/modal', compile('<div class="posts-modal">postsModal</div>'));

  Router.map(function() {
    this.route('posts', function() {});
    this.route('users', function() {});
  });

  App.PostsRoute = Route.extend({
    actions: {
      showModal() {
        this.render('posts/modal', {
          into: 'application',
          outlet: 'modal'
        });
      },
      hideModal() {
        this.disconnectOutlet('modal');
      }
    }
  });

  bootApplication();

  handleURL(assert, '/posts');

  assert.equal(getTextOf(rootElement.querySelector('div.posts-index')), 'postsIndex', 'The posts/index template was rendered');

  run(() => router.send('showModal'));

  assert.equal(getTextOf(rootElement.querySelector('div.posts-modal')), 'postsModal', 'The posts/modal template was rendered');

  run(() => router.send('hideModal'));

  assert.equal(rootElement.querySelector('div.posts-modal'), null, 'The posts/modal template was removed');

  handleURL(assert, '/users');

  assert.equal(rootElement.querySelector('div.posts-index'), null, 'The posts/index template was removed');
  assert.equal(rootElement.querySelector('div.posts-modal'), null, 'The posts/modal template was removed');
});

QUnit.test('Route silently fails when cleaning an outlet from an inactive view', function(assert) {
  assert.expect(1); // handleURL

  setTemplate('application', compile('{{outlet}}'));
  setTemplate('posts', compile('{{outlet \'modal\'}}'));
  setTemplate('modal', compile('A Yo.'));

  Router.map(function() {
    this.route('posts');
  });

  App.PostsRoute = Route.extend({
    actions: {
      hideSelf() {
        this.disconnectOutlet({ outlet: 'main', parentView: 'application' });
      },
      showModal() {
        this.render('modal', { into: 'posts', outlet: 'modal' });
      },
      hideModal() {
        this.disconnectOutlet({ outlet: 'modal', parentView: 'posts' });
      }
    }
  });

  bootApplication();

  handleURL(assert, '/posts');

  run(() => router.send('showModal'));
  run(() => router.send('hideSelf'));
  run(() => router.send('hideModal'));
});

QUnit.test('Router `willTransition` hook passes in cancellable transition', function(assert) {
  // Should hit willTransition 3 times, once for the initial route, and then 2 more times
  // for the two handleURL calls below
  assert.expect(3);

  Router.map(function() {
    this.route('nork');
    this.route('about');
  });

  Router.reopen({
    init() {
      this._super();
      this.on('willTransition', this.testWillTransitionHook);
    },
    testWillTransitionHook(transition, url) {
      assert.ok(true, 'willTransition was called ' + url);
      transition.abort();
    }
  });

  App.LoadingRoute = Route.extend({
    activate() {
      assert.ok(false, 'LoadingRoute was not entered');
    }
  });

  App.NorkRoute = Route.extend({
    activate() {
      assert.ok(false, 'NorkRoute was not entered');
    }
  });

  App.AboutRoute = Route.extend({
    activate() {
      assert.ok(false, 'AboutRoute was not entered');
    }
  });

  bootApplication();

  // Attempted transitions out of index should abort.
  run(router, 'handleURL', '/nork');
  run(router, 'handleURL', '/about');
});

QUnit.test('Aborting/redirecting the transition in `willTransition` prevents LoadingRoute from being entered', function(assert) {
  assert.expect(8);

  Router.map(function() {
    this.route('nork');
    this.route('about');
  });

  let redirect = false;

  App.IndexRoute = Route.extend({
    actions: {
      willTransition(transition) {
        assert.ok(true, 'willTransition was called');
        if (redirect) {
          // router.js won't refire `willTransition` for this redirect
          this.transitionTo('about');
        } else {
          transition.abort();
        }
      }
    }
  });

  let deferred = null;

  App.LoadingRoute = Route.extend({
    activate() {
      assert.ok(deferred, 'LoadingRoute should be entered at this time');
    },
    deactivate() {
      assert.ok(true, 'LoadingRoute was exited');
    }
  });

  App.NorkRoute = Route.extend({
    activate() {
      assert.ok(true, 'NorkRoute was entered');
    }
  });

  App.AboutRoute = Route.extend({
    activate() {
      assert.ok(true, 'AboutRoute was entered');
    },
    model() {
      if (deferred) { return deferred.promise; }
    }
  });

  bootApplication();

  // Attempted transitions out of index should abort.
  run(router, 'transitionTo', 'nork');
  run(router, 'handleURL', '/nork');

  // Attempted transitions out of index should redirect to about
  redirect = true;
  run(router, 'transitionTo', 'nork');
  run(router, 'transitionTo', 'index');

  // Redirected transitions out of index to a route with a
  // promise model should pause the transition and
  // activate LoadingRoute
  deferred = RSVP.defer();
  run(router, 'transitionTo', 'nork');
  run(deferred.resolve);
});

QUnit.test('`didTransition` event fires on the router', function(assert) {
  assert.expect(3);

  Router.map(function() {
    this.route('nork');
  });

  router = container.lookup('router:main');

  router.one('didTransition', function() {
    assert.ok(true, 'didTransition fired on initial routing');
  });

  bootApplication();

  router.one('didTransition', function() {
    assert.ok(true, 'didTransition fired on the router');
    assert.equal(router.get('url'), '/nork', 'The url property is updated by the time didTransition fires');
  });

  run(router, 'transitionTo', 'nork');
});
QUnit.test('`didTransition` can be reopened', function(assert) {
  assert.expect(1);

  Router.map(function() {
    this.route('nork');
  });

  Router.reopen({
    didTransition() {
      this._super(...arguments);
      assert.ok(true, 'reopened didTransition was called');
    }
  });

  bootApplication();
});

QUnit.test('`activate` event fires on the route', function(assert) {
  assert.expect(2);

  let eventFired = 0;

  Router.map(function() {
    this.route('nork');
  });

  App.NorkRoute = Route.extend({
    init() {
      this._super(...arguments);

      this.on('activate', function() {
        assert.equal(++eventFired, 1, 'activate event is fired once');
      });
    },

    activate() {
      assert.ok(true, 'activate hook is called');
    }
  });

  bootApplication();

  run(router, 'transitionTo', 'nork');
});

QUnit.test('`deactivate` event fires on the route', function(assert) {
  assert.expect(2);

  let eventFired = 0;

  Router.map(function() {
    this.route('nork');
    this.route('dork');
  });

  App.NorkRoute = Route.extend({
    init() {
      this._super(...arguments);

      this.on('deactivate', function() {
        assert.equal(++eventFired, 1, 'deactivate event is fired once');
      });
    },

    deactivate() {
      assert.ok(true, 'deactivate hook is called');
    }
  });

  bootApplication();

  run(router, 'transitionTo', 'nork');
  run(router, 'transitionTo', 'dork');
});

QUnit.test('Actions can be handled by inherited action handlers', function(assert) {
  assert.expect(4);

  App.SuperRoute = Route.extend({
    actions: {
      foo() {
        assert.ok(true, 'foo');
      },
      bar(msg) {
        assert.equal(msg, 'HELLO');
      }
    }
  });

  App.RouteMixin = Mixin.create({
    actions: {
      bar(msg) {
        assert.equal(msg, 'HELLO');
        this._super(msg);
      }
    }
  });

  App.IndexRoute = App.SuperRoute.extend(App.RouteMixin, {
    actions: {
      baz() {
        assert.ok(true, 'baz');
      }
    }
  });

  bootApplication();

  router.send('foo');
  router.send('bar', 'HELLO');
  router.send('baz');
});

QUnit.test('transitionTo returns Transition when passed a route name', function(assert) {
  assert.expect(1);
  Router.map(function() {
    this.route('root', { path: '/' });
    this.route('bar');
  });

  bootApplication();

  let transition = run(() => router.transitionTo('bar'));

  assert.equal(transition instanceof Transition, true);
});

QUnit.test('transitionTo returns Transition when passed a url', function(assert) {
  assert.expect(1);
  Router.map(function() {
    this.route('root', { path: '/' });
    this.route('bar', function() {
      this.route('baz');
    });
  });

  bootApplication();

  let transition = run(() => router.transitionTo('/bar/baz'));

  assert.equal(transition instanceof Transition, true);
});

QUnit.test('currentRouteName is a property installed on ApplicationController that can be used in transitionTo', function(assert) {
  assert.expect(24);

  Router.map(function() {
    this.route('be', function() {
      this.route('excellent', { resetNamespace: true }, function() {
        this.route('to', { resetNamespace: true }, function() {
          this.route('each', { resetNamespace: true }, function() {
            this.route('other');
          });
        });
      });
    });
  });

  bootApplication();

  let appController = getOwner(router).lookup('controller:application');

  function transitionAndCheck(path, expectedPath, expectedRouteName) {
    if (path) { run(router, 'transitionTo', path); }
    assert.equal(appController.get('currentPath'), expectedPath);
    assert.equal(appController.get('currentRouteName'), expectedRouteName);
  }

  transitionAndCheck(null, 'index', 'index');
  transitionAndCheck('/be', 'be.index', 'be.index');
  transitionAndCheck('/be/excellent', 'be.excellent.index', 'excellent.index');
  transitionAndCheck('/be/excellent/to', 'be.excellent.to.index', 'to.index');
  transitionAndCheck('/be/excellent/to/each', 'be.excellent.to.each.index', 'each.index');
  transitionAndCheck('/be/excellent/to/each/other', 'be.excellent.to.each.other', 'each.other');

  transitionAndCheck('index', 'index', 'index');
  transitionAndCheck('be', 'be.index', 'be.index');
  transitionAndCheck('excellent', 'be.excellent.index', 'excellent.index');
  transitionAndCheck('to.index', 'be.excellent.to.index', 'to.index');
  transitionAndCheck('each', 'be.excellent.to.each.index', 'each.index');
  transitionAndCheck('each.other', 'be.excellent.to.each.other', 'each.other');
});

QUnit.test('Route model hook finds the same model as a manual find', function(assert) {
  let Post;
  App.Post = EmberObject.extend();
  App.Post.reopenClass({
    find() {
      Post = this;
      return {};
    }
  });

  Router.map(function() {
    this.route('post', { path: '/post/:post_id' });
  });

  bootApplication();

  handleURL(assert, '/post/1');

  assert.equal(App.Post, Post);
});

QUnit.test('Routes can refresh themselves causing their model hooks to be re-run', function(assert) {
  Router.map(function() {
    this.route('parent', { path: '/parent/:parent_id' }, function() {
      this.route('child');
    });
  });

  let appcount = 0;
  App.ApplicationRoute = Route.extend({
    model() {
      ++appcount;
    }
  });

  let parentcount = 0;
  App.ParentRoute = Route.extend({
    model(params) {
      assert.equal(params.parent_id, '123');
      ++parentcount;
    },
    actions: {
      refreshParent() {
        this.refresh();
      }
    }
  });

  let childcount = 0;
  App.ParentChildRoute = Route.extend({
    model() {
      ++childcount;
    }
  });

  bootApplication();

  assert.equal(appcount, 1);
  assert.equal(parentcount, 0);
  assert.equal(childcount, 0);

  run(router, 'transitionTo', 'parent.child', '123');

  assert.equal(appcount, 1);
  assert.equal(parentcount, 1);
  assert.equal(childcount, 1);

  run(router, 'send', 'refreshParent');

  assert.equal(appcount, 1);
  assert.equal(parentcount, 2);
  assert.equal(childcount, 2);
});

QUnit.test('Specifying non-existent controller name in route#render throws', function(assert) {
  assert.expect(1);

  Router.map(function() {
    this.route('home', { path: '/' });
  });

  App.HomeRoute = Route.extend({
    renderTemplate() {
      expectAssertion(() => {
        this.render('homepage', { controller: 'stefanpenneristhemanforme' });
      }, 'You passed `controller: \'stefanpenneristhemanforme\'` into the `render` method, but no such controller could be found.');
    }
  });

  bootApplication();
});

QUnit.test('Redirecting with null model doesn\'t error out', function(assert) {
  Router.map(function() {
    this.route('home', { path: '/' });
    this.route('about', { path: '/about/:hurhurhur' });
  });

  App.AboutRoute = Route.extend({
    serialize: function(model) {
      if (model === null) {
        return { hurhurhur: 'TreeklesMcGeekles' };
      }
    }
  });

  App.HomeRoute = Route.extend({
    beforeModel() {
      this.transitionTo('about', null);
    }
  });

  bootApplication();

  assert.equal(router.get('location.path'), '/about/TreeklesMcGeekles');
});

QUnit.test('rejecting the model hooks promise with a non-error prints the `message` property', function(assert) {
  assert.expect(5);

  let rejectedMessage = 'OMG!! SOOOOOO BAD!!!!';
  let rejectedStack   = 'Yeah, buddy: stack gets printed too.';

  Router.map(function() {
    this.route('yippie', { path: '/' });
  });

  Logger.error = function(initialMessage, errorMessage, errorStack) {
    assert.equal(initialMessage, 'Error while processing route: yippie', 'a message with the current route name is printed');
    assert.equal(errorMessage, rejectedMessage, 'the rejected reason\'s message property is logged');
    assert.equal(errorStack, rejectedStack, 'the rejected reason\'s stack property is logged');
  };

  App.YippieRoute = Route.extend({
    model() {
      return RSVP.reject({ message: rejectedMessage, stack: rejectedStack });
    }
  });

  assert.throws(function() {
    bootApplication();
  }, function(err) {
    assert.equal(err.message, rejectedMessage);
    return true;
  }, 'expected an exception');
});

QUnit.test('rejecting the model hooks promise with an error with `errorThrown` property prints `errorThrown.message` property', function(assert) {
  assert.expect(5);
  let rejectedMessage = 'OMG!! SOOOOOO BAD!!!!';
  let rejectedStack   = 'Yeah, buddy: stack gets printed too.';

  Router.map(function() {
    this.route('yippie', { path: '/' });
  });

  Logger.error = function(initialMessage, errorMessage, errorStack) {
    assert.equal(initialMessage, 'Error while processing route: yippie', 'a message with the current route name is printed');
    assert.equal(errorMessage, rejectedMessage, 'the rejected reason\'s message property is logged');
    assert.equal(errorStack, rejectedStack, 'the rejected reason\'s stack property is logged');
  };

  App.YippieRoute = Route.extend({
    model() {
      return RSVP.reject({
        errorThrown: { message: rejectedMessage, stack: rejectedStack }
      });
    }
  });

  assert.throws(() => bootApplication(), function(err) {
    assert.equal(err.message, rejectedMessage);
    return true;
  }, 'expected an exception');
});

QUnit.test('rejecting the model hooks promise with no reason still logs error', function(assert) {
  Router.map(function() {
    this.route('wowzers', { path: '/' });
  });

  Logger.error = function(initialMessage) {
    assert.equal(initialMessage, 'Error while processing route: wowzers', 'a message with the current route name is printed');
  };

  App.WowzersRoute = Route.extend({
    model() {
      return RSVP.reject();
    }
  });

  bootApplication();
});

QUnit.test('rejecting the model hooks promise with a string shows a good error', function(assert) {
  assert.expect(3);
  let originalLoggerError = Logger.error;
  let rejectedMessage = 'Supercalifragilisticexpialidocious';

  Router.map(function() {
    this.route('yondo', { path: '/' });
  });

  Logger.error = function(initialMessage, errorMessage) {
    assert.equal(initialMessage, 'Error while processing route: yondo', 'a message with the current route name is printed');
    assert.equal(errorMessage, rejectedMessage, 'the rejected reason\'s message property is logged');
  };

  App.YondoRoute = Route.extend({
    model() {
      return RSVP.reject(rejectedMessage);
    }
  });

  assert.throws(() => bootApplication(), new RegExp(rejectedMessage), 'expected an exception');

  Logger.error = originalLoggerError;
});

QUnit.test('willLeave, willChangeContext, willChangeModel actions don\'t fire unless feature flag enabled', function(assert) {
  assert.expect(1);

  App.Router.map(function() {
    this.route('about');
  });

  function shouldNotFire() {
    assert.ok(false, 'this action shouldn\'t have been received');
  }

  App.IndexRoute = Route.extend({
    actions: {
      willChangeModel: shouldNotFire,
      willChangeContext: shouldNotFire,
      willLeave: shouldNotFire
    }
  });

  App.AboutRoute = Route.extend({
    setupController() {
      assert.ok(true, 'about route was entered');
    }
  });

  bootApplication();
  run(router, 'transitionTo', 'about');
});

QUnit.test('Errors in transitionTo within redirect hook are logged', function(assert) {
  assert.expect(4);
  let actual = [];

  Router.map(function() {
    this.route('yondo', { path: '/' });
    this.route('stink-bomb');
  });

  App.YondoRoute = Route.extend({
    redirect() {
      this.transitionTo('stink-bomb', { something: 'goes boom' });
    }
  });

  Logger.error = function() {
    // push the arguments onto an array so we can detect if the error gets logged twice
    actual.push(arguments);
  };

  assert.throws(() => bootApplication(), /More context objects were passed/);

  assert.equal(actual.length, 1, 'the error is only logged once');
  assert.equal(actual[0][0], 'Error while processing route: yondo', 'source route is printed');
  assert.ok(actual[0][1].match(/More context objects were passed than there are dynamic segments for the route: stink-bomb/), 'the error is printed');
});

QUnit.test('Errors in transition show error template if available', function(assert) {
  setTemplate('error', compile('<div id=\'error\'>Error!</div>'));

  Router.map(function() {
    this.route('yondo', { path: '/' });
    this.route('stink-bomb');
  });

  App.YondoRoute = Route.extend({
    redirect() {
      this.transitionTo('stink-bomb', { something: 'goes boom' });
    }
  });

  bootApplication();

  assert.equal(rootElement.querySelectorAll('#error').length, 1, 'Error template was rendered.');
});

QUnit.test('Route#resetController gets fired when changing models and exiting routes', function(assert) {
  assert.expect(4);

  Router.map(function() {
    this.route('a', function() {
      this.route('b', { path: '/b/:id', resetNamespace: true }, function() { });
      this.route('c', { path: '/c/:id', resetNamespace: true }, function() { });
    });
    this.route('out');
  });

  let calls = [];

  let SpyRoute = Route.extend({
    setupController(/* controller, model, transition */) {
      calls.push(['setup', this.routeName]);
    },

    resetController(/* controller */) {
      calls.push(['reset', this.routeName]);
    }
  });

  App.ARoute = SpyRoute.extend();
  App.BRoute = SpyRoute.extend();
  App.CRoute = SpyRoute.extend();
  App.OutRoute = SpyRoute.extend();

  bootApplication();
  assert.deepEqual(calls, []);

  run(router, 'transitionTo', 'b', 'b-1');
  assert.deepEqual(calls, [['setup', 'a'], ['setup', 'b']]);
  calls.length = 0;

  run(router, 'transitionTo', 'c', 'c-1');
  assert.deepEqual(calls, [['reset', 'b'], ['setup', 'c']]);
  calls.length = 0;

  run(router, 'transitionTo', 'out');
  assert.deepEqual(calls, [['reset', 'c'], ['reset', 'a'], ['setup', 'out']]);
});

QUnit.test('Exception during initialization of non-initial route is not swallowed', function(assert) {
  Router.map(function() {
    this.route('boom');
  });
  App.BoomRoute = Route.extend({
    init() {
      throw new Error('boom!');
    }
  });
  bootApplication();
  assert.throws(() => run(router, 'transitionTo', 'boom'), /\bboom\b/);
});

QUnit.test('Exception during load of non-initial route is not swallowed', function(assert) {
  Router.map(function() {
    this.route('boom');
  });
  let lookup = container.lookup;
  container.lookup = function() {
    if (arguments[0] === 'route:boom') {
      throw new Error('boom!');
    }
    return lookup.apply(this, arguments);
  };
  App.BoomRoute = Route.extend({
    init() {
      throw new Error('boom!');
    }
  });
  bootApplication();
  assert.throws(() => run(router, 'transitionTo', 'boom'));
});

QUnit.test('Exception during initialization of initial route is not swallowed', function(assert) {
  Router.map(function() {
    this.route('boom', { path: '/' });
  });
  App.BoomRoute = Route.extend({
    init() {
      throw new Error('boom!');
    }
  });
  assert.throws(() => bootApplication(), /\bboom\b/);
});

QUnit.test('Exception during load of initial route is not swallowed', function(assert) {
  Router.map(function() {
    this.route('boom', { path: '/' });
  });
  let lookup = container.lookup;
  container.lookup = function() {
    if (arguments[0] === 'route:boom') {
      throw new Error('boom!');
    }
    return lookup.apply(this, arguments);
  };
  App.BoomRoute = Route.extend({
    init() {
      throw new Error('boom!');
    }
  });
  assert.throws(() => bootApplication(), /\bboom\b/);
});

QUnit.test('{{outlet}} works when created after initial render', function(assert) {
  setTemplate('sample', compile('Hi{{#if showTheThing}}{{outlet}}{{/if}}Bye'));
  setTemplate('sample/inner', compile('Yay'));
  setTemplate('sample/inner2', compile('Boo'));
  Router.map(function() {
    this.route('sample', { path: '/' }, function() {
      this.route('inner', { path: '/' });
      this.route('inner2', { path: '/2' });
    });
  });

  bootApplication();

  assert.equal(rootElement.textContent.trim(), 'HiBye', 'initial render');

  run(() => container.lookup('controller:sample').set('showTheThing', true));

  assert.equal(rootElement.textContent.trim(), 'HiYayBye', 'second render');

  handleURL(assert, '/2');

  assert.equal(rootElement.textContent.trim(), 'HiBooBye', 'third render');
});

QUnit.test('Can render into a named outlet at the top level', function(assert) {
  setTemplate('application', compile('A-{{outlet}}-B-{{outlet "other"}}-C'));
  setTemplate('modal', compile('Hello world'));
  setTemplate('index', compile('The index'));

  registry.register('route:application', Route.extend({
    renderTemplate() {
      this.render();
      this.render('modal', {
        into: 'application',
        outlet: 'other'
      });
    }
  }));

  bootApplication();

  assert.equal(rootElement.textContent.trim(), 'A-The index-B-Hello world-C', 'initial render');
});

QUnit.test('Can disconnect a named outlet at the top level', function(assert) {
  setTemplate('application', compile('A-{{outlet}}-B-{{outlet "other"}}-C'));
  setTemplate('modal', compile('Hello world'));
  setTemplate('index', compile('The index'));

  registry.register('route:application', Route.extend({
    renderTemplate() {
      this.render();
      this.render('modal', {
        into: 'application',
        outlet: 'other'
      });
    },
    actions: {
      banish() {
        this.disconnectOutlet({
          parentView: 'application',
          outlet: 'other'
        });
      }
    }
  }));

  bootApplication();

  assert.equal(rootElement.textContent.trim(), 'A-The index-B-Hello world-C', 'initial render');

  run(router, 'send', 'banish');

  assert.equal(rootElement.textContent.trim(), 'A-The index-B--C', 'second render');
});

QUnit.test('Can render into a named outlet at the top level, with empty main outlet', function(assert) {
  setTemplate('application', compile('A-{{outlet}}-B-{{outlet "other"}}-C'));
  setTemplate('modal', compile('Hello world'));

  Router.map(function() {
    this.route('hasNoTemplate', { path: '/' });
  });

  registry.register('route:application', Route.extend({
    renderTemplate() {
      this.render();
      this.render('modal', {
        into: 'application',
        outlet: 'other'
      });
    }
  }));

  bootApplication();

  assert.equal(rootElement.textContent.trim(), 'A--B-Hello world-C', 'initial render');
});

QUnit.test('Can render into a named outlet at the top level, later', function(assert) {
  setTemplate('application', compile('A-{{outlet}}-B-{{outlet "other"}}-C'));
  setTemplate('modal', compile('Hello world'));
  setTemplate('index', compile('The index'));

  registry.register('route:application', Route.extend({
    actions: {
      launch() {
        this.render('modal', {
          into: 'application',
          outlet: 'other'
        });
      }
    }
  }));

  bootApplication();

  assert.equal(rootElement.textContent.trim(), 'A-The index-B--C', 'initial render');

  run(router, 'send', 'launch');

  assert.equal(rootElement.textContent.trim(), 'A-The index-B-Hello world-C', 'second render');
});

QUnit.test('Can render routes with no \'main\' outlet and their children', function(assert) {
  setTemplate('application', compile('<div id="application">{{outlet "app"}}</div>'));
  setTemplate('app', compile('<div id="app-common">{{outlet "common"}}</div><div id="app-sub">{{outlet "sub"}}</div>'));
  setTemplate('common', compile('<div id="common"></div>'));
  setTemplate('sub', compile('<div id="sub"></div>'));

  Router.map(function() {
    this.route('app', { path: '/app' }, function() {
      this.route('sub', { path: '/sub', resetNamespace: true });
    });
  });

  App.AppRoute = Route.extend({
    renderTemplate() {
      this.render('app', {
        outlet: 'app',
        into: 'application'
      });
      this.render('common', {
        outlet: 'common',
        into: 'app'
      });
    }
  });

  App.SubRoute = Route.extend({
    renderTemplate() {
      this.render('sub', {
        outlet: 'sub',
        into: 'app'
      });
    }
  });

  bootApplication();
  handleURL(assert, '/app');
  assert.equal(rootElement.querySelectorAll('#app-common #common').length, 1, 'Finds common while viewing /app');
  handleURL(assert, '/app/sub');
  assert.equal(rootElement.querySelectorAll('#app-common #common').length, 1, 'Finds common while viewing /app/sub');
  assert.equal(rootElement.querySelectorAll('#app-sub #sub').length, 1, 'Finds sub while viewing /app/sub');
});

QUnit.test('Tolerates stacked renders', function(assert) {
  setTemplate('application', compile('{{outlet}}{{outlet "modal"}}'));
  setTemplate('index', compile('hi'));
  setTemplate('layer', compile('layer'));
  App.ApplicationRoute = Route.extend({
    actions: {
      openLayer() {
        this.render('layer', {
          into: 'application',
          outlet: 'modal'
        });
      },
      close() {
        this.disconnectOutlet({
          outlet: 'modal',
          parentView: 'application'
        });
      }
    }
  });
  bootApplication();
  assert.equal(rootElement.textContent.trim(), 'hi');
  run(router, 'send', 'openLayer');
  assert.equal(rootElement.textContent.trim(), 'hilayer');
  run(router, 'send', 'openLayer');
  assert.equal(rootElement.textContent.trim(), 'hilayer');
  run(router, 'send', 'close');
  assert.equal(rootElement.textContent.trim(), 'hi');
});

QUnit.test('Renders child into parent with non-default template name', function(assert) {
  setTemplate('application', compile('<div class="a">{{outlet}}</div>'));
  setTemplate('exports/root', compile('<div class="b">{{outlet}}</div>'));
  setTemplate('exports/index', compile('<div class="c"></div>'));

  Router.map(function() {
    this.route('root', function() {
    });
  });

  App.RootRoute = Route.extend({
    renderTemplate() {
      this.render('exports/root');
    }
  });

  App.RootIndexRoute = Route.extend({
    renderTemplate() {
      this.render('exports/index');
    }
  });

  bootApplication();
  handleURL(assert, '/root');
  assert.equal(rootElement.querySelectorAll('.a .b .c').length, 1);
});

QUnit.test('Allows any route to disconnectOutlet another route\'s templates', function(assert) {
  setTemplate('application', compile('{{outlet}}{{outlet "modal"}}'));
  setTemplate('index', compile('hi'));
  setTemplate('layer', compile('layer'));
  App.ApplicationRoute = Route.extend({
    actions: {
      openLayer() {
        this.render('layer', {
          into: 'application',
          outlet: 'modal'
        });
      }
    }
  });
  App.IndexRoute = Route.extend({
    actions: {
      close() {
        this.disconnectOutlet({
          parentView: 'application',
          outlet: 'modal'
        });
      }
    }
  });
  bootApplication();
  assert.equal(rootElement.textContent.trim(), 'hi');
  run(router, 'send', 'openLayer');
  assert.equal(rootElement.textContent.trim(), 'hilayer');
  run(router, 'send', 'close');
  assert.equal(rootElement.textContent.trim(), 'hi');
});

QUnit.test('Can this.render({into:...}) the render helper', function(assert) {
  expectDeprecation(/Rendering into a {{render}} helper that resolves to an {{outlet}} is deprecated./);

  expectDeprecation(() => {
    setTemplate('application', compile('{{render "sidebar"}}'));
  }, /Please refactor [\w\{\}"` ]+ to a component/);

  setTemplate('sidebar', compile('<div class="sidebar">{{outlet}}</div>'));
  setTemplate('index', compile('other'));
  setTemplate('bar', compile('bar'));

  App.IndexRoute = Route.extend({
    renderTemplate() {
      this.render({ into: 'sidebar' });
    },
    actions: {
      changeToBar() {
        this.disconnectOutlet({
          parentView: 'sidebar',
          outlet: 'main'
        });
        this.render('bar', { into: 'sidebar' });
      }
    }
  });

  bootApplication();
  assert.equal(getTextOf(rootElement.querySelector('.sidebar')), 'other');
  run(router, 'send', 'changeToBar');
  assert.equal(getTextOf(rootElement.querySelector('.sidebar')), 'bar');
});

QUnit.test('Can disconnect from the render helper', function(assert) {
  expectDeprecation(/Rendering into a {{render}} helper that resolves to an {{outlet}} is deprecated./);

  expectDeprecation(() => {
    setTemplate('application', compile('{{render "sidebar"}}'));
  }, /Please refactor [\w\{\}"` ]+ to a component/);

  setTemplate('sidebar', compile('<div class="sidebar">{{outlet}}</div>'));
  setTemplate('index', compile('other'));

  App.IndexRoute = Route.extend({
    renderTemplate() {
      this.render({ into: 'sidebar' });
    },
    actions: {
      disconnect: function() {
        this.disconnectOutlet({
          parentView: 'sidebar',
          outlet: 'main'
        });
      }
    }
  });

  bootApplication();
  assert.equal(getTextOf(rootElement.querySelector('.sidebar')), 'other');
  run(router, 'send', 'disconnect');
  assert.equal(getTextOf(rootElement.querySelector('.sidebar')), '');
});

QUnit.test('Can this.render({into:...}) the render helper\'s children', function(assert) {
  expectDeprecation(/Rendering into a {{render}} helper that resolves to an {{outlet}} is deprecated./);

  expectDeprecation(() => {
    setTemplate('application', compile('{{render "sidebar"}}'));
  }, /Please refactor [\w\{\}"` ]+ to a component/);

  setTemplate('sidebar', compile('<div class="sidebar">{{outlet}}</div>'));
  setTemplate('index', compile('<div class="index">{{outlet}}</div>'));
  setTemplate('other', compile('other'));
  setTemplate('bar', compile('bar'));

  App.IndexRoute = Route.extend({
    renderTemplate() {
      this.render({ into: 'sidebar' });
      this.render('other', { into: 'index' });
    },
    actions: {
      changeToBar() {
        this.disconnectOutlet({
          parentView: 'index',
          outlet: 'main'
        });
        this.render('bar', { into: 'index' });
      }
    }
  });

  bootApplication();
  assert.equal(getTextOf(rootElement.querySelector('.sidebar .index')), 'other');
  run(router, 'send', 'changeToBar');
  assert.equal(getTextOf(rootElement.querySelector('.sidebar .index')), 'bar');
});

QUnit.test('Can disconnect from the render helper\'s children', function(assert) {
  expectDeprecation(/Rendering into a {{render}} helper that resolves to an {{outlet}} is deprecated./);

  expectDeprecation(() => {
    setTemplate('application', compile('{{render "sidebar"}}'));
  }, /Please refactor [\w\{\}"` ]+ to a component/);

  setTemplate('sidebar', compile('<div class="sidebar">{{outlet}}</div>'));
  setTemplate('index', compile('<div class="index">{{outlet}}</div>'));
  setTemplate('other', compile('other'));

  App.IndexRoute = Route.extend({
    renderTemplate() {
      this.render({ into: 'sidebar' });
      this.render('other', { into: 'index' });
    },
    actions: {
      disconnect() {
        this.disconnectOutlet({
          parentView: 'index',
          outlet: 'main'
        });
      }
    }
  });

  bootApplication();
  assert.equal(getTextOf(rootElement.querySelector('.sidebar .index')), 'other');
  run(router, 'send', 'disconnect');
  assert.equal(getTextOf(rootElement.querySelector('.sidebar .index')), '');
});

QUnit.test('Can this.render({into:...}) nested render helpers', function(assert) {
  expectDeprecation(/Rendering into a {{render}} helper that resolves to an {{outlet}} is deprecated./);

  expectDeprecation(() => {
    setTemplate('application', compile('{{render "sidebar"}}'));
  }, /Please refactor [\w\{\}"` ]+ to a component/);

  expectDeprecation(() => {
    setTemplate('sidebar', compile('<div class="sidebar">{{render "cart"}}</div>'));
  }, /Please refactor [\w\{\}"` ]+ to a component/);

  setTemplate('cart', compile('<div class="cart">{{outlet}}</div>'));
  setTemplate('index', compile('other'));
  setTemplate('baz', compile('baz'));

  App.IndexRoute = Route.extend({
    renderTemplate() {
      this.render({ into: 'cart' });
    },
    actions: {
      changeToBaz() {
        this.disconnectOutlet({
          parentView: 'cart',
          outlet: 'main'
        });
        this.render('baz', { into: 'cart' });
      }
    }
  });

  bootApplication();
  assert.equal(getTextOf(rootElement.querySelector('.cart')), 'other');
  run(router, 'send', 'changeToBaz');
  assert.equal(getTextOf(rootElement.querySelector('.cart')), 'baz');
});

QUnit.test('Can disconnect from nested render helpers', function(assert) {
  expectDeprecation(/Rendering into a {{render}} helper that resolves to an {{outlet}} is deprecated./);

  expectDeprecation(() => {
    setTemplate('application', compile('{{render "sidebar"}}'));
  }, /Please refactor [\w\{\}"` ]+ to a component/);

  expectDeprecation(() => {
    setTemplate('sidebar', compile('<div class="sidebar">{{render "cart"}}</div>'));
  }, /Please refactor [\w\{\}"` ]+ to a component/);

  setTemplate('cart', compile('<div class="cart">{{outlet}}</div>'));
  setTemplate('index', compile('other'));

  App.IndexRoute = Route.extend({
    renderTemplate() {
      this.render({ into: 'cart' });
    },
    actions: {
      disconnect() {
        this.disconnectOutlet({
          parentView: 'cart',
          outlet: 'main'
        });
      }
    }
  });

  bootApplication();
  assert.equal(getTextOf(rootElement.querySelector('.cart')), 'other');
  run(router, 'send', 'disconnect');
  assert.equal(getTextOf(rootElement.querySelector('.cart')), '');
});

QUnit.test('Components inside an outlet have their didInsertElement hook invoked when the route is displayed', function(assert) {
  setTemplate('index', compile('{{#if showFirst}}{{my-component}}{{else}}{{other-component}}{{/if}}'));

  let myComponentCounter = 0;
  let otherComponentCounter = 0;
  let indexController;

  App.IndexController = Controller.extend({
    showFirst: true
  });

  App.IndexRoute = Route.extend({
    setupController(controller) {
      indexController = controller;
    }
  });

  App.MyComponentComponent = Component.extend({
    didInsertElement() {
      myComponentCounter++;
    }
  });

  App.OtherComponentComponent = Component.extend({
    didInsertElement() {
      otherComponentCounter++;
    }
  });

  bootApplication();

  assert.strictEqual(myComponentCounter, 1, 'didInsertElement invoked on displayed component');
  assert.strictEqual(otherComponentCounter, 0, 'didInsertElement not invoked on displayed component');

  run(() => indexController.set('showFirst', false));

  assert.strictEqual(myComponentCounter, 1, 'didInsertElement not invoked on displayed component');
  assert.strictEqual(otherComponentCounter, 1, 'didInsertElement invoked on displayed component');
});

QUnit.test('Doesnt swallow exception thrown from willTransition', function(assert) {
  assert.expect(1);
  setTemplate('application', compile('{{outlet}}'));
  setTemplate('index', compile('index'));
  setTemplate('other', compile('other'));

  Router.map(function() {
    this.route('other', function() {
    });
  });

  App.IndexRoute = Route.extend({
    actions: {
      willTransition() {
        throw new Error('boom');
      }
    }
  });

  bootApplication();

  assert.throws(() => {
    run(() => router.handleURL('/other'));
  }, /boom/, 'expected an exception but none was thrown');
});

QUnit.test('Exception if outlet name is undefined in render and disconnectOutlet', function() {
  App.ApplicationRoute = Route.extend({
    actions: {
      showModal() {
        this.render({
          outlet: undefined,
          parentView: 'application'
        });
      },
      hideModal() {
        this.disconnectOutlet({
          outlet: undefined,
          parentView: 'application'
        });
      }
    }
  });

  bootApplication();

  expectAssertion(() => {
    run(() => router.send('showModal'));
  }, /You passed undefined as the outlet name/);

  expectAssertion(() => {
    run(() => router.send('hideModal'));
  }, /You passed undefined as the outlet name/);
});

QUnit.test('Route serializers work for Engines', function(assert) {
  assert.expect(2);

  // Register engine
  let BlogEngine = Engine.extend();
  registry.register('engine:blog', BlogEngine);

  // Register engine route map
  let postSerialize = function(params) {
    assert.ok(true, 'serialize hook runs');
    return {
      post_id: params.id
    };
  };
  let BlogMap = function() {
    this.route('post', { path: '/post/:post_id', serialize: postSerialize });
  };
  registry.register('route-map:blog', BlogMap);

  Router.map(function() {
    this.mount('blog');
  });

  bootApplication();

  assert.equal(router._routerMicrolib.generate('blog.post', { id: '13' }), '/blog/post/13', 'url is generated properly');
});

QUnit.test('Defining a Route#serialize method in an Engine throws an error', function(assert) {
  assert.expect(1);

  // Register engine
  let BlogEngine = Engine.extend();
  registry.register('engine:blog', BlogEngine);

  // Register engine route map
  let BlogMap = function() {
    this.route('post');
  };
  registry.register('route-map:blog', BlogMap);

  Router.map(function() {
    this.mount('blog');
  });

  bootApplication();

  let PostRoute = Route.extend({ serialize() {} });
  container.lookup('engine:blog').register('route:post', PostRoute);

  assert.throws(() => router.transitionTo('blog.post'), /Defining a custom serialize method on an Engine route is not supported/);
});

QUnit.test('App.destroy does not leave undestroyed views after clearing engines', function(assert) {
  assert.expect(4);

  let engineInstance;
  // Register engine
  let BlogEngine = Engine.extend();
  registry.register('engine:blog', BlogEngine);
  let EngineIndexRoute = Route.extend({
    init() {
      this._super(...arguments);
      engineInstance = getOwner(this);
    }
  });

  // Register engine route map
  let BlogMap = function() {
    this.route('post');
  };
  registry.register('route-map:blog', BlogMap);

  Router.map(function() {
    this.mount('blog');
  });

  bootApplication();

  let engine = container.lookup('engine:blog');
  engine.register('route:index', EngineIndexRoute);
  engine.register('template:index', compile('Engine Post!'));

  handleURL(assert, '/blog');

  let route = engineInstance.lookup('route:index');

  run(router, 'destroy');
  assert.equal(router._toplevelView, null, 'the toplevelView was cleared');

  run(route, 'destroy');
  assert.equal(router._toplevelView, null, 'the toplevelView was not reinitialized');

  run(App, 'destroy');
  assert.equal(router._toplevelView, null, 'the toplevelView was not reinitialized');
});
