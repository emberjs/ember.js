import Logger from 'ember-console';
import Controller from 'ember-runtime/controllers/controller';
import Route from 'ember-routing/system/route';
import run from 'ember-metal/run_loop';
import { get } from 'ember-metal/property_get';
import jQuery from 'ember-views/system/jquery';
import { compile } from 'ember-template-compiler/tests/utils/helpers';
import Application from 'ember-application/system/application';
import { setTemplates, set as setTemplate } from 'ember-templates/template_registry';
import inject from 'ember-runtime/inject';


var Router, App, router, registry, container, originalLoggerError;

function bootApplication() {
  router = container.lookup('router:main');
  run(App, 'advanceReadiness');
}

QUnit.module('Router Service', {
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

QUnit.test('transitionTo - Basic route', function() {
  Router.map(function() {
    this.route('home', { path: '/' });
    this.route('camelot');
  });

  App.HomeRoute = Route.extend({
  });

  App.CamelotRoute = Route.extend({
  });

  var controller;
  var router;

  App.ApplicationController = Controller.extend({
    router: inject.service(),
    init() {
      this._super.apply(arguments);
      controller = this;
      router = get(this, 'router');
    },
    actions: {
      moveToCamelot() {
        get(this, 'router').transitionTo('camelot');
      }
    }
  });

  App.CamelotController = Controller.extend({
  });

  bootApplication();

  run(function() {
    controller.send('moveToCamelot');
  });

  var currentRouteName = get(router, 'currentRouteName');
  var currentURL       = get(router, 'currentURL');
  var isActive         = router.isActive('camelot');

  equal(isActive, true);
  equal(currentRouteName, 'camelot');
  equal(currentURL, '/camelot', 'The URL update correctly');
  equal(jQuery('h3:contains(silly)', '#qunit-fixture').length, 1, 'The camelot template was rendered');
});

QUnit.test('transitionTo - Dynamic segment', function() {
  Router.map(function() {
    this.route('home', { path: '/' });
    this.route('homepage', { path: 'homepage/:post_id' });
  });

  var homepageModel = { id: 1, home: 'Homepage' };
  var controller;
  var router;

  App.HomeRoute = Route.extend({
  });

  App.HomepageRoute = Route.extend({
    model() {
      return homepageModel;
    }
  });

  App.ApplicationController = Controller.extend({
    router: inject.service(),
    init() {
      this._super.apply(arguments);
      controller = this;
      router = get(this, 'router');
    },

    actions: {
      moveToRoute() {
        get(this, 'router').transitionTo('homepage', homepageModel);
      }
    }
  });

  bootApplication();

  run(function() {
    controller.send('moveToRoute');
  });

  var currentRouteName = get(router, 'currentRouteName');
  var currentURL       = get(router, 'currentURL');
  var isActive         = router.isActive('homepage', homepageModel);

  equal(isActive, true);
  equal(currentRouteName, 'homepage');
  equal(currentURL, '/homepage/1', 'The URL update correctly');
  equal(jQuery('h3:contains(Megatroll)', '#qunit-fixture').length, 1, 'The homepage template was rendered');
  equal(jQuery('p:contains(Homepage)', '#qunit-fixture').length, 1, 'The model was set');
});

QUnit.test('transitionTo - Dynamic segment - model hook', function() {
  Router.map(function() {
    this.route('home', { path: '/' });
    this.route('homepage', { path: 'homepage/:post_id' });
  });

  var homepageModel = { id: 1, home: 'Homepage' };
  var controller;
  var router;

  App.HomeRoute = Route.extend({
  });

  App.HomepageRoute = Route.extend({
    model() {
      return homepageModel;
    }
  });

  App.ApplicationController = Controller.extend({
    router: inject.service(),
    init() {
      this._super.apply(arguments);
      controller = this;
      router = get(this, 'router');
    },

    actions: {
      moveToRoute() {
        get(this, 'router').transitionTo('homepage', 1);
      }
    }
  });

  bootApplication();

  run(function() {
    controller.send('moveToRoute');
  });

  var currentRouteName = get(router, 'currentRouteName');
  var currentURL       = get(router, 'currentURL');
  var isActive         = router.isActive('homepage', homepageModel);

  equal(isActive, true);
  equal(currentRouteName, 'homepage');
  equal(currentURL, '/homepage/1', 'The URL update correctly');
  equal(jQuery('h3:contains(Megatroll)', '#qunit-fixture').length, 1, 'The homepage template was rendered');
  equal(jQuery('p:contains(Homepage)', '#qunit-fixture').length, 1, 'The model was set');
});

QUnit.test('replaceWith - Basic route', function() {
  Router.map(function() {
    this.route('home', { path: '/' });
    this.route('camelot');
  });

  App.HomeRoute = Route.extend({
  });

  App.CamelotRoute = Route.extend({
  });

  var controller;
  var router;

  App.ApplicationController = Controller.extend({
    router: inject.service(),
    init() {
      this._super.apply(arguments);
      controller = this;
      router = get(this, 'router');
    },
    actions: {
      moveToCamelot() {
        get(this, 'router').replaceWith('camelot');
      }
    }
  });

  App.CamelotController = Controller.extend({
  });

  bootApplication();

  run(function() {
    controller.send('moveToCamelot');
  });

  var currentRouteName = get(router, 'currentRouteName');
  var currentURL       = get(router, 'currentURL');
  var isActive         = router.isActive('camelot');

  equal(isActive, true);
  equal(currentRouteName, 'camelot');
  equal(currentURL, '/camelot', 'The URL update correctly');
  equal(jQuery('h3:contains(silly)', '#qunit-fixture').length, 1, 'The camelot template was rendered');
});

QUnit.test('replaceWith - Dynamic segment', function() {
  Router.map(function() {
    this.route('home', { path: '/' });
    this.route('homepage', { path: 'homepage/:post_id' });
  });

  var homepageModel = { id: 1, home: 'Homepage' };
  var controller;
  var router;

  App.HomeRoute = Route.extend({
  });

  App.HomepageRoute = Route.extend({
    model() {
      return homepageModel;
    }
  });

  App.ApplicationController = Controller.extend({
    router: inject.service(),
    init() {
      this._super.apply(arguments);
      controller = this;
      router = get(this, 'router');
    },

    actions: {
      moveToRoute() {
        get(this, 'router').replaceWith('homepage', homepageModel);
      }
    }
  });

  bootApplication();

  run(function() {
    controller.send('moveToRoute');
  });

  var currentRouteName = get(router, 'currentRouteName');
  var currentURL       = get(router, 'currentURL');
  var isActive         = router.isActive('homepage', homepageModel);

  equal(isActive, true);
  equal(currentRouteName, 'homepage');
  equal(currentURL, '/homepage/1', 'The URL update correctly');
  equal(jQuery('h3:contains(Megatroll)', '#qunit-fixture').length, 1, 'The homepage template was rendered');
  equal(jQuery('p:contains(Homepage)', '#qunit-fixture').length, 1, 'The model was set');
});

QUnit.test('replaceWith - Dynamic segment - model hook', function() {
  Router.map(function() {
    this.route('home', { path: '/' });
    this.route('homepage', { path: 'homepage/:post_id' });
  });

  var homepageModel = { id: 1, home: 'Homepage' };
  var controller;
  var router;

  App.HomeRoute = Route.extend({
  });

  App.HomepageRoute = Route.extend({
    model() {
      return homepageModel;
    }
  });

  App.ApplicationController = Controller.extend({
    router: inject.service(),
    init() {
      this._super.apply(arguments);
      controller = this;
      router = get(this, 'router');
    },

    actions: {
      moveToRoute() {
        get(this, 'router').replaceWith('homepage', 1);
      }
    }
  });

  bootApplication();

  run(function() {
    controller.send('moveToRoute');
  });

  var currentRouteName = get(router, 'currentRouteName');
  var currentURL       = get(router, 'currentURL');
  var isActive         = router.isActive('homepage', homepageModel);

  equal(isActive, true);
  equal(currentRouteName, 'homepage');
  equal(currentURL, '/homepage/1', 'The URL update correctly');
  equal(jQuery('h3:contains(Megatroll)', '#qunit-fixture').length, 1, 'The homepage template was rendered');
  equal(jQuery('p:contains(Homepage)', '#qunit-fixture').length, 1, 'The model was set');
});

QUnit.test('urlFor', function() {
  Router.map(function() {
    this.route('home', { path: '/' });
    this.route('camelot');
    this.route('homepage', { path: 'homepage/:post_id' });
  });

  var homepageModel = { id: 1, home: 'Homepage' };
  var controller;
  var router;

  App.HomeRoute = Route.extend({
  });

  App.HomepageRoute = Route.extend({
    model() {
      return homepageModel;
    }
  });

  App.ApplicationController = Controller.extend({
    router: inject.service(),
    init() {
      this._super.apply(arguments);
      controller = this;
      router = get(this, 'router');
    },

    actions: {
      moveToRoute() {
        get(this, 'router').replaceWith('homepage', 1);
      }
    }
  });

  bootApplication();

  run(function() {
    controller.send('moveToRoute');
  });

  var homeUrl = router.urlFor('home');
  var camelotUrl = router.urlFor('camelot');
  var homepageUrl = router.urlFor('homepage', homepageModel);

  equal(homeUrl, '/');
  equal(camelotUrl, '/camelot');
  equal(homepageUrl, '/homepage/1');
});

QUnit.skip('isActiveFor', function() {
  Router.map(function() {
    this.route('home', { path: '/' });
    this.route('camelot');
    this.route('homepage', { path: 'homepage/:post_id' });
  });

  var homepageModel = { id: 1, home: 'Homepage' };
  var controller;
  var router;

  App.HomeRoute = Route.extend({
  });

  App.HomepageRoute = Route.extend({
    model() {
      return homepageModel;
    }
  });

  App.ApplicationController = Controller.extend({
    router: inject.service(),
    init() {
      this._super.apply(arguments);
      controller = this;
      router = get(this, 'router');
    },

    actions: {
      moveToRoute() {
        get(this, 'router').replaceWith('homepage', 1);
      }
    }
  });

  bootApplication();

  run(function() {
    controller.send('moveToRoute');
  });

  var homeActive = router.isActiveTarget('home');
  var camelotActive = router.isActiveTarget('camelot');
  var homepageActive = router.isActiveTarget('homepage', homepageModel);

  ok(homeActive, 'home would be active');
  ok(camelotActive, 'camelot would be active');
  ok(homepageActive, 'homepage would be active');
});
