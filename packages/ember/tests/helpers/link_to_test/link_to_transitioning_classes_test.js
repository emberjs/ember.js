import "ember";

import EmberHandlebars from "ember-htmlbars/compat";

var compile = EmberHandlebars.compile;

var Router, App, router, registry, container;
var set = Ember.set;

var aboutDefer, otherDefer;

function basicEagerURLUpdateTest(setTagName) {
  expect(6);

  if (setTagName) {
    Ember.TEMPLATES.application = compile("{{outlet}}{{link-to 'Index' 'index' id='index-link'}}{{link-to 'About' 'about' id='about-link' tagName='span'}}");
  }

  bootApplication();
  equal(updateCount, 0);
  Ember.run(Ember.$('#about-link'), 'click');

  // URL should be eagerly updated now
  equal(updateCount, 1);
  equal(router.get('location.path'), '/about');

  // Resolve the promise.
  Ember.run(aboutDefer, 'resolve');
  equal(router.get('location.path'), '/about');

  // Shouldn't have called update url again.
  equal(updateCount, 1);
  equal(router.get('location.path'), '/about');
}

function bootApplication() {
  router = container.lookup('router:main');
  Ember.run(App, 'advanceReadiness');
}

var updateCount, replaceCount;

function sharedSetup() {
  App = Ember.Application.create({
    name: "App",
    rootElement: '#qunit-fixture'
  });

  App.deferReadiness();

  updateCount = replaceCount = 0;
  App.Router.reopen({
    location: Ember.NoneLocation.createWithMixins({
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
  registry = App.registry;
  container = App.__container__;
}

function sharedTeardown() {
  Ember.run(function() { App.destroy(); });
  Ember.TEMPLATES = {};
}
if (Ember.FEATURES.isEnabled('ember-routing-transitioning-classes')) {
  QUnit.module("The {{link-to}} helper: .transitioning-in .transitioning-out CSS classes", {
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


        Ember.TEMPLATES.application = compile("{{outlet}}{{link-to 'Index' 'index' id='index-link'}}{{link-to 'About' 'about' id='about-link'}}{{link-to 'Other' 'other' id='other-link'}}");
      });
    },

    teardown() {
      sharedTeardown();
      aboutDefer = null;
    }
  });

  QUnit.test("while a transition is underway", function() {
    expect(18);
    bootApplication();

    function assertHasClass(className) {
      var i = 1;
      while (i < arguments.length) {
        var $a = arguments[i];
        var shouldHaveClass = arguments[i+1];
        equal($a.hasClass(className), shouldHaveClass, $a.attr('id') + " should " + (shouldHaveClass ? '' : "not ") + "have class " + className);
        i +=2;
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

  QUnit.test("while a transition is underway with nested link-to's", function() {
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
        var shouldHaveClass = arguments[i+1];
        equal($a.hasClass(className), shouldHaveClass, $a.attr('id') + " should " + (shouldHaveClass ? '' : "not ") + "have class " + className);
        i +=2;
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
} else {
  QUnit.module("The {{link-to}} helper: eager URL updating", {
    setup() {
      Ember.run(function() {
        sharedSetup();

        registry.unregister('router:main');
        registry.register('router:main', Router);

        Router.map(function() {
          this.route('about');
        });

        App.AboutRoute = Ember.Route.extend({
          model() {
            aboutDefer = Ember.RSVP.defer();
            return aboutDefer.promise;
          }
        });

        Ember.TEMPLATES.application = compile("{{outlet}}{{link-to 'Index' 'index' id='index-link'}}{{link-to 'About' 'about' id='about-link'}}");
      });
    },

    teardown() {
      sharedTeardown();
      aboutDefer = null;
    }
  });

  QUnit.test("invoking a link-to with a slow promise eager updates url", function() {
    basicEagerURLUpdateTest(false);
  });

  QUnit.test("when link-to eagerly updates url, the path it provides does NOT include the rootURL", function() {
    expect(2);

    // HistoryLocation is the only Location class that will cause rootURL to be
    // prepended to link-to href's right now
    var HistoryTestLocation = Ember.HistoryLocation.extend({
      location: {
        hash: '',
        hostname: 'emberjs.com',
        href: 'http://emberjs.com/app/',
        pathname: '/app/',
        protocol: 'http:',
        port: '',
        search: ''
      },

      // Don't actually touch the URL
      replaceState(path) {},
      pushState(path) {},

      setURL(path) {
        set(this, 'path', path);
      },

      replaceURL(path) {
        set(this, 'path', path);
      }
    });

    registry.register('location:historyTest', HistoryTestLocation);

    Router.reopen({
      location: 'historyTest',
      rootURL: '/app/'
    });

    bootApplication();

    // href should have rootURL prepended
    equal(Ember.$('#about-link').attr('href'), '/app/about');

    Ember.run(Ember.$('#about-link'), 'click');

    // Actual path provided to Location class should NOT have rootURL
    equal(router.get('location.path'), '/about');
  });

  QUnit.test("non `a` tags also eagerly update URL", function() {
    basicEagerURLUpdateTest(true);
  });

  QUnit.test("invoking a link-to with a promise that rejects on the run loop doesn't update url", function() {
    App.AboutRoute = Ember.Route.extend({
      model() {
        return Ember.RSVP.reject();
      }
    });

    bootApplication();
    Ember.run(Ember.$('#about-link'), 'click');

    // Shouldn't have called update url.
    equal(updateCount, 0);
    equal(router.get('location.path'), '', 'url was not updated');
  });

  QUnit.test("invoking a link-to whose transition gets aborted in will transition doesn't update the url", function() {
    App.IndexRoute = Ember.Route.extend({
      actions: {
        willTransition(transition) {
          ok(true, "aborting transition");
          transition.abort();
        }
      }
    });

    bootApplication();
    Ember.run(Ember.$('#about-link'), 'click');

    // Shouldn't have called update url.
    equal(updateCount, 0);
    equal(router.get('location.path'), '', 'url was not updated');
  });

}
