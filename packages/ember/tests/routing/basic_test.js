import { getOwner } from 'ember-utils';
import Logger from 'ember-console';
import {
  Controller,
  RSVP,
  Object as EmberObject,
  A as emberA,
  copy
} from 'ember-runtime';
import {
  Route,
  NoneLocation,
  HistoryLocation
} from 'ember-routing';
import {
  run,
  get,
  set,
  computed,
  Mixin,
  observer,
  addObserver
} from 'ember-metal';
import {
  Component,
  setTemplates,
  setTemplate
} from 'ember-glimmer';
import { jQuery } from 'ember-views';
import { compile } from 'ember-template-compiler';
import { Application, Engine } from 'ember-application';
import { Transition } from 'router';

let trim = jQuery.trim;

let Router, App, router, registry, container, originalLoggerError;

function bootApplication() {
  router = container.lookup('router:main');
  run(App, 'advanceReadiness');
}

function handleURL(path) {
  return run(() => {
    return router.handleURL(path).then(function(value) {
      ok(true, 'url: `' + path + '` was handled');
      return value;
    }, function(reason) {
      ok(false, 'failed to visit:`' + path + '` reason: `' + QUnit.jsDump.parse(reason));
      throw reason;
    });
  });
}

function handleURLAborts(path) {
  run(() => {
    router.handleURL(path).then(function(value) {
      ok(false, 'url: `' + path + '` was NOT to be handled');
    }, function(reason) {
      ok(reason && reason.message === 'TransitionAborted', 'url: `' + path + '` was to be aborted');
    });
  });
}

function handleURLRejectsWith(path, expectedReason) {
  run(() => {
    router.handleURL(path).then(function(value) {
      ok(false, 'expected handleURLing: `' + path + '` to fail');
    }, function(reason) {
      equal(reason, expectedReason);
    });
  });
}

QUnit.module('Basic Routing', {
  setup() {
    run(() => {
      App = Application.create({
        name: 'App',
        rootElement: '#qunit-fixture'
      });

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
      setTemplate('home', compile('<h3>Hours</h3>'));
      setTemplate('homepage', compile('<h3>Megatroll</h3><p>{{model.home}}</p>'));
      setTemplate('camelot', compile('<section><h3>Is a silly place</h3></section>'));

      originalLoggerError = Logger.error;
    });
  },

  teardown() {
    run(() => {
      App.destroy();
      App = null;

      setTemplates({});
      Logger.error = originalLoggerError;
    });
  }
});

QUnit.test('warn on URLs not included in the route set', function () {
  Router.map(function() {
    this.route('home', { path: '/' });
  });

  bootApplication();

  expectAssertion(() => run(() => router.handleURL('/what-is-this-i-dont-even')),
                  'The URL \'/what-is-this-i-dont-even\' did not match any routes in your application');
});

QUnit.test('The Homepage', function() {
  Router.map(function() {
    this.route('home', { path: '/' });
  });

  App.HomeRoute = Route.extend({
  });

  let currentPath;

  App.ApplicationController = Controller.extend({
    currentPathDidChange: observer('currentPath', function() {
      currentPath = get(this, 'currentPath');
    })
  });

  bootApplication();

  equal(currentPath, 'home');
  equal(jQuery('h3:contains(Hours)', '#qunit-fixture').length, 1, 'The home template was rendered');
});

QUnit.test('The Home page and the Camelot page with multiple Router.map calls', function() {
  Router.map(function() {
    this.route('home', { path: '/' });
  });

  Router.map(function() {
    this.route('camelot', { path: '/camelot' });
  });

  App.HomeRoute = Route.extend({
  });

  App.CamelotRoute = Route.extend({
  });

  let currentPath;

  App.ApplicationController = Controller.extend({
    currentPathDidChange: observer('currentPath', function() {
      currentPath = get(this, 'currentPath');
    })
  });

  App.CamelotController = Controller.extend({
    currentPathDidChange: observer('currentPath', function() {
      currentPath = get(this, 'currentPath');
    })
  });

  bootApplication();

  handleURL('/camelot');

  equal(currentPath, 'camelot');
  equal(jQuery('h3:contains(silly)', '#qunit-fixture').length, 1, 'The camelot template was rendered');

  handleURL('/');

  equal(currentPath, 'home');
  equal(jQuery('h3:contains(Hours)', '#qunit-fixture').length, 1, 'The home template was rendered');
});

QUnit.test('The Homepage with explicit template name in renderTemplate', function() {
  Router.map(function() {
    this.route('home', { path: '/' });
  });

  App.HomeRoute = Route.extend({
    renderTemplate() {
      this.render('homepage');
    }
  });

  bootApplication();

  equal(jQuery('h3:contains(Megatroll)', '#qunit-fixture').length, 1, 'The homepage template was rendered');
});

QUnit.test('An alternate template will pull in an alternate controller', function() {
  Router.map(function() {
    this.route('home', { path: '/' });
  });

  App.HomeRoute = Route.extend({
    renderTemplate() {
      this.render('homepage');
    }
  });

  App.HomepageController = Controller.extend({
    model: {
      home: 'Comes from homepage'
    }
  });

  bootApplication();

  equal(jQuery('h3:contains(Megatroll) + p:contains(Comes from homepage)', '#qunit-fixture').length, 1, 'The homepage template was rendered');
});

QUnit.test('An alternate template will pull in an alternate controller instead of controllerName', function() {
  Router.map(function() {
    this.route('home', { path: '/' });
  });

  App.HomeRoute = Route.extend({
    controllerName: 'foo',
    renderTemplate() {
      this.render('homepage');
    }
  });

  App.FooController = Controller.extend({
    model: {
      home: 'Comes from Foo'
    }
  });

  App.HomepageController = Controller.extend({
    model: {
      home: 'Comes from homepage'
    }
  });

  bootApplication();

  equal(jQuery('h3:contains(Megatroll) + p:contains(Comes from homepage)', '#qunit-fixture').length, 1, 'The homepage template was rendered');
});

QUnit.test('The template will pull in an alternate controller via key/value', function() {
  Router.map(function() {
    this.route('homepage', { path: '/' });
  });

  App.HomepageRoute = Route.extend({
    renderTemplate() {
      this.render({ controller: 'home' });
    }
  });

  App.HomeController = Controller.extend({
    model: {
      home: 'Comes from home.'
    }
  });

  bootApplication();

  equal(jQuery('h3:contains(Megatroll) + p:contains(Comes from home.)', '#qunit-fixture').length, 1, 'The homepage template was rendered from data from the HomeController');
});

QUnit.test('The Homepage with explicit template name in renderTemplate and controller', function() {
  Router.map(function() {
    this.route('home', { path: '/' });
  });

  App.HomeController = Controller.extend({
    model: {
      home: 'YES I AM HOME'
    }
  });

  App.HomeRoute = Route.extend({
    renderTemplate() {
      this.render('homepage');
    }
  });

  bootApplication();

  equal(jQuery('h3:contains(Megatroll) + p:contains(YES I AM HOME)', '#qunit-fixture').length, 1, 'The homepage template was rendered');
});

QUnit.test('Model passed via renderTemplate model is set as controller\'s model', function() {
  setTemplate('bio', compile('<p>{{model.name}}</p>'));

  App.BioController = Controller.extend();

  Router.map(function() {
    this.route('home', { path: '/' });
  });

  App.HomeRoute = Route.extend({
    renderTemplate() {
      this.render('bio', {
        model: { name: 'emberjs' }
      });
    }
  });

  bootApplication();

  equal(jQuery('p:contains(emberjs)', '#qunit-fixture').length, 1, 'Passed model was set as controllers model');
});

QUnit.test('render uses templateName from route', function() {
  Router.map(function() {
    this.route('home', { path: '/' });
  });

  setTemplate('the_real_home_template', compile(
    '<p>THIS IS THE REAL HOME</p>'
  ));

  App.HomeController = Controller.extend();
  App.HomeRoute = Route.extend({
    templateName: 'the_real_home_template'
  });

  bootApplication();

  equal(jQuery('p', '#qunit-fixture').text(), 'THIS IS THE REAL HOME', 'The homepage template was rendered');
});

QUnit.test('defining templateName allows other templates to be rendered', function() {
  Router.map(function() {
    this.route('home', { path: '/' });
  });

  setTemplate('alert', compile(
    '<div class=\'alert-box\'>Invader!</div>'
  ));
  setTemplate('the_real_home_template', compile(
    '<p>THIS IS THE REAL HOME</p>{{outlet \'alert\'}}'
  ));

  App.HomeController = Controller.extend();
  App.HomeRoute = Route.extend({
    templateName: 'the_real_home_template',
    actions: {
      showAlert() {
        this.render('alert', {
          into: 'home',
          outlet: 'alert'
        });
      }
    }
  });

  bootApplication();

  equal(jQuery('p', '#qunit-fixture').text(), 'THIS IS THE REAL HOME', 'The homepage template was rendered');

  run(() => router.send('showAlert'));

  equal(jQuery('.alert-box', '#qunit-fixture').text(), 'Invader!', 'Template for alert was render into outlet');
});

QUnit.test('templateName is still used when calling render with no name and options', function() {
  Router.map(function() {
    this.route('home', { path: '/' });
  });

  setTemplate('alert', compile(
    '<div class=\'alert-box\'>Invader!</div>'
  ));
  setTemplate('home', compile(
    '<p>THIS IS THE REAL HOME</p>{{outlet \'alert\'}}'
  ));

  App.HomeRoute = Route.extend({
    templateName: 'alert',
    renderTemplate: function() {
      this.render({});
    }
  });

  bootApplication();

  equal(jQuery('.alert-box', '#qunit-fixture').text(), 'Invader!', 'default templateName was rendered into outlet');
});

