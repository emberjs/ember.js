import Ember from 'ember-metal/core';
import { compile } from 'ember-template-compiler';

var Router, App, router, registry, container;
var set = Ember.set;

var aboutDefer, otherDefer;

function bootApplication() {
  router = container.lookup('router:main');
  Ember.run(App, 'advanceReadiness');
}

var updateCount, replaceCount;

function sharedSetup() {
  App = Ember.Application.create({
    name: 'App',
    rootElement: '#qunit-fixture'
  });

  App.deferReadiness();

  updateCount = replaceCount = 0;
  App.Router.reopen({
    location: Ember.NoneLocation.create({
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
  Ember.run(function() { App.destroy(); });
  Ember.TEMPLATES = {};
}

QUnit.module('The {{link-to}} helper: .transitioning-in .transitioning-out CSS classes', {
  setup() {
    Ember.run(function() {
      sharedSetup();

      registry.unregister('router:main');
      registry.register('router:main', Router);

      Router.map(function() {
        this.route('about');
        this.route('other');
      });

      App.AboutRoute = Ember.Route.extend({
        model() {
          aboutDefer = Ember.RSVP.defer();
          return aboutDefer.promise;
        }
      });

      App.OtherRoute = Ember.Route.extend({
        model() {
          otherDefer = Ember.RSVP.defer();
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

  var $index = Ember.$('#index-link');
  var $about = Ember.$('#about-link');
  var $other = Ember.$('#other-link');

  Ember.run($about, 'click');

  assertHasClass('active', $index, true, $about, false, $other, false);
  assertHasClass('ember-transitioning-in', $index, false, $about, true, $other, false);
  assertHasClass('ember-transitioning-out', $index, true, $about, false, $other, false);

  Ember.run(aboutDefer, 'resolve');

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

  App.ParentRouteAboutRoute = Ember.Route.extend({
    model() {
      aboutDefer = Ember.RSVP.defer();
      return aboutDefer.promise;
    }
  });

  App.ParentRouteOtherRoute = Ember.Route.extend({
    model() {
      otherDefer = Ember.RSVP.defer();
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

  var $index = Ember.$('#index-link');
  var $about = Ember.$('#about-link');
  var $other = Ember.$('#other-link');

  Ember.run($about, 'click');

  assertHasClass('active', $index, true, $about, false, $other, false);
  assertHasClass('ember-transitioning-in', $index, false, $about, true, $other, false);
  assertHasClass('ember-transitioning-out', $index, true, $about, false, $other, false);

  Ember.run(aboutDefer, 'resolve');

  assertHasClass('active', $index, false, $about, true, $other, false);
  assertHasClass('ember-transitioning-in', $index, false, $about, false, $other, false);
  assertHasClass('ember-transitioning-out', $index, false, $about, false, $other, false);

  Ember.run($other, 'click');

  assertHasClass('active', $index, false, $about, true, $other, false);
  assertHasClass('ember-transitioning-in', $index, false, $about, false, $other, true);
  assertHasClass('ember-transitioning-out', $index, false, $about, true, $other, false);

  Ember.run(otherDefer, 'resolve');

  assertHasClass('active', $index, false, $about, false, $other, true);
  assertHasClass('ember-transitioning-in', $index, false, $about, false, $other, false);
  assertHasClass('ember-transitioning-out', $index, false, $about, false, $other, false);

  Ember.run($about, 'click');

  assertHasClass('active', $index, false, $about, false, $other, true);
  assertHasClass('ember-transitioning-in', $index, false, $about, true, $other, false);
  assertHasClass('ember-transitioning-out', $index, false, $about, false, $other, true);

  Ember.run(aboutDefer, 'resolve');

  assertHasClass('active', $index, false, $about, true, $other, false);
  assertHasClass('ember-transitioning-in', $index, false, $about, false, $other, false);
  assertHasClass('ember-transitioning-out', $index, false, $about, false, $other, false);
});
