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
import { compile } from 'ember-template-compiler/tests/utils/helpers';
import Application from 'ember-application/system/application';
import { A as emberA } from 'ember-runtime/system/native_array';
import NoneLocation from 'ember-routing/location/none_location';
import HistoryLocation from 'ember-routing/location/history_location';
import { getOwner } from 'container/owner';
import { Transition } from 'router/transition';
import copy from 'ember-runtime/copy';
import { addObserver } from 'ember-metal/observer';
import { setTemplates, set as setTemplate } from 'ember-templates/template_registry';
import { test } from 'internal-test-helpers/tests/skip-if-glimmer';
import inject from 'ember-runtime/inject';


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

  ok(homeActive, "home would be active");
  ok(camelotActive, "camelot would be active");
  ok(homepageActive, "homepage would be active");
});
