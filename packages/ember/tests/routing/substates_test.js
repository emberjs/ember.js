import Ember from 'ember-metal/core';
import { compile } from 'ember-template-compiler';
import EmberView from 'ember-views/views/view';

var Router, App, templates, router, container, counter;

function step(expectedValue, description) {
  equal(counter, expectedValue, 'Step ' + expectedValue + ': ' + description);
  counter++;
}

function bootApplication(startingURL) {
  for (var name in templates) {
    Ember.TEMPLATES[name] = compile(templates[name]);
  }

  if (startingURL) {
    Ember.NoneLocation.reopen({
      path: startingURL
    });
  }

  startingURL = startingURL || '';
  router = container.lookup('router:main');
  Ember.run(App, 'advanceReadiness');
}

QUnit.module('Loading/Error Substates', {
  setup() {
    counter = 1;

    Ember.run(function() {
      App = Ember.Application.create({
        name: 'App',
        rootElement: '#qunit-fixture',
        // fake a modules resolver
        Resolver: Ember.DefaultResolver.extend({ moduleBasedResolver: true })
      });

      App.deferReadiness();

      App.Router.reopen({
        location: 'none'
      });

      Router = App.Router;

      container = App.__container__;

      templates = {
        application: '<div id="app">{{outlet}}</div>',
        index: 'INDEX',
        loading: 'LOADING',
        bro: 'BRO',
        sis: 'SIS'
      };
    });
  },

  teardown() {
    Ember.run(function() {
      App.destroy();
      App = null;

      Ember.TEMPLATES = {};
    });

    Ember.NoneLocation.reopen({
      path: ''
    });
  }
});

QUnit.test('Slow promise from a child route of application enters nested loading state', function() {
  var broModel = {};
  var broDeferred = Ember.RSVP.defer();

  Router.map(function() {
    this.route('bro');
  });

  App.ApplicationRoute = Ember.Route.extend({
    setupController() {
      step(2, 'ApplicationRoute#setup');
    }
  });

  App.BroRoute = Ember.Route.extend({
    model() {
      step(1, 'BroRoute#model');
      return broDeferred.promise;
    }
  });

  bootApplication('/bro');

  equal(Ember.$('#app', '#qunit-fixture').text(), 'LOADING', 'The Loading template is nested in application template\'s outlet');

  Ember.run(broDeferred, 'resolve', broModel);

  equal(Ember.$('#app', '#qunit-fixture').text(), 'BRO', 'bro template has loaded and replaced loading template');
});

QUnit.test('Slow promises waterfall on startup', function() {
  expect(7);

  var grandmaDeferred = Ember.RSVP.defer();
  var sallyDeferred = Ember.RSVP.defer();

  Router.map(function() {
    this.route('grandma', function() {
      this.route('mom', { resetNamespace: true }, function() {
        this.route('sally');
      });
    });
  });

  templates.grandma = 'GRANDMA {{outlet}}';
  templates.mom = 'MOM {{outlet}}';
  templates['mom/loading'] = 'MOMLOADING';
  templates['mom/sally'] = 'SALLY';

  App.GrandmaRoute = Ember.Route.extend({
    model() {
      step(1, 'GrandmaRoute#model');
      return grandmaDeferred.promise;
    }
  });

  App.MomRoute = Ember.Route.extend({
    model() {
      step(2, 'Mom#model');
      return {};
    }
  });

  App.MomSallyRoute = Ember.Route.extend({
    model() {
      step(3, 'SallyRoute#model');
      return sallyDeferred.promise;
    },
    setupController() {
      step(4, 'SallyRoute#setupController');
    }
  });

  bootApplication('/grandma/mom/sally');

  equal(Ember.$('#app', '#qunit-fixture').text(), 'LOADING', 'The Loading template is nested in application template\'s outlet');

  Ember.run(grandmaDeferred, 'resolve', {});
  equal(Ember.$('#app', '#qunit-fixture').text(), 'GRANDMA MOM MOMLOADING', 'Mom\'s child loading route is displayed due to sally\'s slow promise');

  Ember.run(sallyDeferred, 'resolve', {});
  equal(Ember.$('#app', '#qunit-fixture').text(), 'GRANDMA MOM SALLY', 'Sally template displayed');
});

