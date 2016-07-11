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
import { test, asyncTest } from 'ember-glimmer/tests/utils/skip-if-glimmer';
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

QUnit.test('The Homepage', function() {
  Router.map(function() {
    this.route('home', { path: '/' });
    this.route('camelot');
  });

  App.HomeRoute = Route.extend({
  });

  var currentPath;
  var controller;

  App.ApplicationController = Controller.extend({
    router: inject.service(),
    init() {
      this._super.apply(arguments);
      controller = this;
    },
    currentPathDidChange: observer('currentPath', function() {
      currentPath = get(this, 'currentPath');
    }),
    actions: {
      moveToCamelot() {
        get(this, 'router').transitionTo('camelot');
      }
    }
  });

  App.CamelotController = Controller.extend({
    currentPathDidChange: observer('currentPath', function() {
      currentPath = get(this, 'currentPath');
    })
  });

  bootApplication();

  run(function() {
    controller.send('moveToCamelot');
  })

  equal(currentPath, 'camelot');
  equal(jQuery('h3:contains(silly)', '#qunit-fixture').length, 1, 'The camelot template was rendered');
});
