import {
  Controller,
  RSVP,
  Object as EmberObject,
  A as emberA,
  String as StringUtils
} from 'ember-runtime';
import { Route, NoneLocation } from 'ember-routing';
import {
  run,
  get,
  computed,
  Mixin,
  meta
} from 'ember-metal';
import { compile } from 'ember-template-compiler';
import { Application } from 'ember-application';
import { jQuery } from 'ember-views';
import { setTemplates } from 'ember-glimmer';

let App, router, container;

function bootApplication() {
  router = container.lookup('router:main');
  run(App, 'advanceReadiness');
}

function handleURL(path) {
  return run(() => {
    return router.handleURL(path).then(function(value) {
      ok(true, 'url: `' + path + '` was handled');
      return value;
    }, function(reason) {
      ok(false, 'failed to visit:`' + path + '` reason: `' + QUnit.jsDump.parse(reason));
      throw reason;
    });
  });
}

let startingURL = '';
let expectedReplaceURL, expectedPushURL;

function setAndFlush(obj, prop, value) {
  run(obj, 'set', prop, value);
}

const TestLocation = NoneLocation.extend({
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
  run(() => {
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
    run(() => {
      App.destroy();
      App = null;
    });
  } finally {
    setTemplates({});
  }
}

// jscs:disable

QUnit.module('Routing with Query Params', {
  setup() {
    sharedSetup();
  },

  teardown() {
    sharedTeardown();
  }
});

QUnit.test('Calling transitionTo does not lose query params already on the activeTransition', function() {
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

  let parentController = container.lookup('controller:parent');

  equal(parentController.get('foo'), 'lol');
});

QUnit.test('Single query params can be set on the controller [DEPRECATED]', function() {
  App.Router.map(function() {
    this.route('home', { path: '/' });
  });

  App.HomeController = Controller.extend({
    queryParams: ['foo'],
    foo: '123'
  });

  bootApplication();

  let controller = container.lookup('controller:home');

  setAndFlush(controller, 'foo', '456');

  equal(router.get('location.path'), '/?foo=456');

  setAndFlush(controller, 'foo', '987');
  equal(router.get('location.path'), '/?foo=987');
});

QUnit.test('Single query params can be set on the controller [DEPRECATED]', function() {
  App.Router.map(function() {
    this.route('home', { path: '/' });
  });

  App.HomeController = Controller.extend({
    queryParams: ['foo'],
    foo: '123'
  });

  bootApplication();

  let controller = container.lookup('controller:home');

  setAndFlush(controller, 'foo', '456');

  equal(router.get('location.path'), '/?foo=456');

  setAndFlush(controller, 'foo', '987');
  equal(router.get('location.path'), '/?foo=987');
});

QUnit.test('Query params can map to different url keys configured on the controller [DEPRECATED]', function() {
  App.IndexController = Controller.extend({
    queryParams: [{ foo: 'other_foo', bar: { as: 'other_bar' } }],
    foo: 'FOO',
    bar: 'BAR'
  });

  bootApplication();
  equal(router.get('location.path'), '');

  let controller = container.lookup('controller:index');
  setAndFlush(controller, 'foo', 'LEX');

  equal(router.get('location.path'), '/?other_foo=LEX');
  setAndFlush(controller, 'foo', 'WOO');
  equal(router.get('location.path'), '/?other_foo=WOO');

  run(router, 'transitionTo', '/?other_foo=NAW');
  equal(controller.get('foo'), 'NAW');

  setAndFlush(controller, 'bar', 'NERK');
  run(router, 'transitionTo', '/?other_bar=NERK&other_foo=NAW');
});

QUnit.test('Routes have overridable serializeQueryParamKey hook', function() {
  App.IndexRoute = Route.extend({
    serializeQueryParamKey: StringUtils.dasherize
  });

  App.IndexController = Controller.extend({
    queryParams: 'funTimes',
    funTimes: ''
  });

  bootApplication();
  equal(router.get('location.path'), '');

  let controller = container.lookup('controller:index');
  setAndFlush(controller, 'funTimes', 'woot');

  equal(router.get('location.path'), '/?fun-times=woot');
});

QUnit.test('No replaceURL occurs on startup because default values don\'t show up in URL', function() {
  expect(0);

  App.IndexController = Controller.extend({
    queryParams: ['foo'],
    foo: '123'
  });

  expectedReplaceURL = '/?foo=123';

  bootApplication();
});

QUnit.test('Can override inherited QP behavior by specifying queryParams as a computed property', function() {
  expect(0);
  let SharedMixin = Mixin.create({
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
  let indexController = container.lookup('controller:index');

  expectedReplaceURL = 'not gonna happen';
  run(indexController, 'set', 'a', 1);
});

QUnit.test('model hooks receives query params', function() {
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

QUnit.test('controllers won\'t be eagerly instantiated by internal query params logic', function() {
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

  let homeShouldBeCreated = false;
  let aboutShouldBeCreated = false;
  let catsIndexShouldBeCreated = false;

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
  let controller = container.lookup('controller:home');
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

QUnit.test('query params have been set by the time setupController is called', function() {
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

QUnit.test('model hooks receives query params (overridden by incoming url value)', function() {
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

QUnit.test('Route#paramsFor fetches query params', function() {
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

QUnit.test('query paramater with a default value of null should be able to get set to a string of null', function() {
  expect(1);

  App.IndexController = Controller.extend({
    queryParams: ['foo'],
    foo: null
  });

  startingURL = '/';
  bootApplication();
  run(router, 'transitionTo', { queryParams: { foo: 'null' } });
  equal(router.get('location.path'), '/?foo=null', 'foo can be set to a string of null');
});


QUnit.test('model hook can query prefix-less application params (overridden by incoming url value)', function() {
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


QUnit.test('Route#paramsFor fetches falsy query params', function() {
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

QUnit.test('model hook can query prefix-less application params', function() {
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

QUnit.test('can opt into full transition by setting refreshModel in route queryParams', function() {
  expect(6);
  App.ApplicationController = Controller.extend({
    queryParams: ['appomg'],
    appomg: 'applol'
  });

  App.IndexController = Controller.extend({
    queryParams: ['omg'],
    omg: 'lol'
  });

  let appModelCount = 0;
  App.ApplicationRoute = Route.extend({
    model(params) {
      appModelCount++;
    }
  });

  let indexModelCount = 0;
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

  let indexController = container.lookup('controller:index');
  setAndFlush(indexController, 'omg', 'lex');

  equal(appModelCount, 1);
  equal(indexModelCount, 2);
});

QUnit.test('refreshModel does not cause a second transition during app boot ', function() {
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
    refresh() {
      ok(false);
    }
  });

  startingURL = '/?appomg=hello&omg=world';
  bootApplication();
});

QUnit.test('queryParams are updated when a controller property is set and the route is refreshed. Issue #13263  ', function() {
  setTemplates({
    application: compile(
      '<button id="test-button" {{action \'increment\'}}>Increment</button>' +
      '<span id="test-value">{{foo}}</span>' +
      '{{outlet}}'
    )
  });
  App.ApplicationController = Controller.extend({
    queryParams: ['foo'],
    foo: 1,
    actions: {
      increment: function() {
        this.incrementProperty('foo');
        this.send('refreshRoute');
      }
    }
  });

  App.ApplicationRoute = Route.extend({
    actions: {
      refreshRoute: function() {
        this.refresh();
      }
    }
  });

  startingURL = '/';
  bootApplication();
  equal(jQuery('#test-value').text().trim(), '1');
  equal(router.get('location.path'), '/', 'url is correct');
  run(jQuery('#test-button'), 'click');
  equal(jQuery('#test-value').text().trim(), '2');
  equal(router.get('location.path'), '/?foo=2', 'url is correct');
  run(jQuery('#test-button'), 'click');
  equal(jQuery('#test-value').text().trim(), '3');
  equal(router.get('location.path'), '/?foo=3', 'url is correct');
});

QUnit.test('Use Ember.get to retrieve query params \'refreshModel\' configuration', function() {
  expect(6);
  App.ApplicationController = Controller.extend({
    queryParams: ['appomg'],
    appomg: 'applol'
  });

  App.IndexController = Controller.extend({
    queryParams: ['omg'],
    omg: 'lol'
  });

  let appModelCount = 0;
  App.ApplicationRoute = Route.extend({
    model(params) {
      appModelCount++;
    }
  });

  let indexModelCount = 0;
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

  let indexController = container.lookup('controller:index');
  setAndFlush(indexController, 'omg', 'lex');

  equal(appModelCount, 1);
  equal(indexModelCount, 2);
});

QUnit.test('can use refreshModel even w URL changes that remove QPs from address bar', function() {
  expect(4);

  App.IndexController = Controller.extend({
    queryParams: ['omg'],
    omg: 'lol'
  });

  let indexModelCount = 0;
  App.IndexRoute = Route.extend({
    queryParams: {
      omg: {
        refreshModel: true
      }
    },
    model(params) {
      indexModelCount++;

      let data;
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

  let indexController = container.lookup('controller:index');
  equal(indexController.get('omg'), 'lol');
});

QUnit.test('can opt into a replace query by specifying replace:true in the Router config hash', function() {
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

  let appController = container.lookup('controller:application');
  expectedReplaceURL = '/?alex=wallace';
  setAndFlush(appController, 'alex', 'wallace');
});

QUnit.test('Route query params config can be configured using property name instead of URL key', function() {
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

  let appController = container.lookup('controller:application');
  expectedReplaceURL = '/?commit_by=igor_seb';
  setAndFlush(appController, 'commitBy', 'igor_seb');
});


QUnit.test('An explicit replace:false on a changed QP always wins and causes a pushState', function() {
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

  let appController = container.lookup('controller:application');
  expectedPushURL = '/?alex=wallace&steely=jan';
  run(appController, 'setProperties', { alex: 'wallace', steely: 'jan' });

  expectedPushURL = '/?alex=wallace&steely=fran';
  run(appController, 'setProperties', { steely: 'fran' });

  expectedReplaceURL = '/?alex=sriracha&steely=fran';
  run(appController, 'setProperties', { alex: 'sriracha' });
});

QUnit.test('can opt into full transition by setting refreshModel in route queryParams when transitioning from child to parent', function() {
  App.register('template:parent', compile('{{outlet}}'));
  App.register('template:parent.child', compile('{{link-to \'Parent\' \'parent\' (query-params foo=\'change\') id=\'parent-link\'}}'));

  App.Router.map(function() {
    this.route('parent', function() {
      this.route('child');
    });
  });

  let parentModelCount = 0;
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

QUnit.test('Use Ember.get to retrieve query params \'replace\' configuration', function() {
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

  let appController = container.lookup('controller:application');
  expectedReplaceURL = '/?alex=wallace';
  setAndFlush(appController, 'alex', 'wallace');
});

QUnit.test('can override incoming QP values in setupController', function() {
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

QUnit.test('can override incoming QP array values in setupController', function() {
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

QUnit.test('URL transitions that remove QPs still register as QP changes', function() {
  expect(2);

  App.IndexController = Controller.extend({
    queryParams: ['omg'],
    omg: 'lol'
  });

  startingURL = '/?omg=borf';
  bootApplication();

  let indexController = container.lookup('controller:index');
  equal(indexController.get('omg'), 'borf');
  run(router, 'transitionTo', '/');
  equal(indexController.get('omg'), 'lol');
});

QUnit.test('Subresource naming style is supported', function() {
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

QUnit.test('transitionTo supports query params', function() {
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

QUnit.test('transitionTo supports query params (multiple)', function() {
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

QUnit.test('setting controller QP to empty string doesn\'t generate null in URL', function() {
  expect(1);
  App.IndexController = Controller.extend({
    queryParams: ['foo'],
    foo: '123'
  });

  bootApplication();
  let controller = container.lookup('controller:index');

  expectedPushURL = '/?foo=';
  setAndFlush(controller, 'foo', '');
});

QUnit.test('setting QP to empty string doesn\'t generate null in URL', function() {
  expect(1);
  App.IndexRoute = Route.extend({
    queryParams: {
      foo: {
        defaultValue: '123'
      }
    }
  });

  bootApplication();
  let controller = container.lookup('controller:index');

  expectedPushURL = '/?foo=';
  setAndFlush(controller, 'foo', '');
});

QUnit.test('A default boolean value deserializes QPs as booleans rather than strings', function() {
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

  let controller = container.lookup('controller:index');
  equal(controller.get('foo'), true);

  handleURL('/?foo=false');
  equal(controller.get('foo'), false);
});

QUnit.test('Query param without value are empty string', function() {
  App.IndexController = Controller.extend({
    queryParams: ['foo'],
    foo: ''
  });

  startingURL = '/?foo=';
  bootApplication();

  let controller = container.lookup('controller:index');
  equal(controller.get('foo'), '');
});

QUnit.test('Array query params can be set', function() {
  App.Router.map(function() {
    this.route('home', { path: '/' });
  });

  App.HomeController = Controller.extend({
    queryParams: ['foo'],
    foo: []
  });

  bootApplication();

  let controller = container.lookup('controller:home');

  setAndFlush(controller, 'foo', [1, 2]);

  equal(router.get('location.path'), '/?foo=%5B1%2C2%5D');

  setAndFlush(controller, 'foo', [3, 4]);
  equal(router.get('location.path'), '/?foo=%5B3%2C4%5D');
});

QUnit.test('(de)serialization: arrays', function() {
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

QUnit.test('Url with array query param sets controller property to array', function() {
  App.IndexController = Controller.extend({
    queryParams: ['foo'],
    foo: ''
  });

  startingURL = '/?foo[]=1&foo[]=2&foo[]=3';
  bootApplication();

  let controller = container.lookup('controller:index');
  deepEqual(controller.get('foo'), ['1', '2', '3']);
});

QUnit.test('Array query params can be pushed/popped', function() {
  App.Router.map(function() {
    this.route('home', { path: '/' });
  });

  App.HomeController = Controller.extend({
    queryParams: ['foo'],
    foo: emberA()
  });

  bootApplication();

  equal(router.get('location.path'), '');

  let controller = container.lookup('controller:home');

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

QUnit.test('Overwriting with array with same content shouldn\'t refire update', function() {
  expect(3);
  let modelCount = 0;

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
  let controller = container.lookup('controller:home');
  setAndFlush(controller, 'model', emberA([1]));
  equal(modelCount, 1);
  equal(router.get('location.path'), '');
});

QUnit.test('Defaulting to params hash as the model should not result in that params object being watched', function() {
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
      let m = meta(trans.params.application);
      ok(!m.peekWatching('woot'), 'A meta object isn\'t constructed for this params POJO');
    }
  });

  bootApplication();

  run(router, 'transitionTo', 'other');
});

QUnit.test('A child of a resource route still defaults to parent route\'s model even if the child route has a query param', function() {
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

QUnit.test('opting into replace does not affect transitions between routes', function() {
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
  let controller = container.lookup('controller:bar');

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

QUnit.test('Undefined isn\'t deserialized into a string', function() {
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

  let $link = jQuery('#the-link');
  equal($link.attr('href'), '/example');
  run($link, 'click');

  let controller = container.lookup('controller:example');
  equal(get(controller, 'foo'), undefined);
});

QUnit.test('when refreshModel is true and loading action returns false, model hook will rerun when QPs change even if previous did not finish', function() {
  expect(6);

  var appModelCount = 0;
  var promiseResolve;

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

  App.IndexController = Controller.extend({
    queryParams: ['omg']
    // uncommon to not support default value, but should assume undefined.
  });

  var indexModelCount = 0;
  App.IndexRoute = Route.extend({
    queryParams: {
      omg: {
        refreshModel: true
      }
    },
    actions: {
      loading: function() {
        return false;
      }
    },
    model(params) {
      indexModelCount++;
      if (indexModelCount === 2) {
        deepEqual(params, { omg: 'lex' });
        return new RSVP.Promise(function(resolve) {
          promiseResolve = resolve;
          return;
        });
      } else if (indexModelCount === 3) {
        deepEqual(params, { omg: 'hello' }, 'Model hook reruns even if the previous one didnt finish');
      }
    }
  });

  bootApplication();

  equal(indexModelCount, 1);

  var indexController = container.lookup('controller:index');
  setAndFlush(indexController, 'omg', 'lex');
  equal(indexModelCount, 2);

  setAndFlush(indexController, 'omg', 'hello');
  equal(indexModelCount, 3);
  run(function() {
    promiseResolve();
  });
  equal(get(indexController, 'omg'), 'hello', 'At the end last value prevails');
});

QUnit.test('when refreshModel is true and loading action does not return false, model hook will not rerun when QPs change even if previous did not finish', function() {
  expect(7);

  var appModelCount = 0;
  var promiseResolve;

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

  App.IndexController = Controller.extend({
    queryParams: ['omg']
    // uncommon to not support default value, but should assume undefined.
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

      if (indexModelCount === 2) {
        deepEqual(params, { omg: 'lex' });
        return new RSVP.Promise(function(resolve) {
          promiseResolve = resolve;
          return;
        });
      } else if (indexModelCount === 3) {
        ok(false, 'shouldnt get here');
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

  setAndFlush(indexController, 'omg', 'hello');
  equal(get(indexController, 'omg'), 'hello', ' value was set');
  equal(indexModelCount, 2);
  run(function() {
    promiseResolve();
  });
});


QUnit.test('warn user that routes query params configuration must be an Object, not an Array', function() {
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

QUnit.test('handle routes names that clash with Object.prototype properties', function() {
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

  let controller = container.lookup('controller:constructor');
  equal(get(controller, 'foo'), '999');
});