QUnit.test('ApplicationRoute#currentPath reflects loading state path', function() {
  expect(4);

  var momDeferred = Ember.RSVP.defer();

  Router.map(function() {
    this.route('grandma', function() {
      this.route('mom');
    });
  });

  templates.grandma = 'GRANDMA {{outlet}}';
  templates['grandma/loading'] = 'GRANDMALOADING';
  templates['grandma/mom'] = 'MOM';

  App.GrandmaMomRoute = Ember.Route.extend({
    model() {
      return momDeferred.promise;
    }
  });

  bootApplication('/grandma/mom');

  equal(Ember.$('#app', '#qunit-fixture').text(), 'GRANDMA GRANDMALOADING');

  var appController = container.lookup('controller:application');
  equal(appController.get('currentPath'), 'grandma.loading', 'currentPath reflects loading state');

  Ember.run(momDeferred, 'resolve', {});
  equal(Ember.$('#app', '#qunit-fixture').text(), 'GRANDMA MOM');
  equal(appController.get('currentPath'), 'grandma.mom', 'currentPath reflects final state');
});

QUnit.test('Slow promises returned from ApplicationRoute#model don\'t enter LoadingRoute', function() {
  expect(2);

  var appDeferred = Ember.RSVP.defer();

  App.ApplicationRoute = Ember.Route.extend({
    model() {
      return appDeferred.promise;
    }
  });

  App.LoadingRoute = Ember.Route.extend({
    setupController() {
      ok(false, 'shouldn\'t get here');
    }
  });

  bootApplication();

  equal(Ember.$('#app', '#qunit-fixture').text(), '', 'nothing has been rendered yet');

  Ember.run(appDeferred, 'resolve', {});
  equal(Ember.$('#app', '#qunit-fixture').text(), 'INDEX');
});

QUnit.test('Don\'t enter loading route unless either route or template defined', function() {
  delete templates.loading;

  expect(2);

  var indexDeferred = Ember.RSVP.defer();

  App.ApplicationController = Ember.Controller.extend();

  App.IndexRoute = Ember.Route.extend({
    model() {
      return indexDeferred.promise;
    }
  });

  bootApplication();

  var appController = container.lookup('controller:application');
  ok(appController.get('currentPath') !== 'loading', 'loading state not entered');

  Ember.run(indexDeferred, 'resolve', {});
  equal(Ember.$('#app', '#qunit-fixture').text(), 'INDEX');
});

QUnit.test('Enter loading route if only LoadingRoute defined', function() {
  delete templates.loading;

  expect(4);

  var indexDeferred = Ember.RSVP.defer();

  App.IndexRoute = Ember.Route.extend({
    model() {
      step(1, 'IndexRoute#model');
      return indexDeferred.promise;
    }
  });

  App.LoadingRoute = Ember.Route.extend({
    setupController() {
      step(2, 'LoadingRoute#setupController');
    }
  });

  bootApplication();

  var appController = container.lookup('controller:application');
  equal(appController.get('currentPath'), 'loading', 'loading state entered');

  Ember.run(indexDeferred, 'resolve', {});
  equal(Ember.$('#app', '#qunit-fixture').text(), 'INDEX');
});

QUnit.test('Enter child loading state of pivot route', function() {
  expect(4);

  var deferred = Ember.RSVP.defer();

  Router.map(function() {
    this.route('grandma', function() {
      this.route('mom', { resetNamespace: true }, function() {
        this.route('sally');
      });
      this.route('smells');
    });
  });

  templates['grandma/loading'] = 'GMONEYLOADING';

  App.ApplicationController = Ember.Controller.extend();

  App.MomSallyRoute = Ember.Route.extend({
    setupController() {
      step(1, 'SallyRoute#setupController');
    }
  });

  App.GrandmaSmellsRoute = Ember.Route.extend({
    model() {
      return deferred.promise;
    }
  });

  bootApplication('/grandma/mom/sally');

  var appController = container.lookup('controller:application');
  equal(appController.get('currentPath'), 'grandma.mom.sally', 'Initial route fully loaded');

  Ember.run(router, 'transitionTo', 'grandma.smells');
  equal(appController.get('currentPath'), 'grandma.loading', 'in pivot route\'s child loading state');

  Ember.run(deferred, 'resolve', {});

  equal(appController.get('currentPath'), 'grandma.smells', 'Finished transition');
});

