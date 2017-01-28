import { RSVP } from 'ember-runtime';
import { Route, NoneLocation } from 'ember-routing';
import { run, set } from 'ember-metal';
import { compile } from 'ember-template-compiler';
import { Application } from 'ember-application';
import { jQuery } from 'ember-views';
import { setTemplates, setTemplate } from 'ember-glimmer';

let Router, App, registry, container;

let aboutDefer, otherDefer;

function bootApplication() {
  container.lookup('router:main');
  run(App, 'advanceReadiness');
}

function assertHasClass(className) {
  let i = 1;
  while (i < arguments.length) {
    let $a = arguments[i];
    let shouldHaveClass = arguments[i + 1];
    equal($a.hasClass(className), shouldHaveClass, $a.attr('id') + ' should ' + (shouldHaveClass ? '' : 'not ') + 'have class ' + className);
    i += 2;
  }
}

function sharedSetup() {
  App = Application.create({
    name: 'App',
    rootElement: '#qunit-fixture'
  });

  App.deferReadiness();

  App.Router.reopen({
    location: NoneLocation.create({
      setURL(path) {
        set(this, 'path', path);
      },

      replaceURL(path) {
        set(this, 'path', path);
      }
    })
  });

  Router = App.Router;
  registry = App.__registry__;
  container = App.__container__;
}

function sharedTeardown() {
  run(() => App.destroy());
  setTemplates({});
}


QUnit.module('The {{link-to}} helper: .transitioning-in .transitioning-out CSS classes', {
  setup() {
    run(() => {
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

      setTemplate('application', compile('{{outlet}}{{link-to \'Index\' \'index\' id=\'index-link\'}}{{link-to \'About\' \'about\' id=\'about-link\'}}{{link-to \'Other\' \'other\' id=\'other-link\'}}'));
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

  let $index = jQuery('#index-link');
  let $about = jQuery('#about-link');
  let $other = jQuery('#other-link');

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

  setTemplate('application', compile(`
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
  `));

  bootApplication();

  let $index = jQuery('#index-link');
  let $about = jQuery('#about-link');
  let $other = jQuery('#other-link');

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