QUnit.test('The Homepage with a `setupController` hook', function() {
  Router.map(function() {
    this.route('home', { path: '/' });
  });

  App.HomeRoute = Route.extend({
    setupController(controller) {
      set(controller, 'hours', emberA([
        'Monday through Friday: 9am to 5pm',
        'Saturday: Noon to Midnight',
        'Sunday: Noon to 6pm'
      ]));
    }
  });

  setTemplate('home', compile(
    '<ul>{{#each hours as |entry|}}<li>{{entry}}</li>{{/each}}</ul>'
  ));

  bootApplication();

  equal(jQuery('ul li', '#qunit-fixture').eq(2).text(), 'Sunday: Noon to 6pm', 'The template was rendered with the hours context');
});

QUnit.test('The route controller is still set when overriding the setupController hook', function() {
  Router.map(function() {
    this.route('home', { path: '/' });
  });

  App.HomeRoute = Route.extend({
    setupController(controller) {
      // no-op
      // importantly, we are not calling  this._super here
    }
  });

  registry.register('controller:home', Controller.extend());

  bootApplication();

  deepEqual(container.lookup('route:home').controller, container.lookup('controller:home'), 'route controller is the home controller');
});

QUnit.test('The route controller can be specified via controllerName', function() {
  Router.map(function() {
    this.route('home', { path: '/' });
  });

  setTemplate('home', compile(
    '<p>{{myValue}}</p>'
  ));

  App.HomeRoute = Route.extend({
    controllerName: 'myController'
  });

  registry.register('controller:myController', Controller.extend({
    myValue: 'foo'
  }));

  bootApplication();

  deepEqual(container.lookup('route:home').controller, container.lookup('controller:myController'), 'route controller is set by controllerName');
  equal(jQuery('p', '#qunit-fixture').text(), 'foo', 'The homepage template was rendered with data from the custom controller');
});

QUnit.test('The route controller specified via controllerName is used in render', function() {
  Router.map(function() {
    this.route('home', { path: '/' });
  });

  setTemplate('alternative_home', compile(
    '<p>alternative home: {{myValue}}</p>'
  ));

  App.HomeRoute = Route.extend({
    controllerName: 'myController',
    renderTemplate() {
      this.render('alternative_home');
    }
  });

  registry.register('controller:myController', Controller.extend({
    myValue: 'foo'
  }));

  bootApplication();

  deepEqual(container.lookup('route:home').controller, container.lookup('controller:myController'), 'route controller is set by controllerName');
  equal(jQuery('p', '#qunit-fixture').text(), 'alternative home: foo', 'The homepage template was rendered with data from the custom controller');
});

QUnit.test('The route controller specified via controllerName is used in render even when a controller with the routeName is available', function() {
  Router.map(function() {
    this.route('home', { path: '/' });
  });

  setTemplate('home', compile(
    '<p>home: {{myValue}}</p>'
  ));

  App.HomeRoute = Route.extend({
    controllerName: 'myController'
  });

  registry.register('controller:home', Controller.extend({
    myValue: 'home'
  }));

  registry.register('controller:myController', Controller.extend({
    myValue: 'myController'
  }));

  bootApplication();

  deepEqual(container.lookup('route:home').controller, container.lookup('controller:myController'), 'route controller is set by controllerName');
  equal(jQuery('p', '#qunit-fixture').text(), 'home: myController', 'The homepage template was rendered with data from the custom controller');
});

QUnit.test('The Homepage with a `setupController` hook modifying other controllers', function() {
  Router.map(function() {
    this.route('home', { path: '/' });
  });

  App.HomeRoute = Route.extend({
    setupController(controller) {
      set(this.controllerFor('home'), 'hours', emberA([
        'Monday through Friday: 9am to 5pm',
        'Saturday: Noon to Midnight',
        'Sunday: Noon to 6pm'
      ]));
    }
  });

  setTemplate('home', compile(
    '<ul>{{#each hours as |entry|}}<li>{{entry}}</li>{{/each}}</ul>'
  ));

  bootApplication();

  equal(jQuery('ul li', '#qunit-fixture').eq(2).text(), 'Sunday: Noon to 6pm', 'The template was rendered with the hours context');
});

QUnit.test('The Homepage with a computed context that does not get overridden', function() {
  Router.map(function() {
    this.route('home', { path: '/' });
  });

  App.HomeController = Controller.extend({
    model: computed(function() {
      return emberA([
        'Monday through Friday: 9am to 5pm',
        'Saturday: Noon to Midnight',
        'Sunday: Noon to 6pm'
      ]);
    })
  });

  setTemplate('home', compile(
    '<ul>{{#each model as |passage|}}<li>{{passage}}</li>{{/each}}</ul>'
  ));

  bootApplication();

  equal(jQuery('ul li', '#qunit-fixture').eq(2).text(), 'Sunday: Noon to 6pm', 'The template was rendered with the context intact');
});

QUnit.test('The Homepage getting its controller context via model', function() {
  Router.map(function() {
    this.route('home', { path: '/' });
  });

  App.HomeRoute = Route.extend({
    model() {
      return emberA([
        'Monday through Friday: 9am to 5pm',
        'Saturday: Noon to Midnight',
        'Sunday: Noon to 6pm'
      ]);
    },

    setupController(controller, model) {
      equal(this.controllerFor('home'), controller);

      set(this.controllerFor('home'), 'hours', model);
    }
  });

  setTemplate('home', compile(
    '<ul>{{#each hours as |entry|}}<li>{{entry}}</li>{{/each}}</ul>'
  ));

  bootApplication();

  equal(jQuery('ul li', '#qunit-fixture').eq(2).text(), 'Sunday: Noon to 6pm', 'The template was rendered with the hours context');
});

QUnit.test('The Specials Page getting its controller context by deserializing the params hash', function() {
  Router.map(function() {
    this.route('home', { path: '/' });
    this.route('special', { path: '/specials/:menu_item_id' });
  });

  App.SpecialRoute = Route.extend({
    model(params) {
      return EmberObject.create({
        menuItemId: params.menu_item_id
      });
    },

    setupController(controller, model) {
      set(controller, 'model', model);
    }
  });

  setTemplate('special', compile(
    '<p>{{model.menuItemId}}</p>'
  ));

  bootApplication();

  registry.register('controller:special', Controller.extend());

  handleURL('/specials/1');

  equal(jQuery('p', '#qunit-fixture').text(), '1', 'The model was used to render the template');
});

QUnit.test('The Specials Page defaults to looking models up via `find`', function() {
  Router.map(function() {
    this.route('home', { path: '/' });
    this.route('special', { path: '/specials/:menu_item_id' });
  });

  App.MenuItem = EmberObject.extend();
  App.MenuItem.reopenClass({
    find(id) {
      return App.MenuItem.create({
        id: id
      });
    }
  });

  App.SpecialRoute = Route.extend({
    setupController(controller, model) {
      set(controller, 'model', model);
    }
  });

  setTemplate('special', compile(
    '<p>{{model.id}}</p>'
  ));

  bootApplication();

  registry.register('controller:special', Controller.extend());

  handleURL('/specials/1');

  equal(jQuery('p', '#qunit-fixture').text(), '1', 'The model was used to render the template');
});

QUnit.test('The Special Page returning a promise puts the app into a loading state until the promise is resolved', function() {
  Router.map(function() {
    this.route('home', { path: '/' });
    this.route('special', { path: '/specials/:menu_item_id' });
  });

  let menuItem, resolve;

  App.MenuItem = EmberObject.extend();
  App.MenuItem.reopenClass({
    find(id) {
      menuItem = App.MenuItem.create({ id: id });

      return new RSVP.Promise(function(res) {
        resolve = res;
      });
    }
  });

  App.LoadingRoute = Route.extend({

  });

  App.SpecialRoute = Route.extend({
    setupController(controller, model) {
      set(controller, 'model', model);
    }
  });

  setTemplate('special', compile(
    '<p>{{model.id}}</p>'
  ));

  setTemplate('loading', compile(
    '<p>LOADING!</p>'
  ));

  bootApplication();

  registry.register('controller:special', Controller.extend());

  handleURL('/specials/1');

  equal(jQuery('p', '#qunit-fixture').text(), 'LOADING!', 'The app is in the loading state');

  run(() => resolve(menuItem));

  equal(jQuery('p', '#qunit-fixture').text(), '1', 'The app is now in the specials state');
});

QUnit.test('The loading state doesn\'t get entered for promises that resolve on the same run loop', function() {
  Router.map(function() {
    this.route('home', { path: '/' });
    this.route('special', { path: '/specials/:menu_item_id' });
  });

  App.MenuItem = EmberObject.extend();
  App.MenuItem.reopenClass({
    find(id) {
      return { id: id };
    }
  });

  App.LoadingRoute = Route.extend({
    enter() {
      ok(false, 'LoadingRoute shouldn\'t have been entered.');
    }
  });

  App.SpecialRoute = Route.extend({
    setupController(controller, model) {
      set(controller, 'model', model);
    }
  });

  setTemplate('special', compile(
    '<p>{{model.id}}</p>'
  ));

  setTemplate('loading', compile(
    '<p>LOADING!</p>'
  ));

  bootApplication();

  registry.register('controller:special', Controller.extend());

  handleURL('/specials/1');

  equal(jQuery('p', '#qunit-fixture').text(), '1', 'The app is now in the specials state');
});

