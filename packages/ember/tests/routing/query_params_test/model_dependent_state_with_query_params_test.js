import 'ember';
import Ember from 'ember-metal/core';
import isEnabled from 'ember-metal/features';

import EmberHandlebars from 'ember-htmlbars/compat';

var compile = EmberHandlebars.compile;

var Router, App, router, registry, container;

function bootApplication() {
  router = container.lookup('router:main');
  Ember.run(App, 'advanceReadiness');
}

function handleURL(path) {
  return Ember.run(function() {
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
  Ember.run(obj, 'set', prop, value);
}

var TestLocation = Ember.NoneLocation.extend({
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
  Ember.run(function() {
    App = Ember.Application.create({
      name: 'App',
      rootElement: '#qunit-fixture'
    });

    App.deferReadiness();

    registry = App.registry;
    container = App.__container__;

    registry.register('location:test', TestLocation);

    startingURL = expectedReplaceURL = expectedPushURL = '';

    App.Router.reopen({
      location: 'test'
    });

    Router = App.Router;

    App.LoadingRoute = Ember.Route.extend({
    });

    Ember.TEMPLATES.application = compile('{{outlet}}');
    Ember.TEMPLATES.home = compile('<h3>Hours</h3>');
  });
}

function sharedTeardown() {
  Ember.run(function() {
    App.destroy();
    App = null;

    Ember.TEMPLATES = {};
  });
}

if (isEnabled('ember-routing-route-configured-query-params')) {
  QUnit.module('Model Dep Query Params with Route-based configuration', {
    setup() {
      sharedSetup();

      App.Router.map(function() {
        this.route('article', { path: '/a/:id' }, function() {
          this.route('comments', { resetNamespace: true });
        });
      });

      var articles = this.articles = Ember.A([{ id: 'a-1' }, { id: 'a-2' }, { id: 'a-3' }]);

      App.ApplicationController = Ember.Controller.extend({
        articles: this.articles
      });

      var self = this;
      App.ArticleRoute = Ember.Route.extend({
        queryParams: {
          q: {
            defaultValue: 'wat'
          },
          z: {
            defaultValue: 0
          }
        },
        model(params) {
          if (self.expectedModelHookParams) {
            deepEqual(params, self.expectedModelHookParams, 'the ArticleRoute model hook received the expected merged dynamic segment + query params hash');
            self.expectedModelHookParams = null;
          }
          return articles.findProperty('id', params.id);
        }
      });

      App.CommentsRoute = Ember.Route.extend({
        queryParams: {
          page: {
            defaultValue: 1
          }
        }
      });

      Ember.TEMPLATES.application = compile('{{#each articles as |a|}} {{link-to \'Article\' \'article\' a id=a.id}} {{/each}} {{outlet}}');

      this.boot = function() {
        bootApplication();

        self.$link1 = Ember.$('#a-1');
        self.$link2 = Ember.$('#a-2');
        self.$link3 = Ember.$('#a-3');

        equal(self.$link1.attr('href'), '/a/a-1');
        equal(self.$link2.attr('href'), '/a/a-2');
        equal(self.$link3.attr('href'), '/a/a-3');

        self.controller = container.lookup('controller:article');
      };
    },

    teardown() {
      sharedTeardown();
      ok(!this.expectedModelHookParams, 'there should be no pending expectation of expected model hook params');
    }
  });

  QUnit.test('query params have \'model\' stickiness by default', function() {
    this.boot();

    Ember.run(this.$link1, 'click');
    equal(router.get('location.path'), '/a/a-1');

    setAndFlush(this.controller, 'q', 'lol');

    equal(this.$link1.attr('href'), '/a/a-1?q=lol');
    equal(this.$link2.attr('href'), '/a/a-2');
    equal(this.$link3.attr('href'), '/a/a-3');

    Ember.run(this.$link2, 'click');

    equal(this.controller.get('q'), 'wat');
    equal(this.controller.get('z'), 0);
    deepEqual(this.controller.get('model'), { id: 'a-2' });
    equal(this.$link1.attr('href'), '/a/a-1?q=lol');
    equal(this.$link2.attr('href'), '/a/a-2');
    equal(this.$link3.attr('href'), '/a/a-3');
  });

  QUnit.test('query params have \'model\' stickiness by default (url changes)', function() {

    this.boot();

    this.expectedModelHookParams = { id: 'a-1', q: 'lol', z: 0 };
    handleURL('/a/a-1?q=lol');

    deepEqual(this.controller.get('model'), { id: 'a-1' });
    equal(this.controller.get('q'), 'lol');
    equal(this.controller.get('z'), 0);
    equal(this.$link1.attr('href'), '/a/a-1?q=lol');
    equal(this.$link2.attr('href'), '/a/a-2');
    equal(this.$link3.attr('href'), '/a/a-3');

    this.expectedModelHookParams = { id: 'a-2', q: 'lol', z: 0 };
    handleURL('/a/a-2?q=lol');

    deepEqual(this.controller.get('model'), { id: 'a-2' }, 'controller\'s model changed to a-2');
    equal(this.controller.get('q'), 'lol');
    equal(this.controller.get('z'), 0);
    equal(this.$link1.attr('href'), '/a/a-1?q=lol');
    equal(this.$link2.attr('href'), '/a/a-2?q=lol'); // fail
    equal(this.$link3.attr('href'), '/a/a-3');

    this.expectedModelHookParams = { id: 'a-3', q: 'lol', z: 123 };
    handleURL('/a/a-3?q=lol&z=123');

    equal(this.controller.get('q'), 'lol');
    equal(this.controller.get('z'), 123);
    equal(this.$link1.attr('href'), '/a/a-1?q=lol');
    equal(this.$link2.attr('href'), '/a/a-2?q=lol');
    equal(this.$link3.attr('href'), '/a/a-3?q=lol&z=123');
  });

  QUnit.test('query params have \'model\' stickiness by default (params-based transitions)', function() {
    Ember.TEMPLATES.application = compile('{{#each articles as |a|}} {{link-to \'Article\' \'article\' a.id id=a.id}} {{/each}}');

    this.boot();

    this.expectedModelHookParams = { id: 'a-1', q: 'wat', z: 0 };
    Ember.run(router, 'transitionTo', 'article', 'a-1');

    deepEqual(this.controller.get('model'), { id: 'a-1' });
    equal(this.controller.get('q'), 'wat');
    equal(this.controller.get('z'), 0);
    equal(this.$link1.attr('href'), '/a/a-1');
    equal(this.$link2.attr('href'), '/a/a-2');
    equal(this.$link3.attr('href'), '/a/a-3');

    this.expectedModelHookParams = { id: 'a-2', q: 'lol', z: 0 };
    Ember.run(router, 'transitionTo', 'article', 'a-2', { queryParams: { q: 'lol' } });

    deepEqual(this.controller.get('model'), { id: 'a-2' });
    equal(this.controller.get('q'), 'lol');
    equal(this.controller.get('z'), 0);
    equal(this.$link1.attr('href'), '/a/a-1');
    equal(this.$link2.attr('href'), '/a/a-2?q=lol');
    equal(this.$link3.attr('href'), '/a/a-3');

    this.expectedModelHookParams = { id: 'a-3', q: 'hay', z: 0 };
    Ember.run(router, 'transitionTo', 'article', 'a-3', { queryParams: { q: 'hay' } });

    deepEqual(this.controller.get('model'), { id: 'a-3' });
    equal(this.controller.get('q'), 'hay');
    equal(this.controller.get('z'), 0);
    equal(this.$link1.attr('href'), '/a/a-1');
    equal(this.$link2.attr('href'), '/a/a-2?q=lol');
    equal(this.$link3.attr('href'), '/a/a-3?q=hay');

    this.expectedModelHookParams = { id: 'a-2', q: 'lol', z: 1 };
    Ember.run(router, 'transitionTo', 'article', 'a-2', { queryParams: { z: 1 } });

    deepEqual(this.controller.get('model'), { id: 'a-2' });
    equal(this.controller.get('q'), 'lol');
    equal(this.controller.get('z'), 1);
    equal(this.$link1.attr('href'), '/a/a-1');
    equal(this.$link2.attr('href'), '/a/a-2?q=lol&z=1');
    equal(this.$link3.attr('href'), '/a/a-3?q=hay');
  });

  QUnit.test('\'controller\' stickiness shares QP state between models', function() {
    App.ArticleRoute.reopen({
      queryParams: { q: { scope: 'controller' } }
    });

    this.boot();

    Ember.run(this.$link1, 'click');
    equal(router.get('location.path'), '/a/a-1');

    setAndFlush(this.controller, 'q', 'lol');

    equal(this.$link1.attr('href'), '/a/a-1?q=lol');
    equal(this.$link2.attr('href'), '/a/a-2?q=lol');
    equal(this.$link3.attr('href'), '/a/a-3?q=lol');

    Ember.run(this.$link2, 'click');

    equal(this.controller.get('q'), 'lol');
    equal(this.controller.get('z'), 0);
    deepEqual(this.controller.get('model'), { id: 'a-2' });

    equal(this.$link1.attr('href'), '/a/a-1?q=lol');
    equal(this.$link2.attr('href'), '/a/a-2?q=lol');
    equal(this.$link3.attr('href'), '/a/a-3?q=lol');

    this.expectedModelHookParams = { id: 'a-3', q: 'haha', z: 123 };
    handleURL('/a/a-3?q=haha&z=123');

    deepEqual(this.controller.get('model'), { id: 'a-3' });
    equal(this.controller.get('q'), 'haha');
    equal(this.controller.get('z'), 123);

    equal(this.$link1.attr('href'), '/a/a-1?q=haha');
    equal(this.$link2.attr('href'), '/a/a-2?q=haha');
    equal(this.$link3.attr('href'), '/a/a-3?q=haha&z=123');

    setAndFlush(this.controller, 'q', 'woot');

    equal(this.$link1.attr('href'), '/a/a-1?q=woot');
    equal(this.$link2.attr('href'), '/a/a-2?q=woot');
    equal(this.$link3.attr('href'), '/a/a-3?q=woot&z=123');
  });

  QUnit.test('\'model\' stickiness is scoped to current or first dynamic parent route', function() {
    this.boot();

    Ember.run(router, 'transitionTo', 'comments', 'a-1');

    var commentsCtrl = container.lookup('controller:comments');
    equal(commentsCtrl.get('page'), 1);
    equal(router.get('location.path'), '/a/a-1/comments');

    setAndFlush(commentsCtrl, 'page', 2);
    equal(router.get('location.path'), '/a/a-1/comments?page=2');

    setAndFlush(commentsCtrl, 'page', 3);
    equal(router.get('location.path'), '/a/a-1/comments?page=3');

    Ember.run(router, 'transitionTo', 'comments', 'a-2');
    equal(commentsCtrl.get('page'), 1);
    equal(router.get('location.path'), '/a/a-2/comments');

    Ember.run(router, 'transitionTo', 'comments', 'a-1');
    equal(commentsCtrl.get('page'), 3);
    equal(router.get('location.path'), '/a/a-1/comments?page=3');
  });

  QUnit.test('can reset query params using the resetController hook', function() {
    App.Router.map(function() {
      this.route('article', { path: '/a/:id' }, function() {
        this.route('comments', { resetNamespace: true });
      });
      this.route('about');
    });

    App.ArticleRoute.reopen({
      resetController(controller, isExiting) {
        this.controllerFor('comments').set('page', 1);
        if (isExiting) {
          controller.set('q', 'imdone');
        }
      }
    });

    Ember.TEMPLATES.about = compile('{{link-to \'A\' \'comments\' \'a-1\' id=\'one\'}} {{link-to \'B\' \'comments\' \'a-2\' id=\'two\'}}');

    this.boot();

    Ember.run(router, 'transitionTo', 'comments', 'a-1');

    var commentsCtrl = container.lookup('controller:comments');
    equal(commentsCtrl.get('page'), 1);
    equal(router.get('location.path'), '/a/a-1/comments');

    setAndFlush(commentsCtrl, 'page', 2);
    equal(router.get('location.path'), '/a/a-1/comments?page=2');

    Ember.run(router, 'transitionTo', 'comments', 'a-2');
    equal(commentsCtrl.get('page'), 1);
    equal(this.controller.get('q'), 'wat');

    Ember.run(router, 'transitionTo', 'comments', 'a-1');

    equal(router.get('location.path'), '/a/a-1/comments');
    equal(commentsCtrl.get('page'), 1);

    Ember.run(router, 'transitionTo', 'about');

    equal(Ember.$('#one').attr('href'), '/a/a-1/comments?q=imdone');
    equal(Ember.$('#two').attr('href'), '/a/a-2/comments');
  });
} else {
  QUnit.module('Model Dep Query Params', {
    setup() {
      sharedSetup();

      App.Router.map(function() {
        this.route('article', { path: '/a/:id' }, function() {
          this.route('comments', { resetNamespace: true });
        });
      });

      var articles = this.articles = Ember.A([{ id: 'a-1' }, { id: 'a-2' }, { id: 'a-3' }]);

      App.ApplicationController = Ember.Controller.extend({
        articles: this.articles
      });

      var self = this;
      App.ArticleRoute = Ember.Route.extend({
        model(params) {
          if (self.expectedModelHookParams) {
            deepEqual(params, self.expectedModelHookParams, 'the ArticleRoute model hook received the expected merged dynamic segment + query params hash');
            self.expectedModelHookParams = null;
          }
          return articles.findProperty('id', params.id);
        }
      });

      App.ArticleController = Ember.Controller.extend({
        queryParams: ['q', 'z'],
        q: 'wat',
        z: 0
      });

      App.CommentsController = Ember.Controller.extend({
        queryParams: 'page',
        page: 1
      });

      Ember.TEMPLATES.application = compile('{{#each articles as |a|}} {{link-to \'Article\' \'article\' a id=a.id}} {{/each}} {{outlet}}');

      this.boot = function() {
        bootApplication();

        self.$link1 = Ember.$('#a-1');
        self.$link2 = Ember.$('#a-2');
        self.$link3 = Ember.$('#a-3');

        equal(self.$link1.attr('href'), '/a/a-1');
        equal(self.$link2.attr('href'), '/a/a-2');
        equal(self.$link3.attr('href'), '/a/a-3');

        self.controller = container.lookup('controller:article');
      };
    },

    teardown() {
      sharedTeardown();
      ok(!this.expectedModelHookParams, 'there should be no pending expectation of expected model hook params');
    }
  });

  QUnit.test('query params have \'model\' stickiness by default', function() {
    this.boot();

    Ember.run(this.$link1, 'click');
    equal(router.get('location.path'), '/a/a-1');

    setAndFlush(this.controller, 'q', 'lol');

    equal(this.$link1.attr('href'), '/a/a-1?q=lol');
    equal(this.$link2.attr('href'), '/a/a-2');
    equal(this.$link3.attr('href'), '/a/a-3');

    Ember.run(this.$link2, 'click');

    equal(this.controller.get('q'), 'wat');
    equal(this.controller.get('z'), 0);
    deepEqual(this.controller.get('model'), { id: 'a-2' });
    equal(this.$link1.attr('href'), '/a/a-1?q=lol');
    equal(this.$link2.attr('href'), '/a/a-2');
    equal(this.$link3.attr('href'), '/a/a-3');
  });

  QUnit.test('query params have \'model\' stickiness by default (url changes)', function() {
    this.boot();

    this.expectedModelHookParams = { id: 'a-1', q: 'lol', z: 0 };
    handleURL('/a/a-1?q=lol');

    deepEqual(this.controller.get('model'), { id: 'a-1' });
    equal(this.controller.get('q'), 'lol');
    equal(this.controller.get('z'), 0);
    equal(this.$link1.attr('href'), '/a/a-1?q=lol');
    equal(this.$link2.attr('href'), '/a/a-2');
    equal(this.$link3.attr('href'), '/a/a-3');

    this.expectedModelHookParams = { id: 'a-2', q: 'lol', z: 0 };
    handleURL('/a/a-2?q=lol');

    deepEqual(this.controller.get('model'), { id: 'a-2' }, 'controller\'s model changed to a-2');
    equal(this.controller.get('q'), 'lol');
    equal(this.controller.get('z'), 0);
    equal(this.$link1.attr('href'), '/a/a-1?q=lol');
    equal(this.$link2.attr('href'), '/a/a-2?q=lol'); // fail
    equal(this.$link3.attr('href'), '/a/a-3');

    this.expectedModelHookParams = { id: 'a-3', q: 'lol', z: 123 };
    handleURL('/a/a-3?q=lol&z=123');

    equal(this.controller.get('q'), 'lol');
    equal(this.controller.get('z'), 123);
    equal(this.$link1.attr('href'), '/a/a-1?q=lol');
    equal(this.$link2.attr('href'), '/a/a-2?q=lol');
    equal(this.$link3.attr('href'), '/a/a-3?q=lol&z=123');
  });

  QUnit.test('query params have \'model\' stickiness by default (params-based transitions)', function() {
    Ember.TEMPLATES.application = compile('{{#each articles as |a|}} {{link-to \'Article\' \'article\' a.id id=a.id}} {{/each}}');

    this.boot();

    this.expectedModelHookParams = { id: 'a-1', q: 'wat', z: 0 };
    Ember.run(router, 'transitionTo', 'article', 'a-1');

    deepEqual(this.controller.get('model'), { id: 'a-1' });
    equal(this.controller.get('q'), 'wat');
    equal(this.controller.get('z'), 0);
    equal(this.$link1.attr('href'), '/a/a-1');
    equal(this.$link2.attr('href'), '/a/a-2');
    equal(this.$link3.attr('href'), '/a/a-3');

    this.expectedModelHookParams = { id: 'a-2', q: 'lol', z: 0 };
    Ember.run(router, 'transitionTo', 'article', 'a-2', { queryParams: { q: 'lol' } });

    deepEqual(this.controller.get('model'), { id: 'a-2' });
    equal(this.controller.get('q'), 'lol');
    equal(this.controller.get('z'), 0);
    equal(this.$link1.attr('href'), '/a/a-1');
    equal(this.$link2.attr('href'), '/a/a-2?q=lol');
    equal(this.$link3.attr('href'), '/a/a-3');

    this.expectedModelHookParams = { id: 'a-3', q: 'hay', z: 0 };
    Ember.run(router, 'transitionTo', 'article', 'a-3', { queryParams: { q: 'hay' } });

    deepEqual(this.controller.get('model'), { id: 'a-3' });
    equal(this.controller.get('q'), 'hay');
    equal(this.controller.get('z'), 0);
    equal(this.$link1.attr('href'), '/a/a-1');
    equal(this.$link2.attr('href'), '/a/a-2?q=lol');
    equal(this.$link3.attr('href'), '/a/a-3?q=hay');

    this.expectedModelHookParams = { id: 'a-2', q: 'lol', z: 1 };
    Ember.run(router, 'transitionTo', 'article', 'a-2', { queryParams: { z: 1 } });

    deepEqual(this.controller.get('model'), { id: 'a-2' });
    equal(this.controller.get('q'), 'lol');
    equal(this.controller.get('z'), 1);
    equal(this.$link1.attr('href'), '/a/a-1');
    equal(this.$link2.attr('href'), '/a/a-2?q=lol&z=1');
    equal(this.$link3.attr('href'), '/a/a-3?q=hay');
  });

  QUnit.test('\'controller\' stickiness shares QP state between models', function() {
    App.ArticleController.reopen({
      queryParams: { q: { scope: 'controller' } }
    });

    this.boot();

    Ember.run(this.$link1, 'click');
    equal(router.get('location.path'), '/a/a-1');

    setAndFlush(this.controller, 'q', 'lol');

    equal(this.$link1.attr('href'), '/a/a-1?q=lol');
    equal(this.$link2.attr('href'), '/a/a-2?q=lol');
    equal(this.$link3.attr('href'), '/a/a-3?q=lol');

    Ember.run(this.$link2, 'click');

    equal(this.controller.get('q'), 'lol');
    equal(this.controller.get('z'), 0);
    deepEqual(this.controller.get('model'), { id: 'a-2' });

    equal(this.$link1.attr('href'), '/a/a-1?q=lol');
    equal(this.$link2.attr('href'), '/a/a-2?q=lol');
    equal(this.$link3.attr('href'), '/a/a-3?q=lol');

    this.expectedModelHookParams = { id: 'a-3', q: 'haha', z: 123 };
    handleURL('/a/a-3?q=haha&z=123');

    deepEqual(this.controller.get('model'), { id: 'a-3' });
    equal(this.controller.get('q'), 'haha');
    equal(this.controller.get('z'), 123);

    equal(this.$link1.attr('href'), '/a/a-1?q=haha');
    equal(this.$link2.attr('href'), '/a/a-2?q=haha');
    equal(this.$link3.attr('href'), '/a/a-3?q=haha&z=123');

    setAndFlush(this.controller, 'q', 'woot');

    equal(this.$link1.attr('href'), '/a/a-1?q=woot');
    equal(this.$link2.attr('href'), '/a/a-2?q=woot');
    equal(this.$link3.attr('href'), '/a/a-3?q=woot&z=123');
  });

  QUnit.test('\'model\' stickiness is scoped to current or first dynamic parent route', function() {
    this.boot();

    Ember.run(router, 'transitionTo', 'comments', 'a-1');

    var commentsCtrl = container.lookup('controller:comments');
    equal(commentsCtrl.get('page'), 1);
    equal(router.get('location.path'), '/a/a-1/comments');

    setAndFlush(commentsCtrl, 'page', 2);
    equal(router.get('location.path'), '/a/a-1/comments?page=2');

    setAndFlush(commentsCtrl, 'page', 3);
    equal(router.get('location.path'), '/a/a-1/comments?page=3');

    Ember.run(router, 'transitionTo', 'comments', 'a-2');
    equal(commentsCtrl.get('page'), 1);
    equal(router.get('location.path'), '/a/a-2/comments');

    Ember.run(router, 'transitionTo', 'comments', 'a-1');
    equal(commentsCtrl.get('page'), 3);
    equal(router.get('location.path'), '/a/a-1/comments?page=3');
  });

  QUnit.test('can reset query params using the resetController hook', function() {
    App.Router.map(function() {
      this.route('article', { path: '/a/:id' }, function() {
        this.route('comments', { resetNamespace: true });
      });
      this.route('about');
    });

    App.ArticleRoute.reopen({
      resetController(controller, isExiting) {
        this.controllerFor('comments').set('page', 1);
        if (isExiting) {
          controller.set('q', 'imdone');
        }
      }
    });

    Ember.TEMPLATES.about = compile('{{link-to \'A\' \'comments\' \'a-1\' id=\'one\'}} {{link-to \'B\' \'comments\' \'a-2\' id=\'two\'}}');

    this.boot();
    Ember.run(router, 'transitionTo', 'comments', 'a-1');

    var commentsCtrl = container.lookup('controller:comments');
    equal(commentsCtrl.get('page'), 1);
    equal(router.get('location.path'), '/a/a-1/comments');

    setAndFlush(commentsCtrl, 'page', 2);
    equal(router.get('location.path'), '/a/a-1/comments?page=2');


    Ember.run(router, 'transitionTo', 'comments', 'a-2');
    equal(commentsCtrl.get('page'), 1);
    equal(this.controller.get('q'), 'wat');

    Ember.run(router, 'transitionTo', 'comments', 'a-1');

    equal(router.get('location.path'), '/a/a-1/comments');
    equal(commentsCtrl.get('page'), 1);

    Ember.run(router, 'transitionTo', 'about');

    equal(Ember.$('#one').attr('href'), '/a/a-1/comments?q=imdone');
    equal(Ember.$('#two').attr('href'), '/a/a-2/comments');
  });

  QUnit.test('can unit test without bucket cache', function() {
    var controller = container.lookup('controller:article');
    controller._bucketCache = null;

    controller.set('q', 'i used to break');
    equal(controller.get('q'), 'i used to break');
  });
}
