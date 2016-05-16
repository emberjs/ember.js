import { set } from 'ember-metal/property_set';
import Controller from 'ember-runtime/controllers/controller';
import Route from 'ember-routing/system/route';
import run from 'ember-metal/run_loop';
import isEnabled from 'ember-metal/features';
import { compile } from 'ember-template-compiler';
import Application from 'ember-application/system/application';
import jQuery from 'ember-views/system/jquery';
import NoneLocation from 'ember-routing/location/none_location';
import { setTemplates, set as setTemplate } from 'ember-templates/template_registry';

var Router, App, router, registry, container;

function bootApplication() {
  router = container.lookup('router:main');
  run(App, 'advanceReadiness');
}


function shouldNotBeActive(selector) {
  checkActive(selector, false);
}

function shouldBeActive(selector) {
  checkActive(selector, true);
}

function checkActive(selector, active) {
  var classList = jQuery(selector, '#qunit-fixture')[0].className;
  equal(classList.indexOf('active') > -1, active, selector + ' active should be ' + active.toString());
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
  setTemplates({});
}

import { test, testModule } from 'ember-glimmer/tests/utils/skip-if-glimmer';

if (isEnabled('ember-routing-route-configured-query-params')) {
  testModule('The {{link-to}} helper: invoking with query params when defined on a route', {
    setup() {
      run(function() {
        sharedSetup();
        App.IndexController = Controller.extend({
          boundThing: 'OMG'
        });

        App.IndexRoute = Route.extend({
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

        App.AboutRoute = Route.extend({
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

  // jscs:disable

  test("doesn't update controller QP properties on current route when invoked", function() {
    setTemplate('index', compile("{{#link-to 'index' id='the-link'}}Index{{/link-to}}"));
    bootApplication();

    run(jQuery('#the-link'), 'click');
    var indexController = container.lookup('controller:index');
    deepEqual(indexController.getProperties('foo', 'bar'), { foo: '123', bar: 'abc' }, 'controller QP properties not');
  });

  test("doesn't update controller QP properties on current route when invoked (empty query-params obj)", function() {
    setTemplate('index', compile("{{#link-to 'index' (query-params) id='the-link'}}Index{{/link-to}}"));
    bootApplication();

    run(jQuery('#the-link'), 'click');
    var indexController = container.lookup('controller:index');
    deepEqual(indexController.getProperties('foo', 'bar'), { foo: '123', bar: 'abc' }, 'controller QP properties not');
  });

  test('link-to with no params throws', function() {
    setTemplate('index', compile("{{#link-to id='the-link'}}Index{{/link-to}}"));
    expectAssertion(function() {
      bootApplication();
    }, /one or more/);
  });

  test("doesn't update controller QP properties on current route when invoked (empty query-params obj, inferred route)", function() {
    setTemplate('index', compile("{{#link-to (query-params) id='the-link'}}Index{{/link-to}}"));
    bootApplication();

    run(jQuery('#the-link'), 'click');
    var indexController = container.lookup('controller:index');
    deepEqual(indexController.getProperties('foo', 'bar'), { foo: '123', bar: 'abc' }, 'controller QP properties not');
  });

  test('updates controller QP properties on current route when invoked', function() {
    setTemplate('index', compile("{{#link-to 'index' (query-params foo='456') id='the-link'}}Index{{/link-to}}"));
    bootApplication();

    run(jQuery('#the-link'), 'click');
    var indexController = container.lookup('controller:index');
    deepEqual(indexController.getProperties('foo', 'bar'), { foo: '456', bar: 'abc' }, 'controller QP properties updated');
  });

  test('updates controller QP properties on current route when invoked (inferred route)', function() {
    setTemplate('index', compile("{{#link-to (query-params foo='456') id='the-link'}}Index{{/link-to}}"));
    bootApplication();

    run(jQuery('#the-link'), 'click');
    var indexController = container.lookup('controller:index');
    deepEqual(indexController.getProperties('foo', 'bar'), { foo: '456', bar: 'abc' }, 'controller QP properties updated');
  });

  test('updates controller QP properties on other route after transitioning to that route', function() {
    Router.map(function() {
      this.route('about');
    });

    setTemplate('index', compile("{{#link-to 'about' (query-params baz='lol') id='the-link'}}About{{/link-to}}"));
    bootApplication();

    equal(jQuery('#the-link').attr('href'), '/about?baz=lol');
    run(jQuery('#the-link'), 'click');
    var aboutController = container.lookup('controller:about');
    deepEqual(aboutController.getProperties('baz', 'bat'), { baz: 'lol', bat: 'borf' }, 'about controller QP properties updated');

    equal(container.lookup('controller:application').get('currentPath'), 'about');
  });

  test('supplied QP properties can be bound', function() {
    setTemplate('index', compile("{{#link-to (query-params foo=boundThing) id='the-link'}}Index{{/link-to}}"));
    bootApplication();

    var indexController = container.lookup('controller:index');


    equal(jQuery('#the-link').attr('href'), '/?foo=OMG');
    run(indexController, 'set', 'boundThing', 'ASL');
    equal(jQuery('#the-link').attr('href'), '/?foo=ASL');
  });

  test('supplied QP properties can be bound (booleans)', function() {
    var indexController = container.lookup('controller:index');
    setTemplate('index', compile("{{#link-to (query-params abool=boundThing) id='the-link'}}Index{{/link-to}}"));

    bootApplication();

    equal(jQuery('#the-link').attr('href'), '/?abool=OMG');
    run(indexController, 'set', 'boundThing', false);
    equal(jQuery('#the-link').attr('href'), '/?abool=false');

    run(jQuery('#the-link'), 'click');

    deepEqual(indexController.getProperties('foo', 'bar', 'abool'), { foo: '123', bar: 'abc', abool: false });
  });

  test('href updates when unsupplied controller QP props change', function() {
    setTemplate('index', compile("{{#link-to (query-params foo='lol') id='the-link'}}Index{{/link-to}}"));

    bootApplication();

    var indexController = container.lookup('controller:index');

    equal(jQuery('#the-link').attr('href'), '/?foo=lol');
    run(indexController, 'set', 'bar', 'BORF');
    equal(jQuery('#the-link').attr('href'), '/?bar=BORF&foo=lol');
    run(indexController, 'set', 'foo', 'YEAH');
    equal(jQuery('#the-link').attr('href'), '/?bar=BORF&foo=lol');
  });

  test('The {{link-to}} with only query params always transitions to the current route with the query params applied', function() {
    // Test harness for bug #12033

    setTemplate('cars', compile(
      "{{#link-to 'cars.create' id='create-link'}}Create new car{{/link-to}} " +
      "{{#link-to (query-params page='2') id='page2-link'}}Page 2{{/link-to}}" +
      '{{outlet}}'
    ));

    setTemplate('cars/create', compile(
      "{{#link-to 'cars' id='close-link'}}Close create form{{/link-to}}"
    ));

    Router.map(function() {
      this.route('cars', function() {
        this.route('create');
      });
    });

    App.CarsRoute = Route.extend({
      queryParams: {
        page: { defaultValue: 1 }
      }
    });

    bootApplication();

    run(function() {
      router.handleURL('/cars/create');
    });

    run(function() {
      equal(router.currentRouteName, 'cars.create');
      jQuery('#close-link').click();
    });

    run(function() {
      equal(router.currentRouteName, 'cars.index');
      equal(router.get('url'), '/cars');
      equal(container.lookup('controller:cars').get('page'), 1, 'The page query-param is 1');
      jQuery('#page2-link').click();
    });

    run(function() {
      equal(router.currentRouteName, 'cars.index', 'The active route is still cars');
      equal(router.get('url'), '/cars?page=2', 'The url has been updated');
      equal(container.lookup('controller:cars').get('page'), 2, 'The query params have been updated');
    });
  });

  test('The {{link-to}} applies activeClass when query params are not changed', function() {
    setTemplate('index', compile(
      "{{#link-to (query-params foo='cat') id='cat-link'}}Index{{/link-to}} " +
      "{{#link-to (query-params foo='dog') id='dog-link'}}Index{{/link-to}} " +
      "{{#link-to 'index' id='change-nothing'}}Index{{/link-to}}"
    ));

    setTemplate('search', compile(
      "{{#link-to (query-params search='same') id='same-search'}}Index{{/link-to}} " +
      "{{#link-to (query-params search='change') id='change-search'}}Index{{/link-to}} " +
      "{{#link-to (query-params search='same' archive=true) id='same-search-add-archive'}}Index{{/link-to}} " +
      "{{#link-to (query-params archive=true) id='only-add-archive'}}Index{{/link-to}} " +
      "{{#link-to (query-params search='same' archive=true) id='both-same'}}Index{{/link-to}} " +
      "{{#link-to (query-params search='different' archive=true) id='change-one'}}Index{{/link-to}} " +
      "{{#link-to (query-params search='different' archive=false) id='remove-one'}}Index{{/link-to}} " +
      '{{outlet}}'
    ));

    setTemplate('search/results', compile(
      "{{#link-to (query-params sort='title') id='same-sort-child-only'}}Index{{/link-to}} " +
      "{{#link-to (query-params search='same') id='same-search-parent-only'}}Index{{/link-to}} " +
      "{{#link-to (query-params search='change') id='change-search-parent-only'}}Index{{/link-to}} " +
      "{{#link-to (query-params search='same' sort='title') id='same-search-same-sort-child-and-parent'}}Index{{/link-to}} " +
      "{{#link-to (query-params search='same' sort='author') id='same-search-different-sort-child-and-parent'}}Index{{/link-to}} " +
      "{{#link-to (query-params search='change' sort='title') id='change-search-same-sort-child-and-parent'}}Index{{/link-to}} " +
      "{{#link-to (query-params foo='dog') id='dog-link'}}Index{{/link-to}} "
    ));

    Router.map(function() {
      this.route('search', function() {
        this.route('results');
      });
    });

    App.SearchRoute = Route.extend({
      queryParams: {
        search: {
          defaultValue: ''
        },
        archive: {
          defaultValue: false
        }
      }
    });

    App.SearchResultsRoute = Route.extend({
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
    run(router, 'handleURL', '/?foo=cat');
    shouldBeActive('#cat-link');
    shouldNotBeActive('#dog-link');
    run(router, 'handleURL', '/?foo=dog');
    shouldBeActive('#dog-link');
    shouldNotBeActive('#cat-link');
    shouldBeActive('#change-nothing');

    //Multiple params
    run(function() {
      router.handleURL('/search?search=same');
    });
    shouldBeActive('#same-search');
    shouldNotBeActive('#change-search');
    shouldNotBeActive('#same-search-add-archive');
    shouldNotBeActive('#only-add-archive');
    shouldNotBeActive('#remove-one');

    run(function() {
      router.handleURL('/search?search=same&archive=true');
    });
    shouldBeActive('#both-same');
    shouldNotBeActive('#change-one');

    //Nested Controllers
    run(function() {
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

  test('The {{link-to}} applies active class when query-param is number', function() {
    setTemplate('index', compile(
      "{{#link-to (query-params page=pageNumber) id='page-link'}}Index{{/link-to}} "));

    App.IndexRoute = Route.extend({
      queryParams: {
        page: {
          defaultValue: 1
        }
      }
    });

    App.IndexController = Controller.extend({
      pageNumber: 5
    });

    bootApplication();

    shouldNotBeActive('#page-link');
    run(router, 'handleURL', '/?page=5');
    shouldBeActive('#page-link');
  });

  test('The {{link-to}} applies active class when query-param is array', function() {
    setTemplate('index', compile(
      "{{#link-to (query-params pages=pagesArray) id='array-link'}}Index{{/link-to}} " +
      "{{#link-to (query-params pages=biggerArray) id='bigger-link'}}Index{{/link-to}} " +
      "{{#link-to (query-params pages=emptyArray) id='empty-link'}}Index{{/link-to}} "
    ));

    App.IndexRoute = Route.extend({
      queryParams: {
        pages: {
          defaultValue: []
        }
      }
    });

    App.IndexController = Controller.extend({
      pagesArray: [1, 2],
      biggerArray: [1, 2, 3],
      emptyArray: []
    });


    bootApplication();

    shouldNotBeActive('#array-link');
    run(router, 'handleURL', '/?pages=%5B1%2C2%5D');
    shouldBeActive('#array-link');
    shouldNotBeActive('#bigger-link');
    shouldNotBeActive('#empty-link');
    run(router, 'handleURL', '/?pages=%5B2%2C1%5D');
    shouldNotBeActive('#array-link');
    shouldNotBeActive('#bigger-link');
    shouldNotBeActive('#empty-link');
    run(router, 'handleURL', '/?pages=%5B1%2C2%2C3%5D');
    shouldBeActive('#bigger-link');
    shouldNotBeActive('#array-link');
    shouldNotBeActive('#empty-link');
  });

  test('The {{link-to}} helper applies active class to parent route', function() {
    App.Router.map(function() {
      this.route('parent', function() {
        this.route('child');
      });
    });

    setTemplate('application', compile(
      "{{#link-to 'parent' id='parent-link'}}Parent{{/link-to}} " +
      "{{#link-to 'parent.child' id='parent-child-link'}}Child{{/link-to}} " +
      "{{#link-to 'parent' (query-params foo=cat) id='parent-link-qp'}}Parent{{/link-to}} " +
      '{{outlet}}'
    ));

    App.ParentChildRoute = Route.extend({
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
    run(router, 'handleURL', '/parent/child?foo=dog');
    shouldBeActive('#parent-link');
    shouldNotBeActive('#parent-link-qp');
  });

  test('The {{link-to}} helper disregards query-params in activeness computation when current-when specified', function() {
    App.Router.map(function() {
      this.route('parent');
    });

    setTemplate('application', compile(
      "{{#link-to 'parent' (query-params page=1) current-when='parent' id='app-link'}}Parent{{/link-to}} {{outlet}}"));
    setTemplate('parent', compile(
      "{{#link-to 'parent' (query-params page=1) current-when='parent' id='parent-link'}}Parent{{/link-to}} {{outlet}}"));

    App.ParentRoute = Route.extend({
      queryParams: {
        page: {
          defaultValue: 1
        }
      }
    });

    bootApplication();
    equal(jQuery('#app-link').attr('href'), '/parent');
    shouldNotBeActive('#app-link');

    run(router, 'handleURL', '/parent?page=2');
    equal(jQuery('#app-link').attr('href'), '/parent');
    shouldBeActive('#app-link');
    equal(jQuery('#parent-link').attr('href'), '/parent');
    shouldBeActive('#parent-link');

    var parentController = container.lookup('controller:parent');
    equal(parentController.get('page'), 2);
    run(parentController, 'set', 'page', 3);
    equal(router.get('location.path'), '/parent?page=3');
    shouldBeActive('#app-link');
    shouldBeActive('#parent-link');

    jQuery('#app-link').click();
    equal(router.get('location.path'), '/parent');
  });
} else {
  testModule('The {{link-to}} helper: invoking with query params', {
    setup() {
      run(function() {
        sharedSetup();


        App.IndexController = Controller.extend({
          queryParams: ['foo', 'bar', 'abool'],
          foo: '123',
          bar: 'abc',
          boundThing: 'OMG',
          abool: true
        });

        App.AboutController = Controller.extend({
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

  test("doesn't update controller QP properties on current route when invoked", function() {
    setTemplate('index', compile("{{#link-to 'index' id='the-link'}}Index{{/link-to}}"));
    bootApplication();

    run(jQuery('#the-link'), 'click');
    var indexController = container.lookup('controller:index');
    deepEqual(indexController.getProperties('foo', 'bar'), { foo: '123', bar: 'abc' }, 'controller QP properties not');
  });

  test("doesn't update controller QP properties on current route when invoked (empty query-params obj)", function() {
    setTemplate('index', compile("{{#link-to 'index' (query-params) id='the-link'}}Index{{/link-to}}"));
    bootApplication();

    run(jQuery('#the-link'), 'click');
    var indexController = container.lookup('controller:index');
    deepEqual(indexController.getProperties('foo', 'bar'), { foo: '123', bar: 'abc' }, 'controller QP properties not');
  });

  test('link-to with no params throws', function() {
    setTemplate('index', compile("{{#link-to id='the-link'}}Index{{/link-to}}"));
    expectAssertion(function() {
      bootApplication();
    }, /one or more/);
  });

  test("doesn't update controller QP properties on current route when invoked (empty query-params obj, inferred route)", function() {
    setTemplate('index', compile("{{#link-to (query-params) id='the-link'}}Index{{/link-to}}"));
    bootApplication();

    run(jQuery('#the-link'), 'click');
    var indexController = container.lookup('controller:index');
    deepEqual(indexController.getProperties('foo', 'bar'), { foo: '123', bar: 'abc' }, 'controller QP properties not');
  });

  test('updates controller QP properties on current route when invoked', function() {
    setTemplate('index', compile("{{#link-to 'index' (query-params foo='456') id='the-link'}}Index{{/link-to}}"));
    bootApplication();

    run(jQuery('#the-link'), 'click');
    var indexController = container.lookup('controller:index');
    deepEqual(indexController.getProperties('foo', 'bar'), { foo: '456', bar: 'abc' }, 'controller QP properties updated');
  });

  test('updates controller QP properties on current route when invoked (inferred route)', function() {
    setTemplate('index', compile("{{#link-to (query-params foo='456') id='the-link'}}Index{{/link-to}}"));
    bootApplication();

    run(jQuery('#the-link'), 'click');
    var indexController = container.lookup('controller:index');
    deepEqual(indexController.getProperties('foo', 'bar'), { foo: '456', bar: 'abc' }, 'controller QP properties updated');
  });

  test('updates controller QP properties on other route after transitioning to that route', function() {
    Router.map(function() {
      this.route('about');
    });

    setTemplate('index', compile("{{#link-to 'about' (query-params baz='lol') id='the-link'}}About{{/link-to}}"));
    bootApplication();

    equal(jQuery('#the-link').attr('href'), '/about?baz=lol');
    run(jQuery('#the-link'), 'click');
    var aboutController = container.lookup('controller:about');
    deepEqual(aboutController.getProperties('baz', 'bat'), { baz: 'lol', bat: 'borf' }, 'about controller QP properties updated');

    equal(container.lookup('controller:application').get('currentPath'), 'about');
  });

  test('supplied QP properties can be bound', function() {
    var indexController = container.lookup('controller:index');
    setTemplate('index', compile("{{#link-to (query-params foo=boundThing) id='the-link'}}Index{{/link-to}}"));

    bootApplication();

    equal(jQuery('#the-link').attr('href'), '/?foo=OMG');
    run(indexController, 'set', 'boundThing', 'ASL');
    equal(jQuery('#the-link').attr('href'), '/?foo=ASL');
  });

  test('supplied QP properties can be bound (booleans)', function() {
    var indexController = container.lookup('controller:index');
    setTemplate('index', compile("{{#link-to (query-params abool=boundThing) id='the-link'}}Index{{/link-to}}"));

    bootApplication();

    equal(jQuery('#the-link').attr('href'), '/?abool=OMG');
    run(indexController, 'set', 'boundThing', false);
    equal(jQuery('#the-link').attr('href'), '/?abool=false');

    run(jQuery('#the-link'), 'click');

    deepEqual(indexController.getProperties('foo', 'bar', 'abool'), { foo: '123', bar: 'abc', abool: false });
  });

  test('href updates when unsupplied controller QP props change', function() {
    setTemplate('index', compile("{{#link-to (query-params foo='lol') id='the-link'}}Index{{/link-to}}"));

    bootApplication();
    var indexController = container.lookup('controller:index');

    equal(jQuery('#the-link').attr('href'), '/?foo=lol');
    run(indexController, 'set', 'bar', 'BORF');
    equal(jQuery('#the-link').attr('href'), '/?bar=BORF&foo=lol');
    run(indexController, 'set', 'foo', 'YEAH');
    equal(jQuery('#the-link').attr('href'), '/?bar=BORF&foo=lol');
  });

  test('The {{link-to}} with only query params always transitions to the current route with the query params applied', function() {
    // Test harness for bug #12033

    setTemplate('cars', compile(
      "{{#link-to 'cars.create' id='create-link'}}Create new car{{/link-to}} " +
      "{{#link-to (query-params page='2') id='page2-link'}}Page 2{{/link-to}}" +
      '{{outlet}}'
    ));

    setTemplate('cars/create', compile(
      "{{#link-to 'cars' id='close-link'}}Close create form{{/link-to}}"
    ));

    Router.map(function() {
      this.route('cars', function() {
        this.route('create');
      });
    });

    App.CarsController = Controller.extend({
      queryParams: ['page'],
      page: 1
    });

    bootApplication();

    var carsController = container.lookup('controller:cars');

    run(function() {
      router.handleURL('/cars/create');
    });

    run(function() {
      equal(router.currentRouteName, 'cars.create');
      jQuery('#close-link').click();
    });

    run(function() {
      equal(router.currentRouteName, 'cars.index');
      equal(router.get('url'), '/cars');
      equal(carsController.get('page'), 1, 'The page query-param is 1');
      jQuery('#page2-link').click();
    });

    run(function() {
      equal(router.currentRouteName, 'cars.index', 'The active route is still cars');
      equal(router.get('url'), '/cars?page=2', 'The url has been updated');
      equal(carsController.get('page'), 2, 'The query params have been updated');
    });
  });

  test('The {{link-to}} applies activeClass when query params are not changed', function() {
    setTemplate('index', compile(
      "{{#link-to (query-params foo='cat') id='cat-link'}}Index{{/link-to}} " +
      "{{#link-to (query-params foo='dog') id='dog-link'}}Index{{/link-to}} " +
      "{{#link-to 'index' id='change-nothing'}}Index{{/link-to}}"
    ));

    setTemplate('search', compile(
      "{{#link-to (query-params search='same') id='same-search'}}Index{{/link-to}} " +
      "{{#link-to (query-params search='change') id='change-search'}}Index{{/link-to}} " +
      "{{#link-to (query-params search='same' archive=true) id='same-search-add-archive'}}Index{{/link-to}} " +
      "{{#link-to (query-params archive=true) id='only-add-archive'}}Index{{/link-to}} " +
      "{{#link-to (query-params search='same' archive=true) id='both-same'}}Index{{/link-to}} " +
      "{{#link-to (query-params search='different' archive=true) id='change-one'}}Index{{/link-to}} " +
      "{{#link-to (query-params search='different' archive=false) id='remove-one'}}Index{{/link-to}} " +
      '{{outlet}}'
    ));

    setTemplate('search/results', compile(
      "{{#link-to (query-params sort='title') id='same-sort-child-only'}}Index{{/link-to}} " +
      "{{#link-to (query-params search='same') id='same-search-parent-only'}}Index{{/link-to}} " +
      "{{#link-to (query-params search='change') id='change-search-parent-only'}}Index{{/link-to}} " +
      "{{#link-to (query-params search='same' sort='title') id='same-search-same-sort-child-and-parent'}}Index{{/link-to}} " +
      "{{#link-to (query-params search='same' sort='author') id='same-search-different-sort-child-and-parent'}}Index{{/link-to}} " +
      "{{#link-to (query-params search='change' sort='title') id='change-search-same-sort-child-and-parent'}}Index{{/link-to}} " +
      "{{#link-to (query-params foo='dog') id='dog-link'}}Index{{/link-to}} "
    ));

    Router.map(function() {
      this.route('search', function() {
        this.route('results');
      });
    });

    App.SearchController = Controller.extend({
      queryParams: ['search', 'archive'],
      search: '',
      archive: false
    });

    App.SearchResultsController = Controller.extend({
      queryParams: ['sort', 'showDetails'],
      sort: 'title',
      showDetails: true
    });

    bootApplication();

    //Basic tests
    shouldNotBeActive('#cat-link');
    shouldNotBeActive('#dog-link');
    run(router, 'handleURL', '/?foo=cat');
    shouldBeActive('#cat-link');
    shouldNotBeActive('#dog-link');
    run(router, 'handleURL', '/?foo=dog');
    shouldBeActive('#dog-link');
    shouldNotBeActive('#cat-link');
    shouldBeActive('#change-nothing');

    //Multiple params
    run(function() {
      router.handleURL('/search?search=same');
    });
    shouldBeActive('#same-search');
    shouldNotBeActive('#change-search');
    shouldNotBeActive('#same-search-add-archive');
    shouldNotBeActive('#only-add-archive');
    shouldNotBeActive('#remove-one');

    run(function() {
      router.handleURL('/search?search=same&archive=true');
    });
    shouldBeActive('#both-same');
    shouldNotBeActive('#change-one');

    //Nested Controllers
    run(function() {
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

  test('The {{link-to}} applies active class when query-param is number', function() {
    setTemplate('index', compile(
      "{{#link-to (query-params page=pageNumber) id='page-link'}}Index{{/link-to}} "));

    App.IndexController = Controller.extend({
      queryParams: ['page'],
      page: 1,
      pageNumber: 5
    });

    bootApplication();

    shouldNotBeActive('#page-link');
    run(router, 'handleURL', '/?page=5');
    shouldBeActive('#page-link');
  });

  test('The {{link-to}} applies active class when query-param is array', function() {
    setTemplate('index', compile(
      "{{#link-to (query-params pages=pagesArray) id='array-link'}}Index{{/link-to}} " +
      "{{#link-to (query-params pages=biggerArray) id='bigger-link'}}Index{{/link-to}} " +
      "{{#link-to (query-params pages=emptyArray) id='empty-link'}}Index{{/link-to}} "
    ));

    App.IndexController = Controller.extend({
      queryParams: ['pages'],
      pages: [],
      pagesArray: [1, 2],
      biggerArray: [1, 2, 3],
      emptyArray: []
    });

    bootApplication();

    shouldNotBeActive('#array-link');
    run(router, 'handleURL', '/?pages=%5B1%2C2%5D');
    shouldBeActive('#array-link');
    shouldNotBeActive('#bigger-link');
    shouldNotBeActive('#empty-link');
    run(router, 'handleURL', '/?pages=%5B2%2C1%5D');
    shouldNotBeActive('#array-link');
    shouldNotBeActive('#bigger-link');
    shouldNotBeActive('#empty-link');
    run(router, 'handleURL', '/?pages=%5B1%2C2%2C3%5D');
    shouldBeActive('#bigger-link');
    shouldNotBeActive('#array-link');
    shouldNotBeActive('#empty-link');
  });

  test('The {{link-to}} helper applies active class to parent route', function() {
    App.Router.map(function() {
      this.route('parent', function() {
        this.route('child');
      });
    });

    setTemplate('application', compile(
      "{{#link-to 'parent' id='parent-link'}}Parent{{/link-to}} " +
      "{{#link-to 'parent.child' id='parent-child-link'}}Child{{/link-to}} " +
      "{{#link-to 'parent' (query-params foo=cat) id='parent-link-qp'}}Parent{{/link-to}} " +
      '{{outlet}}'
    ));

    App.ParentChildController = Controller.extend({
      queryParams: ['foo'],
      foo: 'bar'
    });

    bootApplication();
    shouldNotBeActive('#parent-link');
    shouldNotBeActive('#parent-child-link');
    shouldNotBeActive('#parent-link-qp');
    run(router, 'handleURL', '/parent/child?foo=dog');
    shouldBeActive('#parent-link');
    shouldNotBeActive('#parent-link-qp');
  });

  test('The {{link-to}} helper disregards query-params in activeness computation when current-when specified', function() {
    App.Router.map(function() {
      this.route('parent');
    });

    setTemplate('application', compile(
      "{{#link-to 'parent' (query-params page=1) current-when='parent' id='app-link'}}Parent{{/link-to}} {{outlet}}"));
    setTemplate('parent', compile(
      "{{#link-to 'parent' (query-params page=1) current-when='parent' id='parent-link'}}Parent{{/link-to}} {{outlet}}"));

    App.ParentController = Controller.extend({
      queryParams: ['page'],
      page: 1
    });

    bootApplication();
    equal(jQuery('#app-link').attr('href'), '/parent');
    shouldNotBeActive('#app-link');

    run(router, 'handleURL', '/parent?page=2');
    equal(jQuery('#app-link').attr('href'), '/parent');
    shouldBeActive('#app-link');
    equal(jQuery('#parent-link').attr('href'), '/parent');
    shouldBeActive('#parent-link');

    var parentController = container.lookup('controller:parent');
    equal(parentController.get('page'), 2);
    run(parentController, 'set', 'page', 3);
    equal(router.get('location.path'), '/parent?page=3');
    shouldBeActive('#app-link');
    shouldBeActive('#parent-link');

    jQuery('#app-link').click();
    equal(router.get('location.path'), '/parent');
  });
}