/*
asyncTest("The Special page returning an error fires the error hook on SpecialRoute", function() {
  Router.map(function() {
    this.route("home", { path: "/" });
    this.route("special", { path: "/specials/:menu_item_id" });
  });

  let menuItem;

  App.MenuItem = Ember.Object.extend();
  App.MenuItem.reopenClass({
    find: function(id) {
      menuItem = App.MenuItem.create({ id: id });
      run.later(function() { menuItem.resolve(menuItem); }, 1);
      return menuItem;
    }
  });

  App.SpecialRoute = Route.extend({
    setup: function() {
      throw 'Setup error';
    },
    actions: {
      error: function(reason) {
        equal(reason, 'Setup error');
        QUnit.start();
      }
    }
  });

  bootApplication();

  handleURLRejectsWith('/specials/1', 'Setup error');
});
*/

QUnit.test('The Special page returning an error invokes SpecialRoute\'s error handler', function() {
  Router.map(function() {
    this.route('home', { path: '/' });
    this.route('special', { path: '/specials/:menu_item_id' });
  });

  let menuItem, promise, resolve;

  App.MenuItem = EmberObject.extend();
  App.MenuItem.reopenClass({
    find(id) {
      menuItem = App.MenuItem.create({ id: id });
      promise = new RSVP.Promise(function(res) {
        resolve = res;
      });

      return promise;
    }
  });

  App.SpecialRoute = Route.extend({
    setup() {
      throw 'Setup error';
    },
    actions: {
      error(reason) {
        equal(reason, 'Setup error', 'SpecialRoute#error received the error thrown from setup');
        return true;
      }
    }
  });

  bootApplication();

  handleURLRejectsWith('/specials/1', 'Setup error');

  run(() => resolve(menuItem));
});

let testOverridableErrorHandler = function(handlersName) {
  expect(2);

  Router.map(function() {
    this.route('home', { path: '/' });
    this.route('special', { path: '/specials/:menu_item_id' });
  });

  let menuItem, resolve;

  App.MenuItem = EmberObject.extend();
  App.MenuItem.reopenClass({
    find(id) {
      menuItem = App.MenuItem.create({ id: id });
      return new RSVP.Promise(function(res) {
        resolve = res;
      });
    }
  });

  let attrs = {};
  attrs[handlersName] = {
    error(reason) {
      equal(reason, 'Setup error', 'error was correctly passed to custom ApplicationRoute handler');
      return true;
    }
  };

  App.ApplicationRoute = Route.extend(attrs);

  App.SpecialRoute = Route.extend({
    setup() {
      throw 'Setup error';
    }
  });

  bootApplication();

  handleURLRejectsWith('/specials/1', 'Setup error');

  run(() => resolve(menuItem));
};

QUnit.test('ApplicationRoute\'s default error handler can be overridden', function() {
  testOverridableErrorHandler('actions');
});

QUnit.asyncTest('Moving from one page to another triggers the correct callbacks', function() {
  expect(3);

  Router.map(function() {
    this.route('home', { path: '/' });
    this.route('special', { path: '/specials/:menu_item_id' });
  });

  App.MenuItem = EmberObject.extend();

  App.SpecialRoute = Route.extend({
    setupController(controller, model) {
      set(controller, 'model', model);
    }
  });

  setTemplate('home', compile(
    '<h3>Home</h3>'
  ));

  setTemplate('special', compile(
    '<p>{{model.id}}</p>'
  ));

  bootApplication();

  registry.register('controller:special', Controller.extend());

  let transition = handleURL('/');

  run(() => {
    transition.then(function() {
      equal(jQuery('h3', '#qunit-fixture').text(), 'Home', 'The app is now in the initial state');

      let promiseContext = App.MenuItem.create({ id: 1 });
      run.later(() => RSVP.resolve(promiseContext), 1);

      return router.transitionTo('special', promiseContext);
    }).then(function(result) {
      deepEqual(router.location.path, '/specials/1');
      QUnit.start();
    });
  });
});

QUnit.asyncTest('Nested callbacks are not exited when moving to siblings', function() {
  Router.map(function() {
    this.route('root', { path: '/' }, function() {
      this.route('special', { path: '/specials/:menu_item_id', resetNamespace: true });
    });
  });

  App.RootRoute = Route.extend({
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

    serialize: function() {
      rootSerialize++;
      return this._super(...arguments);
    }
  });

  let currentPath;

  App.ApplicationController = Controller.extend({
    currentPathDidChange: observer('currentPath', function() {
      currentPath = get(this, 'currentPath');
    })
  });

  let menuItem;

  App.MenuItem = EmberObject.extend();
  App.MenuItem.reopenClass({
    find(id) {
      menuItem = App.MenuItem.create({ id: id });
      return menuItem;
    }
  });

  App.LoadingRoute = Route.extend({

  });

  App.HomeRoute = Route.extend({

  });

  App.SpecialRoute = Route.extend({
    setupController(controller, model) {
      set(controller, 'model', model);
    }
  });

  setTemplate('root/index', compile(
    '<h3>Home</h3>'
  ));

  setTemplate('special', compile(
    '<p>{{model.id}}</p>'
  ));

  setTemplate('loading', compile(
    '<p>LOADING!</p>'
  ));

  let rootSetup = 0;
  let rootRender = 0;
  let rootModel = 0;
  let rootSerialize = 0;

  bootApplication();

  registry.register('controller:special', Controller.extend());

  equal(jQuery('h3', '#qunit-fixture').text(), 'Home', 'The app is now in the initial state');
  equal(rootSetup, 1, 'The root setup was triggered');
  equal(rootRender, 1, 'The root render was triggered');
  equal(rootSerialize, 0, 'The root serialize was not called');
  equal(rootModel, 1, 'The root model was called');

  router = container.lookup('router:main');

  run(() => {
    let menuItem = App.MenuItem.create({ id: 1 });
    run.later(() => RSVP.resolve(menuItem), 1);

    router.transitionTo('special', menuItem).then(function(result) {
      equal(rootSetup, 1, 'The root setup was not triggered again');
      equal(rootRender, 1, 'The root render was not triggered again');
      equal(rootSerialize, 0, 'The root serialize was not called');

      // TODO: Should this be changed?
      equal(rootModel, 1, 'The root model was called again');

      deepEqual(router.location.path, '/specials/1');
      equal(currentPath, 'root.special');

      QUnit.start();
    });
  });
});

QUnit.asyncTest('Events are triggered on the controller if a matching action name is implemented', function() {
  Router.map(function() {
    this.route('home', { path: '/' });
  });

  let model = { name: 'Tom Dale' };
  let stateIsNotCalled = true;

  App.HomeRoute = Route.extend({
    model() {
      return model;
    },

    actions: {
      showStuff(obj) {
        stateIsNotCalled = false;
      }
    }
  });

  setTemplate('home', compile(
    '<a {{action \'showStuff\' model}}>{{name}}</a>'
  ));

  let controller = Controller.extend({
    actions: {
      showStuff(context) {
        ok(stateIsNotCalled, 'an event on the state is not triggered');
        deepEqual(context, { name: 'Tom Dale' }, 'an event with context is passed');
        QUnit.start();
      }
    }
  });

  registry.register('controller:home', controller);

  bootApplication();

  jQuery('#qunit-fixture a').click();
});

QUnit.asyncTest('Events are triggered on the current state when defined in `actions` object', function() {
  Router.map(function() {
    this.route('home', { path: '/' });
  });

  let model = { name: 'Tom Dale' };

  App.HomeRoute = Route.extend({
    model() {
      return model;
    },

    actions: {
      showStuff(obj) {
        ok(this instanceof App.HomeRoute, 'the handler is an App.HomeRoute');
        // Using Ember.copy removes any private Ember vars which older IE would be confused by
        deepEqual(copy(obj, true), { name: 'Tom Dale' }, 'the context is correct');
        QUnit.start();
      }
    }
  });

  setTemplate('home', compile(
    '<a {{action \'showStuff\' model}}>{{model.name}}</a>'
  ));

  bootApplication();

  jQuery('#qunit-fixture a').click();
});

QUnit.asyncTest('Events defined in `actions` object are triggered on the current state when routes are nested', function() {
  Router.map(function() {
    this.route('root', { path: '/' }, function() {
      this.route('index', { path: '/' });
    });
  });

  let model = { name: 'Tom Dale' };

  App.RootRoute = Route.extend({
    actions: {
      showStuff(obj) {
        ok(this instanceof App.RootRoute, 'the handler is an App.HomeRoute');
        // Using Ember.copy removes any private Ember vars which older IE would be confused by
        deepEqual(copy(obj, true), { name: 'Tom Dale' }, 'the context is correct');
        QUnit.start();
      }
    }
  });

  App.RootIndexRoute = Route.extend({
    model() {
      return model;
    }
  });

  setTemplate('root/index', compile(
    '<a {{action \'showStuff\' model}}>{{model.name}}</a>'
  ));

  bootApplication();

  jQuery('#qunit-fixture a').click();
});

QUnit.test('Events can be handled by inherited event handlers', function() {
  expect(4);

  App.SuperRoute = Route.extend({
    actions: {
      foo() {
        ok(true, 'foo');
      },
      bar(msg) {
        equal(msg, 'HELLO');
      }
    }
  });

  App.RouteMixin = Mixin.create({
    actions: {
      bar(msg) {
        equal(msg, 'HELLO');
        this._super(msg);
      }
    }
  });

  App.IndexRoute = App.SuperRoute.extend(App.RouteMixin, {
    actions: {
      baz() {
        ok(true, 'baz');
      }
    }
  });

  bootApplication();

  router.send('foo');
  router.send('bar', 'HELLO');
  router.send('baz');
});

