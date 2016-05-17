import Logger from 'ember-console';
import Controller from 'ember-runtime/controllers/controller';
import Route from 'ember-routing/system/route';
import run from 'ember-metal/run_loop';
import RSVP from 'ember-runtime/ext/rsvp';
import EmberObject from 'ember-runtime/system/object';
import isEnabled from 'ember-metal/features';
import { get } from 'ember-metal/property_get';
import { set } from 'ember-metal/property_set';
import { computed } from 'ember-metal/computed';
import Mixin, { observer } from 'ember-metal/mixin';
import Component from 'ember-templates/component';
import ActionManager from 'ember-views/system/action_manager';
import EmberView from 'ember-views/views/view';
import jQuery from 'ember-views/system/jquery';
import { compile } from 'ember-template-compiler';
import Application from 'ember-application/system/application';
import { A as emberA } from 'ember-runtime/system/native_array';
import NoneLocation from 'ember-routing/location/none_location';
import HistoryLocation from 'ember-routing/location/history_location';
import { getOwner } from 'container/owner';
import { Transition } from 'router/transition';
import copy from 'ember-runtime/copy';
import { addObserver } from 'ember-metal/observer';
import { setTemplates, set as setTemplate } from 'ember-templates/template_registry';

var trim = jQuery.trim;

var Router, App, router, registry, container, originalLoggerError;

function bootApplication() {
  router = container.lookup('router:main');
  run(App, 'advanceReadiness');
}