QUnit.test('Loading actions bubble to root, but don\'t enter substates above pivot', function() {
  expect(6);

  delete templates.loading;

  var sallyDeferred = Ember.RSVP.defer();
  var smellsDeferred = Ember.RSVP.defer();

  Router.map(function() {
    this.route('grandma', function() {
      this.route('mom', { resetNamespace: true }, function() {
        this.route('sally');
      });
      this.route('smells');
    });
  });

  App.ApplicationController = Ember.Controller.extend();

  App.ApplicationRoute = Ember.Route.extend({
    actions: {
      loading(transition, route) {
        ok(true, 'loading action received on ApplicationRoute');
      }
    }
  });

  App.MomSallyRoute = Ember.Route.extend({
    model() {
      return sallyDeferred.promise;
    }
  });

  App.GrandmaSmellsRoute = Ember.Route.extend({
    model() {
      return smellsDeferred.promise;
    }
  });

  bootApplication('/grandma/mom/sally');

  var appController = container.lookup('controller:application');
  ok(!appController.get('currentPath'), 'Initial route fully loaded');
  Ember.run(sallyDeferred, 'resolve', {});

  equal(appController.get('currentPath'), 'grandma.mom.sally', 'transition completed');

  Ember.run(router, 'transitionTo', 'grandma.smells');
  equal(appController.get('currentPath'), 'grandma.mom.sally', 'still in initial state because the only loading state is above the pivot route');

  Ember.run(smellsDeferred, 'resolve', {});

  equal(appController.get('currentPath'), 'grandma.smells', 'Finished transition');
});

QUnit.test('Default error event moves into nested route', function() {
  expect(6);

  templates['grandma'] = 'GRANDMA {{outlet}}';
  templates['grandma/error'] = 'ERROR: {{model.msg}}';

  Router.map(function() {
    this.route('grandma', function() {
      this.route('mom', { resetNamespace: true }, function() {
        this.route('sally');
      });
    });
  });

  App.ApplicationController = Ember.Controller.extend();

  App.MomSallyRoute = Ember.Route.extend({
    model() {
      step(1, 'MomSallyRoute#model');

      return Ember.RSVP.reject({
        msg: 'did it broke?'
      });
    },
    actions: {
      error() {
        step(2, 'MomSallyRoute#actions.error');
        return true;
      }
    }
  });

  throws(function() {
    bootApplication('/grandma/mom/sally');
  }, function(err) { return err.msg === 'did it broke?';});

  step(3, 'App finished booting');

  equal(Ember.$('#app', '#qunit-fixture').text(), 'GRANDMA ERROR: did it broke?', 'error bubbles');

  var appController = container.lookup('controller:application');
  equal(appController.get('currentPath'), 'grandma.error', 'Initial route fully loaded');
});

QUnit.test('Setting a query param during a slow transition should work', function() {
  var deferred = Ember.RSVP.defer();

  Router.map(function() {
    this.route('grandma', { path: '/grandma/:seg' },  function() { });
  });

  templates['grandma/loading'] = 'GMONEYLOADING';

  App.ApplicationController = Ember.Controller.extend();

  App.IndexRoute = Ember.Route.extend({
    beforeModel: function() {
      this.transitionTo('grandma', 1);
    }
  });

  App.GrandmaRoute = Ember.Route.extend({
    queryParams: {
      test: { defaultValue: 1 }
    }
  });

  App.GrandmaIndexRoute = Ember.Route.extend({
    model() {
      return deferred.promise;
    }
  });

  bootApplication('/');

  var appController = container.lookup('controller:application');
  var grandmaController = container.lookup('controller:grandma');

  equal(appController.get('currentPath'), 'grandma.loading', 'Initial route should be loading');

  Ember.run(function() {
    grandmaController.set('test', 3);
  });

  equal(appController.get('currentPath'), 'grandma.loading', 'Route should still be loading');
  equal(grandmaController.get('test'), 3, 'Controller query param value should have changed');

  Ember.run(deferred, 'resolve', {});

  equal(appController.get('currentPath'), 'grandma.index', 'Transition should be complete');
});