QUnit.asyncTest('Actions are not triggered on the controller if a matching action name is implemented as a method', function() {
  Router.map(function() {
    this.route('home', { path: '/' });
  });

  let model = { name: 'Tom Dale' };
  let stateIsNotCalled = true;

  App.HomeRoute = Route.extend({
    model() {
      return model;
    },

    actions: {
      showStuff(context) {
        ok(stateIsNotCalled, 'an event on the state is not triggered');
        deepEqual(context, { name: 'Tom Dale' }, 'an event with context is passed');
        QUnit.start();
      }
    }
  });

  setTemplate('home', compile(
    '<a {{action \'showStuff\' model}}>{{name}}</a>'
  ));

  let controller = Controller.extend({
    showStuff(context) {
      stateIsNotCalled = false;
      ok(stateIsNotCalled, 'an event on the state is not triggered');
    }
  });

  registry.register('controller:home', controller);

  bootApplication();

  jQuery('#qunit-fixture a').click();
});

QUnit.asyncTest('actions can be triggered with multiple arguments', function() {
  Router.map(function() {
    this.route('root', { path: '/' }, function() {
      this.route('index', { path: '/' });
    });
  });

  let model1 = { name: 'Tilde' };
  let model2 = { name: 'Tom Dale' };

  App.RootRoute = Route.extend({
    actions: {
      showStuff(obj1, obj2) {
        ok(this instanceof App.RootRoute, 'the handler is an App.HomeRoute');
        // Using Ember.copy removes any private Ember vars which older IE would be confused by
        deepEqual(copy(obj1, true), { name: 'Tilde' }, 'the first context is correct');
        deepEqual(copy(obj2, true), { name: 'Tom Dale' }, 'the second context is correct');
        QUnit.start();
      }
    }
  });

  App.RootIndexController = Controller.extend({
    model1: model1,
    model2: model2
  });

  setTemplate('root/index', compile(
    '<a {{action \'showStuff\' model1 model2}}>{{model1.name}}</a>'
  ));

  bootApplication();

  jQuery('#qunit-fixture a').click();
});

QUnit.test('transitioning multiple times in a single run loop only sets the URL once', function() {
  Router.map(function() {
    this.route('root', { path: '/' });
    this.route('foo');
    this.route('bar');
  });

  bootApplication();

  let urlSetCount = 0;

  router.get('location').setURL = function(path) {
    urlSetCount++;
    set(this, 'path', path);
  };

  equal(urlSetCount, 0);

  run(function() {
    router.transitionTo('foo');
    router.transitionTo('bar');
  });

  equal(urlSetCount, 1);
  equal(router.get('location').getURL(), '/bar');
});

QUnit.test('navigating away triggers a url property change', function() {
  expect(3);

  Router.map(function() {
    this.route('root', { path: '/' });
    this.route('foo', { path: '/foo' });
    this.route('bar', { path: '/bar' });
  });

  bootApplication();

  run(() => {
    addObserver(router, 'url', function() {
      ok(true, 'url change event was fired');
    });
  });

  ['foo', 'bar', '/foo'].forEach(destination => run(router, 'transitionTo', destination));
});

QUnit.test('using replaceWith calls location.replaceURL if available', function() {
  let setCount = 0;
  let replaceCount = 0;

  Router.reopen({
    location: NoneLocation.create({
      setURL(path) {
        setCount++;
        set(this, 'path', path);
      },

      replaceURL(path) {
        replaceCount++;
        set(this, 'path', path);
      }
    })
  });

  Router.map(function() {
    this.route('root', { path: '/' });
    this.route('foo');
  });

  bootApplication();

  equal(setCount, 0);
  equal(replaceCount, 0);

  run(() => router.replaceWith('foo'));

  equal(setCount, 0, 'should not call setURL');
  equal(replaceCount, 1, 'should call replaceURL once');
  equal(router.get('location').getURL(), '/foo');
});

QUnit.test('using replaceWith calls setURL if location.replaceURL is not defined', function() {
  let setCount = 0;

  Router.reopen({
    location: NoneLocation.create({
      setURL(path) {
        setCount++;
        set(this, 'path', path);
      }
    })
  });

  Router.map(function() {
    this.route('root', { path: '/' });
    this.route('foo');
  });

  bootApplication();

  equal(setCount, 0);

  run(() => router.replaceWith('foo'));

  equal(setCount, 1, 'should call setURL once');
  equal(router.get('location').getURL(), '/foo');
});

