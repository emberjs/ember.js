import Ember from 'ember-metal/core'; // TEMPLATES
import RSVP from 'ember-runtime/ext/rsvp';
import Route from 'ember-routing/system/route';
import run from 'ember-metal/run_loop';
import { set } from 'ember-metal/property_set';
import { compile } from 'ember-template-compiler';
import Application from 'ember-application/system/application';
import jQuery from 'ember-views/system/jquery';
import NoneLocation from 'ember-routing/location/none_location';

var Router, App, router, registry, container;

var aboutDefer, otherDefer;

function bootApplication() {
  router = container.lookup('router:main');
  run(App, 'advanceReadiness');
}

var updateCount, replaceCount;

function sharedSetup() {
  App = Application.create({
    name: 'App',
    rootElement: '#qunit-fixture'
  });

  App.deferReadiness();

  updateCount = replaceCount = 0;
  App.Router.reopen({
    location: NoneLocation.create({
      setURL(path) {
        updateCount++;
        set(this, 'path', path);
      },

      replaceURL(path) {
        replaceCount++;
        set(this, 'path', path);
      }
    })
  });

  Router = App.Router;
  registry = App.__registry__;
  container = App.__container__;
}

function sharedTeardown() {
  run(function() { App.destroy(); });
  Ember.TEMPLATES = {};
}

QUnit.module('The {{link-to}} helper: .transitioning-in .transitioning-out CSS classes', {
  setup() {
    run(function() {
      sharedSetup();

      registry.unregister('router:main');
      registry.register('router:main', Router);

      Router.map(function() {
        this.route('about');
        this.route('other');
      });

      App.AboutRoute = Route.extend({
        model() {
          aboutDefer = RSVP.defer();
          return aboutDefer.promise;
        }
      });

      App.OtherRoute = Route.extend({
        model() {
          otherDefer = RSVP.defer();
          return otherDefer.promise;
        }
      });


      Ember.TEMPLATES.application = compile('{{outlet}}{{link-to \'Index\' \'index\' id=\'index-link\'}}{{link-to \'About\' \'about\' id=\'about-link\'}}{{link-to \'Other\' \'other\' id=\'other-link\'}}');
    });
  },

  teardown() {
    sharedTeardown();
    aboutDefer = null;
  }
});

QUnit.test('while a transition is underway', function() {
  expect(18);
  bootApplication();

  function assertHasClass(className) {
    var i = 1;
    while (i < arguments.length) {
      var $a = arguments[i];
      var shouldHaveClass = arguments[i + 1];
      equal($a.hasClass(className), shouldHaveClass, $a.attr('id') + ' should ' + (shouldHaveClass ? '' : 'not ') + 'have class ' + className);
      i += 2;
    }
  }

  var $index = jQuery('#index-link');
  var $about = jQuery('#about-link');
  var $other = jQuery('#other-link');

  run($about, 'click');

  assertHasClass('active', $index, true, $about, false, $other, false);
  assertHasClass('ember-transitioning-in', $index, false, $about, true, $other, false);
  assertHasClass('ember-transitioning-out', $index, true, $about, false, $other, false);

  run(aboutDefer, 'resolve');

  assertHasClass('active', $index, false, $about, true, $other, false);
  assertHasClass('ember-transitioning-in', $index, false, $about, false, $other, false);
  assertHasClass('ember-transitioning-out', $index, false, $about, false, $other, false);
});

QUnit.test('while a transition is underway with nested link-to\'s', function() {
  expect(54);

  Router.map(function() {
    this.route('parent-route', function() {
      this.route('about');
      this.route('other');
    });
  });

  App.ParentRouteAboutRoute = Route.extend({
    model() {
      aboutDefer = RSVP.defer();
      return aboutDefer.promise;
    }
  });

  App.ParentRouteOtherRoute = Route.extend({
    model() {
      otherDefer = RSVP.defer();
      return otherDefer.promise;
    }
  });

  Ember.TEMPLATES.application = compile(`
      {{outlet}}
      {{#link-to 'index' tagName='li'}}
        {{link-to 'Index' 'index' id='index-link'}}
      {{/link-to}}
      {{#link-to 'parent-route.about' tagName='li'}}
        {{link-to 'About' 'parent-route.about' id='about-link'}}
      {{/link-to}}
      {{#link-to 'parent-route.other' tagName='li'}}
        {{link-to 'Other' 'parent-route.other' id='other-link'}}
      {{/link-to}}
    `);

  bootApplication();

  function assertHasClass(className) {
    var i = 1;
    while (i < arguments.length) {
      var $a = arguments[i];
      var shouldHaveClass = arguments[i + 1];
      equal($a.hasClass(className), shouldHaveClass, $a.attr('id') + ' should ' + (shouldHaveClass ? '' : 'not ') + 'have class ' + className);
      i += 2;
    }
  }

  var $index = jQuery('#index-link');
  var $about = jQuery('#about-link');
  var $other = jQuery('#other-link');

  run($about, 'click');

  assertHasClass('active', $index, true, $about, false, $other, false);
  assertHasClass('ember-transitioning-in', $index, false, $about, true, $other, false);
  assertHasClass('ember-transitioning-out', $index, true, $about, false, $other, false);

  run(aboutDefer, 'resolve');

  assertHasClass('active', $index, false, $about, true, $other, false);
  assertHasClass('ember-transitioning-in', $index, false, $about, false, $other, false);
  assertHasClass('ember-transitioning-out', $index, false, $about, false, $other, false);

  run($other, 'click');

  assertHasClass('active', $index, false, $about, true, $other, false);
  assertHasClass('ember-transitioning-in', $index, false, $about, false, $other, true);
  assertHasClass('ember-transitioning-out', $index, false, $about, true, $other, false);

  run(otherDefer, 'resolve');

  assertHasClass('active', $index, false, $about, false, $other, true);
  assertHasClass('ember-transitioning-in', $index, false, $about, false, $other, false);
  assertHasClass('ember-transitioning-out', $index, false, $about, false, $other, false);

  run($about, 'click');

  assertHasClass('active', $index, false, $about, false, $other, true);
  assertHasClass('ember-transitioning-in', $index, false, $about, true, $other, false);
  assertHasClass('ember-transitioning-out', $index, false, $about, false, $other, true);

  run(aboutDefer, 'resolve');

  assertHasClass('active', $index, false, $about, true, $other, false);
  assertHasClass('ember-transitioning-in', $index, false, $about, false, $other, false);
  assertHasClass('ember-transitioning-out', $index, false, $about, false, $other, false);
});