function handleURL(path) {
  return run(function() {
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
  run(function() {
    router.handleURL(path).then(function(value) {
      ok(false, 'url: `' + path + '` was NOT to be handled');
    }, function(reason) {
      ok(reason && reason.message === 'TransitionAborted', 'url: `' + path + '` was to be aborted');
    });
  });
}

function handleURLRejectsWith(path, expectedReason) {
  run(function() {
    router.handleURL(path).then(function(value) {
      ok(false, 'expected handleURLing: `' + path + '` to fail');
    }, function(reason) {
      equal(reason, expectedReason);
    });
  });
}

import { test, testModule, asyncTest } from 'ember-glimmer/tests/utils/skip-if-glimmer';

testModule('Basic Routing', {
  setup() {
    run(function() {
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
    run(function() {
      App.destroy();
      App = null;

      setTemplates({});
      Logger.error = originalLoggerError;
    });
  }
});

test('warn on URLs not included in the route set', function () {
  Router.map(function() {
    this.route('home', { path: '/' });
  });


  bootApplication();

  expectAssertion(function() {
    run(function() {
      router.handleURL('/what-is-this-i-dont-even');
    });
  }, 'The URL \'/what-is-this-i-dont-even\' did not match any routes in your application');
});

test('The Homepage', function() {
  Router.map(function() {
    this.route('home', { path: '/' });
  });

  App.HomeRoute = Route.extend({
  });

  var currentPath;

  App.ApplicationController = Controller.extend({
    currentPathDidChange: observer('currentPath', function() {
      currentPath = get(this, 'currentPath');
    })
  });

  bootApplication();

  equal(currentPath, 'home');
  equal(jQuery('h3:contains(Hours)', '#qunit-fixture').length, 1, 'The home template was rendered');
});

test('The Home page and the Camelot page with multiple Router.map calls', function() {
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

  var currentPath;

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

test('The Homepage with explicit template name in renderTemplate', function() {
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

test('An alternate template will pull in an alternate controller', function() {
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

test('An alternate template will pull in an alternate controller instead of controllerName', function() {
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

test('The template will pull in an alternate controller via key/value', function() {
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

test('The Homepage with explicit template name in renderTemplate and controller', function() {
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

test('Model passed via renderTemplate model is set as controller\'s model', function() {
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

test('Renders correct view with slash notation', function() {
  setTemplate('home/page', compile('<p>{{view.name}}</p>'));

  Router.map(function() {
    this.route('home', { path: '/' });
  });

  App.HomeRoute = Route.extend({
    renderTemplate() {
      this.render('home/page');
    }
  });

  App.HomePageView = EmberView.extend({
    name: 'Home/Page'
  });

  bootApplication();

  equal(jQuery('p:contains(Home/Page)', '#qunit-fixture').length, 1, 'The homepage template was rendered');
});

test('Renders the view given in the view option', function() {
  setTemplate('home', compile('<p>{{view.name}}</p>'));

  Router.map(function() {
    this.route('home', { path: '/' });
  });

  App.HomeRoute = Route.extend({
    renderTemplate() {
      this.render({ view: 'homePage' });
    }
  });

  App.HomePageView = EmberView.extend({
    name: 'Home/Page'
  });

  bootApplication();

  equal(jQuery('p:contains(Home/Page)', '#qunit-fixture').length, 1, 'The homepage view was rendered');
});

test('render does not replace templateName if user provided', function() {
  Router.map(function() {
    this.route('home', { path: '/' });
  });

  setTemplate('the_real_home_template', compile(
    '<p>THIS IS THE REAL HOME</p>'
  ));

  App.HomeView = EmberView.extend({
    templateName: 'the_real_home_template'
  });
  App.HomeController = Controller.extend();
  App.HomeRoute = Route.extend();

  bootApplication();

  equal(jQuery('p', '#qunit-fixture').text(), 'THIS IS THE REAL HOME', 'The homepage template was rendered');
});

test('render does not replace template if user provided', function () {
  Router.map(function () {
    this.route('home', { path: '/' });
  });

  App.HomeView = EmberView.extend({
    template: compile('<p>THIS IS THE REAL HOME</p>')
  });
  App.HomeController = Controller.extend();
  App.HomeRoute = Route.extend();

  bootApplication();

  run(function () {
    router.handleURL('/');
  });

  equal(jQuery('p', '#qunit-fixture').text(), 'THIS IS THE REAL HOME', 'The homepage template was rendered');
});

test('render uses templateName from route', function() {
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

test('defining templateName allows other templates to be rendered', function() {
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

  run(function() {
    router.send('showAlert');
  });

  equal(jQuery('.alert-box', '#qunit-fixture').text(), 'Invader!', 'Template for alert was render into outlet');
});

test('Specifying a name to render should have precedence over everything else', function() {
  Router.map(function() {
    this.route('home', { path: '/' });
  });

  App.HomeController = Controller.extend();
  App.HomeRoute = Route.extend({
    templateName: 'home',
    controllerName: 'home',
    viewName: 'home',

    renderTemplate() {
      this.render('homepage');
    }
  });

  App.HomeView = EmberView.extend({
    template: compile('<h3>This should not be rendered</h3><p>{{model.home}}</p>')
  });

  App.HomepageController = Controller.extend({
    model: {
      home: 'Tinytroll'
    }
  });
  App.HomepageView = EmberView.extend({
    layout: compile(
      '<span>Outer</span>{{yield}}<span>troll</span>'
    ),
    templateName: 'homepage'
  });

  bootApplication();

  equal(jQuery('h3', '#qunit-fixture').text(), 'Megatroll', 'The homepage template was rendered');
  equal(jQuery('p', '#qunit-fixture').text(), 'Tinytroll', 'The homepage controller was used');
  equal(jQuery('span', '#qunit-fixture').text(), 'Outertroll', 'The homepage view was used');
});

test('The Homepage with a `setupController` hook', function() {
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

test('The route controller is still set when overriding the setupController hook', function() {
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

test('The route controller can be specified via controllerName', function() {
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

test('The route controller specified via controllerName is used in render', function() {
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

test('The route controller specified via controllerName is used in render even when a controller with the routeName is available', function() {
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

test('The Homepage with a `setupController` hook modifying other controllers', function() {
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

test('The Homepage with a computed context that does not get overridden', function() {
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

test('The Homepage getting its controller context via model', function() {
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

test('The Specials Page getting its controller context by deserializing the params hash', function() {
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

test('The Specials Page defaults to looking models up via `find`', function() {
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

test('The Special Page returning a promise puts the app into a loading state until the promise is resolved', function() {
  Router.map(function() {
    this.route('home', { path: '/' });
    this.route('special', { path: '/specials/:menu_item_id' });
  });

  var menuItem, resolve;

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

  run(function() {
    resolve(menuItem);
  });

  equal(jQuery('p', '#qunit-fixture').text(), '1', 'The app is now in the specials state');
});

test('The loading state doesn\'t get entered for promises that resolve on the same run loop', function() {
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

  var menuItem;

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

test('The Special page returning an error invokes SpecialRoute\'s error handler', function() {
  Router.map(function() {
    this.route('home', { path: '/' });
    this.route('special', { path: '/specials/:menu_item_id' });
  });

  var menuItem, promise, resolve;

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

  run(function() {
    resolve(menuItem);
  });
});

let testOverridableErrorHandler = function(handlersName) {
  expect(2);

  Router.map(function() {
    this.route('home', { path: '/' });
    this.route('special', { path: '/specials/:menu_item_id' });
  });

  var menuItem, resolve;

  App.MenuItem = EmberObject.extend();
  App.MenuItem.reopenClass({
    find(id) {
      menuItem = App.MenuItem.create({ id: id });
      return new RSVP.Promise(function(res) {
        resolve = res;
      });
    }
  });

  var attrs = {};
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

  run(function() {
    resolve(menuItem);
  });
};

test('ApplicationRoute\'s default error handler can be overridden', function() {
  testOverridableErrorHandler('actions');
});

asyncTest('Moving from one page to another triggers the correct callbacks', function() {
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

  var transition = handleURL('/');

  run(function() {
    transition.then(function() {
      equal(jQuery('h3', '#qunit-fixture').text(), 'Home', 'The app is now in the initial state');

      var promiseContext = App.MenuItem.create({ id: 1 });
      run.later(function() {
        RSVP.resolve(promiseContext);
      }, 1);

      return router.transitionTo('special', promiseContext);
    }).then(function(result) {
      deepEqual(router.location.path, '/specials/1');
      QUnit.start();
    });
  });
});

asyncTest('Nested callbacks are not exited when moving to siblings', function() {
  function serializeRootRoute() {
    rootSerialize++;
    return this._super(...arguments);
  }

  if (isEnabled('ember-route-serializers')) {
    Router.map(function() {
      this.route('root', { path: '/', serialize: serializeRootRoute }, function() {
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
      }
    });
  } else {
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

      serialize: serializeRootRoute
    });
  }

  var currentPath;

  App.ApplicationController = Controller.extend({
    currentPathDidChange: observer('currentPath', function() {
      currentPath = get(this, 'currentPath');
    })
  });

  var menuItem;

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

  var rootSetup = 0;
  var rootRender = 0;
  var rootModel = 0;
  var rootSerialize = 0;

  bootApplication();

  registry.register('controller:special', Controller.extend());

  equal(jQuery('h3', '#qunit-fixture').text(), 'Home', 'The app is now in the initial state');
  equal(rootSetup, 1, 'The root setup was triggered');
  equal(rootRender, 1, 'The root render was triggered');
  equal(rootSerialize, 0, 'The root serialize was not called');
  equal(rootModel, 1, 'The root model was called');

  router = container.lookup('router:main');

  run(function() {
    var menuItem = App.MenuItem.create({ id: 1 });
    run.later(function() {
      RSVP.resolve(menuItem);
    }, 1);

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

asyncTest('Events are triggered on the controller if a matching action name is implemented', function() {
  Router.map(function() {
    this.route('home', { path: '/' });
  });

  var model = { name: 'Tom Dale' };
  var stateIsNotCalled = true;

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

  var controller = Controller.extend({
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

  var actionId = jQuery('#qunit-fixture a').data('ember-action');
  var [ action ] = ActionManager.registeredActions[actionId];
  var event = new jQuery.Event('click');
  action.handler(event);
});

asyncTest('Events are triggered on the current state when defined in `actions` object', function() {
  Router.map(function() {
    this.route('home', { path: '/' });
  });

  var model = { name: 'Tom Dale' };

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

  var actionId = jQuery('#qunit-fixture a').data('ember-action');
  var [ action ] = ActionManager.registeredActions[actionId];
  var event = new jQuery.Event('click');
  action.handler(event);
});

asyncTest('Events defined in `actions` object are triggered on the current state when routes are nested', function() {
  Router.map(function() {
    this.route('root', { path: '/' }, function() {
      this.route('index', { path: '/' });
    });
  });

  var model = { name: 'Tom Dale' };

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

  var actionId = jQuery('#qunit-fixture a').data('ember-action');
  var [ action ] = ActionManager.registeredActions[actionId];
  var event = new jQuery.Event('click');
  action.handler(event);
});

test('Events can be handled by inherited event handlers', function() {
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

asyncTest('Actions are not triggered on the controller if a matching action name is implemented as a method', function() {
  Router.map(function() {
    this.route('home', { path: '/' });
  });

  var model = { name: 'Tom Dale' };
  var stateIsNotCalled = true;

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

  var controller = Controller.extend({
    showStuff(context) {
      stateIsNotCalled = false;
      ok(stateIsNotCalled, 'an event on the state is not triggered');
    }
  });

  registry.register('controller:home', controller);

  bootApplication();

  var actionId = jQuery('#qunit-fixture a').data('ember-action');
  var [ action ] = ActionManager.registeredActions[actionId];
  var event = new jQuery.Event('click');
  action.handler(event);
});

asyncTest('actions can be triggered with multiple arguments', function() {
  Router.map(function() {
    this.route('root', { path: '/' }, function() {
      this.route('index', { path: '/' });
    });
  });

  var model1 = { name: 'Tilde' };
  var model2 = { name: 'Tom Dale' };

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

  var actionId = jQuery('#qunit-fixture a').data('ember-action');
  var [ action ] = ActionManager.registeredActions[actionId];
  var event = new jQuery.Event('click');
  action.handler(event);
});

test('transitioning multiple times in a single run loop only sets the URL once', function() {
  Router.map(function() {
    this.route('root', { path: '/' });
    this.route('foo');
    this.route('bar');
  });

  bootApplication();

  var urlSetCount = 0;

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

test('navigating away triggers a url property change', function() {
  expect(3);

  Router.map(function() {
    this.route('root', { path: '/' });
    this.route('foo', { path: '/foo' });
    this.route('bar', { path: '/bar' });
  });

  bootApplication();

  run(function() {
    addObserver(router, 'url', function() {
      ok(true, 'url change event was fired');
    });
  });

  ['foo', 'bar', '/foo'].forEach(function(destination) {
    run(router, 'transitionTo', destination);
  });
});

test('using replaceWith calls location.replaceURL if available', function() {
  var setCount = 0;
  var replaceCount = 0;

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

  run(function() {
    router.replaceWith('foo');
  });

  equal(setCount, 0, 'should not call setURL');
  equal(replaceCount, 1, 'should call replaceURL once');
  equal(router.get('location').getURL(), '/foo');
});

test('using replaceWith calls setURL if location.replaceURL is not defined', function() {
  var setCount = 0;

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

  run(function() {
    router.replaceWith('foo');
  });

  equal(setCount, 1, 'should call setURL once');
  equal(router.get('location').getURL(), '/foo');
});

test('Route inherits model from parent route', function() {
  expect(9);

  Router.map(function() {
    this.route('the_post', { path: '/posts/:post_id' }, function() {
      this.route('comments');

      this.route('shares', { path: '/shares/:share_id', resetNamespace: true }, function() {
        this.route('share');
      });
    });
  });

  var post1 = {};
  var post2 = {};
  var post3 = {};
  var currentPost;
  var share1 = {};
  var share2 = {};
  var share3 = {};

  var posts = {
    1: post1,
    2: post2,
    3: post3
  };
  var shares = {
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
      var parent_model = this.modelFor('thePost');

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
      var parent_model = this.modelFor('shares');

      equal(share, parent_model);
    }
  });

  bootApplication();

  currentPost = post1;
  handleURL('/posts/1/comments');
  handleURL('/posts/1/shares/1');

  currentPost = post2;
  handleURL('/posts/2/comments');
  handleURL('/posts/2/shares/2');

  currentPost = post3;
  handleURL('/posts/3/comments');
  handleURL('/posts/3/shares/3');
});

test('Routes with { resetNamespace: true } inherits model from parent route', function() {
  expect(6);

  Router.map(function() {
    this.route('the_post', { path: '/posts/:post_id' }, function() {
      this.route('comments', { resetNamespace: true }, function() {
      });
    });
  });

  var post1 = {};
  var post2 = {};
  var post3 = {};
  var currentPost;

  var posts = {
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
      var parent_model = this.modelFor('thePost');

      equal(post, parent_model);
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

test('It is possible to get the model from a parent route', function() {
  expect(9);

  Router.map(function() {
    this.route('the_post', { path: '/posts/:post_id' }, function() {
      this.route('comments', { resetNamespace: true });
    });
  });

  var post1 = {};
  var post2 = {};
  var post3 = {};
  var currentPost;

  var posts = {
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

test('A redirection hook is provided', function() {
  Router.map(function() {
    this.route('choose', { path: '/' });
    this.route('home');
  });

  var chooseFollowed = 0;
  var destination;

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

test('Redirecting from the middle of a route aborts the remainder of the routes', function() {
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

test('Redirecting to the current target in the middle of a route does not abort initial routing', function() {
  expect(5);

  Router.map(function() {
    this.route('home');
    this.route('foo', function() {
      this.route('bar', { resetNamespace: true }, function() {
        this.route('baz');
      });
    });
  });

  var successCount = 0;
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

test('Redirecting to the current target with a different context aborts the remainder of the routes', function() {
  expect(4);

  Router.map(function() {
    this.route('home');
    this.route('foo', function() {
      this.route('bar', { path: 'bar/:id', resetNamespace: true }, function() {
        this.route('baz');
      });
    });
  });

  var model = { id: 2 };

  var count = 0;

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

test('Transitioning from a parent event does not prevent currentPath from being set', function() {
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

  var applicationController = getOwner(router).lookup('controller:application');

  handleURL('/foo/bar/baz');

  equal(applicationController.get('currentPath'), 'foo.bar.baz');

  run(function() {
    router.send('goToQux');
  });

  equal(applicationController.get('currentPath'), 'foo.qux');
  equal(router.get('location').getURL(), '/foo/qux');
});

test('Generated names can be customized when providing routes with dot notation', function() {
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

test('Child routes render into their parent route\'s template by default', function() {
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

test('Child routes render into specified template', function() {
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

test('Rendering into specified template with slash notation', function() {
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

test('Parent route context change', function() {
  var editCount = 0;
  var editedPostIds = emberA();

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

    actions: {
      editPost(context) {
        this.transitionTo('post.edit');
      }
    }
  });

  App.PostEditRoute = Route.extend({
    model(params) {
      var postId = this.modelFor('post').id;
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

  run(function() {
    router.send('editPost');
  });

  run(function() {
    router.send('showPost', { id: '2' });
  });

  run(function() {
    router.send('editPost');
  });

  equal(editCount, 2, 'set up the edit route twice without failure');
  deepEqual(editedPostIds, ['1', '2'], 'modelFor posts.post returns the right context');
});

test('Router accounts for rootURL on page load when using history location', function() {
  var rootURL = window.location.pathname + '/app';
  var postsTemplateRendered = false;
  var setHistory, HistoryTestLocation;

  setHistory = function(obj, path) {
    obj.set('history', { state: { path: path } });
  };

  // Create new implementation that extends HistoryLocation
  // and set current location to rootURL + '/posts'
  HistoryTestLocation = HistoryLocation.extend({
    initState() {
      var path = rootURL + '/posts';

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

test('The rootURL is passed properly to the location implementation', function() {
  expect(1);
  var rootURL = '/blahzorz';
  var HistoryTestLocation;

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


test('Only use route rendered into main outlet for default into property on child', function() {
  setTemplate('application', compile('{{outlet \'menu\'}}{{outlet}}'));
  setTemplate('posts', compile('{{outlet}}'));
  setTemplate('posts/index', compile('postsIndex'));
  setTemplate('posts/menu', compile('postsMenu'));

  Router.map(function() {
    this.route('posts', function() {});
  });

  App.PostsMenuView = EmberView.extend({
    tagName: 'div',
    templateName: 'posts/menu',
    classNames: ['posts-menu']
  });

  App.PostsIndexView = EmberView.extend({
    tagName: 'p',
    classNames: ['posts-index']
  });

  App.PostsRoute = Route.extend({
    renderTemplate() {
      this.render();
      this.render('postsMenu', {
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

test('Generating a URL should not affect currentModel', function() {
  Router.map(function() {
    this.route('post', { path: '/posts/:post_id' });
  });

  var posts = {
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

  var route = container.lookup('route:post');
  equal(route.modelFor('post'), posts[1]);

  var url = router.generate('post', posts[2]);
  equal(url, '/posts/2');

  equal(route.modelFor('post'), posts[1]);
});


test('Generated route should be an instance of App.Route if provided', function() {
  var generatedRoute;

  Router.map(function() {
    this.route('posts');
  });

  App.Route = Route.extend();

  bootApplication();

  handleURL('/posts');

  generatedRoute = container.lookup('route:posts');

  ok(generatedRoute instanceof App.Route, 'should extend the correct route');
});

test('Nested index route is not overriden by parent\'s implicit index route', function() {
  Router.map(function() {
    this.route('posts', function() {
      this.route('index', { path: ':category' });
    });
  });

  bootApplication();

  run(function() {
    router.transitionTo('posts', { category: 'emberjs' });
  });

  deepEqual(router.location.path, '/posts/emberjs');
});

if (isEnabled('ember-route-serializers')) {
  test('Custom Route#serialize method still works [DEPRECATED]', function() {
    Router.map(function() {
      this.route('posts', function() {
        this.route('index', {
          path: ':category'
        });
      });
    });

    App.PostsIndexRoute = Route.extend({
      serialize(model) {
        return { category: model.category };
      }
    });

    bootApplication();

    run(function() {
      expectDeprecation(function() {
        router.transitionTo('posts', { category: 'emberjs' });
      }, 'Defining a serialize function on route \'posts\' is deprecated. Instead, define it in the router\'s map as an option.');
    });

    deepEqual(router.location.path, '/posts/emberjs');
  });
}

test('Application template does not duplicate when re-rendered', function() {
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

  equal(jQuery('h3:contains(I Render Once)').size(), 1);
});

test('Child routes should render inside the application template if the application template causes a redirect', function() {
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

test('The template is not re-rendered when the route\'s context changes', function() {
  Router.map(function() {
    this.route('page', { path: '/page/:name' });
  });

  App.PageRoute = Route.extend({
    model(params) {
      return EmberObject.create({ name: params.name });
    }
  });

  var insertionCount = 0;
  App.PageView = EmberView.extend({
    didInsertElement() {
      insertionCount += 1;
    }
  });

  setTemplate('page', compile(
    '<p>{{model.name}}</p>'
  ));

  bootApplication();

  handleURL('/page/first');

  equal(jQuery('p', '#qunit-fixture').text(), 'first');
  equal(insertionCount, 1);

  handleURL('/page/second');

  equal(jQuery('p', '#qunit-fixture').text(), 'second');
  equal(insertionCount, 1, 'view should have inserted only once');

  run(function() {
    router.transitionTo('page', EmberObject.create({ name: 'third' }));
  });

  equal(jQuery('p', '#qunit-fixture').text(), 'third');
  equal(insertionCount, 1, 'view should still have inserted only once');
});


test('The template is not re-rendered when two routes present the exact same template, view, & controller', function() {
  Router.map(function() {
    this.route('first');
    this.route('second');
    this.route('third');
    this.route('fourth');
  });

  App.SharedRoute = Route.extend({
    viewName: 'shared',
    setupController(controller) {
      this.controllerFor('shared').set('message', 'This is the ' + this.routeName + ' message');
    },

    renderTemplate(controller, context) {
      this.render({ controller: 'shared' });
    }
  });

  App.FirstRoute  = App.SharedRoute.extend();
  App.SecondRoute = App.SharedRoute.extend();
  App.ThirdRoute  = App.SharedRoute.extend();
  App.FourthRoute = App.SharedRoute.extend({
    viewName: 'fourth'
  });

  App.SharedController = Controller.extend();

  var insertionCount = 0;
  App.SharedView = EmberView.extend({
    templateName: 'shared',
    didInsertElement() {
      insertionCount += 1;
    }
  });

  // Extending, in essence, creates a different view
  App.FourthView = App.SharedView.extend();

  setTemplate('shared', compile(
    '<p>{{message}}</p>'
  ));

  bootApplication();

  handleURL('/first');

  equal(jQuery('p', '#qunit-fixture').text(), 'This is the first message');
  equal(insertionCount, 1, 'expected one assertion');

  // Transition by URL
  handleURL('/second');

  equal(jQuery('p', '#qunit-fixture').text(), 'This is the second message');
  equal(insertionCount, 1, 'view should have inserted only once');

  // Then transition directly by route name
  run(function() {
    router.transitionTo('third').then(function(value) {
      ok(true, 'expected transition');
    }, function(reason) {
      ok(false, 'unexpected transition failure: ', QUnit.jsDump.parse(reason));
    });
  });

  equal(jQuery('p', '#qunit-fixture').text(), 'This is the third message');
  equal(insertionCount, 1, 'view should still have inserted only once');

  // Lastly transition to a different view, with the same controller and template
  handleURL('/fourth');

  equal(jQuery('p', '#qunit-fixture').text(), 'This is the fourth message');
  equal(insertionCount, 2, 'view should have inserted a second time');
});

test('ApplicationRoute with model does not proxy the currentPath', function() {
  var model = {};
  var currentPath;

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

test('Promises encountered on app load put app into loading state until resolved', function() {
  expect(2);

  var deferred = RSVP.defer();

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

test('Route should tear down multiple outlets', function() {
  setTemplate('application', compile('{{outlet \'menu\'}}{{outlet}}{{outlet \'footer\'}}'));
  setTemplate('posts', compile('{{outlet}}'));
  setTemplate('users', compile('users'));
  setTemplate('posts/index', compile('postsIndex'));
  setTemplate('posts/menu', compile('postsMenu'));
  setTemplate('posts/footer', compile('postsFooter'));

  Router.map(function() {
    this.route('posts', function() {});
    this.route('users', function() {});
  });

  App.PostsMenuView = EmberView.extend({
    tagName: 'div',
    templateName: 'posts/menu',
    classNames: ['posts-menu']
  });

  App.PostsIndexView = EmberView.extend({
    tagName: 'p',
    classNames: ['posts-index']
  });

  App.PostsFooterView = EmberView.extend({
    tagName: 'div',
    templateName: 'posts/footer',
    classNames: ['posts-footer']
  });

  App.PostsRoute = Route.extend({
    renderTemplate() {
      this.render('postsMenu', {
        into: 'application',
        outlet: 'menu'
      });

      this.render();

      this.render('postsFooter', {
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


test('Route will assert if you try to explicitly render {into: ...} a missing template', function () {
  Router.map(function() {
    this.route('home', { path: '/' });
  });

  App.HomeRoute = Route.extend({
    renderTemplate() {
      this.render({ into: 'nonexistent' });
    }
  });

  expectAssertion(function() {
    bootApplication();
  }, 'You attempted to render into \'nonexistent\' but it was not found');
});

test('Route supports clearing outlet explicitly', function() {
  setTemplate('application', compile('{{outlet}}{{outlet \'modal\'}}'));
  setTemplate('posts', compile('{{outlet}}'));
  setTemplate('users', compile('users'));
  setTemplate('posts/index', compile('postsIndex {{outlet}}'));
  setTemplate('posts/modal', compile('postsModal'));
  setTemplate('posts/extra', compile('postsExtra'));

  Router.map(function() {
    this.route('posts', function() {});
    this.route('users', function() {});
  });

  App.PostsIndexView = EmberView.extend({
    classNames: ['posts-index']
  });

  App.PostsModalView = EmberView.extend({
    templateName: 'posts/modal',
    classNames: ['posts-modal']
  });

  App.PostsExtraView = EmberView.extend({
    templateName: 'posts/extra',
    classNames: ['posts-extra']
  });

  App.PostsRoute = Route.extend({
    actions: {
      showModal() {
        this.render('postsModal', {
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
        this.render('postsExtra', {
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
  run(function() {
    router.send('showModal');
  });
  equal(jQuery('div.posts-modal:contains(postsModal)', '#qunit-fixture').length, 1, 'The posts/modal template was rendered');
  run(function() {
    router.send('showExtra');
  });
  equal(jQuery('div.posts-extra:contains(postsExtra)', '#qunit-fixture').length, 1, 'The posts/extra template was rendered');
  run(function() {
    router.send('hideModal');
  });
  equal(jQuery('div.posts-modal:contains(postsModal)', '#qunit-fixture').length, 0, 'The posts/modal template was removed');
  run(function() {
    router.send('hideExtra');
  });
  equal(jQuery('div.posts-extra:contains(postsExtra)', '#qunit-fixture').length, 0, 'The posts/extra template was removed');

  handleURL('/users');

  equal(jQuery('div.posts-index:contains(postsIndex)', '#qunit-fixture').length, 0, 'The posts/index template was removed');
  equal(jQuery('div.posts-modal:contains(postsModal)', '#qunit-fixture').length, 0, 'The posts/modal template was removed');
  equal(jQuery('div.posts-extra:contains(postsExtra)', '#qunit-fixture').length, 0, 'The posts/extra template was removed');
});

test('Route supports clearing outlet using string parameter', function() {
  setTemplate('application', compile('{{outlet}}{{outlet \'modal\'}}'));
  setTemplate('posts', compile('{{outlet}}'));
  setTemplate('users', compile('users'));
  setTemplate('posts/index', compile('postsIndex {{outlet}}'));
  setTemplate('posts/modal', compile('postsModal'));

  Router.map(function() {
    this.route('posts', function() {});
    this.route('users', function() {});
  });

  App.PostsIndexView = EmberView.extend({
    classNames: ['posts-index']
  });

  App.PostsModalView = EmberView.extend({
    templateName: 'posts/modal',
    classNames: ['posts-modal']
  });

  App.PostsRoute = Route.extend({
    actions: {
      showModal() {
        this.render('postsModal', {
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
  run(function() {
    router.send('showModal');
  });
  equal(jQuery('div.posts-modal:contains(postsModal)', '#qunit-fixture').length, 1, 'The posts/modal template was rendered');
  run(function() {
    router.send('hideModal');
  });
  equal(jQuery('div.posts-modal:contains(postsModal)', '#qunit-fixture').length, 0, 'The posts/modal template was removed');

  handleURL('/users');

  equal(jQuery('div.posts-index:contains(postsIndex)', '#qunit-fixture').length, 0, 'The posts/index template was removed');
  equal(jQuery('div.posts-modal:contains(postsModal)', '#qunit-fixture').length, 0, 'The posts/modal template was removed');
});

test('Route silently fails when cleaning an outlet from an inactive view', function() {
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

  run(function() { router.send('showModal'); });
  run(function() { router.send('hideSelf'); });
  run(function() { router.send('hideModal'); });
});

test('Router `willTransition` hook passes in cancellable transition', function() {
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

test('Aborting/redirecting the transition in `willTransition` prevents LoadingRoute from being entered', function() {
  expect(8);

  Router.map(function() {
    this.route('nork');
    this.route('about');
  });

  var redirect = false;

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

  var deferred = null;

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

test('`didTransition` event fires on the router', function() {
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
test('`didTransition` can be reopened', function() {
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

test('`activate` event fires on the route', function() {
  expect(2);

  var eventFired = 0;

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

test('`deactivate` event fires on the route', function() {
  expect(2);

  var eventFired = 0;

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

test('Actions can be handled by inherited action handlers', function() {
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

test('transitionTo returns Transition when passed a route name', function() {
  expect(1);
  Router.map(function() {
    this.route('root', { path: '/' });
    this.route('bar');
  });

  var transition = null;

  bootApplication();

  run(function() {
    transition = router.transitionTo('bar');
  });

  equal(transition instanceof Transition, true);
});

test('transitionTo returns Transition when passed a url', function() {
  expect(1);
  Router.map(function() {
    this.route('root', { path: '/' });
    this.route('bar', function() {
      this.route('baz');
    });
  });

  var transition = null;

  bootApplication();

  run(function() {
    transition = router.transitionTo('/bar/baz');
  });

  equal(transition instanceof Transition, true);
});

test('currentRouteName is a property installed on ApplicationController that can be used in transitionTo', function() {
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

  var appController = getOwner(router).lookup('controller:application');

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

test('Route model hook finds the same model as a manual find', function() {
  var Post;
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

test('Routes can refresh themselves causing their model hooks to be re-run', function() {
  Router.map(function() {
    this.route('parent', { path: '/parent/:parent_id' }, function() {
      this.route('child');
    });
  });

  var appcount = 0;
  App.ApplicationRoute = Route.extend({
    model() {
      ++appcount;
    }
  });

  var parentcount = 0;
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

  var childcount = 0;
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

test('Specifying non-existent controller name in route#render throws', function() {
  expect(1);

  Router.map(function() {
    this.route('home', { path: '/' });
  });

  App.HomeRoute = Route.extend({
    renderTemplate() {
      try {
        this.render('homepage', { controller: 'stefanpenneristhemanforme' });
      } catch(e) {
        equal(e.message, 'You passed `controller: \'stefanpenneristhemanforme\'` into the `render` method, but no such controller could be found.');
      }
    }
  });

  bootApplication();
});

test('Redirecting with null model doesn\'t error out', function() {
  function serializeAboutRoute(model) {
    if (model === null) {
      return { hurhurhur: 'TreeklesMcGeekles' };
    }
  }

  if (isEnabled('ember-route-serializers')) {
    Router.map(function() {
      this.route('home', { path: '/' });
      this.route('about', { path: '/about/:hurhurhur', serialize: serializeAboutRoute });
    });
  } else {
    Router.map(function() {
      this.route('home', { path: '/' });
      this.route('about', { path: '/about/:hurhurhur' });
    });

    App.AboutRoute = Route.extend({
      serialize: serializeAboutRoute
    });
  }

  App.HomeRoute = Route.extend({
    beforeModel() {
      this.transitionTo('about', null);
    }
  });

  bootApplication();

  equal(router.get('location.path'), '/about/TreeklesMcGeekles');
});

test('rejecting the model hooks promise with a non-error prints the `message` property', function() {
  expect(5);

  var rejectedMessage = 'OMG!! SOOOOOO BAD!!!!';
  var rejectedStack   = 'Yeah, buddy: stack gets printed too.';

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

test('rejecting the model hooks promise with an error with `errorThrown` property prints `errorThrown.message` property', function() {
  expect(5);
  var rejectedMessage = 'OMG!! SOOOOOO BAD!!!!';
  var rejectedStack   = 'Yeah, buddy: stack gets printed too.';

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

  throws(function() {
    bootApplication();
  }, function(err) {
    equal(err.message, rejectedMessage);
    return true;
  }, 'expected an exception');
});

test('rejecting the model hooks promise with no reason still logs error', function() {
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

test('rejecting the model hooks promise with a string shows a good error', function() {
  expect(3);
  var originalLoggerError = Logger.error;
  var rejectedMessage = 'Supercalifragilisticexpialidocious';

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

  throws(function() {
    bootApplication();
  }, rejectedMessage, 'expected an exception');

  Logger.error = originalLoggerError;
});

test('willLeave, willChangeContext, willChangeModel actions don\'t fire unless feature flag enabled', function() {
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

test('Errors in transitionTo within redirect hook are logged', function() {
  expect(4);
  var actual = [];

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

  throws(function() {
    bootApplication();
  }, /More context objects were passed/);

  equal(actual.length, 1, 'the error is only logged once');
  equal(actual[0][0], 'Error while processing route: yondo', 'source route is printed');
  ok(actual[0][1].match(/More context objects were passed than there are dynamic segments for the route: stink-bomb/), 'the error is printed');
});

test('Errors in transition show error template if available', function() {
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

  throws(function() {
    bootApplication();
  }, /More context objects were passed/);

  equal(jQuery('#error').length, 1, 'Error template was rendered.');
});

test('Route#resetController gets fired when changing models and exiting routes', function() {
  expect(4);

  Router.map(function() {
    this.route('a', function() {
      this.route('b', { path: '/b/:id', resetNamespace: true }, function() { });
      this.route('c', { path: '/c/:id', resetNamespace: true }, function() { });
    });
    this.route('out');
  });

  var calls = [];

  var SpyRoute = Route.extend({
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

test('Exception during initialization of non-initial route is not swallowed', function() {
  Router.map(function() {
    this.route('boom');
  });
  App.BoomRoute = Route.extend({
    init() {
      throw new Error('boom!');
    }
  });
  bootApplication();
  throws(function() {
    run(router, 'transitionTo', 'boom');
  }, /\bboom\b/);
});


test('Exception during load of non-initial route is not swallowed', function() {
  Router.map(function() {
    this.route('boom');
  });
  var lookup = container.lookup;
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
  throws(function() {
    run(router, 'transitionTo', 'boom');
  });
});

test('Exception during initialization of initial route is not swallowed', function() {
  Router.map(function() {
    this.route('boom', { path: '/' });
  });
  App.BoomRoute = Route.extend({
    init() {
      throw new Error('boom!');
    }
  });
  throws(function() {
    bootApplication();
  }, /\bboom\b/);
});

test('Exception during load of initial route is not swallowed', function() {
  Router.map(function() {
    this.route('boom', { path: '/' });
  });
  var lookup = container.lookup;
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
  throws(function() {
    bootApplication();
  }, /\bboom\b/);
});

test('{{outlet}} works when created after initial render', function() {
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

  run(function() {
    container.lookup('controller:sample').set('showTheThing', true);
  });

  equal(jQuery('#qunit-fixture').text(), 'HiYayBye', 'second render');

  handleURL('/2');

  equal(jQuery('#qunit-fixture').text(), 'HiBooBye', 'third render');
});

test('Can rerender application view multiple times when it contains an outlet', function() {
  setTemplate('application', compile('App{{outlet}}'));
  setTemplate('index', compile('Hello world'));

  registry.register('view:application', EmberView.extend({
    elementId: 'im-special'
  }));

  bootApplication();

  equal(jQuery('#qunit-fixture').text(), 'AppHello world', 'initial render');

  run(function() {
    EmberView.views['im-special'].rerender();
  });

  equal(jQuery('#qunit-fixture').text(), 'AppHello world', 'second render');

  run(function() {
    EmberView.views['im-special'].rerender();
  });

  equal(jQuery('#qunit-fixture').text(), 'AppHello world', 'third render');
});

test('Can render into a named outlet at the top level', function() {
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

test('Can disconnect a named outlet at the top level', function() {
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

test('Can render into a named outlet at the top level, with empty main outlet', function() {
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


test('Can render into a named outlet at the top level, later', function() {
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

test('Can render routes with no \'main\' outlet and their children', function() {
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
    renderTemplate : function() {
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
    renderTemplate : function() {
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

test('Tolerates stacked renders', function() {
  setTemplate('application', compile('{{outlet}}{{outlet "modal"}}'));
  setTemplate('index', compile('hi'));
  setTemplate('layer', compile('layer'));
  App.ApplicationRoute = Route.extend({
    actions: {
      openLayer: function() {
        this.render('layer', {
          into: 'application',
          outlet: 'modal'
        });
      },
      close: function() {
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

test('Renders child into parent with non-default template name', function() {
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

test('Allows any route to disconnectOutlet another route\'s templates', function() {
  setTemplate('application', compile('{{outlet}}{{outlet "modal"}}'));
  setTemplate('index', compile('hi'));
  setTemplate('layer', compile('layer'));
  App.ApplicationRoute = Route.extend({
    actions: {
      openLayer: function() {
        this.render('layer', {
          into: 'application',
          outlet: 'modal'
        });
      }
    }
  });
  App.IndexRoute = Route.extend({
    actions: {
      close: function() {
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

test('Can this.render({into:...}) the render helper', function() {
  setTemplate('application', compile('{{render "foo"}}'));
  setTemplate('foo', compile('<div class="foo">{{outlet}}</div>'));
  setTemplate('index', compile('other'));
  setTemplate('bar', compile('bar'));

  App.IndexRoute = Route.extend({
    renderTemplate() {
      this.render({ into: 'foo' });
    },
    actions: {
      changeToBar: function() {
        this.disconnectOutlet({
          parentView: 'foo',
          outlet: 'main'
        });
        this.render('bar', { into: 'foo' });
      }
    }
  });

  bootApplication();
  equal(jQuery('#qunit-fixture .foo').text(), 'other');
  run(router, 'send', 'changeToBar');
  equal(jQuery('#qunit-fixture .foo').text(), 'bar');
});

test('Can disconnect from the render helper', function() {
  setTemplate('application', compile('{{render "foo"}}'));
  setTemplate('foo', compile('<div class="foo">{{outlet}}</div>'));
  setTemplate('index', compile('other'));

  App.IndexRoute = Route.extend({
    renderTemplate() {
      this.render({ into: 'foo' });
    },
    actions: {
      disconnect: function() {
        this.disconnectOutlet({
          parentView: 'foo',
          outlet: 'main'
        });
      }
    }
  });

  bootApplication();
  equal(jQuery('#qunit-fixture .foo').text(), 'other');
  run(router, 'send', 'disconnect');
  equal(jQuery('#qunit-fixture .foo').text(), '');
});


test('Can this.render({into:...}) the render helper\'s children', function() {
  setTemplate('application', compile('{{render "foo"}}'));
  setTemplate('foo', compile('<div class="foo">{{outlet}}</div>'));
  setTemplate('index', compile('<div class="index">{{outlet}}</div>'));
  setTemplate('other', compile('other'));
  setTemplate('bar', compile('bar'));

  App.IndexRoute = Route.extend({
    renderTemplate() {
      this.render({ into: 'foo' });
      this.render('other', { into: 'index' });
    },
    actions: {
      changeToBar: function() {
        this.disconnectOutlet({
          parentView: 'index',
          outlet: 'main'
        });
        this.render('bar', { into: 'index' });
      }
    }
  });

  bootApplication();
  equal(jQuery('#qunit-fixture .foo .index').text(), 'other');
  run(router, 'send', 'changeToBar');
  equal(jQuery('#qunit-fixture .foo .index').text(), 'bar');
});

test('Can disconnect from the render helper\'s children', function() {
  setTemplate('application', compile('{{render "foo"}}'));
  setTemplate('foo', compile('<div class="foo">{{outlet}}</div>'));
  setTemplate('index', compile('<div class="index">{{outlet}}</div>'));
  setTemplate('other', compile('other'));

  App.IndexRoute = Route.extend({
    renderTemplate() {
      this.render({ into: 'foo' });
      this.render('other', { into: 'index' });
    },
    actions: {
      disconnect: function() {
        this.disconnectOutlet({
          parentView: 'index',
          outlet: 'main'
        });
      }
    }
  });

  bootApplication();
  equal(jQuery('#qunit-fixture .foo .index').text(), 'other');
  run(router, 'send', 'disconnect');
  equal(jQuery('#qunit-fixture .foo .index').text(), '');
});

test('Can this.render({into:...}) nested render helpers', function() {
  setTemplate('application', compile('{{render "foo"}}'));
  setTemplate('foo', compile('<div class="foo">{{render "bar"}}</div>'));
  setTemplate('bar', compile('<div class="bar">{{outlet}}</div>'));
  setTemplate('index', compile('other'));
  setTemplate('baz', compile('baz'));

  App.IndexRoute = Route.extend({
    renderTemplate: function() {
      this.render({ into: 'bar' });
    },
    actions: {
      changeToBaz: function() {
        this.disconnectOutlet({
          parentView: 'bar',
          outlet: 'main'
        });
        this.render('baz', { into: 'bar' });
      }
    }
  });

  bootApplication();
  equal(jQuery('#qunit-fixture .bar').text(), 'other');
  run(router, 'send', 'changeToBaz');
  equal(jQuery('#qunit-fixture .bar').text(), 'baz');
});

test('Can disconnect from nested render helpers', function() {
  setTemplate('application', compile('{{render "foo"}}'));
  setTemplate('foo', compile('<div class="foo">{{render "bar"}}</div>'));
  setTemplate('bar', compile('<div class="bar">{{outlet}}</div>'));
  setTemplate('index', compile('other'));

  App.IndexRoute = Route.extend({
    renderTemplate: function() {
      this.render({ into: 'bar' });
    },
    actions: {
      disconnect: function() {
        this.disconnectOutlet({
          parentView: 'bar',
          outlet: 'main'
        });
      }
    }
  });

  bootApplication();
  equal(jQuery('#qunit-fixture .bar').text(), 'other');
  run(router, 'send', 'disconnect');
  equal(jQuery('#qunit-fixture .bar').text(), '');
});

test('Can render with layout', function() {
  setTemplate('application', compile('{{outlet}}'));
  setTemplate('index', compile('index-template'));
  setTemplate('my-layout', compile('my-layout [{{yield}}]'));

  App.IndexView = EmberView.extend({
    layoutName: 'my-layout'
  });

  bootApplication();
  equal(jQuery('#qunit-fixture').text(), 'my-layout [index-template]');
});

test('Components inside an outlet have their didInsertElement hook invoked when the route is displayed', function(assert) {
  setTemplate('index', compile('{{#if showFirst}}{{my-component}}{{else}}{{other-component}}{{/if}}'));

  var myComponentCounter = 0;
  var otherComponentCounter = 0;
  var indexController;

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

  run(function() {
    indexController.set('showFirst', false);
  });

  assert.strictEqual(myComponentCounter, 1, 'didInsertElement not invoked on displayed component');
  assert.strictEqual(otherComponentCounter, 1, 'didInsertElement invoked on displayed component');
});

test('Doesnt swallow exception thrown from willTransition', function() {
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

  throws(function() {
    run(function() {
      router.handleURL('/other');
    });
  }, /boom/, 'expected an exception that didnt happen');
});

test('Exception if outlet name is undefined in render and disconnectOutlet', function(assert) {
  App.ApplicationRoute = Route.extend({
    actions: {
      showModal: function() {
        this.render({
          outlet: undefined,
          parentView: 'application'
        });
      },
      hideModal: function() {
        this.disconnectOutlet({
          outlet: undefined,
          parentView: 'application'
        });
      }
    }
  });

  bootApplication();

  throws(function() {
    run(function() { router.send('showModal'); });
  }, /You passed undefined as the outlet name/);

  throws(function() {
    run(function() { router.send('hideModal'); });
  }, /You passed undefined as the outlet name/);
});