QUnit.test('Slow promises returned from ApplicationRoute#model enter ApplicationLoadingRoute if present', function() {
  expect(2);

  var appDeferred = Ember.RSVP.defer();

  App.ApplicationRoute = Ember.Route.extend({
    model() {
      return appDeferred.promise;
    }
  });

  var loadingRouteEntered = false;
  App.ApplicationLoadingRoute = Ember.Route.extend({
    setupController() {
      loadingRouteEntered = true;
    }
  });

  bootApplication();

  ok(loadingRouteEntered, 'ApplicationLoadingRoute was entered');

  Ember.run(appDeferred, 'resolve', {});
  equal(Ember.$('#app', '#qunit-fixture').text(), 'INDEX');
});

QUnit.test('Slow promises returned from ApplicationRoute#model enter application_loading if template present', function() {
  expect(3);

  templates['application_loading'] = 'TOPLEVEL LOADING';

  var appDeferred = Ember.RSVP.defer();
  App.ApplicationRoute = Ember.Route.extend({
    model() {
      return appDeferred.promise;
    }
  });

  var loadingRouteEntered = false;
  App.ApplicationLoadingRoute = Ember.Route.extend({
    setupController() {
      loadingRouteEntered = true;
    }
  });

  App.ApplicationLoadingView = EmberView.extend({
    elementId: 'toplevel-loading'
  });

  bootApplication();

  equal(Ember.$('#qunit-fixture > #toplevel-loading').text(), 'TOPLEVEL LOADING');

  Ember.run(appDeferred, 'resolve', {});

  equal(Ember.$('#toplevel-loading', '#qunit-fixture').length, 0, 'top-level loading View has been entirely removed from DOM');
  equal(Ember.$('#app', '#qunit-fixture').text(), 'INDEX');
});

QUnit.test('Default error event moves into nested route, prioritizing more specifically named error route', function() {
  expect(6);

  templates['grandma'] = 'GRANDMA {{outlet}}';
  templates['grandma/error'] = 'ERROR: {{model.msg}}';
  templates['grandma/mom_error'] = 'MOM ERROR: {{model.msg}}';

  Router.map(function() {
    this.route('grandma', function() {
      this.route('mom', { resetNamespace: true }, function() {
        this.route('sally');
      });
    });
  });

  App.ApplicationController = Ember.Controller.extend();

  App.MomSallyRoute = Ember.Route.extend({
    model() {
      step(1, 'MomSallyRoute#model');

      return Ember.RSVP.reject({
        msg: 'did it broke?'
      });
    },
    actions: {
      error() {
        step(2, 'MomSallyRoute#actions.error');
        return true;
      }
    }
  });

  throws(function() {
    bootApplication('/grandma/mom/sally');
  }, function(err) { return err.msg === 'did it broke?'; });

  step(3, 'App finished booting');

  equal(Ember.$('#app', '#qunit-fixture').text(), 'GRANDMA MOM ERROR: did it broke?', 'the more specifically-named mom error substate was entered over the other error route');

  var appController = container.lookup('controller:application');
  equal(appController.get('currentPath'), 'grandma.mom_error', 'Initial route fully loaded');
});

QUnit.test('Prioritized substate entry works with preserved-namespace nested routes', function() {
  expect(2);

  templates['foo/bar_loading'] = 'FOOBAR LOADING';
  templates['foo/bar/index'] = 'YAY';

  Router.map(function() {
    this.route('foo', function() {
      this.route('foo.bar', { path: '/bar', resetNamespace: true }, function() {
      });
    });
  });

  App.ApplicationController = Ember.Controller.extend();

  var deferred = Ember.RSVP.defer();
  App.FooBarRoute = Ember.Route.extend({
    model() {
      return deferred.promise;
    }
  });

  bootApplication('/foo/bar');

  equal(Ember.$('#app', '#qunit-fixture').text(), 'FOOBAR LOADING', 'foo.bar_loading was entered (as opposed to something like foo/foo/bar_loading)');

  Ember.run(deferred, 'resolve');

  equal(Ember.$('#app', '#qunit-fixture').text(), 'YAY');
});