QUnit.test('Route inherits model from parent route', function() {
  expect(9);

  Router.map(function() {
    this.route('the_post', { path: '/posts/:post_id' }, function() {
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
    3: post3
  };
  let shares = {
    1: share1,
    2: share2,
    3: share3
  };

  App.ThePostRoute = Route.extend({
    model(params) {
      return posts[params.post_id];
    }
  });

  App.ThePostCommentsRoute = Route.extend({
    afterModel(post, transition) {
      let parent_model = this.modelFor('thePost');

      equal(post, parent_model);
    }
  });

  App.SharesRoute = Route.extend({
    model(params) {
      return shares[params.share_id];
    }
  });

  App.SharesShareRoute = Route.extend({
    afterModel(share, transition) {
      let parent_model = this.modelFor('shares');

      equal(share, parent_model);
    }
  });

  bootApplication();

  handleURL('/posts/1/comments');
  handleURL('/posts/1/shares/1');

  handleURL('/posts/2/comments');
  handleURL('/posts/2/shares/2');

  handleURL('/posts/3/comments');
  handleURL('/posts/3/shares/3');
});

QUnit.test('Routes with { resetNamespace: true } inherits model from parent route', function() {
  expect(6);

  Router.map(function() {
    this.route('the_post', { path: '/posts/:post_id' }, function() {
      this.route('comments', { resetNamespace: true }, function() {
      });
    });
  });

  let post1 = {};
  let post2 = {};
  let post3 = {};

  let posts = {
    1: post1,
    2: post2,
    3: post3
  };

  App.ThePostRoute = Route.extend({
    model(params) {
      return posts[params.post_id];
    }
  });

  App.CommentsRoute = Route.extend({
    afterModel(post, transition) {
      let parent_model = this.modelFor('thePost');

      equal(post, parent_model);
    }
  });

  bootApplication();

  handleURL('/posts/1/comments');
  handleURL('/posts/2/comments');
  handleURL('/posts/3/comments');
});

QUnit.test('It is possible to get the model from a parent route', function() {
  expect(9);

  Router.map(function() {
    this.route('the_post', { path: '/posts/:post_id' }, function() {
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
    3: post3
  };

  App.ThePostRoute = Route.extend({
    model(params) {
      return posts[params.post_id];
    }
  });

  App.CommentsRoute = Route.extend({
    model() {
      // Allow both underscore / camelCase format.
      equal(this.modelFor('thePost'), currentPost);
      equal(this.modelFor('the_post'), currentPost);
    }
  });

  bootApplication();

  currentPost = post1;
  handleURL('/posts/1/comments');

  currentPost = post2;
  handleURL('/posts/2/comments');

  currentPost = post3;
  handleURL('/posts/3/comments');
});

QUnit.test('A redirection hook is provided', function() {
  Router.map(function() {
    this.route('choose', { path: '/' });
    this.route('home');
  });

  let chooseFollowed = 0;
  let destination;

  App.ChooseRoute = Route.extend({
    redirect() {
      if (destination) {
        this.transitionTo(destination);
      }
    },

    setupController() {
      chooseFollowed++;
    }
  });

  destination = 'home';

  bootApplication();

  equal(chooseFollowed, 0, 'The choose route wasn\'t entered since a transition occurred');
  equal(jQuery('h3:contains(Hours)', '#qunit-fixture').length, 1, 'The home template was rendered');
  equal(getOwner(router).lookup('controller:application').get('currentPath'), 'home');
});

QUnit.test('Redirecting from the middle of a route aborts the remainder of the routes', function() {
  expect(3);

  Router.map(function() {
    this.route('home');
    this.route('foo', function() {
      this.route('bar', { resetNamespace: true }, function() {
        this.route('baz');
      });
    });
  });

  App.BarRoute = Route.extend({
    redirect() {
      this.transitionTo('home');
    },
    setupController() {
      ok(false, 'Should transition before setupController');
    }
  });

  App.BarBazRoute = Route.extend({
    enter() {
      ok(false, 'Should abort transition getting to next route');
    }
  });

  bootApplication();

  handleURLAborts('/foo/bar/baz');

  equal(getOwner(router).lookup('controller:application').get('currentPath'), 'home');
  equal(router.get('location').getURL(), '/home');
});

QUnit.test('Redirecting to the current target in the middle of a route does not abort initial routing', function() {
  expect(5);

  Router.map(function() {
    this.route('home');
    this.route('foo', function() {
      this.route('bar', { resetNamespace: true }, function() {
        this.route('baz');
      });
    });
  });

  let successCount = 0;
  App.BarRoute = Route.extend({
    redirect() {
      this.transitionTo('bar.baz').then(function() {
        successCount++;
      });
    },

    setupController() {
      ok(true, 'Should still invoke bar\'s setupController');
    }
  });

  App.BarBazRoute = Route.extend({
    setupController() {
      ok(true, 'Should still invoke bar.baz\'s setupController');
    }
  });

  bootApplication();

  handleURL('/foo/bar/baz');

  equal(getOwner(router).lookup('controller:application').get('currentPath'), 'foo.bar.baz');
  equal(successCount, 1, 'transitionTo success handler was called once');
});

QUnit.test('Redirecting to the current target with a different context aborts the remainder of the routes', function() {
  expect(4);

  Router.map(function() {
    this.route('home');
    this.route('foo', function() {
      this.route('bar', { path: 'bar/:id', resetNamespace: true }, function() {
        this.route('baz');
      });
    });
  });

  let model = { id: 2 };

  let count = 0;

  App.BarRoute = Route.extend({
    afterModel(context) {
      if (count++ > 10) {
        ok(false, 'infinite loop');
      } else {
        this.transitionTo('bar.baz', model);
      }
    }
  });

  App.BarBazRoute = Route.extend({
    setupController() {
      ok(true, 'Should still invoke setupController');
    }
  });

  bootApplication();

  handleURLAborts('/foo/bar/1/baz');

  equal(getOwner(router).lookup('controller:application').get('currentPath'), 'foo.bar.baz');
  equal(router.get('location').getURL(), '/foo/bar/2/baz');
});

QUnit.test('Transitioning from a parent event does not prevent currentPath from being set', function() {
  Router.map(function() {
    this.route('foo', function() {
      this.route('bar', { resetNamespace: true }, function() {
        this.route('baz');
      });
      this.route('qux');
    });
  });

  App.FooRoute = Route.extend({
    actions: {
      goToQux() {
        this.transitionTo('foo.qux');
      }
    }
  });

  bootApplication();

  let applicationController = getOwner(router).lookup('controller:application');

  handleURL('/foo/bar/baz');

  equal(applicationController.get('currentPath'), 'foo.bar.baz');

  run(() => router.send('goToQux'));

  equal(applicationController.get('currentPath'), 'foo.qux');
  equal(router.get('location').getURL(), '/foo/qux');
});

QUnit.test('Generated names can be customized when providing routes with dot notation', function() {
  expect(4);

  setTemplate('index', compile('<div>Index</div>'));
  setTemplate('application', compile('<h1>Home</h1><div class=\'main\'>{{outlet}}</div>'));
  setTemplate('foo', compile('<div class=\'middle\'>{{outlet}}</div>'));
  setTemplate('bar', compile('<div class=\'bottom\'>{{outlet}}</div>'));
  setTemplate('bar/baz', compile('<p>{{name}}Bottom!</p>'));

  Router.map(function() {
    this.route('foo', { path: '/top' }, function() {
      this.route('bar', { path: '/middle', resetNamespace: true }, function() {
        this.route('baz', { path: '/bottom' });
      });
    });
  });

  App.FooRoute = Route.extend({
    renderTemplate() {
      ok(true, 'FooBarRoute was called');
      return this._super(...arguments);
    }
  });

  App.BarBazRoute = Route.extend({
    renderTemplate() {
      ok(true, 'BarBazRoute was called');
      return this._super(...arguments);
    }
  });

  App.BarController = Controller.extend({
    name: 'Bar'
  });

  App.BarBazController = Controller.extend({
    name: 'BarBaz'
  });

  bootApplication();

  handleURL('/top/middle/bottom');

  equal(jQuery('.main .middle .bottom p', '#qunit-fixture').text(), 'BarBazBottom!', 'The templates were rendered into their appropriate parents');
});

QUnit.test('Child routes render into their parent route\'s template by default', function() {
  setTemplate('index', compile('<div>Index</div>'));
  setTemplate('application', compile('<h1>Home</h1><div class=\'main\'>{{outlet}}</div>'));
  setTemplate('top', compile('<div class=\'middle\'>{{outlet}}</div>'));
  setTemplate('middle', compile('<div class=\'bottom\'>{{outlet}}</div>'));
  setTemplate('middle/bottom', compile('<p>Bottom!</p>'));

  Router.map(function() {
    this.route('top', function() {
      this.route('middle', { resetNamespace: true }, function() {
        this.route('bottom');
      });
    });
  });

  bootApplication();

  handleURL('/top/middle/bottom');

  equal(jQuery('.main .middle .bottom p', '#qunit-fixture').text(), 'Bottom!', 'The templates were rendered into their appropriate parents');
});

QUnit.test('Child routes render into specified template', function() {
  setTemplate('index', compile('<div>Index</div>'));
  setTemplate('application', compile('<h1>Home</h1><div class=\'main\'>{{outlet}}</div>'));
  setTemplate('top', compile('<div class=\'middle\'>{{outlet}}</div>'));
  setTemplate('middle', compile('<div class=\'bottom\'>{{outlet}}</div>'));
  setTemplate('middle/bottom', compile('<p>Bottom!</p>'));

  Router.map(function() {
    this.route('top', function() {
      this.route('middle', { resetNamespace: true }, function() {
        this.route('bottom');
      });
    });
  });

  App.MiddleBottomRoute = Route.extend({
    renderTemplate() {
      this.render('middle/bottom', { into: 'top' });
    }
  });

  bootApplication();

  handleURL('/top/middle/bottom');

  equal(jQuery('.main .middle .bottom p', '#qunit-fixture').length, 0, 'should not render into the middle template');
  equal(jQuery('.main .middle > p', '#qunit-fixture').text(), 'Bottom!', 'The template was rendered into the top template');
});

QUnit.test('Rendering into specified template with slash notation', function() {
  setTemplate('person/profile', compile('profile {{outlet}}'));
  setTemplate('person/details', compile('details!'));

  Router.map(function() {
    this.route('home', { path: '/' });
  });

  App.HomeRoute = Route.extend({
    renderTemplate() {
      this.render('person/profile');
      this.render('person/details', { into: 'person/profile' });
    }
  });

  bootApplication();

  equal(jQuery('#qunit-fixture:contains(profile details!)').length, 1, 'The templates were rendered');
});

QUnit.test('Parent route context change', function() {
  let editCount = 0;
  let editedPostIds = emberA();

  setTemplate('application', compile('{{outlet}}'));
  setTemplate('posts', compile('{{outlet}}'));
  setTemplate('post', compile('{{outlet}}'));
  setTemplate('post/index', compile('showing'));
  setTemplate('post/edit', compile('editing'));

  Router.map(function() {
    this.route('posts', function() {
      this.route('post', { path: '/:postId', resetNamespace: true }, function() {
        this.route('edit');
      });
    });
  });

  App.PostsRoute = Route.extend({
    actions: {
      showPost(context) {
        this.transitionTo('post', context);
      }
    }
  });

  App.PostRoute = Route.extend({
    model(params) {
      return { id: params.postId };
    },

    serialize(model) {
      return { postId: model.id };
    },

    actions: {
      editPost(context) {
        this.transitionTo('post.edit');
      }
    }
  });

  App.PostEditRoute = Route.extend({
    model(params) {
      let postId = this.modelFor('post').id;
      editedPostIds.push(postId);
      return null;
    },
    setup() {
      this._super(...arguments);
      editCount++;
    }
  });

  bootApplication();

  handleURL('/posts/1');

  run(() => router.send('editPost'));
  run(() => router.send('showPost', { id: '2' }));
  run(() => router.send('editPost'));

  equal(editCount, 2, 'set up the edit route twice without failure');
  deepEqual(editedPostIds, ['1', '2'], 'modelFor posts.post returns the right context');
});

QUnit.test('Router accounts for rootURL on page load when using history location', function() {
  let rootURL = window.location.pathname + '/app';
  let postsTemplateRendered = false;
  let setHistory, HistoryTestLocation;

  setHistory = function(obj, path) {
    obj.set('history', { state: { path: path } });
  };

  // Create new implementation that extends HistoryLocation
  // and set current location to rootURL + '/posts'
  HistoryTestLocation = HistoryLocation.extend({
    initState() {
      let path = rootURL + '/posts';

      setHistory(this, path);
      this.set('location', {
        pathname: path,
        href: 'http://localhost/' + path
      });
    },

    replaceState(path) {
      setHistory(this, path);
    },

    pushState(path) {
      setHistory(this, path);
    }
  });


  registry.register('location:historyTest', HistoryTestLocation);

  Router.reopen({
    location: 'historyTest',
    rootURL: rootURL
  });

  Router.map(function() {
    this.route('posts', { path: '/posts' });
  });

  App.PostsRoute = Route.extend({
    model() {},
    renderTemplate() {
      postsTemplateRendered = true;
    }
  });

  bootApplication();

  ok(postsTemplateRendered, 'Posts route successfully stripped from rootURL');
});

QUnit.test('The rootURL is passed properly to the location implementation', function() {
  expect(1);
  let rootURL = '/blahzorz';
  let HistoryTestLocation;

  HistoryTestLocation = HistoryLocation.extend({
    rootURL: 'this is not the URL you are looking for',
    initState() {
      equal(this.get('rootURL'), rootURL);
    }
  });

  registry.register('location:history-test', HistoryTestLocation);

  Router.reopen({
    location: 'history-test',
    rootURL: rootURL,
    // if we transition in this test we will receive failures
    // if the tests are run from a static file
    _doURLTransition() { }
  });

  bootApplication();
});


QUnit.test('Only use route rendered into main outlet for default into property on child', function() {
  setTemplate('application', compile('{{outlet \'menu\'}}{{outlet}}'));
  setTemplate('posts', compile('{{outlet}}'));
  setTemplate('posts/index', compile('<p class="posts-index">postsIndex</p>'));
  setTemplate('posts/menu', compile('<div class="posts-menu">postsMenu</div>'));

  Router.map(function() {
    this.route('posts', function() {});
  });

  App.PostsRoute = Route.extend({
    renderTemplate() {
      this.render();
      this.render('posts/menu', {
        into: 'application',
        outlet: 'menu'
      });
    }
  });

  bootApplication();

  handleURL('/posts');

  equal(jQuery('div.posts-menu:contains(postsMenu)', '#qunit-fixture').length, 1, 'The posts/menu template was rendered');
  equal(jQuery('p.posts-index:contains(postsIndex)', '#qunit-fixture').length, 1, 'The posts/index template was rendered');
});

QUnit.test('Generating a URL should not affect currentModel', function() {
  Router.map(function() {
    this.route('post', { path: '/posts/:post_id' });
  });

  let posts = {
    1: { id: 1 },
    2: { id: 2 }
  };

  App.PostRoute = Route.extend({
    model(params) {
      return posts[params.post_id];
    }
  });

  bootApplication();

  handleURL('/posts/1');

  let route = container.lookup('route:post');
  equal(route.modelFor('post'), posts[1]);

  let url = router.generate('post', posts[2]);
  equal(url, '/posts/2');

  equal(route.modelFor('post'), posts[1]);
});


QUnit.test('Generated route should be an instance of App.Route if provided', function() {
  let generatedRoute;

  Router.map(function() {
    this.route('posts');
  });

  App.Route = Route.extend();

  bootApplication();

  handleURL('/posts');

  generatedRoute = container.lookup('route:posts');

  ok(generatedRoute instanceof App.Route, 'should extend the correct route');
});

QUnit.test('Nested index route is not overriden by parent\'s implicit index route', function() {
  Router.map(function() {
    this.route('posts', function() {
      this.route('index', { path: ':category' });
    });
  });

  bootApplication();

  run(() => router.transitionTo('posts', { category: 'emberjs' }));

  deepEqual(router.location.path, '/posts/emberjs');
});

QUnit.test('Application template does not duplicate when re-rendered', function() {
  setTemplate('application', compile('<h3>I Render Once</h3>{{outlet}}'));

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
  handleURL('/posts');

  equal(jQuery('h3:contains(I Render Once)').length, 1);
});

QUnit.test('Child routes should render inside the application template if the application template causes a redirect', function() {
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

  equal(jQuery('#qunit-fixture > div').text(), 'App posts');
});

QUnit.test('The template is not re-rendered when the route\'s context changes', function() {
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

  handleURL('/page/first');

  equal(jQuery('p', '#qunit-fixture').text(), 'first');
  equal(insertionCount, 1);

  handleURL('/page/second');

  equal(jQuery('p', '#qunit-fixture').text(), 'second');
  equal(insertionCount, 1, 'view should have inserted only once');

  run(() => router.transitionTo('page', EmberObject.create({ name: 'third' })));

  equal(jQuery('p', '#qunit-fixture').text(), 'third');
  equal(insertionCount, 1, 'view should still have inserted only once');
});

QUnit.test('The template is not re-rendered when two routes present the exact same template & controller', function() {
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
    setupController(controller) {
      this.controllerFor('shared').set('message', 'This is the ' + this.routeName + ' message');
    },

    renderTemplate(controller, context) {
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

  handleURL('/first');

  equal(jQuery('p', '#qunit-fixture').text(), 'This is the first message');
  equal(insertionCount, 1, 'expected one assertion');

  // Transition by URL
  handleURL('/second');

  equal(jQuery('p', '#qunit-fixture').text(), 'This is the second message');
  equal(insertionCount, 1, 'expected one assertion');

  // Then transition directly by route name
  run(() => {
    router.transitionTo('third').then(function(value) {
      ok(true, 'expected transition');
    }, function(reason) {
      ok(false, 'unexpected transition failure: ', QUnit.jsDump.parse(reason));
    });
  });

  equal(jQuery('p', '#qunit-fixture').text(), 'This is the third message');
  equal(insertionCount, 1, 'expected one assertion');

  // Lastly transition to a different view, with the same controller and template
  handleURL('/fourth');
  equal(insertionCount, 1, 'expected one assertion');

  equal(jQuery('p', '#qunit-fixture').text(), 'This is the fourth message');
});

QUnit.test('ApplicationRoute with model does not proxy the currentPath', function() {
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

  equal(currentPath, 'index', 'currentPath is index');
  equal('currentPath' in model, false, 'should have defined currentPath on controller');
});

QUnit.test('Promises encountered on app load put app into loading state until resolved', function() {
  expect(2);

  let deferred = RSVP.defer();

  App.IndexRoute = Route.extend({
    model() {
      return deferred.promise;
    }
  });

  setTemplate('index', compile('<p>INDEX</p>'));
  setTemplate('loading', compile('<p>LOADING</p>'));

  bootApplication();

  equal(jQuery('p', '#qunit-fixture').text(), 'LOADING', 'The loading state is displaying.');
  run(deferred.resolve);
  equal(jQuery('p', '#qunit-fixture').text(), 'INDEX', 'The index route is display.');
});

QUnit.test('Route should tear down multiple outlets', function() {
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

  handleURL('/posts');

  equal(jQuery('div.posts-menu:contains(postsMenu)', '#qunit-fixture').length, 1, 'The posts/menu template was rendered');
  equal(jQuery('p.posts-index:contains(postsIndex)', '#qunit-fixture').length, 1, 'The posts/index template was rendered');
  equal(jQuery('div.posts-footer:contains(postsFooter)', '#qunit-fixture').length, 1, 'The posts/footer template was rendered');

  handleURL('/users');

  equal(jQuery('div.posts-menu:contains(postsMenu)', '#qunit-fixture').length, 0, 'The posts/menu template was removed');
  equal(jQuery('p.posts-index:contains(postsIndex)', '#qunit-fixture').length, 0, 'The posts/index template was removed');
  equal(jQuery('div.posts-footer:contains(postsFooter)', '#qunit-fixture').length, 0, 'The posts/footer template was removed');
});


QUnit.test('Route will assert if you try to explicitly render {into: ...} a missing template', function () {
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

QUnit.test('Route supports clearing outlet explicitly', function() {
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

  handleURL('/posts');

  equal(jQuery('div.posts-index:contains(postsIndex)', '#qunit-fixture').length, 1, 'The posts/index template was rendered');

  run(() => router.send('showModal'));

  equal(jQuery('div.posts-modal:contains(postsModal)', '#qunit-fixture').length, 1, 'The posts/modal template was rendered');

  run(() => router.send('showExtra'));

  equal(jQuery('div.posts-extra:contains(postsExtra)', '#qunit-fixture').length, 1, 'The posts/extra template was rendered');

  run(() => router.send('hideModal'));

  equal(jQuery('div.posts-modal:contains(postsModal)', '#qunit-fixture').length, 0, 'The posts/modal template was removed');

  run(() => router.send('hideExtra'));

  equal(jQuery('div.posts-extra:contains(postsExtra)', '#qunit-fixture').length, 0, 'The posts/extra template was removed');
  run(function() {
    router.send('showModal');
  });
  equal(jQuery('div.posts-modal:contains(postsModal)', '#qunit-fixture').length, 1, 'The posts/modal template was rendered');
  run(function() {
    router.send('showExtra');
  });
  equal(jQuery('div.posts-extra:contains(postsExtra)', '#qunit-fixture').length, 1, 'The posts/extra template was rendered');

  handleURL('/users');

  equal(jQuery('div.posts-index:contains(postsIndex)', '#qunit-fixture').length, 0, 'The posts/index template was removed');
  equal(jQuery('div.posts-modal:contains(postsModal)', '#qunit-fixture').length, 0, 'The posts/modal template was removed');
  equal(jQuery('div.posts-extra:contains(postsExtra)', '#qunit-fixture').length, 0, 'The posts/extra template was removed');
});

QUnit.test('Route supports clearing outlet using string parameter', function() {
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

  handleURL('/posts');

  equal(jQuery('div.posts-index:contains(postsIndex)', '#qunit-fixture').length, 1, 'The posts/index template was rendered');

  run(() => router.send('showModal'));

  equal(jQuery('div.posts-modal:contains(postsModal)', '#qunit-fixture').length, 1, 'The posts/modal template was rendered');

  run(() => router.send('hideModal'));

  equal(jQuery('div.posts-modal:contains(postsModal)', '#qunit-fixture').length, 0, 'The posts/modal template was removed');

  handleURL('/users');

  equal(jQuery('div.posts-index:contains(postsIndex)', '#qunit-fixture').length, 0, 'The posts/index template was removed');
  equal(jQuery('div.posts-modal:contains(postsModal)', '#qunit-fixture').length, 0, 'The posts/modal template was removed');
});

QUnit.test('Route silently fails when cleaning an outlet from an inactive view', function() {
  expect(1); // handleURL

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

  handleURL('/posts');

  run(() => router.send('showModal'));
  run(() => router.send('hideSelf'));
  run(() => router.send('hideModal'));
});

QUnit.test('Router `willTransition` hook passes in cancellable transition', function() {
  // Should hit willTransition 3 times, once for the initial route, and then 2 more times
  // for the two handleURL calls below
  expect(3);

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
      ok(true, 'willTransition was called ' + url);
      transition.abort();
    }
  });

  App.LoadingRoute = Route.extend({
    activate() {
      ok(false, 'LoadingRoute was not entered');
    }
  });

  App.NorkRoute = Route.extend({
    activate() {
      ok(false, 'NorkRoute was not entered');
    }
  });

  App.AboutRoute = Route.extend({
    activate() {
      ok(false, 'AboutRoute was not entered');
    }
  });

  bootApplication();

  // Attempted transitions out of index should abort.
  run(router, 'handleURL', '/nork');
  run(router, 'handleURL', '/about');
});

QUnit.test('Aborting/redirecting the transition in `willTransition` prevents LoadingRoute from being entered', function() {
  expect(8);

  Router.map(function() {
    this.route('nork');
    this.route('about');
  });

  let redirect = false;

  App.IndexRoute = Route.extend({
    actions: {
      willTransition(transition) {
        ok(true, 'willTransition was called');
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
      ok(deferred, 'LoadingRoute should be entered at this time');
    },
    deactivate() {
      ok(true, 'LoadingRoute was exited');
    }
  });

  App.NorkRoute = Route.extend({
    activate() {
      ok(true, 'NorkRoute was entered');
    }
  });

  App.AboutRoute = Route.extend({
    activate() {
      ok(true, 'AboutRoute was entered');
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

QUnit.test('Conditionally pausing a route transition, only one `link-to` components will receive an `.active` state when the transition is `.retry()`ed', function() {
  expect(3);

  setTemplate('application', compile('\
    {{#link-to "thread" 1 class="one"}} One {{/link-to}}\
    {{#link-to "thread" 2 class="two"}} Two {{/link-to}}\
    {{#link-to "thread" 3 class="three"}} Three {{/link-to}}\
    {{outlet}}'
  ));

  Router.reopen({
    location: 'none',
    rootURL: '/'
  });

  Router.map(function() {
    this.route('thread', { path: '/:id' });
  });

  App.IndexRoute = Route.extend({
    actions: {
      willTransition(transition) {
        this._super(...arguments);

        // If the user wants to transition, reset and return
        if (this.continueTransition) {
          // reset users selection
          this.continueTransition = false;
          return false;
        }

        transition.abort();

        var previousTransition = this.getWithDefault('previousTransition', transition);
        this.set('previousTransition', previousTransition);

        this.continueTransition = true;
        previousTransition.retry();
      }
    }
  });

  bootApplication();

  var appController = getOwner(router).lookup('controller:application');

  run(router, 'transitionTo', 'index');
  equal(appController.get('currentPath'), 'index');

  run(router, 'transitionTo', 'thread', 2);

  run(() => {
    // Only one link-to should have the active class
    equal(jQuery('.one.active').length, 0);
    equal(jQuery('.two.active').length, 1);
    equal(jQuery('.three.active').length, 0);
  });

});

QUnit.test('`didTransition` event fires on the router', function() {
  expect(3);

  Router.map(function() {
    this.route('nork');
  });

  router = container.lookup('router:main');

  router.one('didTransition', function() {
    ok(true, 'didTransition fired on initial routing');
  });

  bootApplication();

  router.one('didTransition', function() {
    ok(true, 'didTransition fired on the router');
    equal(router.get('url'), '/nork', 'The url property is updated by the time didTransition fires');
  });

  run(router, 'transitionTo', 'nork');
});
QUnit.test('`didTransition` can be reopened', function() {
  expect(1);

  Router.map(function() {
    this.route('nork');
  });

  Router.reopen({
    didTransition() {
      this._super(...arguments);
      ok(true, 'reopened didTransition was called');
    }
  });

  bootApplication();
});

QUnit.test('`activate` event fires on the route', function() {
  expect(2);

  let eventFired = 0;

  Router.map(function() {
    this.route('nork');
  });

  App.NorkRoute = Route.extend({
    init() {
      this._super(...arguments);

      this.on('activate', function() {
        equal(++eventFired, 1, 'activate event is fired once');
      });
    },

    activate() {
      ok(true, 'activate hook is called');
    }
  });

  bootApplication();

  run(router, 'transitionTo', 'nork');
});

QUnit.test('`deactivate` event fires on the route', function() {
  expect(2);

  let eventFired = 0;

  Router.map(function() {
    this.route('nork');
    this.route('dork');
  });

  App.NorkRoute = Route.extend({
    init() {
      this._super(...arguments);

      this.on('deactivate', function() {
        equal(++eventFired, 1, 'deactivate event is fired once');
      });
    },

    deactivate() {
      ok(true, 'deactivate hook is called');
    }
  });

  bootApplication();

  run(router, 'transitionTo', 'nork');
  run(router, 'transitionTo', 'dork');
});

QUnit.test('Actions can be handled by inherited action handlers', function() {
  expect(4);

  App.SuperRoute = Route.extend({
    actions: {
      foo() {
        ok(true, 'foo');
      },
      bar(msg) {
        equal(msg, 'HELLO');
      }
    }
  });

  App.RouteMixin = Mixin.create({
    actions: {
      bar(msg) {
        equal(msg, 'HELLO');
        this._super(msg);
      }
    }
  });

  App.IndexRoute = App.SuperRoute.extend(App.RouteMixin, {
    actions: {
      baz() {
        ok(true, 'baz');
      }
    }
  });

  bootApplication();

  router.send('foo');
  router.send('bar', 'HELLO');
  router.send('baz');
});

QUnit.test('transitionTo returns Transition when passed a route name', function() {
  expect(1);
  Router.map(function() {
    this.route('root', { path: '/' });
    this.route('bar');
  });

  bootApplication();

  let transition = run(() => router.transitionTo('bar'));

  equal(transition instanceof Transition, true);
});

QUnit.test('transitionTo returns Transition when passed a url', function() {
  expect(1);
  Router.map(function() {
    this.route('root', { path: '/' });
    this.route('bar', function() {
      this.route('baz');
    });
  });

  bootApplication();

  let transition = run(() => router.transitionTo('/bar/baz'));

  equal(transition instanceof Transition, true);
});

QUnit.test('currentRouteName is a property installed on ApplicationController that can be used in transitionTo', function() {
  expect(24);

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
    equal(appController.get('currentPath'), expectedPath);
    equal(appController.get('currentRouteName'), expectedRouteName);
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

QUnit.test('Route model hook finds the same model as a manual find', function() {
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

  handleURL('/post/1');

  equal(App.Post, Post);
});

QUnit.test('Routes can refresh themselves causing their model hooks to be re-run', function() {
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
      equal(params.parent_id, '123');
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

  equal(appcount, 1);
  equal(parentcount, 0);
  equal(childcount, 0);

  run(router, 'transitionTo', 'parent.child', '123');

  equal(appcount, 1);
  equal(parentcount, 1);
  equal(childcount, 1);

  run(router, 'send', 'refreshParent');

  equal(appcount, 1);
  equal(parentcount, 2);
  equal(childcount, 2);
});

QUnit.test('Specifying non-existent controller name in route#render throws', function() {
  expect(1);

  Router.map(function() {
    this.route('home', { path: '/' });
  });

  App.HomeRoute = Route.extend({
    renderTemplate() {
      try {
        this.render('homepage', { controller: 'stefanpenneristhemanforme' });
      } catch (e) {
        equal(e.message, 'You passed `controller: \'stefanpenneristhemanforme\'` into the `render` method, but no such controller could be found.');
      }
    }
  });

  bootApplication();
});

QUnit.test('Redirecting with null model doesn\'t error out', function() {
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

  equal(router.get('location.path'), '/about/TreeklesMcGeekles');
});

QUnit.test('rejecting the model hooks promise with a non-error prints the `message` property', function() {
  expect(5);

  let rejectedMessage = 'OMG!! SOOOOOO BAD!!!!';
  let rejectedStack   = 'Yeah, buddy: stack gets printed too.';

  Router.map(function() {
    this.route('yippie', { path: '/' });
  });

  Logger.error = function(initialMessage, errorMessage, errorStack) {
    equal(initialMessage, 'Error while processing route: yippie', 'a message with the current route name is printed');
    equal(errorMessage, rejectedMessage, 'the rejected reason\'s message property is logged');
    equal(errorStack, rejectedStack, 'the rejected reason\'s stack property is logged');
  };

  App.YippieRoute = Route.extend({
    model() {
      return RSVP.reject({ message: rejectedMessage, stack: rejectedStack });
    }
  });

  throws(function() {
    bootApplication();
  }, function(err) {
    equal(err.message, rejectedMessage);
    return true;
  }, 'expected an exception');
});

QUnit.test('rejecting the model hooks promise with an error with `errorThrown` property prints `errorThrown.message` property', function() {
  expect(5);
  let rejectedMessage = 'OMG!! SOOOOOO BAD!!!!';
  let rejectedStack   = 'Yeah, buddy: stack gets printed too.';

  Router.map(function() {
    this.route('yippie', { path: '/' });
  });

  Logger.error = function(initialMessage, errorMessage, errorStack) {
    equal(initialMessage, 'Error while processing route: yippie', 'a message with the current route name is printed');
    equal(errorMessage, rejectedMessage, 'the rejected reason\'s message property is logged');
    equal(errorStack, rejectedStack, 'the rejected reason\'s stack property is logged');
  };

  App.YippieRoute = Route.extend({
    model() {
      return RSVP.reject({
        errorThrown: { message: rejectedMessage, stack: rejectedStack }
      });
    }
  });

  throws(() => bootApplication(), function(err) {
    equal(err.message, rejectedMessage);
    return true;
  }, 'expected an exception');
});

QUnit.test('rejecting the model hooks promise with no reason still logs error', function() {
  Router.map(function() {
    this.route('wowzers', { path: '/' });
  });

  Logger.error = function(initialMessage) {
    equal(initialMessage, 'Error while processing route: wowzers', 'a message with the current route name is printed');
  };

  App.WowzersRoute = Route.extend({
    model() {
      return RSVP.reject();
    }
  });

  bootApplication();
});

QUnit.test('rejecting the model hooks promise with a string shows a good error', function() {
  expect(3);
  let originalLoggerError = Logger.error;
  let rejectedMessage = 'Supercalifragilisticexpialidocious';

  Router.map(function() {
    this.route('yondo', { path: '/' });
  });

  Logger.error = function(initialMessage, errorMessage) {
    equal(initialMessage, 'Error while processing route: yondo', 'a message with the current route name is printed');
    equal(errorMessage, rejectedMessage, 'the rejected reason\'s message property is logged');
  };

  App.YondoRoute = Route.extend({
    model() {
      return RSVP.reject(rejectedMessage);
    }
  });

  throws(() => bootApplication(), rejectedMessage, 'expected an exception');

  Logger.error = originalLoggerError;
});

QUnit.test('willLeave, willChangeContext, willChangeModel actions don\'t fire unless feature flag enabled', function() {
  expect(1);

  App.Router.map(function() {
    this.route('about');
  });

  function shouldNotFire() {
    ok(false, 'this action shouldn\'t have been received');
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
      ok(true, 'about route was entered');
    }
  });

  bootApplication();
  run(router, 'transitionTo', 'about');
});

QUnit.test('Errors in transitionTo within redirect hook are logged', function() {
  expect(4);
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

  throws(() => bootApplication(), /More context objects were passed/);

  equal(actual.length, 1, 'the error is only logged once');
  equal(actual[0][0], 'Error while processing route: yondo', 'source route is printed');
  ok(actual[0][1].match(/More context objects were passed than there are dynamic segments for the route: stink-bomb/), 'the error is printed');
});

QUnit.test('Errors in transition show error template if available', function() {
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

  throws(() => bootApplication(), /More context objects were passed/);

  equal(jQuery('#error').length, 1, 'Error template was rendered.');
});

QUnit.test('Route#resetController gets fired when changing models and exiting routes', function() {
  expect(4);

  Router.map(function() {
    this.route('a', function() {
      this.route('b', { path: '/b/:id', resetNamespace: true }, function() { });
      this.route('c', { path: '/c/:id', resetNamespace: true }, function() { });
    });
    this.route('out');
  });

  let calls = [];

  let SpyRoute = Route.extend({
    setupController(controller, model, transition) {
      calls.push(['setup', this.routeName]);
    },

    resetController(controller) {
      calls.push(['reset', this.routeName]);
    }
  });

  App.ARoute = SpyRoute.extend();
  App.BRoute = SpyRoute.extend();
  App.CRoute = SpyRoute.extend();
  App.OutRoute = SpyRoute.extend();

  bootApplication();
  deepEqual(calls, []);

  run(router, 'transitionTo', 'b', 'b-1');
  deepEqual(calls, [['setup', 'a'], ['setup', 'b']]);
  calls.length = 0;

  run(router, 'transitionTo', 'c', 'c-1');
  deepEqual(calls, [['reset', 'b'], ['setup', 'c']]);
  calls.length = 0;

  run(router, 'transitionTo', 'out');
  deepEqual(calls, [['reset', 'c'], ['reset', 'a'], ['setup', 'out']]);
});

QUnit.test('Exception during initialization of non-initial route is not swallowed', function() {
  Router.map(function() {
    this.route('boom');
  });
  App.BoomRoute = Route.extend({
    init() {
      throw new Error('boom!');
    }
  });
  bootApplication();
  throws(() => run(router, 'transitionTo', 'boom'), /\bboom\b/);
});


QUnit.test('Exception during load of non-initial route is not swallowed', function() {
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
  throws(() => run(router, 'transitionTo', 'boom'));
});

QUnit.test('Exception during initialization of initial route is not swallowed', function() {
  Router.map(function() {
    this.route('boom', { path: '/' });
  });
  App.BoomRoute = Route.extend({
    init() {
      throw new Error('boom!');
    }
  });
  throws(() => bootApplication(), /\bboom\b/);
});

QUnit.test('Exception during load of initial route is not swallowed', function() {
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
  throws(() => bootApplication(), /\bboom\b/);
});

QUnit.test('{{outlet}} works when created after initial render', function() {
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

  equal(jQuery('#qunit-fixture').text(), 'HiBye', 'initial render');

  run(() => container.lookup('controller:sample').set('showTheThing', true));

  equal(jQuery('#qunit-fixture').text(), 'HiYayBye', 'second render');

  handleURL('/2');

  equal(jQuery('#qunit-fixture').text(), 'HiBooBye', 'third render');
});

QUnit.test('Can render into a named outlet at the top level', function() {
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

  equal(jQuery('#qunit-fixture').text(), 'A-The index-B-Hello world-C', 'initial render');
});

QUnit.test('Can disconnect a named outlet at the top level', function() {
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

  equal(jQuery('#qunit-fixture').text(), 'A-The index-B-Hello world-C', 'initial render');

  run(router, 'send', 'banish');

  equal(jQuery('#qunit-fixture').text(), 'A-The index-B--C', 'second render');
});

QUnit.test('Can render into a named outlet at the top level, with empty main outlet', function() {
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

  equal(jQuery('#qunit-fixture').text(), 'A--B-Hello world-C', 'initial render');
});


QUnit.test('Can render into a named outlet at the top level, later', function() {
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

  equal(jQuery('#qunit-fixture').text(), 'A-The index-B--C', 'initial render');

  run(router, 'send', 'launch');

  equal(jQuery('#qunit-fixture').text(), 'A-The index-B-Hello world-C', 'second render');
});

QUnit.test('Can render routes with no \'main\' outlet and their children', function() {
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
  handleURL('/app');
  equal(jQuery('#app-common #common').length, 1, 'Finds common while viewing /app');
  handleURL('/app/sub');
  equal(jQuery('#app-common #common').length, 1, 'Finds common while viewing /app/sub');
  equal(jQuery('#app-sub #sub').length, 1, 'Finds sub while viewing /app/sub');
});

QUnit.test('Tolerates stacked renders', function() {
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
  equal(trim(jQuery('#qunit-fixture').text()), 'hi');
  run(router, 'send', 'openLayer');
  equal(trim(jQuery('#qunit-fixture').text()), 'hilayer');
  run(router, 'send', 'openLayer');
  equal(trim(jQuery('#qunit-fixture').text()), 'hilayer');
  run(router, 'send', 'close');
  equal(trim(jQuery('#qunit-fixture').text()), 'hi');
});

QUnit.test('Renders child into parent with non-default template name', function() {
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
  handleURL('/root');
  equal(jQuery('#qunit-fixture .a .b .c').length, 1);
});

QUnit.test('Allows any route to disconnectOutlet another route\'s templates', function() {
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
  equal(trim(jQuery('#qunit-fixture').text()), 'hi');
  run(router, 'send', 'openLayer');
  equal(trim(jQuery('#qunit-fixture').text()), 'hilayer');
  run(router, 'send', 'close');
  equal(trim(jQuery('#qunit-fixture').text()), 'hi');
});

QUnit.test('Can this.render({into:...}) the render helper', function() {
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
  equal(jQuery('#qunit-fixture .sidebar').text(), 'other');
  run(router, 'send', 'changeToBar');
  equal(jQuery('#qunit-fixture .sidebar').text(), 'bar');
});

QUnit.test('Can disconnect from the render helper', function() {
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
  equal(jQuery('#qunit-fixture .sidebar').text(), 'other');
  run(router, 'send', 'disconnect');
  equal(jQuery('#qunit-fixture .sidebar').text(), '');
});

QUnit.test('Can this.render({into:...}) the render helper\'s children', function() {
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
  equal(jQuery('#qunit-fixture .sidebar .index').text(), 'other');
  run(router, 'send', 'changeToBar');
  equal(jQuery('#qunit-fixture .sidebar .index').text(), 'bar');
});

QUnit.test('Can disconnect from the render helper\'s children', function() {
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
  equal(jQuery('#qunit-fixture .sidebar .index').text(), 'other');
  run(router, 'send', 'disconnect');
  equal(jQuery('#qunit-fixture .sidebar .index').text(), '');
});

QUnit.test('Can this.render({into:...}) nested render helpers', function() {
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
  equal(jQuery('#qunit-fixture .cart').text(), 'other');
  run(router, 'send', 'changeToBaz');
  equal(jQuery('#qunit-fixture .cart').text(), 'baz');
});

QUnit.test('Can disconnect from nested render helpers', function() {
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
  equal(jQuery('#qunit-fixture .cart').text(), 'other');
  run(router, 'send', 'disconnect');
  equal(jQuery('#qunit-fixture .cart').text(), '');
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

QUnit.test('Doesnt swallow exception thrown from willTransition', function() {
  expect(1);
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

  throws(() => {
    run(() => router.handleURL('/other'));
  }, /boom/, 'expected an exception that didnt happen');
});

QUnit.test('Exception if outlet name is undefined in render and disconnectOutlet', function(assert) {
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

  throws(() => {
    run(() => router.send('showModal'));
  }, /You passed undefined as the outlet name/);

  throws(() => {
    run(() => router.send('hideModal'));
  }, /You passed undefined as the outlet name/);
});

QUnit.test('Route serializers work for Engines', function() {
  expect(2);

  // Register engine
  let BlogEngine = Engine.extend();
  registry.register('engine:blog', BlogEngine);

  // Register engine route map
  let postSerialize = function(params) {
    ok(true, 'serialize hook runs');
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

  equal(router._routerMicrolib.generate('blog.post', { id: '13' }), '/blog/post/13', 'url is generated properly');
});

QUnit.test('Defining a Route#serialize method in an Engine throws an error', function() {
  expect(1);

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

  throws(() => router.transitionTo('blog.post'), /Defining a custom serialize method on an Engine route is not supported/);
});

QUnit.test('App.destroy does not leave undestroyed views after clearing engines', function() {
  expect(4);

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

  handleURL('/blog');

  let route = engineInstance.lookup('route:index');

  run(router, 'destroy');
  equal(router._toplevelView, null, 'the toplevelView was cleared');

  run(route, 'destroy');
  equal(router._toplevelView, null, 'the toplevelView was not reinitialized');

  run(App, 'destroy');
  equal(router._toplevelView, null, 'the toplevelView was not reinitialized');
});
