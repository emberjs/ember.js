import Controller from 'ember-runtime/controllers/controller';
import Route from 'ember-routing/system/route';
import run from 'ember-metal/run_loop';
import get from 'ember-metal/property_get';
import EmberObject from 'ember-runtime/system/object';
import isEnabled from 'ember-metal/features';
import { computed } from 'ember-metal/computed';
import { compile } from 'ember-template-compiler';
import Application from 'ember-application/system/application';
import jQuery from 'ember-views/system/jquery';
import { A as emberA } from 'ember-runtime/system/native_array';
import NoneLocation from 'ember-routing/location/none_location';
import { setTemplates } from 'ember-templates/template_registry';
import { dasherize } from 'ember-runtime/system/string';
import Mixin from 'ember-metal/mixin';
import { meta } from 'ember-metal/meta';

var App, router, container;

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

var startingURL = '';
var expectedReplaceURL, expectedPushURL;

function setAndFlush(obj, prop, value) {
  run(obj, 'set', prop, value);
}

var TestLocation = NoneLocation.extend({
  initState() {
    this.set('path', startingURL);
  },

  setURL(path) {
    if (expectedReplaceURL) {
      ok(false, 'pushState occurred but a replaceState was expected');
    }
    if (expectedPushURL) {
      equal(path, expectedPushURL, 'an expected pushState occurred');
      expectedPushURL = null;
    }
    this.set('path', path);
  },

  replaceURL(path) {
    if (expectedPushURL) {
      ok(false, 'replaceState occurred but a pushState was expected');
    }
    if (expectedReplaceURL) {
      equal(path, expectedReplaceURL, 'an expected replaceState occurred');
      expectedReplaceURL = null;
    }
    this.set('path', path);
  }
});

function sharedSetup() {
  run(function() {
    App = Application.create({
      name: 'App',
      rootElement: '#qunit-fixture'
    });

    App.deferReadiness();

    container = App.__container__;

    App.register('location:test', TestLocation);

    startingURL = expectedReplaceURL = expectedPushURL = '';

    App.Router.reopen({
      location: 'test'
    });

    App.LoadingRoute = Route.extend({
    });

    App.register('template:application', compile('{{outlet}}'));
    App.register('template:home', compile('<h3>Hours</h3>'));
  });
}

function sharedTeardown() {
  try {
    run(function() {
      App.destroy();
      App = null;
    });
  } finally {
    setTemplates({});
  }
}

import { test, testModule } from 'ember-glimmer/tests/utils/skip-if-glimmer';
// jscs:disable

testModule('Routing with Query Params', {
  setup() {
    sharedSetup();
  },

  teardown() {
    sharedTeardown();
  }
});

