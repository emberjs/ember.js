import { getOwner } from 'ember-utils';
import Logger from 'ember-console';
import {
  Controller,
  RSVP,
  Object as EmberObject
} from 'ember-runtime';
import { Route } from 'ember-routing';
import {
  run
} from 'ember-metal';
import {
  Component,
  setTemplates,
  setTemplate
} from 'ember-glimmer';
import { ENV } from 'ember-environment';
import { compile } from 'ember-template-compiler';
import { Application, Engine } from 'ember-application';
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

QUnit.test('Generated route should be an instance of App.Route if provided', function (assert) {
  let generatedRoute;

  Router.map(function () {
    this.route('posts');
  });

  App.Route = Route.extend();

  bootApplication();

  handleURL(assert, '/posts');

  generatedRoute = container.lookup('route:posts');

  assert.ok(generatedRoute instanceof App.Route, 'should extend the correct route');
});