QUnit.test('Prioritized loading substate entry works with preserved-namespace nested routes', function() {
  expect(2);

  templates['foo/bar_loading'] = 'FOOBAR LOADING';
  templates['foo/bar'] = 'YAY';

  Router.map(function() {
    this.route('foo', function() {
      this.route('bar');
    });
  });

  App.ApplicationController = Ember.Controller.extend();

  var deferred = Ember.RSVP.defer();
  App.FooBarRoute = Ember.Route.extend({
    model() {
      return deferred.promise;
    }
  });

  bootApplication('/foo/bar');

  equal(Ember.$('#app', '#qunit-fixture').text(), 'FOOBAR LOADING', 'foo.bar_loading was entered (as opposed to something like foo/foo/bar_loading)');

  Ember.run(deferred, 'resolve');

  equal(Ember.$('#app', '#qunit-fixture').text(), 'YAY');
});

QUnit.test('Prioritized error substate entry works with preserved-namespace nested routes', function() {
  expect(2);

  templates['foo/bar_error'] = 'FOOBAR ERROR: {{model.msg}}';
  templates['foo/bar'] = 'YAY';

  Router.map(function() {
    this.route('foo', function() {
      this.route('bar');
    });
  });

  App.ApplicationController = Ember.Controller.extend();

  App.FooBarRoute = Ember.Route.extend({
    model() {
      return Ember.RSVP.reject({
        msg: 'did it broke?'
      });
    }
  });

  throws(function() {
    bootApplication('/foo/bar');
  }, function(err) { return err.msg === 'did it broke?'; });

  equal(Ember.$('#app', '#qunit-fixture').text(), 'FOOBAR ERROR: did it broke?', 'foo.bar_error was entered (as opposed to something like foo/foo/bar_error)');
});

QUnit.test('Prioritized loading substate entry works with auto-generated index routes', function() {
  expect(2);

  templates['foo/index_loading'] = 'FOO LOADING';
  templates['foo/index'] = 'YAY';
  templates['foo'] = '{{outlet}}';

  Router.map(function() {
    this.route('foo', function() {
      this.route('bar');
    });
  });

  App.ApplicationController = Ember.Controller.extend();

  var deferred = Ember.RSVP.defer();
  App.FooIndexRoute = Ember.Route.extend({
    model() {
      return deferred.promise;
    }
  });
  App.FooRoute = Ember.Route.extend({
    model() {
      return true;
    }
  });

  bootApplication('/foo');

  equal(Ember.$('#app', '#qunit-fixture').text(), 'FOO LOADING', 'foo.index_loading was entered');

  Ember.run(deferred, 'resolve');

  equal(Ember.$('#app', '#qunit-fixture').text(), 'YAY');
});

QUnit.test('Prioritized error substate entry works with auto-generated index routes', function() {
  expect(2);

  templates['foo/index_error'] = 'FOO ERROR: {{model.msg}}';
  templates['foo/index'] = 'YAY';
  templates['foo'] = '{{outlet}}';

  Router.map(function() {
    this.route('foo', function() {
      this.route('bar');
    });
  });

  App.ApplicationController = Ember.Controller.extend();

  App.FooIndexRoute = Ember.Route.extend({
    model() {
      return Ember.RSVP.reject({
        msg: 'did it broke?'
      });
    }
  });
  App.FooRoute = Ember.Route.extend({
    model() {
      return true;
    }
  });

  throws(function() {
    bootApplication('/foo');
  }, function(err) { return err.msg === 'did it broke?'; });

  equal(Ember.$('#app', '#qunit-fixture').text(), 'FOO ERROR: did it broke?', 'foo.index_error was entered');
});

QUnit.test('Rejected promises returned from ApplicationRoute transition into top-level application_error', function() {
  expect(3);

  templates['application_error'] = '<p id="toplevel-error">TOPLEVEL ERROR: {{model.msg}}</p>';

  var reject = true;
  App.ApplicationRoute = Ember.Route.extend({
    model() {
      if (reject) {
        return Ember.RSVP.reject({ msg: 'BAD NEWS BEARS' });
      } else {
        return {};
      }
    }
  });

  throws(function() {
    bootApplication();
  }, function(err) { return err.msg === 'BAD NEWS BEARS'; });

  equal(Ember.$('#toplevel-error', '#qunit-fixture').text(), 'TOPLEVEL ERROR: BAD NEWS BEARS');

  reject = false;
  Ember.run(router, 'transitionTo', 'index');

  equal(Ember.$('#app', '#qunit-fixture').text(), 'INDEX');
});
