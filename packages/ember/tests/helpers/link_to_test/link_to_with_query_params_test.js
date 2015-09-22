import Ember from 'ember-metal/core';
import isEnabled from 'ember-metal/features';
import { compile } from 'ember-template-compiler';

var Router, App, router, registry, container;
var set = Ember.set;

function bootApplication() {
  router = container.lookup('router:main');
  Ember.run(App, 'advanceReadiness');
}


function shouldNotBeActive(selector) {
  checkActive(selector, false);
}

function shouldBeActive(selector) {
  checkActive(selector, true);
}

function checkActive(selector, active) {
  var classList = Ember.$(selector, '#qunit-fixture')[0].className;
  equal(classList.indexOf('active') > -1, active, selector + ' active should be ' + active.toString());
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

if (isEnabled('ember-routing-route-configured-query-params')) {
  QUnit.module('The {{link-to}} helper: invoking with query params when defined on a route', {
    setup() {
      Ember.run(function() {
        sharedSetup();
        App.IndexController = Ember.Controller.extend({
          boundThing: 'OMG'
        });

        App.IndexRoute = Ember.Route.extend({
          queryParams: {
            foo: {
              defaultValue: '123'
            },
            bar: {
              defaultValue: 'abc'
            },
            abool: {
              defaultValue: true
            }
          }
        });

        App.AboutRoute = Ember.Route.extend({
          queryParams: {
            baz: {
              defaultValue: 'alex'
            },
            bat: {
              defaultValue: 'borf'
            }
          }
        });

        registry.unregister('router:main');
        registry.register('router:main', Router);
      });
    },

    teardown: sharedTeardown
  });

  QUnit.test('doesn\'t update controller QP properties on current route when invoked', function() {
    Ember.TEMPLATES.index = compile('{{#link-to \'index\' id=\'the-link\'}}Index{{/link-to}}');
    bootApplication();

    Ember.run(Ember.$('#the-link'), 'click');
    var indexController = container.lookup('controller:index');
    deepEqual(indexController.getProperties('foo', 'bar'), { foo: '123', bar: 'abc' }, 'controller QP properties not');
  });

  QUnit.test('doesn\'t update controller QP properties on current route when invoked (empty query-params obj)', function() {
    Ember.TEMPLATES.index = compile('{{#link-to \'index\' (query-params) id=\'the-link\'}}Index{{/link-to}}');
    bootApplication();

    Ember.run(Ember.$('#the-link'), 'click');
    var indexController = container.lookup('controller:index');
    deepEqual(indexController.getProperties('foo', 'bar'), { foo: '123', bar: 'abc' }, 'controller QP properties not');
  });

  QUnit.test('link-to with no params throws', function() {
    Ember.TEMPLATES.index = compile('{{#link-to id=\'the-link\'}}Index{{/link-to}}');
    expectAssertion(function() {
      bootApplication();
    }, /one or more/);
  });

  QUnit.test('doesn\'t update controller QP properties on current route when invoked (empty query-params obj, inferred route)', function() {
    Ember.TEMPLATES.index = compile('{{#link-to (query-params) id=\'the-link\'}}Index{{/link-to}}');
    bootApplication();

    Ember.run(Ember.$('#the-link'), 'click');
    var indexController = container.lookup('controller:index');
    deepEqual(indexController.getProperties('foo', 'bar'), { foo: '123', bar: 'abc' }, 'controller QP properties not');
  });

  QUnit.test('updates controller QP properties on current route when invoked', function() {
    Ember.TEMPLATES.index = compile('{{#link-to \'index\' (query-params foo=\'456\') id=\'the-link\'}}Index{{/link-to}}');
    bootApplication();

    Ember.run(Ember.$('#the-link'), 'click');
    var indexController = container.lookup('controller:index');
    deepEqual(indexController.getProperties('foo', 'bar'), { foo: '456', bar: 'abc' }, 'controller QP properties updated');
  });

  QUnit.test('updates controller QP properties on current route when invoked (inferred route)', function() {
    Ember.TEMPLATES.index = compile('{{#link-to (query-params foo=\'456\') id=\'the-link\'}}Index{{/link-to}}');
    bootApplication();

    Ember.run(Ember.$('#the-link'), 'click');
    var indexController = container.lookup('controller:index');
    deepEqual(indexController.getProperties('foo', 'bar'), { foo: '456', bar: 'abc' }, 'controller QP properties updated');
  });

  QUnit.test('updates controller QP properties on other route after transitioning to that route', function() {
    Router.map(function() {
      this.route('about');
    });

    Ember.TEMPLATES.index = compile('{{#link-to \'about\' (query-params baz=\'lol\') id=\'the-link\'}}About{{/link-to}}');
    bootApplication();

    equal(Ember.$('#the-link').attr('href'), '/about?baz=lol');
    Ember.run(Ember.$('#the-link'), 'click');
    var aboutController = container.lookup('controller:about');
    deepEqual(aboutController.getProperties('baz', 'bat'), { baz: 'lol', bat: 'borf' }, 'about controller QP properties updated');

    equal(container.lookup('controller:application').get('currentPath'), 'about');
  });

  QUnit.test('supplied QP properties can be bound', function() {
    Ember.TEMPLATES.index = compile('{{#link-to (query-params foo=boundThing) id=\'the-link\'}}Index{{/link-to}}');
    bootApplication();

    var indexController = container.lookup('controller:index');


    equal(Ember.$('#the-link').attr('href'), '/?foo=OMG');
    Ember.run(indexController, 'set', 'boundThing', 'ASL');
    equal(Ember.$('#the-link').attr('href'), '/?foo=ASL');
  });

  QUnit.test('supplied QP properties can be bound (booleans)', function() {
    var indexController = container.lookup('controller:index');
    Ember.TEMPLATES.index = compile('{{#link-to (query-params abool=boundThing) id=\'the-link\'}}Index{{/link-to}}');

    bootApplication();

    equal(Ember.$('#the-link').attr('href'), '/?abool=OMG');
    Ember.run(indexController, 'set', 'boundThing', false);
    equal(Ember.$('#the-link').attr('href'), '/?abool=false');

    Ember.run(Ember.$('#the-link'), 'click');

    deepEqual(indexController.getProperties('foo', 'bar', 'abool'), { foo: '123', bar: 'abc', abool: false });
  });

  QUnit.test('href updates when unsupplied controller QP props change', function() {
    Ember.TEMPLATES.index = compile('{{#link-to (query-params foo=\'lol\') id=\'the-link\'}}Index{{/link-to}}');

    bootApplication();

    var indexController = container.lookup('controller:index');

    equal(Ember.$('#the-link').attr('href'), '/?foo=lol');
    Ember.run(indexController, 'set', 'bar', 'BORF');
    equal(Ember.$('#the-link').attr('href'), '/?bar=BORF&foo=lol');
    Ember.run(indexController, 'set', 'foo', 'YEAH');
    equal(Ember.$('#the-link').attr('href'), '/?bar=BORF&foo=lol');
  });

  QUnit.test('The {{link-to}} with only query params always transitions to the current route with the query params applied', function() {
    // Test harness for bug #12033

    Ember.TEMPLATES.cars = compile(
      '{{#link-to \'cars.create\' id=\'create-link\'}}Create new car{{/link-to}} ' +
      '{{#link-to (query-params page=\'2\') id=\'page2-link\'}}Page 2{{/link-to}}' +
      '{{outlet}}'
    );

    Ember.TEMPLATES['cars/create'] = compile(
      '{{#link-to \'cars\' id=\'close-link\'}}Close create form{{/link-to}}'
    );

    Router.map(function() {
      this.route('cars', function() {
        this.route('create');
      });
    });

    App.CarsRoute = Ember.Route.extend({
      queryParams: {
        page: { defaultValue: 1 }
      }
    });

    bootApplication();

    Ember.run(function() {
      router.handleURL('/cars/create');
    });

    Ember.run(function() {
      equal(router.currentRouteName, 'cars.create');
      Ember.$('#close-link').click();
    });

    Ember.run(function() {
      equal(router.currentRouteName, 'cars.index');
      equal(router.get('url'), '/cars');
      equal(container.lookup('controller:cars').get('page'), 1, 'The page query-param is 1');
      Ember.$('#page2-link').click();
    });

    Ember.run(function() {
      equal(router.currentRouteName, 'cars.index', 'The active route is still cars');
      equal(router.get('url'), '/cars?page=2', 'The url has been updated');
      equal(container.lookup('controller:cars').get('page'), 2, 'The query params have been updated');
    });
  });

  QUnit.test('The {{link-to}} applies activeClass when query params are not changed', function() {
    Ember.TEMPLATES.index = compile(
      '{{#link-to (query-params foo=\'cat\') id=\'cat-link\'}}Index{{/link-to}} ' +
      '{{#link-to (query-params foo=\'dog\') id=\'dog-link\'}}Index{{/link-to}} ' +
      '{{#link-to \'index\' id=\'change-nothing\'}}Index{{/link-to}}'
    );

    Ember.TEMPLATES.search = compile(
      '{{#link-to (query-params search=\'same\') id=\'same-search\'}}Index{{/link-to}} ' +
      '{{#link-to (query-params search=\'change\') id=\'change-search\'}}Index{{/link-to}} ' +
      '{{#link-to (query-params search=\'same\' archive=true) id=\'same-search-add-archive\'}}Index{{/link-to}} ' +
      '{{#link-to (query-params archive=true) id=\'only-add-archive\'}}Index{{/link-to}} ' +
      '{{#link-to (query-params search=\'same\' archive=true) id=\'both-same\'}}Index{{/link-to}} ' +
      '{{#link-to (query-params search=\'different\' archive=true) id=\'change-one\'}}Index{{/link-to}} ' +
      '{{#link-to (query-params search=\'different\' archive=false) id=\'remove-one\'}}Index{{/link-to}} ' +
      '{{outlet}}'
    );

    Ember.TEMPLATES['search/results'] = compile(
      '{{#link-to (query-params sort=\'title\') id=\'same-sort-child-only\'}}Index{{/link-to}} ' +
      '{{#link-to (query-params search=\'same\') id=\'same-search-parent-only\'}}Index{{/link-to}} ' +
      '{{#link-to (query-params search=\'change\') id=\'change-search-parent-only\'}}Index{{/link-to}} ' +
      '{{#link-to (query-params search=\'same\' sort=\'title\') id=\'same-search-same-sort-child-and-parent\'}}Index{{/link-to}} ' +
      '{{#link-to (query-params search=\'same\' sort=\'author\') id=\'same-search-different-sort-child-and-parent\'}}Index{{/link-to}} ' +
      '{{#link-to (query-params search=\'change\' sort=\'title\') id=\'change-search-same-sort-child-and-parent\'}}Index{{/link-to}} ' +
      '{{#link-to (query-params foo=\'dog\') id=\'dog-link\'}}Index{{/link-to}} '
    );

    Router.map(function() {
      this.route('search', function() {
        this.route('results');
      });
    });

    App.SearchRoute = Ember.Route.extend({
      queryParams: {
        search: {
          defaultValue: ''
        },
        archive: {
          defaultValue: false
        }
      }
    });

    App.SearchResultsRoute = Ember.Route.extend({
      queryParams: {
        sort: {
          defaultValue: 'title'
        },
        showDetails: {
          defaultValue: true
        }
      }
    });

    bootApplication();

    //Basic tests
    shouldNotBeActive('#cat-link');
    shouldNotBeActive('#dog-link');
    Ember.run(router, 'handleURL', '/?foo=cat');
    shouldBeActive('#cat-link');
    shouldNotBeActive('#dog-link');
    Ember.run(router, 'handleURL', '/?foo=dog');
    shouldBeActive('#dog-link');
    shouldNotBeActive('#cat-link');
    shouldBeActive('#change-nothing');

    //Multiple params
    Ember.run(function() {
      router.handleURL('/search?search=same');
    });
    shouldBeActive('#same-search');
    shouldNotBeActive('#change-search');
    shouldNotBeActive('#same-search-add-archive');
    shouldNotBeActive('#only-add-archive');
    shouldNotBeActive('#remove-one');

    Ember.run(function() {
      router.handleURL('/search?search=same&archive=true');
    });
    shouldBeActive('#both-same');
    shouldNotBeActive('#change-one');

    //Nested Controllers
    Ember.run(function() {
      // Note: this is kind of a strange case; sort's default value is 'title',
      // so this URL shouldn't have been generated in the first place, but
      // we should also be able to gracefully handle these cases.
      router.handleURL('/search/results?search=same&sort=title&showDetails=true');
    });
    //shouldBeActive('#same-sort-child-only');
    shouldBeActive('#same-search-parent-only');
    shouldNotBeActive('#change-search-parent-only');
    shouldBeActive('#same-search-same-sort-child-and-parent');
    shouldNotBeActive('#same-search-different-sort-child-and-parent');
    shouldNotBeActive('#change-search-same-sort-child-and-parent');
  });

  QUnit.test('The {{link-to}} applies active class when query-param is number', function() {
    Ember.TEMPLATES.index = compile(
      '{{#link-to (query-params page=pageNumber) id=\'page-link\'}}Index{{/link-to}} ');

    App.IndexRoute = Ember.Route.extend({
      queryParams: {
        page: {
          defaultValue: 1
        }
      }
    });

    App.IndexController = Ember.Controller.extend({
      pageNumber: 5
    });

    bootApplication();

    shouldNotBeActive('#page-link');
    Ember.run(router, 'handleURL', '/?page=5');
    shouldBeActive('#page-link');
  });

  QUnit.test('The {{link-to}} applies active class when query-param is array', function() {
    Ember.TEMPLATES.index = compile(
      '{{#link-to (query-params pages=pagesArray) id=\'array-link\'}}Index{{/link-to}} ' +
      '{{#link-to (query-params pages=biggerArray) id=\'bigger-link\'}}Index{{/link-to}} ' +
      '{{#link-to (query-params pages=emptyArray) id=\'empty-link\'}}Index{{/link-to}} '
    );

    App.IndexRoute = Ember.Route.extend({
      queryParams: {
        pages: {
          defaultValue: []
        }
      }
    });

    App.IndexController = Ember.Controller.extend({
      pagesArray: [1, 2],
      biggerArray: [1, 2, 3],
      emptyArray: []
    });


    bootApplication();

    shouldNotBeActive('#array-link');
    Ember.run(router, 'handleURL', '/?pages=%5B1%2C2%5D');
    shouldBeActive('#array-link');
    shouldNotBeActive('#bigger-link');
    shouldNotBeActive('#empty-link');
    Ember.run(router, 'handleURL', '/?pages=%5B2%2C1%5D');
    shouldNotBeActive('#array-link');
    shouldNotBeActive('#bigger-link');
    shouldNotBeActive('#empty-link');
    Ember.run(router, 'handleURL', '/?pages=%5B1%2C2%2C3%5D');
    shouldBeActive('#bigger-link');
    shouldNotBeActive('#array-link');
    shouldNotBeActive('#empty-link');
  });

  QUnit.test('The {{link-to}} helper applies active class to parent route', function() {
    App.Router.map(function() {
      this.route('parent', function() {
        this.route('child');
      });
    });

    Ember.TEMPLATES.application = compile(
      '{{#link-to \'parent\' id=\'parent-link\'}}Parent{{/link-to}} ' +
      '{{#link-to \'parent.child\' id=\'parent-child-link\'}}Child{{/link-to}} ' +
      '{{#link-to \'parent\' (query-params foo=cat) id=\'parent-link-qp\'}}Parent{{/link-to}} ' +
      '{{outlet}}'
    );

    App.ParentChildRoute = Ember.Route.extend({
      queryParams: {
        foo: {
          defaultValue: 'bar'
        }
      }
    });

    bootApplication();
    shouldNotBeActive('#parent-link');
    shouldNotBeActive('#parent-child-link');
    shouldNotBeActive('#parent-link-qp');
    Ember.run(router, 'handleURL', '/parent/child?foo=dog');
    shouldBeActive('#parent-link');
    shouldNotBeActive('#parent-link-qp');
  });

  QUnit.test('The {{link-to}} helper disregards query-params in activeness computation when current-when specified', function() {
    App.Router.map(function() {
      this.route('parent');
    });

    Ember.TEMPLATES.application = compile(
      '{{#link-to \'parent\' (query-params page=1) current-when=\'parent\' id=\'app-link\'}}Parent{{/link-to}} {{outlet}}');
    Ember.TEMPLATES.parent = compile(
      '{{#link-to \'parent\' (query-params page=1) current-when=\'parent\' id=\'parent-link\'}}Parent{{/link-to}} {{outlet}}');

    App.ParentRoute = Ember.Route.extend({
      queryParams: {
        page: {
          defaultValue: 1
        }
      }
    });

    bootApplication();
    equal(Ember.$('#app-link').attr('href'), '/parent');
    shouldNotBeActive('#app-link');

    Ember.run(router, 'handleURL', '/parent?page=2');
    equal(Ember.$('#app-link').attr('href'), '/parent');
    shouldBeActive('#app-link');
    equal(Ember.$('#parent-link').attr('href'), '/parent');
    shouldBeActive('#parent-link');

    var parentController = container.lookup('controller:parent');
    equal(parentController.get('page'), 2);
    Ember.run(parentController, 'set', 'page', 3);
    equal(router.get('location.path'), '/parent?page=3');
    shouldBeActive('#app-link');
    shouldBeActive('#parent-link');

    Ember.$('#app-link').click();
    equal(router.get('location.path'), '/parent');
  });
} else {
  QUnit.module('The {{link-to}} helper: invoking with query params', {
    setup() {
      Ember.run(function() {
        sharedSetup();


        App.IndexController = Ember.Controller.extend({
          queryParams: ['foo', 'bar', 'abool'],
          foo: '123',
          bar: 'abc',
          boundThing: 'OMG',
          abool: true
        });

        App.AboutController = Ember.Controller.extend({
          queryParams: ['baz', 'bat'],
          baz: 'alex',
          bat: 'borf'
        });

        registry.unregister('router:main');
        registry.register('router:main', Router);
      });
    },

    teardown: sharedTeardown
  });

  QUnit.test('doesn\'t update controller QP properties on current route when invoked', function() {
    Ember.TEMPLATES.index = compile('{{#link-to \'index\' id=\'the-link\'}}Index{{/link-to}}');
    bootApplication();

    Ember.run(Ember.$('#the-link'), 'click');
    var indexController = container.lookup('controller:index');
    deepEqual(indexController.getProperties('foo', 'bar'), { foo: '123', bar: 'abc' }, 'controller QP properties not');
  });

  QUnit.test('doesn\'t update controller QP properties on current route when invoked (empty query-params obj)', function() {
    Ember.TEMPLATES.index = compile('{{#link-to \'index\' (query-params) id=\'the-link\'}}Index{{/link-to}}');
    bootApplication();

    Ember.run(Ember.$('#the-link'), 'click');
    var indexController = container.lookup('controller:index');
    deepEqual(indexController.getProperties('foo', 'bar'), { foo: '123', bar: 'abc' }, 'controller QP properties not');
  });

  QUnit.test('link-to with no params throws', function() {
    Ember.TEMPLATES.index = compile('{{#link-to id=\'the-link\'}}Index{{/link-to}}');
    expectAssertion(function() {
      bootApplication();
    }, /one or more/);
  });

  QUnit.test('doesn\'t update controller QP properties on current route when invoked (empty query-params obj, inferred route)', function() {
    Ember.TEMPLATES.index = compile('{{#link-to (query-params) id=\'the-link\'}}Index{{/link-to}}');
    bootApplication();

    Ember.run(Ember.$('#the-link'), 'click');
    var indexController = container.lookup('controller:index');
    deepEqual(indexController.getProperties('foo', 'bar'), { foo: '123', bar: 'abc' }, 'controller QP properties not');
  });

  QUnit.test('updates controller QP properties on current route when invoked', function() {
    Ember.TEMPLATES.index = compile('{{#link-to \'index\' (query-params foo=\'456\') id=\'the-link\'}}Index{{/link-to}}');
    bootApplication();

    Ember.run(Ember.$('#the-link'), 'click');
    var indexController = container.lookup('controller:index');
    deepEqual(indexController.getProperties('foo', 'bar'), { foo: '456', bar: 'abc' }, 'controller QP properties updated');
  });

  QUnit.test('updates controller QP properties on current route when invoked (inferred route)', function() {
    Ember.TEMPLATES.index = compile('{{#link-to (query-params foo=\'456\') id=\'the-link\'}}Index{{/link-to}}');
    bootApplication();

    Ember.run(Ember.$('#the-link'), 'click');
    var indexController = container.lookup('controller:index');
    deepEqual(indexController.getProperties('foo', 'bar'), { foo: '456', bar: 'abc' }, 'controller QP properties updated');
  });

  QUnit.test('updates controller QP properties on other route after transitioning to that route', function() {
    Router.map(function() {
      this.route('about');
    });

    Ember.TEMPLATES.index = compile('{{#link-to \'about\' (query-params baz=\'lol\') id=\'the-link\'}}About{{/link-to}}');
    bootApplication();

    equal(Ember.$('#the-link').attr('href'), '/about?baz=lol');
    Ember.run(Ember.$('#the-link'), 'click');
    var aboutController = container.lookup('controller:about');
    deepEqual(aboutController.getProperties('baz', 'bat'), { baz: 'lol', bat: 'borf' }, 'about controller QP properties updated');

    equal(container.lookup('controller:application').get('currentPath'), 'about');
  });

  QUnit.test('supplied QP properties can be bound', function() {
    var indexController = container.lookup('controller:index');
    Ember.TEMPLATES.index = compile('{{#link-to (query-params foo=boundThing) id=\'the-link\'}}Index{{/link-to}}');

    bootApplication();

    equal(Ember.$('#the-link').attr('href'), '/?foo=OMG');
    Ember.run(indexController, 'set', 'boundThing', 'ASL');
    equal(Ember.$('#the-link').attr('href'), '/?foo=ASL');
  });

  QUnit.test('supplied QP properties can be bound (booleans)', function() {
    var indexController = container.lookup('controller:index');
    Ember.TEMPLATES.index = compile('{{#link-to (query-params abool=boundThing) id=\'the-link\'}}Index{{/link-to}}');

    bootApplication();

    equal(Ember.$('#the-link').attr('href'), '/?abool=OMG');
    Ember.run(indexController, 'set', 'boundThing', false);
    equal(Ember.$('#the-link').attr('href'), '/?abool=false');

    Ember.run(Ember.$('#the-link'), 'click');

    deepEqual(indexController.getProperties('foo', 'bar', 'abool'), { foo: '123', bar: 'abc', abool: false });
  });

  QUnit.test('href updates when unsupplied controller QP props change', function() {
    Ember.TEMPLATES.index = compile('{{#link-to (query-params foo=\'lol\') id=\'the-link\'}}Index{{/link-to}}');

    bootApplication();
    var indexController = container.lookup('controller:index');

    equal(Ember.$('#the-link').attr('href'), '/?foo=lol');
    Ember.run(indexController, 'set', 'bar', 'BORF');
    equal(Ember.$('#the-link').attr('href'), '/?bar=BORF&foo=lol');
    Ember.run(indexController, 'set', 'foo', 'YEAH');
    equal(Ember.$('#the-link').attr('href'), '/?bar=BORF&foo=lol');
  });

  QUnit.test('The {{link-to}} with only query params always transitions to the current route with the query params applied', function() {
    // Test harness for bug #12033

    Ember.TEMPLATES.cars = compile(
      '{{#link-to \'cars.create\' id=\'create-link\'}}Create new car{{/link-to}} ' +
      '{{#link-to (query-params page=\'2\') id=\'page2-link\'}}Page 2{{/link-to}}' +
      '{{outlet}}'
    );

    Ember.TEMPLATES['cars/create'] = compile(
      '{{#link-to \'cars\' id=\'close-link\'}}Close create form{{/link-to}}'
    );

    Router.map(function() {
      this.route('cars', function() {
        this.route('create');
      });
    });

    App.CarsController = Ember.Controller.extend({
      queryParams: ['page'],
      page: 1
    });

    bootApplication();

    var carsController = container.lookup('controller:cars');

    Ember.run(function() {
      router.handleURL('/cars/create');
    });

    Ember.run(function() {
      equal(router.currentRouteName, 'cars.create');
      Ember.$('#close-link').click();
    });

    Ember.run(function() {
      equal(router.currentRouteName, 'cars.index');
      equal(router.get('url'), '/cars');
      equal(carsController.get('page'), 1, 'The page query-param is 1');
      Ember.$('#page2-link').click();
    });

    Ember.run(function() {
      equal(router.currentRouteName, 'cars.index', 'The active route is still cars');
      equal(router.get('url'), '/cars?page=2', 'The url has been updated');
      equal(carsController.get('page'), 2, 'The query params have been updated');
    });
  });

  QUnit.test('The {{link-to}} applies activeClass when query params are not changed', function() {
    Ember.TEMPLATES.index = compile(
      '{{#link-to (query-params foo=\'cat\') id=\'cat-link\'}}Index{{/link-to}} ' +
      '{{#link-to (query-params foo=\'dog\') id=\'dog-link\'}}Index{{/link-to}} ' +
      '{{#link-to \'index\' id=\'change-nothing\'}}Index{{/link-to}}'
    );

    Ember.TEMPLATES.search = compile(
      '{{#link-to (query-params search=\'same\') id=\'same-search\'}}Index{{/link-to}} ' +
      '{{#link-to (query-params search=\'change\') id=\'change-search\'}}Index{{/link-to}} ' +
      '{{#link-to (query-params search=\'same\' archive=true) id=\'same-search-add-archive\'}}Index{{/link-to}} ' +
      '{{#link-to (query-params archive=true) id=\'only-add-archive\'}}Index{{/link-to}} ' +
      '{{#link-to (query-params search=\'same\' archive=true) id=\'both-same\'}}Index{{/link-to}} ' +
      '{{#link-to (query-params search=\'different\' archive=true) id=\'change-one\'}}Index{{/link-to}} ' +
      '{{#link-to (query-params search=\'different\' archive=false) id=\'remove-one\'}}Index{{/link-to}} ' +
      '{{outlet}}'
    );

    Ember.TEMPLATES['search/results'] = compile(
      '{{#link-to (query-params sort=\'title\') id=\'same-sort-child-only\'}}Index{{/link-to}} ' +
      '{{#link-to (query-params search=\'same\') id=\'same-search-parent-only\'}}Index{{/link-to}} ' +
      '{{#link-to (query-params search=\'change\') id=\'change-search-parent-only\'}}Index{{/link-to}} ' +
      '{{#link-to (query-params search=\'same\' sort=\'title\') id=\'same-search-same-sort-child-and-parent\'}}Index{{/link-to}} ' +
      '{{#link-to (query-params search=\'same\' sort=\'author\') id=\'same-search-different-sort-child-and-parent\'}}Index{{/link-to}} ' +
      '{{#link-to (query-params search=\'change\' sort=\'title\') id=\'change-search-same-sort-child-and-parent\'}}Index{{/link-to}} ' +
      '{{#link-to (query-params foo=\'dog\') id=\'dog-link\'}}Index{{/link-to}} '
    );

    Router.map(function() {
      this.route('search', function() {
        this.route('results');
      });
    });

    App.SearchController = Ember.Controller.extend({
      queryParams: ['search', 'archive'],
      search: '',
      archive: false
    });

    App.SearchResultsController = Ember.Controller.extend({
      queryParams: ['sort', 'showDetails'],
      sort: 'title',
      showDetails: true
    });

    bootApplication();

    //Basic tests
    shouldNotBeActive('#cat-link');
    shouldNotBeActive('#dog-link');
    Ember.run(router, 'handleURL', '/?foo=cat');
    shouldBeActive('#cat-link');
    shouldNotBeActive('#dog-link');
    Ember.run(router, 'handleURL', '/?foo=dog');
    shouldBeActive('#dog-link');
    shouldNotBeActive('#cat-link');
    shouldBeActive('#change-nothing');

    //Multiple params
    Ember.run(function() {
      router.handleURL('/search?search=same');
    });
    shouldBeActive('#same-search');
    shouldNotBeActive('#change-search');
    shouldNotBeActive('#same-search-add-archive');
    shouldNotBeActive('#only-add-archive');
    shouldNotBeActive('#remove-one');

    Ember.run(function() {
      router.handleURL('/search?search=same&archive=true');
    });
    shouldBeActive('#both-same');
    shouldNotBeActive('#change-one');

    //Nested Controllers
    Ember.run(function() {
      // Note: this is kind of a strange case; sort's default value is 'title',
      // so this URL shouldn't have been generated in the first place, but
      // we should also be able to gracefully handle these cases.
      router.handleURL('/search/results?search=same&sort=title&showDetails=true');
    });
    //shouldBeActive('#same-sort-child-only');
    shouldBeActive('#same-search-parent-only');
    shouldNotBeActive('#change-search-parent-only');
    shouldBeActive('#same-search-same-sort-child-and-parent');
    shouldNotBeActive('#same-search-different-sort-child-and-parent');
    shouldNotBeActive('#change-search-same-sort-child-and-parent');
  });

  QUnit.test('The {{link-to}} applies active class when query-param is number', function() {
    Ember.TEMPLATES.index = compile(
      '{{#link-to (query-params page=pageNumber) id=\'page-link\'}}Index{{/link-to}} ');

    App.IndexController = Ember.Controller.extend({
      queryParams: ['page'],
      page: 1,
      pageNumber: 5
    });

    bootApplication();

    shouldNotBeActive('#page-link');
    Ember.run(router, 'handleURL', '/?page=5');
    shouldBeActive('#page-link');
  });

  QUnit.test('The {{link-to}} applies active class when query-param is array', function() {
    Ember.TEMPLATES.index = compile(
      '{{#link-to (query-params pages=pagesArray) id=\'array-link\'}}Index{{/link-to}} ' +
      '{{#link-to (query-params pages=biggerArray) id=\'bigger-link\'}}Index{{/link-to}} ' +
      '{{#link-to (query-params pages=emptyArray) id=\'empty-link\'}}Index{{/link-to}} '
    );

    App.IndexController = Ember.Controller.extend({
      queryParams: ['pages'],
      pages: [],
      pagesArray: [1, 2],
      biggerArray: [1, 2, 3],
      emptyArray: []
    });

    bootApplication();

    shouldNotBeActive('#array-link');
    Ember.run(router, 'handleURL', '/?pages=%5B1%2C2%5D');
    shouldBeActive('#array-link');
    shouldNotBeActive('#bigger-link');
    shouldNotBeActive('#empty-link');
    Ember.run(router, 'handleURL', '/?pages=%5B2%2C1%5D');
    shouldNotBeActive('#array-link');
    shouldNotBeActive('#bigger-link');
    shouldNotBeActive('#empty-link');
    Ember.run(router, 'handleURL', '/?pages=%5B1%2C2%2C3%5D');
    shouldBeActive('#bigger-link');
    shouldNotBeActive('#array-link');
    shouldNotBeActive('#empty-link');
  });

  QUnit.test('The {{link-to}} helper applies active class to parent route', function() {
    App.Router.map(function() {
      this.route('parent', function() {
        this.route('child');
      });
    });

    Ember.TEMPLATES.application = compile(
      '{{#link-to \'parent\' id=\'parent-link\'}}Parent{{/link-to}} ' +
      '{{#link-to \'parent.child\' id=\'parent-child-link\'}}Child{{/link-to}} ' +
      '{{#link-to \'parent\' (query-params foo=cat) id=\'parent-link-qp\'}}Parent{{/link-to}} ' +
      '{{outlet}}'
    );

    App.ParentChildController = Ember.Controller.extend({
      queryParams: ['foo'],
      foo: 'bar'
    });

    bootApplication();
    shouldNotBeActive('#parent-link');
    shouldNotBeActive('#parent-child-link');
    shouldNotBeActive('#parent-link-qp');
    Ember.run(router, 'handleURL', '/parent/child?foo=dog');
    shouldBeActive('#parent-link');
    shouldNotBeActive('#parent-link-qp');
  });

  QUnit.test('The {{link-to}} helper disregards query-params in activeness computation when current-when specified', function() {
    App.Router.map(function() {
      this.route('parent');
    });

    Ember.TEMPLATES.application = compile(
      '{{#link-to \'parent\' (query-params page=1) current-when=\'parent\' id=\'app-link\'}}Parent{{/link-to}} {{outlet}}');
    Ember.TEMPLATES.parent = compile(
      '{{#link-to \'parent\' (query-params page=1) current-when=\'parent\' id=\'parent-link\'}}Parent{{/link-to}} {{outlet}}');

    App.ParentController = Ember.Controller.extend({
      queryParams: ['page'],
      page: 1
    });

    bootApplication();
    equal(Ember.$('#app-link').attr('href'), '/parent');
    shouldNotBeActive('#app-link');

    Ember.run(router, 'handleURL', '/parent?page=2');
    equal(Ember.$('#app-link').attr('href'), '/parent');
    shouldBeActive('#app-link');
    equal(Ember.$('#parent-link').attr('href'), '/parent');
    shouldBeActive('#parent-link');

    var parentController = container.lookup('controller:parent');
    equal(parentController.get('page'), 2);
    Ember.run(parentController, 'set', 'page', 3);
    equal(router.get('location.path'), '/parent?page=3');
    shouldBeActive('#app-link');
    shouldBeActive('#parent-link');

    Ember.$('#app-link').click();
    equal(router.get('location.path'), '/parent');
  });
}