if (isEnabled('ember-routing-route-configured-query-params')) {
  test('Single query params can be set on the route', function() {
    App.Router.map(function() {
      this.route('home', { path: '/' });
    });

    App.HomeRoute = Route.extend({
      queryParams: {
        foo: {
          defaultValue: '123'
        }
      }
    });

    bootApplication();

    var controller = container.lookup('controller:home');

    setAndFlush(controller, 'foo', '456');

    equal(router.get('location.path'), '/?foo=456');

    setAndFlush(controller, 'foo', '987');
    equal(router.get('location.path'), '/?foo=987');
  });

  test('a query param can have define a `type` for type casting', function() {
    App.Router.map(function() {
      this.route('home', { path: '/' });
    });

    App.HomeRoute = Route.extend({
      queryParams: {
        page: {
          defaultValue: null,
          type: 'number'
        }
      }
    });

    bootApplication();

    var controller = container.lookup('controller:home');

    run(router, 'transitionTo', 'home', { queryParams: { page: '4' } });
    equal(controller.get('page'), 4);
  });

  test('Query params can map to different url keys configured on the route', function() {
    App.IndexRoute = Route.extend({
      queryParams: {
        foo: { as: 'other_foo', defaultValue: 'FOO' },
        bar: { as: 'other_bar', defaultValue: 'BAR' }
      }
    });

    bootApplication();
    equal(router.get('location.path'), '');

    var controller = container.lookup('controller:index');

    setAndFlush(controller, 'foo', 'LEX');

    equal(router.get('location.path'), '/?other_foo=LEX');
    setAndFlush(controller, 'foo', 'WOO');
    equal(router.get('location.path'), '/?other_foo=WOO');

    run(router, 'transitionTo', '/?other_foo=NAW');
    equal(controller.get('foo'), 'NAW');

    setAndFlush(controller, 'bar', 'NERK');
    run(router, 'transitionTo', '/?other_bar=NERK&other_foo=NAW');
  });

  test('Routes have overridable serializeQueryParamKey hook and it works with route-configured query params', function() {
    App.IndexRoute = Route.extend({
      queryParams: {
        funTimes: {
          defaultValue: ''
        }
      },
      serializeQueryParamKey: dasherize
    });

    bootApplication();
    equal(router.get('location.path'), '');

    var controller = container.lookup('controller:index');
    setAndFlush(controller, 'funTimes', 'woot');

    equal(router.get('location.path'), '/?fun-times=woot');
  });

  test('No replaceURL occurs on startup when configured via Route because default values don\'t show up in URL', function() {
    expect(0);

    App.IndexRoute = Route.extend({
      queryParams: {
        foo: {
          defaultValue: '123'
        }
      }
    });

    expectedReplaceURL = '/?foo=123';

    bootApplication();
  });

  test('model hooks receives query params when configred on Route', function() {
    App.IndexRoute = Route.extend({
      queryParams: {
        omg: {
          defaultValue: 'lol'
        }
      },
      model(params) {
        deepEqual(params, { omg: 'lol' });
      }
    });

    bootApplication();

    equal(router.get('location.path'), '');
  });

  test('model hooks receives query params (overridden by incoming url value) when configured on route', function() {
    App.IndexRoute = Route.extend({
      queryParams: {
        omg: {
          defaultValue: 'lol'
        }
      },
      model(params) {
        deepEqual(params, { omg: 'yes' });
      }
    });

    startingURL = '/?omg=yes';
    bootApplication();

    equal(router.get('location.path'), '/?omg=yes');
  });

  test('Route#paramsFor fetches query params when configured on the route', function() {
    expect(1);

    App.Router.map(function() {
      this.route('index', { path: '/:something' });
    });

    App.IndexRoute = Route.extend({
      queryParams: {
        foo: {
          defaultValue: 'fooapp'
        }
      },
      model(params, transition) {
        deepEqual(this.paramsFor('index'), { something: 'omg', foo: 'fooapp' }, 'could retrieve params for index');
      }
    });

    startingURL = '/omg';
    bootApplication();
  });

  test('Route#paramsFor fetches falsy query params when they\'re configured on the route', function() {
    expect(1);

    App.IndexRoute = Route.extend({
      queryParams: {
        foo: {
          defaultValue: true
        }
      },
      model(params, transition) {
        equal(params.foo, false);
      }
    });

    startingURL = '/?foo=false';
    bootApplication();
  });

  test('model hook can query prefix-less application params when they\'re configured on the route', function() {
    App.ApplicationRoute = Route.extend({
      queryParams: {
        appomg: {
          defaultValue: 'applol'
        }
      },
      model(params) {
        deepEqual(params, { appomg: 'applol' });
      }
    });

    App.IndexRoute = Route.extend({
      queryParams: {
        omg: {
          defaultValue: 'lol'
        }
      },
      model(params) {
        deepEqual(params, { omg: 'lol' });
        deepEqual(this.paramsFor('application'), { appomg: 'applol' });
      }
    });

    bootApplication();

    equal(router.get('location.path'), '');
  });

  test('can opt into full transition by setting refreshModel in route queryParams when all configuration is in route', function() {
    expect(6);

    var appModelCount = 0;
    App.ApplicationRoute = Route.extend({
      queryParams: {
        'appomg': {
          defaultValue: 'applol'
        }
      },
      model(params) {
        appModelCount++;
      }
    });

    var indexModelCount = 0;
    App.IndexRoute = Route.extend({
      queryParams: {
        omg: {
          refreshModel: true,
          defaultValue: 'lol'
        }
      },
      model(params) {
        indexModelCount++;

        if (indexModelCount === 1) {
          deepEqual(params, { omg: 'lol' });
        } else if (indexModelCount === 2) {
          deepEqual(params, { omg: 'lex' });
        }
      }
    });

    bootApplication();

    equal(appModelCount, 1);
    equal(indexModelCount, 1);

    var indexController = container.lookup('controller:index');
    setAndFlush(indexController, 'omg', 'lex');

    equal(appModelCount, 1);
    equal(indexModelCount, 2);
  });

  test('refreshModel does not cause a second transition during app boot ', function() {
    expect(0);

    App.ApplicationRoute = Route.extend({
      queryParams: {
        appomg: {
          defaultValue: 'applol'
        }
      }
    });

    App.IndexRoute = Route.extend({
      queryParams: {
        omg: {
          defaultValue: 'lol',
          refreshModel: true
        }
      },
      refresh: function() {
        ok(false);
      }
    });

    startingURL = '/?appomg=hello&omg=world';
    bootApplication();
  });

  test('can use refreshModel even w URL changes that remove QPs from address bar when QP configured on route', function() {
    expect(4);

    var indexModelCount = 0;
    App.IndexRoute = Route.extend({
      queryParams: {
        omg: {
          defaultValue: 'lol',
          refreshModel: true
        }
      },
      model(params) {
        indexModelCount++;

        var data;
        if (indexModelCount === 1) {
          data = 'foo';
        } else if (indexModelCount === 2) {
          data = 'lol';
        }

        deepEqual(params, { omg: data }, 'index#model receives right data');
      }
    });

    startingURL = '/?omg=foo';
    bootApplication();
    handleURL('/');

    var indexController = container.lookup('controller:index');
    equal(indexController.get('omg'), 'lol');
  });

  test('can opt into a replace query by specifying replace:true in the Router config hash when all configuration lives on route', function() {
    expect(2);

    App.ApplicationRoute = Route.extend({
      queryParams: {
        alex: {
          defaultValue: 'matchneer',
          replace: true
        }
      }
    });

    bootApplication();

    equal(router.get('location.path'), '');

    var appController = container.lookup('controller:application');
    expectedReplaceURL = '/?alex=wallace';
    setAndFlush(appController, 'alex', 'wallace');
  });

  test('Route query params config can be configured using property name instead of URL key when configured on the route', function() {
    expect(2);

    App.ApplicationRoute = Route.extend({
      queryParams: {
        commitBy: {
          as: 'commit_by',
          replace: true
        }
      }
    });

    bootApplication();

    equal(router.get('location.path'), '');

    var appController = container.lookup('controller:application');
    expectedReplaceURL = '/?commit_by=igor_seb';
    setAndFlush(appController, 'commitBy', 'igor_seb');
  });

  test('An explicit replace:false on a changed QP always wins and causes a pushState even when configuration is all on the route', function() {
    expect(3);

    App.ApplicationRoute = Route.extend({
      queryParams: {
        alex: {
          replace: true,
          defaultValue: 'matchneer'
        },
        steely: {
          replace: false,
          defaultValue: 'dan'
        }
      }
    });

    bootApplication();

    var appController = container.lookup('controller:application');
    expectedPushURL = '/?alex=wallace&steely=jan';
    run(appController, 'setProperties', { alex: 'wallace', steely: 'jan' });

    expectedPushURL = '/?alex=wallace&steely=fran';
    run(appController, 'setProperties', { steely: 'fran' });

    expectedReplaceURL = '/?alex=sriracha&steely=fran';
    run(appController, 'setProperties', { alex: 'sriracha' });
  });

  test('can opt into full transition by setting refreshModel in route queryParams when transitioning from child to parent when all configuration is on route', function() {
    App.register('template:parent', compile('{{outlet}}'));
    App.register('template:parent/child', compile("{{link-to 'Parent' 'parent' (query-params foo='change') id='parent-link'}}"));

    App.Router.map(function() {
      this.route('parent', function() {
        this.route('child');
      });
    });

    var parentModelCount = 0;
    App.ParentRoute = Route.extend({
      model() {
        parentModelCount++;
      },
      queryParams: {
        foo: {
          refreshModel: true,
          defaultValue: 'abc'
        }
      }
    });

    startingURL = '/parent/child?foo=lol';
    bootApplication();

    equal(parentModelCount, 1);

    container.lookup('controller:parent');

    run(jQuery('#parent-link'), 'click');

    equal(parentModelCount, 2);
  });

  test('URL transitions that remove QPs still register as QP changes when configuration lives on the route', function() {
    expect(2);

    App.IndexRoute = Route.extend({
      queryParams: {
        omg: {
          defaultValue: 'lol'
        }
      }
    });

    startingURL = '/?omg=borf';
    bootApplication();

    var indexController = container.lookup('controller:index');
    equal(indexController.get('omg'), 'borf');
    run(router, 'transitionTo', '/');
    equal(indexController.get('omg'), 'lol');
  });

  test('Subresource naming style is supported when configuration is all on the route', function() {
    App.Router.map(function() {
      this.route('abc.def', { path: '/abcdef' }, function() {
        this.route('zoo');
      });
    });

    App.register('template:application', compile("{{link-to 'A' 'abc.def' (query-params foo='123') id='one'}}{{link-to 'B' 'abc.def.zoo' (query-params foo='123' bar='456') id='two'}}{{outlet}}"));

    App.AbcDefRoute = Route.extend({
      queryParams: {
        foo: 'lol'
      }
    });

    App.AbcDefZooRoute = Route.extend({
      queryParams: {
        bar: {
          defaultValue: 'haha'
        }
      }
    });

    bootApplication();
    equal(router.get('location.path'), '');
    equal(jQuery('#one').attr('href'), '/abcdef?foo=123');
    equal(jQuery('#two').attr('href'), '/abcdef/zoo?bar=456&foo=123');

    run(jQuery('#one'), 'click');
    equal(router.get('location.path'), '/abcdef?foo=123');
    run(jQuery('#two'), 'click');
    equal(router.get('location.path'), '/abcdef/zoo?bar=456&foo=123');
  });

  test('transitionTo supports query params when configuration occurs on the route', function() {
    App.IndexRoute = Route.extend({
      queryParams: {
        foo: {
          defaultValue: 'lol'
        }
      }
    });

    bootApplication();

    equal(router.get('location.path'), '');

    run(router, 'transitionTo', { queryParams: { foo: 'borf' } });
    equal(router.get('location.path'), '/?foo=borf', 'shorthand supported');
    run(router, 'transitionTo', { queryParams: { 'index:foo': 'blaf' } });
    equal(router.get('location.path'), '/?foo=blaf', 'longform supported');
    run(router, 'transitionTo', { queryParams: { 'index:foo': false } });
    equal(router.get('location.path'), '/?foo=false', 'longform supported (bool)');
    run(router, 'transitionTo', { queryParams: { foo: false } });
    equal(router.get('location.path'), '/?foo=false', 'shorhand supported (bool)');
  });

  test('transitionTo supports query params (multiple) when configuration occurs on the route', function() {
    App.IndexRoute = Route.extend({
      queryParams: {
        foo: {
          defaultValue: 'lol'
        },
        bar: {
          defaultValue: 'wat'
        }
      }
    });

    bootApplication();

    equal(router.get('location.path'), '');

    run(router, 'transitionTo', { queryParams: { foo: 'borf' } });
    equal(router.get('location.path'), '/?foo=borf', 'shorthand supported');
    run(router, 'transitionTo', { queryParams: { 'index:foo': 'blaf' } });
    equal(router.get('location.path'), '/?foo=blaf', 'longform supported');
    run(router, 'transitionTo', { queryParams: { 'index:foo': false } });
    equal(router.get('location.path'), '/?foo=false', 'longform supported (bool)');
    run(router, 'transitionTo', { queryParams: { foo: false } });
    equal(router.get('location.path'), '/?foo=false', 'shorhand supported (bool)');
  });

  test('A default boolean value deserializes QPs as booleans rather than strings when configuration occurs on the route', function() {
    App.IndexRoute = Route.extend({
      queryParams: {
        foo: {
          defaultValue: false
        }
      },
      model(params) {
        equal(params.foo, true, 'model hook received foo as boolean true');
      }
    });

    startingURL = '/?foo=true';
    bootApplication();

    var controller = container.lookup('controller:index');
    equal(controller.get('foo'), true);

    handleURL('/?foo=false');
    equal(controller.get('foo'), false);
  });

  test('Query param without value are empty string when configuration occurs on the route', function() {
    App.IndexRoute = Route.extend({
      queryParams: {
        foo: {
          defaultValue: ''
        }
      }
    });

    startingURL = '/?foo=';
    bootApplication();

    var controller = container.lookup('controller:index');
    equal(controller.get('foo'), '');
  });

  test('Array query params can be set when configured on the route', function() {
    App.Router.map(function() {
      this.route('home', { path: '/' });
    });

    App.HomeRoute = Route.extend({
      queryParams: {
        foo: {
          defaultValue: []
        }
      }
    });

    bootApplication();

    var controller = container.lookup('controller:home');

    setAndFlush(controller, 'foo', [1, 2]);

    equal(router.get('location.path'), '/?foo=%5B1%2C2%5D');

    setAndFlush(controller, 'foo', [3, 4]);
    equal(router.get('location.path'), '/?foo=%5B3%2C4%5D');
  });

  test('(de)serialization: arrays when configuration occurs on the route', function() {
    App.IndexRoute = Route.extend({
      queryParams: {
        foo: {
          defaultValue: [1]
        }
      }
    });

    bootApplication();

    equal(router.get('location.path'), '');

    run(router, 'transitionTo', { queryParams: { foo: [2, 3] } });
    equal(router.get('location.path'), '/?foo=%5B2%2C3%5D', 'shorthand supported');
    run(router, 'transitionTo', { queryParams: { 'index:foo': [4, 5] } });
    equal(router.get('location.path'), '/?foo=%5B4%2C5%5D', 'longform supported');
    run(router, 'transitionTo', { queryParams: { foo: [] } });
    equal(router.get('location.path'), '/?foo=%5B%5D', 'longform supported');
  });

  test('Url with array query param sets controller property to array when configuration occurs on the route', function() {
    App.IndexRoute = Route.extend({
      queryParams: {
        foo: {
          defaultValue: ''
        }
      }
    });

    startingURL = '/?foo[]=1&foo[]=2&foo[]=3';
    bootApplication();

    var controller = container.lookup('controller:index');
    deepEqual(controller.get('foo'), ['1', '2', '3']);
  });

  test('Url with array query param sets controller property to array when configuration occurs on the route and there is still a controller', function() {
    App.IndexController = Controller.extend();

    App.IndexRoute = Route.extend({
      queryParams: {
        foo: {
          defaultValue: ''
        }
      }
    });

    startingURL = '/?foo[]=1&foo[]=2&foo[]=3';
    bootApplication();

    var controller = container.lookup('controller:index');
    deepEqual(controller.get('foo'), ['1', '2', '3']);
  });

  test('Array query params can be pushed/popped when configuration occurs on the route but there is still a controller', function() {
    App.Router.map(function() {
      this.route('home', { path: '/' });
    });

    App.HomeController = Controller.extend({
      foo: emberA()
    });

    App.HomeRoute = Route.extend({
      queryParams: {
        foo: {}
      }
    });

    bootApplication();

    equal(router.get('location.path'), '');

    var controller = container.lookup('controller:home');

    run(controller.foo, 'pushObject', 1);
    equal(router.get('location.path'), '/?foo=%5B1%5D');
    deepEqual(controller.foo, [1]);
    run(controller.foo, 'popObject');
    equal(router.get('location.path'), '/');
    deepEqual(controller.foo, []);
    run(controller.foo, 'pushObject', 1);
    equal(router.get('location.path'), '/?foo=%5B1%5D');
    deepEqual(controller.foo, [1]);
    run(controller.foo, 'popObject');
    equal(router.get('location.path'), '/');
    deepEqual(controller.foo, []);
    run(controller.foo, 'pushObject', 1);
    equal(router.get('location.path'), '/?foo=%5B1%5D');
    deepEqual(controller.foo, [1]);
    run(controller.foo, 'pushObject', 2);
    equal(router.get('location.path'), '/?foo=%5B1%2C2%5D');
    deepEqual(controller.foo, [1, 2]);
    run(controller.foo, 'popObject');
    equal(router.get('location.path'), '/?foo=%5B1%5D');
    deepEqual(controller.foo, [1]);
    run(controller.foo, 'unshiftObject', 'lol');
    equal(router.get('location.path'), '/?foo=%5B%22lol%22%2C1%5D');
    deepEqual(controller.foo, ['lol', 1]);
  });

  test('Overwriting with array with same content shouldn\'t refire update when configuration occurs on router but there is still a controller', function() {
    expect(3);
    var modelCount = 0;

    App.Router.map(function() {
      this.route('home', { path: '/' });
    });

    App.HomeRoute = Route.extend({
      queryParams: {
        foo: {}
      },
      model() {
        modelCount++;
      }
    });

    App.HomeController = Controller.extend({
      foo: emberA([1])
    });

    bootApplication();

    equal(modelCount, 1);
    var controller = container.lookup('controller:home');
    setAndFlush(controller, 'model', emberA([1]));
    equal(modelCount, 1);
    equal(router.get('location.path'), '');
  });

  test('A child of a resource route still defaults to parent route\'s model even if the child route has a query param when configuration occurs on the router', function() {
    expect(1);

    App.IndexRoute = Route.extend({
      queryParams: {
        woot: {}
      }
    });

    App.ApplicationRoute = Route.extend({
      model(p, trans) {
        return { woot: true };
      }
    });

    App.IndexRoute = Route.extend({
      setupController(controller, model) {
        deepEqual(model, { woot: true }, 'index route inherited model route from parent route');
      }
    });

    bootApplication();
  });

  test('opting into replace does not affect transitions between routes when configuration occurs on the route', function() {
    expect(5);
    App.register('template:application', compile(
      "{{link-to 'Foo' 'foo' id='foo-link'}}" +
      "{{link-to 'Bar' 'bar' id='bar-no-qp-link'}}" +
      "{{link-to 'Bar' 'bar' (query-params raytiley='isthebest') id='bar-link'}}" +
      '{{outlet}}'
    ));
    App.Router.map(function() {
      this.route('foo');
      this.route('bar');
    });

    App.BarRoute = Route.extend({
      queryParams: {
        raytiley: {
          replace: true,
          defaultValue: 'israd'
        }
      }
    });

    bootApplication();
    var controller = container.lookup('controller:bar');

    expectedPushURL = '/foo';
    run(jQuery('#foo-link'), 'click');

    expectedPushURL = '/bar';
    run(jQuery('#bar-no-qp-link'), 'click');

    expectedReplaceURL = '/bar?raytiley=woot';
    setAndFlush(controller, 'raytiley', 'woot');

    expectedPushURL = '/foo';
    run(jQuery('#foo-link'), 'click');

    expectedPushURL = '/bar?raytiley=isthebest';
    run(jQuery('#bar-link'), 'click');
  });

  test('Undefined isn\'t deserialized into a string when configuration occurs on the route', function() {
    expect(3);
    App.Router.map(function() {
      this.route('example');
    });

    App.register('template:application', compile("{{link-to 'Example' 'example' id='the-link'}}"));

    App.ExampleRoute = Route.extend({
      queryParams: {
        // uncommon to not support default value, but should assume undefined.
        foo: {
          defaultValue: undefined
        }
      },
      model(params) {
        deepEqual(params, { foo: undefined });
      }
    });

    bootApplication();

    var $link = jQuery('#the-link');
    equal($link.attr('href'), '/example');
    run($link, 'click');

    var controller = container.lookup('controller:example');
    equal(get(controller, 'foo'), undefined);
  });

  test('query params have been set by the time setupController is called when configuration occurs on the router', function() {
    expect(1);

    App.ApplicationRoute = Route.extend({
      queryParams: {
        foo: {
          defaultValue: 'wat'
        }
      },
      setupController(controller) {
        equal(controller.get('foo'), 'YEAH', 'controller\'s foo QP property set before setupController called');
      }
    });

    startingURL = '/?foo=YEAH';
    bootApplication();
  });

  test('query params have been set by the time setupController is called when configuration occurs on the router and there is still a controller', function() {
    expect(1);

    App.ApplicationController = Controller.extend();

    App.ApplicationRoute = Route.extend({
      queryParams: {
        foo: {
          defaultValue: 'wat'
        }
      },
      setupController(controller) {
        equal(controller.get('foo'), 'YEAH', 'controller\'s foo QP property set before setupController called');
      }
    });

    startingURL = '/?foo=YEAH';
    bootApplication();
  });

  test('model hooks receives query params when configured on the route', function() {
    App.IndexRoute = Route.extend({
      queryParams: {
        omg: {
          defaultValue: 'lol'
        }
      },
      model(params) {
        deepEqual(params, { omg: 'lol' });
      }
    });

    bootApplication();

    equal(router.get('location.path'), '');
  });

  test('Routes have overridable serializeQueryParamKey hook when configured on the route', function() {
    App.IndexRoute = Route.extend({
      queryParams: {
        funTimes: {
          defaultValue: ''
        }
      },
      serializeQueryParamKey: dasherize
    });

    bootApplication();
    equal(router.get('location.path'), '');

    var controller = container.lookup('controller:index');
    setAndFlush(controller, 'funTimes', 'woot');

    equal(router.get('location.path'), '/?fun-times=woot');
  });

  test('No replaceURL occurs on startup because default values don\'t show up in URL when configured on the route', function() {
    expect(0);

    App.IndexRoute = Route.extend({
      queryParams: {
        foo: {
          defaultValue: '123'
        }
      }
    });

    expectedReplaceURL = '/?foo=123';

    bootApplication();
  });

  test("controllers won't be eagerly instantiated by internal query params logic when configured on the route", function() {
    expect(10);
    App.Router.map(function() {
      this.route('cats', function() {
        this.route('index', { path: '/' });
      });
      this.route('home', { path: '/' });
      this.route('about');
    });

    App.register('template:home',       compile("<h3>{{link-to 'About' 'about' (query-params lol='wat') id='link-to-about'}}</h3>"));
    App.register('template:about',      compile("<h3>{{link-to 'Home' 'home'  (query-params foo='naw')}}</h3>"));
    App.register('template:cats.index', compile("<h3>{{link-to 'Cats' 'cats'  (query-params name='domino') id='cats-link'}}</h3>"));

    var homeShouldBeCreated = false;
    var aboutShouldBeCreated = false;
    var catsIndexShouldBeCreated = false;

    App.HomeRoute = Route.extend({
      queryParams: {
        foo: {
          defaultValue: '123'
        }
      },
      setup() {
        homeShouldBeCreated = true;
        this._super(...arguments);
      }
    });

    App.HomeController = Controller.extend({
      init() {
        this._super(...arguments);
        ok(homeShouldBeCreated, 'HomeController should be created at this time');
      }
    });

    App.AboutRoute = Route.extend({
      queryParams: {
        lol: {
          defaultValue: 'haha'
        }
      },
      setup() {
        aboutShouldBeCreated = true;
        this._super(...arguments);
      }
    });

    App.AboutController = Controller.extend({
      init() {
        this._super(...arguments);
        ok(aboutShouldBeCreated, 'AboutController should be created at this time');
      }
    });

    App.CatsIndexRoute = Route.extend({
      queryParams: {
        breed: {
          defaultValue: 'Golden'
        },
        name: {
          defaultValue: null
        }
      },
      model() {
        return [];
      },
      setup() {
        catsIndexShouldBeCreated = true;
        this._super(...arguments);
      },
      setupController(controller, context) {
        controller.set('model', context);
      }
    });

    App.CatsIndexController = Controller.extend({
      init() {
        this._super(...arguments);
        ok(catsIndexShouldBeCreated, 'CatsIndexController should be created at this time');
      }
    });

    bootApplication();

    equal(router.get('location.path'), '', 'url is correct');
    var controller = container.lookup('controller:home');
    setAndFlush(controller, 'foo', '456');
    equal(router.get('location.path'), '/?foo=456', 'url is correct');
    equal(jQuery('#link-to-about').attr('href'), '/about?lol=wat', 'link to about is correct');

    run(router, 'transitionTo', 'about');
    equal(router.get('location.path'), '/about', 'url is correct');

    run(router, 'transitionTo', 'cats');

    equal(router.get('location.path'), '/cats', 'url is correct');
    equal(jQuery('#cats-link').attr('href'), '/cats?name=domino', 'link to cats is correct');
    run(jQuery('#cats-link'), 'click');
    equal(router.get('location.path'), '/cats?name=domino', 'url is correct');
  });

  test('query params have been set by the time setupController is called when configured on the route', function() {
    expect(1);

    App.ApplicationRoute = Route.extend({
      queryParams: {
        foo: {
          defaultValue: 'wat'
        }
      },
      setupController(controller) {
        equal(controller.get('foo'), 'YEAH', 'controller\'s foo QP property set before setupController called');
      }
    });

    startingURL = '/?foo=YEAH';
    bootApplication();
  });

  test('model hooks receives query params (overridden by incoming url value) when configured on the route', function() {
    App.IndexRoute = Route.extend({
      queryParams: {
        omg: {
          defaultValue: 'lol'
        }
      },
      model(params) {
        deepEqual(params, { omg: 'yes' });
      }
    });

    startingURL = '/?omg=yes';
    bootApplication();

    equal(router.get('location.path'), '/?omg=yes');
  });

  test('Route#paramsFor fetches query params when configured on the route', function() {
    expect(1);

    App.Router.map(function() {
      this.route('index', { path: '/:something' });
    });

    App.IndexRoute = Route.extend({
      queryParams: {
        foo: {
          defaultValue: 'fooapp'
        }
      },
      model(params, transition) {
        deepEqual(this.paramsFor('index'), { something: 'omg', foo: 'fooapp' }, 'could retrieve params for index');
      }
    });

    startingURL = '/omg';
    bootApplication();
  });

  test('model hook can query prefix-less application params (overridden by incoming url value) when they\'re configured on the route', function() {
    App.ApplicationRoute = Route.extend({
      queryParams: {
        appomg: {
          defaultValue: 'applol'
        }
      },
      model(params) {
        deepEqual(params, { appomg: 'appyes' });
      }
    });

    App.IndexRoute = Route.extend({
      queryParams: {
        omg: {
          defaultValue: 'lol'
        }
      },
      model(params) {
        deepEqual(params, { omg: 'yes' });
        deepEqual(this.paramsFor('application'), { appomg: 'appyes' });
      }
    });

    startingURL = '/?appomg=appyes&omg=yes';
    bootApplication();

    equal(router.get('location.path'), '/?appomg=appyes&omg=yes');
  });

  test('Route#paramsFor fetches falsy query params when configured on the route', function() {
    expect(1);

    App.IndexRoute = Route.extend({
      queryParams: {
        foo: {
          defaultValue: true
        }
      },
      model(params, transition) {
        equal(params.foo, false);
      }
    });

    startingURL = '/?foo=false';
    bootApplication();
  });

  test('model hook can query prefix-less application params when configured on the route', function() {
    App.ApplicationRoute = Route.extend({
      queryParams: {
        appomg: {
          defaultValue: 'applol'
        }
      },
      model(params) {
        deepEqual(params, { appomg: 'applol' });
      }
    });

    App.IndexRoute = Route.extend({
      queryParams: {
        omg: {
          defaultValue: 'lol'
        }
      },
      model(params) {
        deepEqual(params, { omg: 'lol' });
        deepEqual(this.paramsFor('application'), { appomg: 'applol' });
      }
    });

    bootApplication();

    equal(router.get('location.path'), '');
  });

  test('can opt into full transition by setting refreshModel in route queryParams when configured on the route', function() {
    expect(6);

    var appModelCount = 0;
    App.ApplicationRoute = Route.extend({
      queryParams: {
        'appomg': {
          defaultValue: 'applol'
        }
      },
      model(params) {
        appModelCount++;
      }
    });

    var indexModelCount = 0;
    App.IndexRoute = Route.extend({
      queryParams: {
        omg: {
          defaultValue: 'lol',
          refreshModel: true
        }
      },
      model(params) {
        indexModelCount++;

        if (indexModelCount === 1) {
          deepEqual(params, { omg: 'lol' });
        } else if (indexModelCount === 2) {
          deepEqual(params, { omg: 'lex' });
        }
      }
    });

    bootApplication();

    equal(appModelCount, 1);
    equal(indexModelCount, 1);

    var indexController = container.lookup('controller:index');
    setAndFlush(indexController, 'omg', 'lex');

    equal(appModelCount, 1);
    equal(indexModelCount, 2);
  });


  test('can use refreshModel even w URL changes that remove QPs from address bar when configured on the route', function() {
    expect(4);

    var indexModelCount = 0;
    App.IndexRoute = Route.extend({
      queryParams: {
        omg: {
          refreshModel: true,
          defaultValue: 'lol'
        }
      },
      model(params) {
        indexModelCount++;

        var data;
        if (indexModelCount === 1) {
          data = 'foo';
        } else if (indexModelCount === 2) {
          data = 'lol';
        }

        deepEqual(params, { omg: data }, 'index#model receives right data');
      }
    });

    startingURL = '/?omg=foo';
    bootApplication();
    handleURL('/');

    var indexController = container.lookup('controller:index');
    equal(indexController.get('omg'), 'lol');
  });

  test('can opt into a replace query by specifying replace:true in the Router config hash when configured on the route', function() {
    expect(2);

    App.ApplicationRoute = Route.extend({
      queryParams: {
        alex: {
          defaultValue: 'matchneer',
          replace: true
        }
      }
    });

    bootApplication();

    equal(router.get('location.path'), '');

    var appController = container.lookup('controller:application');
    expectedReplaceURL = '/?alex=wallace';
    setAndFlush(appController, 'alex', 'wallace');
  });

  test('Route query params config can be configured using property name instead of URL key when configured on the route', function() {
    expect(2);

    App.ApplicationRoute = Route.extend({
      queryParams: {
        commitBy: {
          as: 'commit_by',
          replace: true
        }
      }
    });

    bootApplication();

    equal(router.get('location.path'), '');

    var appController = container.lookup('controller:application');
    expectedReplaceURL = '/?commit_by=igor_seb';
    setAndFlush(appController, 'commitBy', 'igor_seb');
  });

  test('An explicit replace:false on a changed QP always wins and causes a pushState when configured on the route', function() {
    expect(3);

    App.ApplicationRoute = Route.extend({
      queryParams: {
        alex: {
          replace: true,
          defaultValue: 'matchneer'
        },
        steely: {
          defaultValue: 'dan',
          replace: false
        }
      }
    });

    bootApplication();

    var appController = container.lookup('controller:application');
    expectedPushURL = '/?alex=wallace&steely=jan';
    run(appController, 'setProperties', { alex: 'wallace', steely: 'jan' });

    expectedPushURL = '/?alex=wallace&steely=fran';
    run(appController, 'setProperties', { steely: 'fran' });

    expectedReplaceURL = '/?alex=sriracha&steely=fran';
    run(appController, 'setProperties', { alex: 'sriracha' });
  });

  test('can opt into full transition by setting refreshModel in route queryParams when transitioning from child to parent when configured on the route', function() {
    App.register('template:parent', compile('{{outlet}}'));
    App.register('template:parent.child', compile("{{link-to 'Parent' 'parent' (query-params foo='change') id='parent-link'}}"));

    App.Router.map(function() {
      this.route('parent', function() {
        this.route('child');
      });
    });

    var parentModelCount = 0;
    App.ParentRoute = Route.extend({
      model() {
        parentModelCount++;
      },
      queryParams: {
        foo: {
          refreshModel: true,
          defaultValue: 'abc'
        }
      }
    });

    startingURL = '/parent/child?foo=lol';
    bootApplication();

    equal(parentModelCount, 1);

    container.lookup('controller:parent');

    run(jQuery('#parent-link'), 'click');

    equal(parentModelCount, 2);
  });

  test('can override incoming QP values in setupController when configured on the route', function() {
    expect(3);

    App.Router.map(function() {
      this.route('about');
    });

    App.IndexRoute = Route.extend({
      queryParams: {
        omg: {
          defaultValue: 'lol'
        }
      },
      setupController(controller) {
        ok(true, 'setupController called');
        controller.set('omg', 'OVERRIDE');
      },
      actions: {
        queryParamsDidChange() {
          ok(false, 'queryParamsDidChange shouldn\'t fire');
        }
      }
    });

    startingURL = '/about';
    bootApplication();
    equal(router.get('location.path'), '/about');
    run(router, 'transitionTo', 'index');
    equal(router.get('location.path'), '/?omg=OVERRIDE');
  });

  test('can override incoming QP array values in setupController when configured on the route', function() {
    expect(3);

    App.Router.map(function() {
      this.route('about');
    });

    App.IndexRoute = Route.extend({
      queryParams: {
        omg: {
          defaultValue: ['lol']
        }
      },
      setupController(controller) {
        ok(true, 'setupController called');
        controller.set('omg', ['OVERRIDE']);
      },
      actions: {
        queryParamsDidChange() {
          ok(false, 'queryParamsDidChange shouldn\'t fire');
        }
      }
    });

    startingURL = '/about';
    bootApplication();
    equal(router.get('location.path'), '/about');
    run(router, 'transitionTo', 'index');
    equal(router.get('location.path'), '/?omg=' + encodeURIComponent(JSON.stringify(['OVERRIDE'])));
  });

  test('URL transitions that remove QPs still register as QP changes when configured on the route', function() {
    expect(2);

    App.IndexRoute = Route.extend({
      queryParams: {
        omg: {
          defaultValue: 'lol'
        }
      }
    });

    startingURL = '/?omg=borf';
    bootApplication();

    var indexController = container.lookup('controller:index');
    equal(indexController.get('omg'), 'borf');
    run(router, 'transitionTo', '/');
    equal(indexController.get('omg'), 'lol');
  });

  test('Subresource naming style is supported when configured on the route', function() {
    App.Router.map(function() {
      this.route('abc.def', { path: '/abcdef' }, function() {
        this.route('zoo');
      });
    });

    App.register('template:application', compile("{{link-to 'A' 'abc.def' (query-params foo='123') id='one'}}{{link-to 'B' 'abc.def.zoo' (query-params foo='123' bar='456') id='two'}}{{outlet}}"));

    App.AbcDefRoute = Route.extend({
      queryParams: {
        foo: {
          defaultValue: 'lol'
        }
      }
    });

    App.AbcDefZooRoute = Route.extend({
      queryParams: {
        bar: {
          defaultValue: 'haha'
        }
      }
    });

    bootApplication();
    equal(router.get('location.path'), '');
    equal(jQuery('#one').attr('href'), '/abcdef?foo=123');
    equal(jQuery('#two').attr('href'), '/abcdef/zoo?bar=456&foo=123');

    run(jQuery('#one'), 'click');
    equal(router.get('location.path'), '/abcdef?foo=123');
    run(jQuery('#two'), 'click');
    equal(router.get('location.path'), '/abcdef/zoo?bar=456&foo=123');
  });

  test('transitionTo supports query params when configured on the route', function() {
    App.IndexRoute = Route.extend({
      queryParams: {
        foo: {
          defaultValue: 'lol'
        }
      }
    });

    bootApplication();

    equal(router.get('location.path'), '');

    run(router, 'transitionTo', { queryParams: { foo: 'borf' } });
    equal(router.get('location.path'), '/?foo=borf', 'shorthand supported');
    run(router, 'transitionTo', { queryParams: { 'index:foo': 'blaf' } });
    equal(router.get('location.path'), '/?foo=blaf', 'longform supported');
    run(router, 'transitionTo', { queryParams: { 'index:foo': false } });
    equal(router.get('location.path'), '/?foo=false', 'longform supported (bool)');
    run(router, 'transitionTo', { queryParams: { foo: false } });
    equal(router.get('location.path'), '/?foo=false', 'shorhand supported (bool)');
  });

  test('transitionTo supports query params (multiple) when configured on the route', function() {
    App.IndexRoute = Route.extend({
      queryParams: {
        foo: {
          defaultValue: 'lol'
        },
        bar: {
          defaultValue: 'wat'
        }
      }
    });

    bootApplication();

    equal(router.get('location.path'), '');

    run(router, 'transitionTo', { queryParams: { foo: 'borf' } });
    equal(router.get('location.path'), '/?foo=borf', 'shorthand supported');
    run(router, 'transitionTo', { queryParams: { 'index:foo': 'blaf' } });
    equal(router.get('location.path'), '/?foo=blaf', 'longform supported');
    run(router, 'transitionTo', { queryParams: { 'index:foo': false } });
    equal(router.get('location.path'), '/?foo=false', 'longform supported (bool)');
    run(router, 'transitionTo', { queryParams: { foo: false } });
    equal(router.get('location.path'), '/?foo=false', 'shorhand supported (bool)');
  });

  test('setting controller QP to empty string doesn\'t generate null in URL when configured on the route', function() {
    expect(1);
    App.IndexRoute = Route.extend({
      queryParams: {
        foo: {
          defaultValue: '123'
        }
      }
    });

    bootApplication();
    var controller = container.lookup('controller:index');

    expectedPushURL = '/?foo=';
    setAndFlush(controller, 'foo', '');
  });

  test('setting QP to empty string doesn\'t generate null in URL when configured on the route', function() {
    expect(1);
    App.IndexRoute = Route.extend({
      queryParams: {
        foo: {
          defaultValue: '123'
        }
      }
    });

    bootApplication();
    var controller = container.lookup('controller:index');

    expectedPushURL = '/?foo=';
    setAndFlush(controller, 'foo', '');
  });

  test('A default boolean value deserializes QPs as booleans rather than strings when configured on the route', function() {
    App.IndexRoute = Route.extend({
      queryParams: {
        foo: {
          defaultValue: false
        }
      },
      model(params) {
        equal(params.foo, true, 'model hook received foo as boolean true');
      }
    });

    startingURL = '/?foo=true';
    bootApplication();

    var controller = container.lookup('controller:index');
    equal(controller.get('foo'), true);

    handleURL('/?foo=false');
    equal(controller.get('foo'), false);
  });

  test('Query param without value are empty string when configured on the route', function() {
    App.IndexRoute = Route.extend({
      queryParams: {
        foo: {
          defaultValue: ''
        }
      }
    });

    startingURL = '/?foo=';
    bootApplication();

    var controller = container.lookup('controller:index');
    equal(controller.get('foo'), '');
  });

  test('Array query params can be set when configured on the route', function() {
    App.Router.map(function() {
      this.route('home', { path: '/' });
    });

    App.HomeRoute = Route.extend({
      queryParams: {
        foo: {
          defaultValue: []
        }
      }
    });

    bootApplication();

    var controller = container.lookup('controller:home');

    setAndFlush(controller, 'foo', [1, 2]);

    equal(router.get('location.path'), '/?foo=%5B1%2C2%5D');

    setAndFlush(controller, 'foo', [3, 4]);
    equal(router.get('location.path'), '/?foo=%5B3%2C4%5D');
  });

  test('(de)serialization: arrays when configured on the route', function() {
    App.IndexRoute = Route.extend({
      queryParams: {
        foo: {
          defaultValue: [1]
        }
      }
    });

    bootApplication();

    equal(router.get('location.path'), '');

    run(router, 'transitionTo', { queryParams: { foo: [2, 3] } });
    equal(router.get('location.path'), '/?foo=%5B2%2C3%5D', 'shorthand supported');
    run(router, 'transitionTo', { queryParams: { 'index:foo': [4, 5] } });
    equal(router.get('location.path'), '/?foo=%5B4%2C5%5D', 'longform supported');
    run(router, 'transitionTo', { queryParams: { foo: [] } });
    equal(router.get('location.path'), '/?foo=%5B%5D', 'longform supported');
  });

  test('Url with array query param sets controller property to array when configured on the route', function() {
    App.IndexRoute = Route.extend({
      queryParams: {
        foo: {
          defaultValue: ''
        }
      }
    });

    startingURL = '/?foo[]=1&foo[]=2&foo[]=3';
    bootApplication();

    var controller = container.lookup('controller:index');
    deepEqual(controller.get('foo'), ['1', '2', '3']);
  });

  test('Array query params can be pushed/popped when configured on the route', function() {
    App.Router.map(function() {
      this.route('home', { path: '/' });
    });

    App.HomeRoute = Route.extend({
      queryParams: {
        foo: {
          defaultValue: emberA()
        }
      }
    });

    bootApplication();

    equal(router.get('location.path'), '');

    var controller = container.lookup('controller:home');

    run(controller.foo, 'pushObject', 1);
    equal(router.get('location.path'), '/?foo=%5B1%5D');
    deepEqual(controller.foo, [1]);
    run(controller.foo, 'popObject');
    equal(router.get('location.path'), '/');
    deepEqual(controller.foo, []);
    run(controller.foo, 'pushObject', 1);
    equal(router.get('location.path'), '/?foo=%5B1%5D');
    deepEqual(controller.foo, [1]);
    run(controller.foo, 'popObject');
    equal(router.get('location.path'), '/');
    deepEqual(controller.foo, []);
    run(controller.foo, 'pushObject', 1);
    equal(router.get('location.path'), '/?foo=%5B1%5D');
    deepEqual(controller.foo, [1]);
    run(controller.foo, 'pushObject', 2);
    equal(router.get('location.path'), '/?foo=%5B1%2C2%5D');
    deepEqual(controller.foo, [1, 2]);
    run(controller.foo, 'popObject');
    equal(router.get('location.path'), '/?foo=%5B1%5D');
    deepEqual(controller.foo, [1]);
    run(controller.foo, 'unshiftObject', 'lol');
    equal(router.get('location.path'), '/?foo=%5B%22lol%22%2C1%5D');
    deepEqual(controller.foo, ['lol', 1]);
  });

  test('Overwriting with array with same content shouldn\'t refire update when configured on the route', function() {
    expect(3);
    var modelCount = 0;

    App.Router.map(function() {
      this.route('home', { path: '/' });
    });

    App.HomeRoute = Route.extend({
      queryParams: {
        foo: {
          defaultValue: emberA([1])
        }
      },
      model() {
        modelCount++;
      }
    });

    bootApplication();

    equal(modelCount, 1);
    var controller = container.lookup('controller:home');
    setAndFlush(controller, 'model', emberA([1]));
    equal(modelCount, 1);
    equal(router.get('location.path'), '');
  });

  test('Defaulting to params hash as the model should not result in that params object being watched when configured on the route', function() {
    expect(1);

    App.Router.map(function() {
      this.route('other');
    });

    // This causes the params hash, which is returned as a route's
    // model if no other model could be resolved given the provided
    // params (and no custom model hook was defined), to be watched,
    // unless we return a copy of the params hash.
    App.ApplicationRoute = Route.extend({
      queryParams: {
        woot: {
          defaultValue: 'wat'
        }
      }
    });

    App.OtherRoute = Route.extend({
      model(p, trans) {
        var m = meta(trans.params.application);
        ok(!m.peekWatching('woot'), 'A meta object isn\'t constructed for this params POJO');
      }
    });

    bootApplication();

    run(router, 'transitionTo', 'other');
  });

  test('A child of a resource route still defaults to parent route\'s model even if the child route has a query param when configured on the route', function() {
    expect(1);

    App.ApplicationRoute = Route.extend({
      model(p, trans) {
        return { woot: true };
      }
    });

    App.IndexRoute = Route.extend({
      queryParams: {
        woot: {
          defaultValue: undefined
        }
      },
      setupController(controller, model) {
        deepEqual(model, { woot: true }, 'index route inherited model route from parent route');
      }
    });

    bootApplication();
  });

  test('opting into replace does not affect transitions between routes when configured on route', function() {
    expect(5);
    App.register('template:application', compile(
      "{{link-to 'Foo' 'foo' id='foo-link'}}" +
      "{{link-to 'Bar' 'bar' id='bar-no-qp-link'}}" +
      "{{link-to 'Bar' 'bar' (query-params raytiley='isthebest') id='bar-link'}}" +
      '{{outlet}}'
    ));
    App.Router.map(function() {
      this.route('foo');
      this.route('bar');
    });

    App.BarRoute = Route.extend({
      queryParams: {
        raytiley: {
          defaultValue: 'israd',
          replace: true
        }
      }
    });

    bootApplication();
    var controller = container.lookup('controller:bar');

    expectedPushURL = '/foo';
    run(jQuery('#foo-link'), 'click');

    expectedPushURL = '/bar';
    run(jQuery('#bar-no-qp-link'), 'click');

    expectedReplaceURL = '/bar?raytiley=woot';
    setAndFlush(controller, 'raytiley', 'woot');

    expectedPushURL = '/foo';
    run(jQuery('#foo-link'), 'click');

    expectedPushURL = '/bar?raytiley=isthebest';
    run(jQuery('#bar-link'), 'click');
  });

  test('Undefined isn\'t deserialized into a string when configured on the route', function() {
    expect(3);
    App.Router.map(function() {
      this.route('example');
    });

    App.register('template:application', compile("{{link-to 'Example' 'example' id='the-link'}}"));

    App.ExampleRoute = Route.extend({
      queryParams: {
        // uncommon to not support default value, but should assume undefined.
        foo: {}
      },
      model(params) {
        deepEqual(params, { foo: undefined });
      }
    });

    bootApplication();

    var $link = jQuery('#the-link');
    equal($link.attr('href'), '/example');
    run($link, 'click');

    var controller = container.lookup('controller:example');
    equal(get(controller, 'foo'), undefined);
  });

  test('Changing a query param property on a controller after navigating using a {{link-to}} should preserve the unchanged query params', function() {
    expect(11);
    App.Router.map(function() {
      this.route('example');
    });

    App.register('template:application', compile(
      "{{link-to 'Example' 'example' (query-params bar='abc' foo='def') id='the-link1'}}" +
      "{{link-to 'Example' 'example' (query-params bar='123' foo='456') id='the-link2'}}"
    ));

    App.ExampleRoute = Route.extend({
      queryParams: {
        foo: { defaultValue: 'foo' },
        bar: { defaultValue: 'bar' }
      }
    });

    bootApplication();

    var controller = container.lookup('controller:example');

    var $link1 = jQuery('#the-link1');
    var $link2 = jQuery('#the-link2');
    equal($link1.attr('href'), '/example?bar=abc&foo=def');
    equal($link2.attr('href'), '/example?bar=123&foo=456');

    expectedPushURL = '/example?bar=abc&foo=def';
    run($link1, 'click');
    equal(get(controller, 'bar'), 'abc');
    equal(get(controller, 'foo'), 'def');

    expectedPushURL = '/example?bar=123&foo=456';
    run($link2, 'click');
    equal(get(controller, 'bar'), '123');
    equal(get(controller, 'foo'), '456');

    expectedPushURL = '/example?bar=rab&foo=456';
    setAndFlush(controller, 'bar', 'rab');
    equal(get(controller, 'bar'), 'rab');
    equal(get(controller, 'foo'), '456');
  });

  test('Calling transitionTo does not lose query params already on the activeTransition', function() {
    expect(2);
    App.Router.map(function() {
      this.route('parent', function() {
        this.route('child');
        this.route('sibling');
      });
    });

    App.ParentRoute = Route.extend({
      queryParams: { foo: { defaultValue: 'bar' } }
    });

    App.ParentChildRoute = Route.extend({
      afterModel: function() {
        ok(true, 'The after model hook was called');
        this.transitionTo('parent.sibling');
      }
    });

    startingURL = '/parent/child?foo=lol';
    bootApplication();

    var parentController = container.lookup('controller:parent');

    equal(parentController.get('foo'), 'lol');
  });
} else {
  test('Calling transitionTo does not lose query params already on the activeTransition', function() {
    expect(2);
    App.Router.map(function() {
      this.route('parent', function() {
        this.route('child');
        this.route('sibling');
      });
    });

    App.ParentChildRoute = Route.extend({
      afterModel: function() {
        ok(true, 'The after model hook was called');
        this.transitionTo('parent.sibling');
      }
    });

    App.ParentController = Controller.extend({
      queryParams: ['foo'],
      foo: 'bar'
    });

    startingURL = '/parent/child?foo=lol';
    bootApplication();

    var parentController = container.lookup('controller:parent');

    equal(parentController.get('foo'), 'lol');
  });

  test('Single query params can be set on the controller [DEPRECATED]', function() {
    App.Router.map(function() {
      this.route('home', { path: '/' });
    });

    App.HomeController = Controller.extend({
      queryParams: ['foo'],
      foo: '123'
    });

    bootApplication();

    var controller = container.lookup('controller:home');

    setAndFlush(controller, 'foo', '456');

    equal(router.get('location.path'), '/?foo=456');

    setAndFlush(controller, 'foo', '987');
    equal(router.get('location.path'), '/?foo=987');
  });

  test('Single query params can be set on the controller [DEPRECATED]', function() {
    App.Router.map(function() {
      this.route('home', { path: '/' });
    });

    App.HomeController = Controller.extend({
      queryParams: ['foo'],
      foo: '123'
    });

    bootApplication();

    var controller = container.lookup('controller:home');

    setAndFlush(controller, 'foo', '456');

    equal(router.get('location.path'), '/?foo=456');

    setAndFlush(controller, 'foo', '987');
    equal(router.get('location.path'), '/?foo=987');
  });

  test('Query params can map to different url keys configured on the controller [DEPRECATED]', function() {
    App.IndexController = Controller.extend({
      queryParams: [{ foo: 'other_foo', bar: { as: 'other_bar' } }],
      foo: 'FOO',
      bar: 'BAR'
    });

    bootApplication();
    equal(router.get('location.path'), '');

    var controller = container.lookup('controller:index');
    setAndFlush(controller, 'foo', 'LEX');

    equal(router.get('location.path'), '/?other_foo=LEX');
    setAndFlush(controller, 'foo', 'WOO');
    equal(router.get('location.path'), '/?other_foo=WOO');

    run(router, 'transitionTo', '/?other_foo=NAW');
    equal(controller.get('foo'), 'NAW');

    setAndFlush(controller, 'bar', 'NERK');
    run(router, 'transitionTo', '/?other_bar=NERK&other_foo=NAW');
  });

  test('Routes have overridable serializeQueryParamKey hook', function() {
    App.IndexRoute = Route.extend({
      serializeQueryParamKey: dasherize
    });

    App.IndexController = Controller.extend({
      queryParams: 'funTimes',
      funTimes: ''
    });

    bootApplication();
    equal(router.get('location.path'), '');

    var controller = container.lookup('controller:index');
    setAndFlush(controller, 'funTimes', 'woot');

    equal(router.get('location.path'), '/?fun-times=woot');
  });

  test('No replaceURL occurs on startup because default values don\'t show up in URL', function() {
    expect(0);

    App.IndexController = Controller.extend({
      queryParams: ['foo'],
      foo: '123'
    });

    expectedReplaceURL = '/?foo=123';

    bootApplication();
  });

  test('Can override inherited QP behavior by specifying queryParams as a computed property', function() {
    expect(0);
    var SharedMixin = Mixin.create({
      queryParams: ['a'],
      a: 0
    });

    App.IndexController = Controller.extend(SharedMixin, {
      queryParams: computed(function() {
        return ['c'];
      }),
      c: true
    });

    bootApplication();
    var indexController = container.lookup('controller:index');

    expectedReplaceURL = 'not gonna happen';
    run(indexController, 'set', 'a', 1);
  });

  test('model hooks receives query params', function() {
    App.IndexController = Controller.extend({
      queryParams: ['omg'],
      omg: 'lol'
    });

    App.IndexRoute = Route.extend({
      model(params) {
        deepEqual(params, { omg: 'lol' });
      }
    });

    bootApplication();

    equal(router.get('location.path'), '');
  });

  test('controllers won\'t be eagerly instantiated by internal query params logic', function() {
    expect(10);
    App.Router.map(function() {
      this.route('cats', function() {
        this.route('index', { path: '/' });
      });
      this.route('home', { path: '/' });
      this.route('about');
    });

    App.register('template:home',       compile("<h3>{{link-to 'About' 'about' (query-params lol='wat') id='link-to-about'}}</h3>"));
    App.register('template:about',      compile("<h3>{{link-to 'Home' 'home'  (query-params foo='naw')}}</h3>"));
    App.register('template:cats.index', compile("<h3>{{link-to 'Cats' 'cats'  (query-params name='domino') id='cats-link'}}</h3>"));

    var homeShouldBeCreated = false;
    var aboutShouldBeCreated = false;
    var catsIndexShouldBeCreated = false;

    App.HomeRoute = Route.extend({
      setup() {
        homeShouldBeCreated = true;
        this._super(...arguments);
      }
    });

    App.HomeController = Controller.extend({
      queryParams: ['foo'],
      foo: '123',
      init() {
        this._super(...arguments);
        ok(homeShouldBeCreated, 'HomeController should be created at this time');
      }
    });

    App.AboutRoute = Route.extend({
      setup() {
        aboutShouldBeCreated = true;
        this._super(...arguments);
      }
    });

    App.AboutController = Controller.extend({
      queryParams: ['lol'],
      lol: 'haha',
      init() {
        this._super(...arguments);
        ok(aboutShouldBeCreated, 'AboutController should be created at this time');
      }
    });

    App.CatsIndexRoute = Route.extend({
      model() {
        return [];
      },
      setup() {
        catsIndexShouldBeCreated = true;
        this._super(...arguments);
      },
      setupController(controller, context) {
        controller.set('model', context);
      }
    });

    App.CatsIndexController = Controller.extend({
      queryParams: ['breed', 'name'],
      breed: 'Golden',
      name: null,
      init() {
        this._super(...arguments);
        ok(catsIndexShouldBeCreated, 'CatsIndexController should be created at this time');
      }
    });

    bootApplication();

    equal(router.get('location.path'), '', 'url is correct');
    var controller = container.lookup('controller:home');
    setAndFlush(controller, 'foo', '456');
    equal(router.get('location.path'), '/?foo=456', 'url is correct');
    equal(jQuery('#link-to-about').attr('href'), '/about?lol=wat', 'link to about is correct');

    run(router, 'transitionTo', 'about');
    equal(router.get('location.path'), '/about', 'url is correct');

    run(router, 'transitionTo', 'cats');

    equal(router.get('location.path'), '/cats', 'url is correct');
    equal(jQuery('#cats-link').attr('href'), '/cats?name=domino', 'link to cats is correct');
    run(jQuery('#cats-link'), 'click');
    equal(router.get('location.path'), '/cats?name=domino', 'url is correct');
  });

  test('query params have been set by the time setupController is called', function() {
    expect(1);

    App.ApplicationController = Controller.extend({
      queryParams: ['foo'],
      foo: 'wat'
    });

    App.ApplicationRoute = Route.extend({
      setupController(controller) {
        equal(controller.get('foo'), 'YEAH', 'controller\'s foo QP property set before setupController called');
      }
    });

    startingURL = '/?foo=YEAH';
    bootApplication();
  });

  test('model hooks receives query params (overridden by incoming url value)', function() {
    App.IndexController = Controller.extend({
      queryParams: ['omg'],
      omg: 'lol'
    });

    App.IndexRoute = Route.extend({
      model(params) {
        deepEqual(params, { omg: 'yes' });
      }
    });

    startingURL = '/?omg=yes';
    bootApplication();

    equal(router.get('location.path'), '/?omg=yes');
  });

  test('Route#paramsFor fetches query params', function() {
    expect(1);

    App.Router.map(function() {
      this.route('index', { path: '/:something' });
    });

    App.IndexController = Controller.extend({
      queryParams: ['foo'],
      foo: 'fooapp'
    });

    App.IndexRoute = Route.extend({
      model(params, transition) {
        deepEqual(this.paramsFor('index'), { something: 'omg', foo: 'fooapp' }, 'could retrieve params for index');
      }
    });

    startingURL = '/omg';
    bootApplication();
  });

  test('model hook can query prefix-less application params (overridden by incoming url value)', function() {
    App.ApplicationController = Controller.extend({
      queryParams: ['appomg'],
      appomg: 'applol'
    });

    App.IndexController = Controller.extend({
      queryParams: ['omg'],
      omg: 'lol'
    });

    App.ApplicationRoute = Route.extend({
      model(params) {
        deepEqual(params, { appomg: 'appyes' });
      }
    });

    App.IndexRoute = Route.extend({
      model(params) {
        deepEqual(params, { omg: 'yes' });
        deepEqual(this.paramsFor('application'), { appomg: 'appyes' });
      }
    });

    startingURL = '/?appomg=appyes&omg=yes';
    bootApplication();

    equal(router.get('location.path'), '/?appomg=appyes&omg=yes');
  });


  test('Route#paramsFor fetches falsy query params', function() {
    expect(1);

    App.IndexController = Controller.extend({
      queryParams: ['foo'],
      foo: true
    });

    App.IndexRoute = Route.extend({
      model(params, transition) {
        equal(params.foo, false);
      }
    });

    startingURL = '/?foo=false';
    bootApplication();
  });

  test('model hook can query prefix-less application params', function() {
    App.ApplicationController = Controller.extend({
      queryParams: ['appomg'],
      appomg: 'applol'
    });

    App.IndexController = Controller.extend({
      queryParams: ['omg'],
      omg: 'lol'
    });

    App.ApplicationRoute = Route.extend({
      model(params) {
        deepEqual(params, { appomg: 'applol' });
      }
    });

    App.IndexRoute = Route.extend({
      model(params) {
        deepEqual(params, { omg: 'lol' });
        deepEqual(this.paramsFor('application'), { appomg: 'applol' });
      }
    });

    bootApplication();

    equal(router.get('location.path'), '');
  });

  test('can opt into full transition by setting refreshModel in route queryParams', function() {
    expect(6);
    App.ApplicationController = Controller.extend({
      queryParams: ['appomg'],
      appomg: 'applol'
    });

    App.IndexController = Controller.extend({
      queryParams: ['omg'],
      omg: 'lol'
    });

    var appModelCount = 0;
    App.ApplicationRoute = Route.extend({
      model(params) {
        appModelCount++;
      }
    });

    var indexModelCount = 0;
    App.IndexRoute = Route.extend({
      queryParams: {
        omg: {
          refreshModel: true
        }
      },
      model(params) {
        indexModelCount++;

        if (indexModelCount === 1) {
          deepEqual(params, { omg: 'lol' });
        } else if (indexModelCount === 2) {
          deepEqual(params, { omg: 'lex' });
        }
      }
    });

    bootApplication();

    equal(appModelCount, 1);
    equal(indexModelCount, 1);

    var indexController = container.lookup('controller:index');
    setAndFlush(indexController, 'omg', 'lex');

    equal(appModelCount, 1);
    equal(indexModelCount, 2);
  });

  test('refreshModel does not cause a second transition during app boot ', function() {
    expect(0);
    App.ApplicationController = Controller.extend({
      queryParams: ['appomg'],
      appomg: 'applol'
    });

    App.IndexController = Controller.extend({
      queryParams: ['omg'],
      omg: 'lol'
    });

    App.IndexRoute = Route.extend({
      queryParams: {
        omg: {
          refreshModel: true
        }
      },
      refresh: function() {
        ok(false);
      }
    });

    startingURL = '/?appomg=hello&omg=world';
    bootApplication();
  });

  test('Use Ember.get to retrieve query params \'refreshModel\' configuration', function() {
    expect(6);
    App.ApplicationController = Controller.extend({
      queryParams: ['appomg'],
      appomg: 'applol'
    });

    App.IndexController = Controller.extend({
      queryParams: ['omg'],
      omg: 'lol'
    });

    var appModelCount = 0;
    App.ApplicationRoute = Route.extend({
      model(params) {
        appModelCount++;
      }
    });

    var indexModelCount = 0;
    App.IndexRoute = Route.extend({
      queryParams: EmberObject.create({
        unknownProperty(keyName) {
          return { refreshModel: true };
        }
      }),
      model(params) {
        indexModelCount++;

        if (indexModelCount === 1) {
          deepEqual(params, { omg: 'lol' });
        } else if (indexModelCount === 2) {
          deepEqual(params, { omg: 'lex' });
        }
      }
    });

    bootApplication();

    equal(appModelCount, 1);
    equal(indexModelCount, 1);

    var indexController = container.lookup('controller:index');
    setAndFlush(indexController, 'omg', 'lex');

    equal(appModelCount, 1);
    equal(indexModelCount, 2);
  });

  test('can use refreshModel even w URL changes that remove QPs from address bar', function() {
    expect(4);

    App.IndexController = Controller.extend({
      queryParams: ['omg'],
      omg: 'lol'
    });

    var indexModelCount = 0;
    App.IndexRoute = Route.extend({
      queryParams: {
        omg: {
          refreshModel: true
        }
      },
      model(params) {
        indexModelCount++;

        var data;
        if (indexModelCount === 1) {
          data = 'foo';
        } else if (indexModelCount === 2) {
          data = 'lol';
        }

        deepEqual(params, { omg: data }, 'index#model receives right data');
      }
    });

    startingURL = '/?omg=foo';
    bootApplication();
    handleURL('/');

    var indexController = container.lookup('controller:index');
    equal(indexController.get('omg'), 'lol');
  });

  test('can opt into a replace query by specifying replace:true in the Router config hash', function() {
    expect(2);
    App.ApplicationController = Controller.extend({
      queryParams: ['alex'],
      alex: 'matchneer'
    });

    App.ApplicationRoute = Route.extend({
      queryParams: {
        alex: {
          replace: true
        }
      }
    });

    bootApplication();

    equal(router.get('location.path'), '');

    var appController = container.lookup('controller:application');
    expectedReplaceURL = '/?alex=wallace';
    setAndFlush(appController, 'alex', 'wallace');
  });

  test('Route query params config can be configured using property name instead of URL key', function() {
    expect(2);
    App.ApplicationController = Controller.extend({
      queryParams: [
        { commitBy: 'commit_by' }
      ]
    });

    App.ApplicationRoute = Route.extend({
      queryParams: {
        commitBy: {
          replace: true
        }
      }
    });

    bootApplication();

    equal(router.get('location.path'), '');

    var appController = container.lookup('controller:application');
    expectedReplaceURL = '/?commit_by=igor_seb';
    setAndFlush(appController, 'commitBy', 'igor_seb');
  });


  test('An explicit replace:false on a changed QP always wins and causes a pushState', function() {
    expect(3);
    App.ApplicationController = Controller.extend({
      queryParams: ['alex', 'steely'],
      alex: 'matchneer',
      steely: 'dan'
    });

    App.ApplicationRoute = Route.extend({
      queryParams: {
        alex: {
          replace: true
        },
        steely: {
          replace: false
        }
      }
    });

    bootApplication();

    var appController = container.lookup('controller:application');
    expectedPushURL = '/?alex=wallace&steely=jan';
    run(appController, 'setProperties', { alex: 'wallace', steely: 'jan' });

    expectedPushURL = '/?alex=wallace&steely=fran';
    run(appController, 'setProperties', { steely: 'fran' });

    expectedReplaceURL = '/?alex=sriracha&steely=fran';
    run(appController, 'setProperties', { alex: 'sriracha' });
  });

  test('can opt into full transition by setting refreshModel in route queryParams when transitioning from child to parent', function() {
    App.register('template:parent', compile('{{outlet}}'));
    App.register('template:parent.child', compile('{{link-to \'Parent\' \'parent\' (query-params foo=\'change\') id=\'parent-link\'}}'));

    App.Router.map(function() {
      this.route('parent', function() {
        this.route('child');
      });
    });

    var parentModelCount = 0;
    App.ParentRoute = Route.extend({
      model() {
        parentModelCount++;
      },
      queryParams: {
        foo: {
          refreshModel: true
        }
      }
    });

    App.ParentController = Controller.extend({
      queryParams: ['foo'],
      foo: 'abc'
    });

    startingURL = '/parent/child?foo=lol';
    bootApplication();

    equal(parentModelCount, 1);

    container.lookup('controller:parent');

    run(jQuery('#parent-link'), 'click');

    equal(parentModelCount, 2);
  });

  test('Use Ember.get to retrieve query params \'replace\' configuration', function() {
    expect(2);
    App.ApplicationController = Controller.extend({
      queryParams: ['alex'],
      alex: 'matchneer'
    });

    App.ApplicationRoute = Route.extend({
      queryParams: EmberObject.create({
        unknownProperty(keyName) {
          // We are simulating all qps requiring refresh
          return { replace: true };
        }
      })
    });

    bootApplication();

    equal(router.get('location.path'), '');

    var appController = container.lookup('controller:application');
    expectedReplaceURL = '/?alex=wallace';
    setAndFlush(appController, 'alex', 'wallace');
  });

  test('can override incoming QP values in setupController', function() {
    expect(3);

    App.Router.map(function() {
      this.route('about');
    });

    App.IndexController = Controller.extend({
      queryParams: ['omg'],
      omg: 'lol'
    });

    App.IndexRoute = Route.extend({
      setupController(controller) {
        ok(true, 'setupController called');
        controller.set('omg', 'OVERRIDE');
      },
      actions: {
        queryParamsDidChange() {
          ok(false, 'queryParamsDidChange shouldn\'t fire');
        }
      }
    });

    startingURL = '/about';
    bootApplication();
    equal(router.get('location.path'), '/about');
    run(router, 'transitionTo', 'index');
    equal(router.get('location.path'), '/?omg=OVERRIDE');
  });

  test('can override incoming QP array values in setupController', function() {
    expect(3);

    App.Router.map(function() {
      this.route('about');
    });

    App.IndexController = Controller.extend({
      queryParams: ['omg'],
      omg: ['lol']
    });

    App.IndexRoute = Route.extend({
      setupController(controller) {
        ok(true, 'setupController called');
        controller.set('omg', ['OVERRIDE']);
      },
      actions: {
        queryParamsDidChange() {
          ok(false, 'queryParamsDidChange shouldn\'t fire');
        }
      }
    });

    startingURL = '/about';
    bootApplication();
    equal(router.get('location.path'), '/about');
    run(router, 'transitionTo', 'index');
    equal(router.get('location.path'), '/?omg=' + encodeURIComponent(JSON.stringify(['OVERRIDE'])));
  });

  test('URL transitions that remove QPs still register as QP changes', function() {
    expect(2);

    App.IndexController = Controller.extend({
      queryParams: ['omg'],
      omg: 'lol'
    });

    startingURL = '/?omg=borf';
    bootApplication();

    var indexController = container.lookup('controller:index');
    equal(indexController.get('omg'), 'borf');
    run(router, 'transitionTo', '/');
    equal(indexController.get('omg'), 'lol');
  });

  test('Subresource naming style is supported', function() {
    App.Router.map(function() {
      this.route('abc.def', { path: '/abcdef' }, function() {
        this.route('zoo');
      });
    });

    App.register('template:application', compile('{{link-to \'A\' \'abc.def\' (query-params foo=\'123\') id=\'one\'}}{{link-to \'B\' \'abc.def.zoo\' (query-params foo=\'123\' bar=\'456\') id=\'two\'}}{{outlet}}'));

    App.AbcDefController = Controller.extend({
      queryParams: ['foo'],
      foo: 'lol'
    });

    App.AbcDefZooController = Controller.extend({
      queryParams: ['bar'],
      bar: 'haha'
    });

    bootApplication();
    equal(router.get('location.path'), '');
    equal(jQuery('#one').attr('href'), '/abcdef?foo=123');
    equal(jQuery('#two').attr('href'), '/abcdef/zoo?bar=456&foo=123');

    run(jQuery('#one'), 'click');
    equal(router.get('location.path'), '/abcdef?foo=123');
    run(jQuery('#two'), 'click');
    equal(router.get('location.path'), '/abcdef/zoo?bar=456&foo=123');
  });

  test('transitionTo supports query params', function() {
    App.IndexController = Controller.extend({
      queryParams: ['foo'],
      foo: 'lol'
    });

    bootApplication();

    equal(router.get('location.path'), '');

    run(router, 'transitionTo', { queryParams: { foo: 'borf' } });
    equal(router.get('location.path'), '/?foo=borf', 'shorthand supported');
    run(router, 'transitionTo', { queryParams: { 'index:foo': 'blaf' } });
    equal(router.get('location.path'), '/?foo=blaf', 'longform supported');
    run(router, 'transitionTo', { queryParams: { 'index:foo': false } });
    equal(router.get('location.path'), '/?foo=false', 'longform supported (bool)');
    run(router, 'transitionTo', { queryParams: { foo: false } });
    equal(router.get('location.path'), '/?foo=false', 'shorhand supported (bool)');
  });

  test('transitionTo supports query params (multiple)', function() {
    App.IndexController = Controller.extend({
      queryParams: ['foo', 'bar'],
      foo: 'lol',
      bar: 'wat'
    });

    bootApplication();

    equal(router.get('location.path'), '');

    run(router, 'transitionTo', { queryParams: { foo: 'borf' } });
    equal(router.get('location.path'), '/?foo=borf', 'shorthand supported');
    run(router, 'transitionTo', { queryParams: { 'index:foo': 'blaf' } });
    equal(router.get('location.path'), '/?foo=blaf', 'longform supported');
    run(router, 'transitionTo', { queryParams: { 'index:foo': false } });
    equal(router.get('location.path'), '/?foo=false', 'longform supported (bool)');
    run(router, 'transitionTo', { queryParams: { foo: false } });
    equal(router.get('location.path'), '/?foo=false', 'shorhand supported (bool)');
  });

  test('setting controller QP to empty string doesn\'t generate null in URL', function() {
    expect(1);
    App.IndexController = Controller.extend({
      queryParams: ['foo'],
      foo: '123'
    });

    bootApplication();
    var controller = container.lookup('controller:index');

    expectedPushURL = '/?foo=';
    setAndFlush(controller, 'foo', '');
  });

  test('setting QP to empty string doesn\'t generate null in URL', function() {
    expect(1);
    App.IndexRoute = Route.extend({
      queryParams: {
        foo: {
          defaultValue: '123'
        }
      }
    });

    bootApplication();
    var controller = container.lookup('controller:index');

    expectedPushURL = '/?foo=';
    setAndFlush(controller, 'foo', '');
  });

  test('A default boolean value deserializes QPs as booleans rather than strings', function() {
    App.IndexController = Controller.extend({
      queryParams: ['foo'],
      foo: false
    });

    App.IndexRoute = Route.extend({
      model(params) {
        equal(params.foo, true, 'model hook received foo as boolean true');
      }
    });

    startingURL = '/?foo=true';
    bootApplication();

    var controller = container.lookup('controller:index');
    equal(controller.get('foo'), true);

    handleURL('/?foo=false');
    equal(controller.get('foo'), false);
  });

  test('Query param without value are empty string', function() {
    App.IndexController = Controller.extend({
      queryParams: ['foo'],
      foo: ''
    });

    startingURL = '/?foo=';
    bootApplication();

    var controller = container.lookup('controller:index');
    equal(controller.get('foo'), '');
  });

  test('Array query params can be set', function() {
    App.Router.map(function() {
      this.route('home', { path: '/' });
    });

    App.HomeController = Controller.extend({
      queryParams: ['foo'],
      foo: []
    });

    bootApplication();

    var controller = container.lookup('controller:home');

    setAndFlush(controller, 'foo', [1, 2]);

    equal(router.get('location.path'), '/?foo=%5B1%2C2%5D');

    setAndFlush(controller, 'foo', [3, 4]);
    equal(router.get('location.path'), '/?foo=%5B3%2C4%5D');
  });

  test('(de)serialization: arrays', function() {
    App.IndexController = Controller.extend({
      queryParams: ['foo'],
      foo: [1]
    });

    bootApplication();

    equal(router.get('location.path'), '');

    run(router, 'transitionTo', { queryParams: { foo: [2, 3] } });
    equal(router.get('location.path'), '/?foo=%5B2%2C3%5D', 'shorthand supported');
    run(router, 'transitionTo', { queryParams: { 'index:foo': [4, 5] } });
    equal(router.get('location.path'), '/?foo=%5B4%2C5%5D', 'longform supported');
    run(router, 'transitionTo', { queryParams: { foo: [] } });
    equal(router.get('location.path'), '/?foo=%5B%5D', 'longform supported');
  });

  test('Url with array query param sets controller property to array', function() {
    App.IndexController = Controller.extend({
      queryParams: ['foo'],
      foo: ''
    });

    startingURL = '/?foo[]=1&foo[]=2&foo[]=3';
    bootApplication();

    var controller = container.lookup('controller:index');
    deepEqual(controller.get('foo'), ['1', '2', '3']);
  });

  test('Array query params can be pushed/popped', function() {
    App.Router.map(function() {
      this.route('home', { path: '/' });
    });

    App.HomeController = Controller.extend({
      queryParams: ['foo'],
      foo: emberA()
    });

    bootApplication();

    equal(router.get('location.path'), '');

    var controller = container.lookup('controller:home');

    run(controller.foo, 'pushObject', 1);
    equal(router.get('location.path'), '/?foo=%5B1%5D');
    deepEqual(controller.foo, [1]);
    run(controller.foo, 'popObject');
    equal(router.get('location.path'), '/');
    deepEqual(controller.foo, []);
    run(controller.foo, 'pushObject', 1);
    equal(router.get('location.path'), '/?foo=%5B1%5D');
    deepEqual(controller.foo, [1]);
    run(controller.foo, 'popObject');
    equal(router.get('location.path'), '/');
    deepEqual(controller.foo, []);
    run(controller.foo, 'pushObject', 1);
    equal(router.get('location.path'), '/?foo=%5B1%5D');
    deepEqual(controller.foo, [1]);
    run(controller.foo, 'pushObject', 2);
    equal(router.get('location.path'), '/?foo=%5B1%2C2%5D');
    deepEqual(controller.foo, [1, 2]);
    run(controller.foo, 'popObject');
    equal(router.get('location.path'), '/?foo=%5B1%5D');
    deepEqual(controller.foo, [1]);
    run(controller.foo, 'unshiftObject', 'lol');
    equal(router.get('location.path'), '/?foo=%5B%22lol%22%2C1%5D');
    deepEqual(controller.foo, ['lol', 1]);
  });

  test('Overwriting with array with same content shouldn\'t refire update', function() {
    expect(3);
    var modelCount = 0;

    App.Router.map(function() {
      this.route('home', { path: '/' });
    });

    App.HomeRoute = Route.extend({
      model() {
        modelCount++;
      }
    });

    App.HomeController = Controller.extend({
      queryParams: ['foo'],
      foo: emberA([1])
    });

    bootApplication();

    equal(modelCount, 1);
    var controller = container.lookup('controller:home');
    setAndFlush(controller, 'model', emberA([1]));
    equal(modelCount, 1);
    equal(router.get('location.path'), '');
  });

  test('Defaulting to params hash as the model should not result in that params object being watched', function() {
    expect(1);

    App.Router.map(function() {
      this.route('other');
    });

    // This causes the params hash, which is returned as a route's
    // model if no other model could be resolved given the provided
    // params (and no custom model hook was defined), to be watched,
    // unless we return a copy of the params hash.
    App.ApplicationController = Controller.extend({
      queryParams: ['woot'],
      woot: 'wat'
    });

    App.OtherRoute = Route.extend({
      model(p, trans) {
        var m = meta(trans.params.application);
        ok(!m.peekWatching('woot'), 'A meta object isn\'t constructed for this params POJO');
      }
    });

    bootApplication();

    run(router, 'transitionTo', 'other');
  });

  test('A child of a resource route still defaults to parent route\'s model even if the child route has a query param', function() {
    expect(1);

    App.IndexController = Controller.extend({
      queryParams: ['woot']
    });

    App.ApplicationRoute = Route.extend({
      model(p, trans) {
        return { woot: true };
      }
    });

    App.IndexRoute = Route.extend({
      setupController(controller, model) {
        deepEqual(model, { woot: true }, 'index route inherited model route from parent route');
      }
    });

    bootApplication();
  });

  test('opting into replace does not affect transitions between routes', function() {
    expect(5);
    App.register('template:application', compile(
      '{{link-to \'Foo\' \'foo\' id=\'foo-link\'}}' +
      '{{link-to \'Bar\' \'bar\' id=\'bar-no-qp-link\'}}' +
      '{{link-to \'Bar\' \'bar\' (query-params raytiley=\'isthebest\') id=\'bar-link\'}}' +
      '{{outlet}}'
    ));
    App.Router.map(function() {
      this.route('foo');
      this.route('bar');
    });

    App.BarController = Controller.extend({
      queryParams: ['raytiley'],
      raytiley: 'israd'
    });

    App.BarRoute = Route.extend({
      queryParams: {
        raytiley: {
          replace: true
        }
      }
    });

    bootApplication();
    var controller = container.lookup('controller:bar');

    expectedPushURL = '/foo';
    run(jQuery('#foo-link'), 'click');

    expectedPushURL = '/bar';
    run(jQuery('#bar-no-qp-link'), 'click');

    expectedReplaceURL = '/bar?raytiley=woot';
    setAndFlush(controller, 'raytiley', 'woot');

    expectedPushURL = '/foo';
    run(jQuery('#foo-link'), 'click');

    expectedPushURL = '/bar?raytiley=isthebest';
    run(jQuery('#bar-link'), 'click');
  });

  test('Undefined isn\'t deserialized into a string', function() {
    expect(3);
    App.Router.map(function() {
      this.route('example');
    });

    App.register('template:application', compile('{{link-to \'Example\' \'example\' id=\'the-link\'}}'));

    App.ExampleController = Controller.extend({
      queryParams: ['foo']
      // uncommon to not support default value, but should assume undefined.
    });

    App.ExampleRoute = Route.extend({
      model(params) {
        deepEqual(params, { foo: undefined });
      }
    });

    bootApplication();

    var $link = jQuery('#the-link');
    equal($link.attr('href'), '/example');
    run($link, 'click');

    var controller = container.lookup('controller:example');
    equal(get(controller, 'foo'), undefined);
  });
}

test('warn user that routes query params configuration must be an Object, not an Array', function() {
  expect(1);

  App.ApplicationRoute = Route.extend({
    queryParams: [
      { commitBy: { replace: true } }
    ]
  });

  expectAssertion(function() {
    bootApplication();
  }, 'You passed in `[{"commitBy":{"replace":true}}]` as the value for `queryParams` but `queryParams` cannot be an Array');
});

test('handle routes names that clash with Object.prototype properties', function() {
  expect(1);

  App.Router.map(function() {
    this.route('constructor');
  });

  App.ConstructorRoute = Route.extend({
    queryParams: {
      foo: {
        defaultValue: '123'
      }
    }
  });

  bootApplication();

  run(router, 'transitionTo', 'constructor', { queryParams: { foo: '999' } });

  var controller = container.lookup('controller:constructor');
  equal(get(controller, 'foo'), '999');
});
