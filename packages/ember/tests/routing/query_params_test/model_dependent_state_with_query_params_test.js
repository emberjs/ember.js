import Ember from 'ember-metal/core';
import isEnabled from 'ember-metal/features';
import { compile } from 'ember-template-compiler';

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

    registry = App.__registry__;
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

function queryParamsStickyTest1(urlPrefix) {
  return function() {
    this.boot();

    Ember.run(this.$link1, 'click');
    equal(router.get('location.path'), `${urlPrefix}/a-1`);

    setAndFlush(this.controller, 'q', 'lol');

    equal(this.$link1.attr('href'), `${urlPrefix}/a-1?q=lol`);
    equal(this.$link2.attr('href'), `${urlPrefix}/a-2`);
    equal(this.$link3.attr('href'), `${urlPrefix}/a-3`);

    Ember.run(this.$link2, 'click');

    equal(this.controller.get('q'), 'wat');
    equal(this.controller.get('z'), 0);
    deepEqual(this.controller.get('model'), { id: 'a-2' });
    equal(this.$link1.attr('href'), `${urlPrefix}/a-1?q=lol`);
    equal(this.$link2.attr('href'), `${urlPrefix}/a-2`);
    equal(this.$link3.attr('href'), `${urlPrefix}/a-3`);
  };
}

function queryParamsStickyTest2(urlPrefix) {
  return function() {
    this.boot();

    this.expectedModelHookParams = { id: 'a-1', q: 'lol', z: 0 };
    handleURL(`${urlPrefix}/a-1?q=lol`);

    deepEqual(this.controller.get('model'), { id: 'a-1' });
    equal(this.controller.get('q'), 'lol');
    equal(this.controller.get('z'), 0);
    equal(this.$link1.attr('href'), `${urlPrefix}/a-1?q=lol`);
    equal(this.$link2.attr('href'), `${urlPrefix}/a-2`);
    equal(this.$link3.attr('href'), `${urlPrefix}/a-3`);

    this.expectedModelHookParams = { id: 'a-2', q: 'lol', z: 0 };
    handleURL(`${urlPrefix}/a-2?q=lol`);

    deepEqual(this.controller.get('model'), { id: 'a-2' }, 'controller\'s model changed to a-2');
    equal(this.controller.get('q'), 'lol');
    equal(this.controller.get('z'), 0);
    equal(this.$link1.attr('href'), `${urlPrefix}/a-1?q=lol`);
    equal(this.$link2.attr('href'), `${urlPrefix}/a-2?q=lol`); // fail
    equal(this.$link3.attr('href'), `${urlPrefix}/a-3`);

    this.expectedModelHookParams = { id: 'a-3', q: 'lol', z: 123 };
    handleURL(`${urlPrefix}/a-3?q=lol&z=123`);

    equal(this.controller.get('q'), 'lol');
    equal(this.controller.get('z'), 123);
    equal(this.$link1.attr('href'), `${urlPrefix}/a-1?q=lol`);
    equal(this.$link2.attr('href'), `${urlPrefix}/a-2?q=lol`);
    equal(this.$link3.attr('href'), `${urlPrefix}/a-3?q=lol&z=123`);
  };
}

function queryParamsStickyTest3(urlPrefix, articleLookup) {
  return function() {
    Ember.TEMPLATES.application = compile(`{{#each articles as |a|}} {{link-to 'Article' '${articleLookup}' a.id id=a.id}} {{/each}}`);

    this.boot();

    this.expectedModelHookParams = { id: 'a-1', q: 'wat', z: 0 };
    Ember.run(router, 'transitionTo', articleLookup, 'a-1');

    deepEqual(this.controller.get('model'), { id: 'a-1' });
    equal(this.controller.get('q'), 'wat');
    equal(this.controller.get('z'), 0);
    equal(this.$link1.attr('href'), `${urlPrefix}/a-1`);
    equal(this.$link2.attr('href'), `${urlPrefix}/a-2`);
    equal(this.$link3.attr('href'), `${urlPrefix}/a-3`);

    this.expectedModelHookParams = { id: 'a-2', q: 'lol', z: 0 };
    Ember.run(router, 'transitionTo', articleLookup, 'a-2', { queryParams: { q: 'lol' } });

    deepEqual(this.controller.get('model'), { id: 'a-2' });
    equal(this.controller.get('q'), 'lol');
    equal(this.controller.get('z'), 0);
    equal(this.$link1.attr('href'), `${urlPrefix}/a-1`);
    equal(this.$link2.attr('href'), `${urlPrefix}/a-2?q=lol`);
    equal(this.$link3.attr('href'), `${urlPrefix}/a-3`);

    this.expectedModelHookParams = { id: 'a-3', q: 'hay', z: 0 };
    Ember.run(router, 'transitionTo', articleLookup, 'a-3', { queryParams: { q: 'hay' } });

    deepEqual(this.controller.get('model'), { id: 'a-3' });
    equal(this.controller.get('q'), 'hay');
    equal(this.controller.get('z'), 0);
    equal(this.$link1.attr('href'), `${urlPrefix}/a-1`);
    equal(this.$link2.attr('href'), `${urlPrefix}/a-2?q=lol`);
    equal(this.$link3.attr('href'), `${urlPrefix}/a-3?q=hay`);

    this.expectedModelHookParams = { id: 'a-2', q: 'lol', z: 1 };
    Ember.run(router, 'transitionTo', articleLookup, 'a-2', { queryParams: { z: 1 } });

    deepEqual(this.controller.get('model'), { id: 'a-2' });
    equal(this.controller.get('q'), 'lol');
    equal(this.controller.get('z'), 1);
    equal(this.$link1.attr('href'), `${urlPrefix}/a-1`);
    equal(this.$link2.attr('href'), `${urlPrefix}/a-2?q=lol&z=1`);
    equal(this.$link3.attr('href'), `${urlPrefix}/a-3?q=hay`);
  };
}

function queryParamsStickyTest4(urlPrefix, articleLookup) {
  return function() {
    var articleClass = Ember.String.classify(articleLookup);

    if (isEnabled('ember-routing-route-configured-query-params')) {
      App[`${articleClass}Route`].reopen({
        queryParams: { q: { scope: 'controller' } }
      });
    } else {
      App[`${articleClass}Controller`].reopen({
        queryParams: { q: { scope: 'controller' } }
      });
    }

    this.boot();

    Ember.run(this.$link1, 'click');
    equal(router.get('location.path'), `${urlPrefix}/a-1`);

    setAndFlush(this.controller, 'q', 'lol');

    equal(this.$link1.attr('href'), `${urlPrefix}/a-1?q=lol`);
    equal(this.$link2.attr('href'), `${urlPrefix}/a-2?q=lol`);
    equal(this.$link3.attr('href'), `${urlPrefix}/a-3?q=lol`);

    Ember.run(this.$link2, 'click');

    equal(this.controller.get('q'), 'lol');
    equal(this.controller.get('z'), 0);
    deepEqual(this.controller.get('model'), { id: 'a-2' });

    equal(this.$link1.attr('href'), `${urlPrefix}/a-1?q=lol`);
    equal(this.$link2.attr('href'), `${urlPrefix}/a-2?q=lol`);
    equal(this.$link3.attr('href'), `${urlPrefix}/a-3?q=lol`);

    this.expectedModelHookParams = { id: 'a-3', q: 'haha', z: 123 };
    handleURL(`${urlPrefix}/a-3?q=haha&z=123`);

    deepEqual(this.controller.get('model'), { id: 'a-3' });
    equal(this.controller.get('q'), 'haha');
    equal(this.controller.get('z'), 123);

    equal(this.$link1.attr('href'), `${urlPrefix}/a-1?q=haha`);
    equal(this.$link2.attr('href'), `${urlPrefix}/a-2?q=haha`);
    equal(this.$link3.attr('href'), `${urlPrefix}/a-3?q=haha&z=123`);

    setAndFlush(this.controller, 'q', 'woot');

    equal(this.$link1.attr('href'), `${urlPrefix}/a-1?q=woot`);
    equal(this.$link2.attr('href'), `${urlPrefix}/a-2?q=woot`);
    equal(this.$link3.attr('href'), `${urlPrefix}/a-3?q=woot&z=123`);
  };
}

function queryParamsStickyTest5(urlPrefix, commentsLookupKey) {
  return function() {
    this.boot();

    Ember.run(router, 'transitionTo', commentsLookupKey, 'a-1');

    var commentsCtrl = container.lookup(`controller:${commentsLookupKey}`);
    equal(commentsCtrl.get('page'), 1);
    equal(router.get('location.path'), `${urlPrefix}/a-1/comments`);

    setAndFlush(commentsCtrl, 'page', 2);
    equal(router.get('location.path'), `${urlPrefix}/a-1/comments?page=2`);

    setAndFlush(commentsCtrl, 'page', 3);
    equal(router.get('location.path'), `${urlPrefix}/a-1/comments?page=3`);

    Ember.run(router, 'transitionTo', commentsLookupKey, 'a-2');
    equal(commentsCtrl.get('page'), 1);
    equal(router.get('location.path'), `${urlPrefix}/a-2/comments`);

    Ember.run(router, 'transitionTo', commentsLookupKey, 'a-1');
    equal(commentsCtrl.get('page'), 3);
    equal(router.get('location.path'), `${urlPrefix}/a-1/comments?page=3`);
  };
}

function queryParamsStickyTest6(urlPrefix, articleLookup, commentsLookup) {
  return function() {
    var articleClass = Ember.String.classify(articleLookup);

    App[`${articleClass}Route`].reopen({
      resetController(controller, isExiting) {
        this.controllerFor(commentsLookup).set('page', 1);
        if (isExiting) {
          controller.set('q', 'imdone');
        }
      }
    });

    Ember.TEMPLATES.about = compile(`{{link-to 'A' '${commentsLookup}' 'a-1' id='one'}} {{link-to 'B' '${commentsLookup}' 'a-2' id='two'}}`);

    this.boot();

    Ember.run(router, 'transitionTo', commentsLookup, 'a-1');

    var commentsCtrl = container.lookup(`controller:${commentsLookup}`);
    equal(commentsCtrl.get('page'), 1);
    equal(router.get('location.path'), `${urlPrefix}/a-1/comments`);

    setAndFlush(commentsCtrl, 'page', 2);
    equal(router.get('location.path'), `${urlPrefix}/a-1/comments?page=2`);

    Ember.run(router, 'transitionTo', commentsLookup, 'a-2');
    equal(commentsCtrl.get('page'), 1);
    equal(this.controller.get('q'), 'wat');

    Ember.run(router, 'transitionTo', commentsLookup, 'a-1');

    equal(router.get('location.path'), `${urlPrefix}/a-1/comments`);
    equal(commentsCtrl.get('page'), 1);

    Ember.run(router, 'transitionTo', 'about');

    equal(Ember.$('#one').attr('href'), `${urlPrefix}/a-1/comments?q=imdone`);
    equal(Ember.$('#two').attr('href'), `${urlPrefix}/a-2/comments`);
  };
}

QUnit.module('Model Dep Query Params', {
  setup() {
    sharedSetup();

    App.Router.map(function() {
      this.route('article', { path: '/a/:id' }, function() {
        this.route('comments', { resetNamespace: true });
      });
      this.route('about');
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
        return articles.findBy('id', params.id);
      }
    });

    if (isEnabled('ember-routing-route-configured-query-params')) {
      App.ArticleRoute.reopen({
        queryParams: {
          q: { defaultValue: 'wat' },
          z: { defaultValue: 0 }
        }
      });

      App.CommentsRoute = Ember.Route.extend({
        queryParams: {
          page: { defaultValue: 1 }
        }
      });
    } else {
      App.ArticleController = Ember.Controller.extend({
        queryParams: ['q', 'z'],
        q: 'wat',
        z: 0
      });

      App.CommentsController = Ember.Controller.extend({
        queryParams: 'page',
        page: 1
      });
    }

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

QUnit.test('query params have \'model\' stickiness by default', queryParamsStickyTest1('/a'));

QUnit.test('query params have \'model\' stickiness by default (url changes)', queryParamsStickyTest2('/a'));

QUnit.test('query params have \'model\' stickiness by default (params-based transitions)', queryParamsStickyTest3('/a', 'article'));

QUnit.test('\'controller\' stickiness shares QP state between models', queryParamsStickyTest4('/a', 'article'));

QUnit.test('\'model\' stickiness is scoped to current or first dynamic parent route', queryParamsStickyTest5('/a', 'comments'));

QUnit.test('can reset query params using the resetController hook', queryParamsStickyTest6('/a', 'article', 'comments'));

QUnit.module('Model Dep Query Params (nested)', {
  setup() {
    sharedSetup();

    App.Router.map(function() {
      this.route('site', function() {
        this.route('article', { path: '/a/:id' }, function() {
          this.route('comments');
        });
      });
      this.route('about');
    });

    var site_articles = this.site_articles = Ember.A([{ id: 'a-1' }, { id: 'a-2' }, { id: 'a-3' }]);

    App.ApplicationController = Ember.Controller.extend({
      articles: this.site_articles
    });

    var self = this;
    App.SiteArticleRoute = Ember.Route.extend({
      model(params) {
        if (self.expectedModelHookParams) {
          deepEqual(params, self.expectedModelHookParams, 'the ArticleRoute model hook received the expected merged dynamic segment + query params hash');
          self.expectedModelHookParams = null;
        }
        return site_articles.findBy('id', params.id);
      }
    });

    if (isEnabled('ember-routing-route-configured-query-params')) {
      App.SiteArticleRoute.reopen({
        queryParams: {
          q: { defaultValue: 'wat' },
          z: { defaultValue: 0 }
        }
      });

      App.SiteArticleCommentsRoute = Ember.Route.extend({
        queryParams: {
          page: { defaultValue: 1 }
        }
      });
    } else {
      App.SiteArticleController = Ember.Controller.extend({
        queryParams: ['q', 'z'],
        q: 'wat',
        z: 0
      });

      App.SiteArticleCommentsController = Ember.Controller.extend({
        queryParams: 'page',
        page: 1
      });
    }
    Ember.TEMPLATES.application = compile('{{#each articles as |a|}} {{link-to \'Article\' \'site.article\' a id=a.id}} {{/each}} {{outlet}}');

    this.boot = function() {
      bootApplication();

      self.$link1 = Ember.$('#a-1');
      self.$link2 = Ember.$('#a-2');
      self.$link3 = Ember.$('#a-3');

      equal(self.$link1.attr('href'), '/site/a/a-1');
      equal(self.$link2.attr('href'), '/site/a/a-2');
      equal(self.$link3.attr('href'), '/site/a/a-3');

      self.controller = container.lookup('controller:site.article');
    };
  },

  teardown() {
    sharedTeardown();
    ok(!this.expectedModelHookParams, 'there should be no pending expectation of expected model hook params');
  }
});

QUnit.test('query params have \'model\' stickiness by default', queryParamsStickyTest1('/site/a'));

QUnit.test('query params have \'model\' stickiness by default (url changes)', queryParamsStickyTest2('/site/a'));

QUnit.test('query params have \'model\' stickiness by default (params-based transitions)', queryParamsStickyTest3('/site/a', 'site.article'));

QUnit.test('\'controller\' stickiness shares QP state between models', queryParamsStickyTest4('/site/a', 'site.article'));

QUnit.test('\'model\' stickiness is scoped to current or first dynamic parent route', queryParamsStickyTest5('/site/a', 'site.article.comments'));

QUnit.test('can reset query params using the resetController hook', queryParamsStickyTest6('/site/a', 'site.article', 'site.article.comments'));

QUnit.module('Model Dep Query Params (nested & more than 1 dynamic segment)', {
  setup() {
    sharedSetup();

    App.Router.map(function() {
      this.route('site', { path: '/site/:site_id' }, function() {
        this.route('article', { path: '/a/:article_id' }, function() {
          this.route('comments');
        });
      });
    });

    var sites = this.sites = Ember.A([{ id: 's-1' }, { id: 's-2' }, { id: 's-3' }]);
    var site_articles = this.site_articles = Ember.A([{ id: 'a-1' }, { id: 'a-2' }, { id: 'a-3' }]);

    App.ApplicationController = Ember.Controller.extend({
      siteArticles: this.site_articles,
      sites: this.sites,
      allSitesAllArticles: Ember.computed({
        get: function() {
          var ret = [];
          var siteArticles = this.siteArticles;
          var sites = this.sites;
          sites.forEach(function(site) {
            ret = ret.concat(siteArticles.map((article) => {
              return { id: `${site.id}-${article.id}`, site_id: site.id, article_id: article.id };
            }));
          });
          return ret;
        }
      })
    });

    var self = this;
    App.SiteRoute = Ember.Route.extend({
      model(params) {
        if (self.expectedSiteModelHookParams) {
          deepEqual(params, self.expectedSiteModelHookParams, 'the SiteRoute model hook received the expected merged dynamic segment + query params hash');
          self.expectedSiteModelHookParams = null;
        }
        return sites.findBy('id', params.site_id);
      }
    });
    App.SiteArticleRoute = Ember.Route.extend({
      model(params) {
        if (self.expectedArticleModelHookParams) {
          deepEqual(params, self.expectedArticleModelHookParams, 'the SiteArticleRoute model hook received the expected merged dynamic segment + query params hash');
          self.expectedArticleModelHookParams = null;
        }
        return site_articles.findBy('id', params.article_id);
      }
    });

    if (isEnabled('ember-routing-route-configured-query-params')) {
      App.SiteRoute.reopen({
        queryParams: {
          country: { defaultValue: 'au' }
        }
      });

      App.SiteArticleRoute.reopen({
        queryParams: {
          q: { defaultValue: 'wat' },
          z: { defaultValue: 0 }
        }
      });

      App.SiteArticleCommentsRoute = Ember.Route.extend({
        queryParams: {
          page: { defaultValue: 1 }
        }
      });
    } else {
      App.SiteController = Ember.Controller.extend({
        queryParams: ['country'],
        country: 'au'
      });

      App.SiteArticleController = Ember.Controller.extend({
        queryParams: ['q', 'z'],
        q: 'wat',
        z: 0
      });

      App.SiteArticleCommentsController = Ember.Controller.extend({
        queryParams: ['page'],
        page: 1
      });
    }

    Ember.TEMPLATES.application = compile('{{#each allSitesAllArticles as |a|}} {{#link-to \'site.article\' a.site_id a.article_id id=a.id}}Article [{{a.site_id}}] [{{a.article_id}}]{{/link-to}} {{/each}} {{outlet}}');

    this.boot = function() {
      bootApplication();
      self.links = {};
      self.links['s-1-a-1'] = Ember.$('#s-1-a-1');
      self.links['s-1-a-2'] = Ember.$('#s-1-a-2');
      self.links['s-1-a-3'] = Ember.$('#s-1-a-3');
      self.links['s-2-a-1'] = Ember.$('#s-2-a-1');
      self.links['s-2-a-2'] = Ember.$('#s-2-a-2');
      self.links['s-2-a-3'] = Ember.$('#s-2-a-3');
      self.links['s-3-a-1'] = Ember.$('#s-3-a-1');
      self.links['s-3-a-2'] = Ember.$('#s-3-a-2');
      self.links['s-3-a-3'] = Ember.$('#s-3-a-3');

      equal(self.links['s-1-a-1'].attr('href'), '/site/s-1/a/a-1');
      equal(self.links['s-1-a-2'].attr('href'), '/site/s-1/a/a-2');
      equal(self.links['s-1-a-3'].attr('href'), '/site/s-1/a/a-3');
      equal(self.links['s-2-a-1'].attr('href'), '/site/s-2/a/a-1');
      equal(self.links['s-2-a-2'].attr('href'), '/site/s-2/a/a-2');
      equal(self.links['s-2-a-3'].attr('href'), '/site/s-2/a/a-3');
      equal(self.links['s-3-a-1'].attr('href'), '/site/s-3/a/a-1');
      equal(self.links['s-3-a-2'].attr('href'), '/site/s-3/a/a-2');
      equal(self.links['s-3-a-3'].attr('href'), '/site/s-3/a/a-3');

      self.site_controller = container.lookup('controller:site');
      self.article_controller = container.lookup('controller:site.article');
    };
  },

  teardown() {
    sharedTeardown();
    ok(!this.expectedModelHookParams, 'there should be no pending expectation of expected model hook params');
  }
});

QUnit.test('query params have \'model\' stickiness by default', function() {
  this.boot();

  Ember.run(this.links['s-1-a-1'], 'click');
  deepEqual(this.site_controller.get('model'), { id: 's-1' });
  deepEqual(this.article_controller.get('model'), { id: 'a-1' });
  equal(router.get('location.path'), '/site/s-1/a/a-1');

  setAndFlush(this.article_controller, 'q', 'lol');

  equal(this.links['s-1-a-1'].attr('href'), '/site/s-1/a/a-1?q=lol');
  equal(this.links['s-1-a-2'].attr('href'), '/site/s-1/a/a-2');
  equal(this.links['s-1-a-3'].attr('href'), '/site/s-1/a/a-3');
  equal(this.links['s-2-a-1'].attr('href'), '/site/s-2/a/a-1?q=lol');
  equal(this.links['s-2-a-2'].attr('href'), '/site/s-2/a/a-2');
  equal(this.links['s-2-a-3'].attr('href'), '/site/s-2/a/a-3');
  equal(this.links['s-3-a-1'].attr('href'), '/site/s-3/a/a-1?q=lol');
  equal(this.links['s-3-a-2'].attr('href'), '/site/s-3/a/a-2');
  equal(this.links['s-3-a-3'].attr('href'), '/site/s-3/a/a-3');

  setAndFlush(this.site_controller, 'country', 'us');

  equal(this.links['s-1-a-1'].attr('href'), '/site/s-1/a/a-1?country=us&q=lol');
  equal(this.links['s-1-a-2'].attr('href'), '/site/s-1/a/a-2?country=us');
  equal(this.links['s-1-a-3'].attr('href'), '/site/s-1/a/a-3?country=us');
  equal(this.links['s-2-a-1'].attr('href'), '/site/s-2/a/a-1?q=lol');
  equal(this.links['s-2-a-2'].attr('href'), '/site/s-2/a/a-2');
  equal(this.links['s-2-a-3'].attr('href'), '/site/s-2/a/a-3');
  equal(this.links['s-3-a-1'].attr('href'), '/site/s-3/a/a-1?q=lol');
  equal(this.links['s-3-a-2'].attr('href'), '/site/s-3/a/a-2');
  equal(this.links['s-3-a-3'].attr('href'), '/site/s-3/a/a-3');

  Ember.run(this.links['s-1-a-2'], 'click');

  equal(this.site_controller.get('country'), 'us');
  equal(this.article_controller.get('q'), 'wat');
  equal(this.article_controller.get('z'), 0);
  deepEqual(this.site_controller.get('model'), { id: 's-1' });
  deepEqual(this.article_controller.get('model'), { id: 'a-2' });
  equal(this.links['s-1-a-1'].attr('href'), '/site/s-1/a/a-1?country=us&q=lol');
  equal(this.links['s-1-a-2'].attr('href'), '/site/s-1/a/a-2?country=us');
  equal(this.links['s-1-a-3'].attr('href'), '/site/s-1/a/a-3?country=us');
  equal(this.links['s-2-a-1'].attr('href'), '/site/s-2/a/a-1?q=lol');
  equal(this.links['s-2-a-2'].attr('href'), '/site/s-2/a/a-2');
  equal(this.links['s-2-a-3'].attr('href'), '/site/s-2/a/a-3');
  equal(this.links['s-3-a-1'].attr('href'), '/site/s-3/a/a-1?q=lol');
  equal(this.links['s-3-a-2'].attr('href'), '/site/s-3/a/a-2');
  equal(this.links['s-3-a-3'].attr('href'), '/site/s-3/a/a-3');

  Ember.run(this.links['s-2-a-2'], 'click');

  equal(this.site_controller.get('country'), 'au');
  equal(this.article_controller.get('q'), 'wat');
  equal(this.article_controller.get('z'), 0);
  deepEqual(this.site_controller.get('model'), { id: 's-2' });
  deepEqual(this.article_controller.get('model'), { id: 'a-2' });
  equal(this.links['s-1-a-1'].attr('href'), '/site/s-1/a/a-1?country=us&q=lol');
  equal(this.links['s-1-a-2'].attr('href'), '/site/s-1/a/a-2?country=us');
  equal(this.links['s-1-a-3'].attr('href'), '/site/s-1/a/a-3?country=us');
  equal(this.links['s-2-a-1'].attr('href'), '/site/s-2/a/a-1?q=lol');
  equal(this.links['s-2-a-2'].attr('href'), '/site/s-2/a/a-2');
  equal(this.links['s-2-a-3'].attr('href'), '/site/s-2/a/a-3');
  equal(this.links['s-3-a-1'].attr('href'), '/site/s-3/a/a-1?q=lol');
  equal(this.links['s-3-a-2'].attr('href'), '/site/s-3/a/a-2');
  equal(this.links['s-3-a-3'].attr('href'), '/site/s-3/a/a-3');
});

QUnit.test('query params have \'model\' stickiness by default (url changes)', function() {
  this.boot();

  this.expectedSiteModelHookParams = { site_id: 's-1', country: 'au' };
  this.expectedArticleModelHookParams = { article_id: 'a-1', q: 'lol', z: 0 };
  handleURL('/site/s-1/a/a-1?q=lol');

  deepEqual(this.site_controller.get('model'), { id: 's-1' }, 'site controller\'s model is s-1');
  deepEqual(this.article_controller.get('model'), { id: 'a-1' }, 'article controller\'s model is a-1');
  equal(this.site_controller.get('country'), 'au');
  equal(this.article_controller.get('q'), 'lol');
  equal(this.article_controller.get('z'), 0);
  equal(this.links['s-1-a-1'].attr('href'), '/site/s-1/a/a-1?q=lol');
  equal(this.links['s-1-a-2'].attr('href'), '/site/s-1/a/a-2');
  equal(this.links['s-1-a-3'].attr('href'), '/site/s-1/a/a-3');
  equal(this.links['s-2-a-1'].attr('href'), '/site/s-2/a/a-1?q=lol');
  equal(this.links['s-2-a-2'].attr('href'), '/site/s-2/a/a-2');
  equal(this.links['s-2-a-3'].attr('href'), '/site/s-2/a/a-3');
  equal(this.links['s-3-a-1'].attr('href'), '/site/s-3/a/a-1?q=lol');
  equal(this.links['s-3-a-2'].attr('href'), '/site/s-3/a/a-2');
  equal(this.links['s-3-a-3'].attr('href'), '/site/s-3/a/a-3');

  this.expectedSiteModelHookParams = { site_id: 's-2', country: 'us' };
  this.expectedArticleModelHookParams = { article_id: 'a-1', q: 'lol', z: 0 };
  handleURL('/site/s-2/a/a-1?country=us&q=lol');

  deepEqual(this.site_controller.get('model'), { id: 's-2' }, 'site controller\'s model is s-2');
  deepEqual(this.article_controller.get('model'), { id: 'a-1' }, 'article controller\'s model is a-1');
  equal(this.site_controller.get('country'), 'us');
  equal(this.article_controller.get('q'), 'lol');
  equal(this.article_controller.get('z'), 0);
  equal(this.links['s-1-a-1'].attr('href'), '/site/s-1/a/a-1?q=lol');
  equal(this.links['s-1-a-2'].attr('href'), '/site/s-1/a/a-2');
  equal(this.links['s-1-a-3'].attr('href'), '/site/s-1/a/a-3');
  equal(this.links['s-2-a-1'].attr('href'), '/site/s-2/a/a-1?country=us&q=lol');
  equal(this.links['s-2-a-2'].attr('href'), '/site/s-2/a/a-2?country=us');
  equal(this.links['s-2-a-3'].attr('href'), '/site/s-2/a/a-3?country=us');
  equal(this.links['s-3-a-1'].attr('href'), '/site/s-3/a/a-1?q=lol');
  equal(this.links['s-3-a-2'].attr('href'), '/site/s-3/a/a-2');
  equal(this.links['s-3-a-3'].attr('href'), '/site/s-3/a/a-3');

  this.expectedSiteModelHookParams = { site_id: 's-2', country: 'us' };
  this.expectedArticleModelHookParams = { article_id: 'a-2', q: 'lol', z: 0 };
  handleURL('/site/s-2/a/a-2?country=us&q=lol');

  deepEqual(this.site_controller.get('model'), { id: 's-2' }, 'site controller\'s model is s-2');
  deepEqual(this.article_controller.get('model'), { id: 'a-2' }, 'article controller\'s model is a-2');
  equal(this.site_controller.get('country'), 'us');
  equal(this.article_controller.get('q'), 'lol');
  equal(this.article_controller.get('z'), 0);
  equal(this.links['s-1-a-1'].attr('href'), '/site/s-1/a/a-1?q=lol');
  equal(this.links['s-1-a-2'].attr('href'), '/site/s-1/a/a-2?q=lol');
  equal(this.links['s-1-a-3'].attr('href'), '/site/s-1/a/a-3');
  equal(this.links['s-2-a-1'].attr('href'), '/site/s-2/a/a-1?country=us&q=lol');
  equal(this.links['s-2-a-2'].attr('href'), '/site/s-2/a/a-2?country=us&q=lol');
  equal(this.links['s-2-a-3'].attr('href'), '/site/s-2/a/a-3?country=us');
  equal(this.links['s-3-a-1'].attr('href'), '/site/s-3/a/a-1?q=lol');
  equal(this.links['s-3-a-2'].attr('href'), '/site/s-3/a/a-2?q=lol');
  equal(this.links['s-3-a-3'].attr('href'), '/site/s-3/a/a-3');

  this.expectedSiteModelHookParams = { site_id: 's-2', country: 'us' };
  this.expectedArticleModelHookParams = { article_id: 'a-3', q: 'lol', z: 123 };
  handleURL('/site/s-2/a/a-3?country=us&q=lol&z=123');

  deepEqual(this.site_controller.get('model'), { id: 's-2' }, 'site controller\'s model is s-2');
  deepEqual(this.article_controller.get('model'), { id: 'a-3' }, 'article controller\'s model is a-3');
  equal(this.site_controller.get('country'), 'us');
  equal(this.article_controller.get('q'), 'lol');
  equal(this.article_controller.get('z'), 123);
  equal(this.links['s-1-a-1'].attr('href'), '/site/s-1/a/a-1?q=lol');
  equal(this.links['s-1-a-2'].attr('href'), '/site/s-1/a/a-2?q=lol');
  equal(this.links['s-1-a-3'].attr('href'), '/site/s-1/a/a-3?q=lol&z=123');
  equal(this.links['s-2-a-1'].attr('href'), '/site/s-2/a/a-1?country=us&q=lol');
  equal(this.links['s-2-a-2'].attr('href'), '/site/s-2/a/a-2?country=us&q=lol');
  equal(this.links['s-2-a-3'].attr('href'), '/site/s-2/a/a-3?country=us&q=lol&z=123');
  equal(this.links['s-3-a-1'].attr('href'), '/site/s-3/a/a-1?q=lol');
  equal(this.links['s-3-a-2'].attr('href'), '/site/s-3/a/a-2?q=lol');
  equal(this.links['s-3-a-3'].attr('href'), '/site/s-3/a/a-3?q=lol&z=123');

  this.expectedSiteModelHookParams = { site_id: 's-3', country: 'nz' };
  this.expectedArticleModelHookParams = { article_id: 'a-3', q: 'lol', z: 123 };
  handleURL('/site/s-3/a/a-3?country=nz&q=lol&z=123');

  deepEqual(this.site_controller.get('model'), { id: 's-3' }, 'site controller\'s model is s-3');
  deepEqual(this.article_controller.get('model'), { id: 'a-3' }, 'article controller\'s model is a-3');
  equal(this.site_controller.get('country'), 'nz');
  equal(this.article_controller.get('q'), 'lol');
  equal(this.article_controller.get('z'), 123);
  equal(this.links['s-1-a-1'].attr('href'), '/site/s-1/a/a-1?q=lol');
  equal(this.links['s-1-a-2'].attr('href'), '/site/s-1/a/a-2?q=lol');
  equal(this.links['s-1-a-3'].attr('href'), '/site/s-1/a/a-3?q=lol&z=123');
  equal(this.links['s-2-a-1'].attr('href'), '/site/s-2/a/a-1?country=us&q=lol');
  equal(this.links['s-2-a-2'].attr('href'), '/site/s-2/a/a-2?country=us&q=lol');
  equal(this.links['s-2-a-3'].attr('href'), '/site/s-2/a/a-3?country=us&q=lol&z=123');
  equal(this.links['s-3-a-1'].attr('href'), '/site/s-3/a/a-1?country=nz&q=lol');
  equal(this.links['s-3-a-2'].attr('href'), '/site/s-3/a/a-2?country=nz&q=lol');
  equal(this.links['s-3-a-3'].attr('href'), '/site/s-3/a/a-3?country=nz&q=lol&z=123');
});

QUnit.test('query params have \'model\' stickiness by default (params-based transitions)', function() {
  this.boot();

  this.expectedSiteModelHookParams = { site_id: 's-1', country: 'au' };
  this.expectedArticleModelHookParams = { article_id: 'a-1', q: 'wat', z: 0 };
  Ember.run(router, 'transitionTo', 'site.article', 's-1', 'a-1');

  deepEqual(this.site_controller.get('model'), { id: 's-1' });
  deepEqual(this.article_controller.get('model'), { id: 'a-1' });
  equal(this.site_controller.get('country'), 'au');
  equal(this.article_controller.get('q'), 'wat');
  equal(this.article_controller.get('z'), 0);
  equal(this.links['s-1-a-1'].attr('href'), '/site/s-1/a/a-1');
  equal(this.links['s-1-a-2'].attr('href'), '/site/s-1/a/a-2');
  equal(this.links['s-1-a-3'].attr('href'), '/site/s-1/a/a-3');
  equal(this.links['s-2-a-1'].attr('href'), '/site/s-2/a/a-1');
  equal(this.links['s-2-a-2'].attr('href'), '/site/s-2/a/a-2');
  equal(this.links['s-2-a-3'].attr('href'), '/site/s-2/a/a-3');
  equal(this.links['s-3-a-1'].attr('href'), '/site/s-3/a/a-1');
  equal(this.links['s-3-a-2'].attr('href'), '/site/s-3/a/a-2');
  equal(this.links['s-3-a-3'].attr('href'), '/site/s-3/a/a-3');

  this.expectedSiteModelHookParams = { site_id: 's-1', country: 'au' };
  this.expectedArticleModelHookParams = { article_id: 'a-2', q: 'lol', z: 0 };
  Ember.run(router, 'transitionTo', 'site.article', 's-1', 'a-2', { queryParams: { q: 'lol' } });

  deepEqual(this.site_controller.get('model'), { id: 's-1' });
  deepEqual(this.article_controller.get('model'), { id: 'a-2' });
  equal(this.site_controller.get('country'), 'au');
  equal(this.article_controller.get('q'), 'lol');
  equal(this.article_controller.get('z'), 0);
  equal(this.links['s-1-a-1'].attr('href'), '/site/s-1/a/a-1');
  equal(this.links['s-1-a-2'].attr('href'), '/site/s-1/a/a-2?q=lol');
  equal(this.links['s-1-a-3'].attr('href'), '/site/s-1/a/a-3');
  equal(this.links['s-2-a-1'].attr('href'), '/site/s-2/a/a-1');
  equal(this.links['s-2-a-2'].attr('href'), '/site/s-2/a/a-2?q=lol');
  equal(this.links['s-2-a-3'].attr('href'), '/site/s-2/a/a-3');
  equal(this.links['s-3-a-1'].attr('href'), '/site/s-3/a/a-1');
  equal(this.links['s-3-a-2'].attr('href'), '/site/s-3/a/a-2?q=lol');
  equal(this.links['s-3-a-3'].attr('href'), '/site/s-3/a/a-3');

  this.expectedSiteModelHookParams = { site_id: 's-1', country: 'au' };
  this.expectedArticleModelHookParams = { article_id: 'a-3', q: 'hay', z: 0 };
  Ember.run(router, 'transitionTo', 'site.article', 's-1', 'a-3', { queryParams: { q: 'hay' } });

  deepEqual(this.site_controller.get('model'), { id: 's-1' });
  deepEqual(this.article_controller.get('model'), { id: 'a-3' });
  equal(this.site_controller.get('country'), 'au');
  equal(this.article_controller.get('q'), 'hay');
  equal(this.article_controller.get('z'), 0);
  equal(this.links['s-1-a-1'].attr('href'), '/site/s-1/a/a-1');
  equal(this.links['s-1-a-2'].attr('href'), '/site/s-1/a/a-2?q=lol');
  equal(this.links['s-1-a-3'].attr('href'), '/site/s-1/a/a-3?q=hay');
  equal(this.links['s-2-a-1'].attr('href'), '/site/s-2/a/a-1');
  equal(this.links['s-2-a-2'].attr('href'), '/site/s-2/a/a-2?q=lol');
  equal(this.links['s-2-a-3'].attr('href'), '/site/s-2/a/a-3?q=hay');
  equal(this.links['s-3-a-1'].attr('href'), '/site/s-3/a/a-1');
  equal(this.links['s-3-a-2'].attr('href'), '/site/s-3/a/a-2?q=lol');
  equal(this.links['s-3-a-3'].attr('href'), '/site/s-3/a/a-3?q=hay');

  this.expectedSiteModelHookParams = { site_id: 's-1', country: 'au' };
  this.expectedArticleModelHookParams = { article_id: 'a-2', q: 'lol', z: 1 };
  Ember.run(router, 'transitionTo', 'site.article', 's-1', 'a-2', { queryParams: { z: 1 } });

  deepEqual(this.site_controller.get('model'), { id: 's-1' });
  deepEqual(this.article_controller.get('model'), { id: 'a-2' });
  equal(this.site_controller.get('country'), 'au');
  equal(this.article_controller.get('q'), 'lol');
  equal(this.article_controller.get('z'), 1);
  equal(this.links['s-1-a-1'].attr('href'), '/site/s-1/a/a-1');
  equal(this.links['s-1-a-2'].attr('href'), '/site/s-1/a/a-2?q=lol&z=1');
  equal(this.links['s-1-a-3'].attr('href'), '/site/s-1/a/a-3?q=hay');
  equal(this.links['s-2-a-1'].attr('href'), '/site/s-2/a/a-1');
  equal(this.links['s-2-a-2'].attr('href'), '/site/s-2/a/a-2?q=lol&z=1');
  equal(this.links['s-2-a-3'].attr('href'), '/site/s-2/a/a-3?q=hay');
  equal(this.links['s-3-a-1'].attr('href'), '/site/s-3/a/a-1');
  equal(this.links['s-3-a-2'].attr('href'), '/site/s-3/a/a-2?q=lol&z=1');
  equal(this.links['s-3-a-3'].attr('href'), '/site/s-3/a/a-3?q=hay');

  this.expectedSiteModelHookParams = { site_id: 's-2', country: 'us' };
  this.expectedArticleModelHookParams = { article_id: 'a-2', q: 'lol', z: 1 };
  Ember.run(router, 'transitionTo', 'site.article', 's-2', 'a-2', { queryParams: { country: 'us' } });

  deepEqual(this.site_controller.get('model'), { id: 's-2' });
  deepEqual(this.article_controller.get('model'), { id: 'a-2' });
  equal(this.site_controller.get('country'), 'us');
  equal(this.article_controller.get('q'), 'lol');
  equal(this.article_controller.get('z'), 1);
  equal(this.links['s-1-a-1'].attr('href'), '/site/s-1/a/a-1');
  equal(this.links['s-1-a-2'].attr('href'), '/site/s-1/a/a-2?q=lol&z=1');
  equal(this.links['s-1-a-3'].attr('href'), '/site/s-1/a/a-3?q=hay');
  equal(this.links['s-2-a-1'].attr('href'), '/site/s-2/a/a-1?country=us');
  equal(this.links['s-2-a-2'].attr('href'), '/site/s-2/a/a-2?country=us&q=lol&z=1');
  equal(this.links['s-2-a-3'].attr('href'), '/site/s-2/a/a-3?country=us&q=hay');
  equal(this.links['s-3-a-1'].attr('href'), '/site/s-3/a/a-1');
  equal(this.links['s-3-a-2'].attr('href'), '/site/s-3/a/a-2?q=lol&z=1');
  equal(this.links['s-3-a-3'].attr('href'), '/site/s-3/a/a-3?q=hay');

  this.expectedSiteModelHookParams = { site_id: 's-2', country: 'us' };
  this.expectedArticleModelHookParams = { article_id: 'a-1', q: 'yeah', z: 0 };
  Ember.run(router, 'transitionTo', 'site.article', 's-2', 'a-1', { queryParams: { q: 'yeah' } });

  deepEqual(this.site_controller.get('model'), { id: 's-2' });
  deepEqual(this.article_controller.get('model'), { id: 'a-1' });
  equal(this.site_controller.get('country'), 'us');
  equal(this.article_controller.get('q'), 'yeah');
  equal(this.article_controller.get('z'), 0);
  equal(this.links['s-1-a-1'].attr('href'), '/site/s-1/a/a-1?q=yeah');
  equal(this.links['s-1-a-2'].attr('href'), '/site/s-1/a/a-2?q=lol&z=1');
  equal(this.links['s-1-a-3'].attr('href'), '/site/s-1/a/a-3?q=hay');
  equal(this.links['s-2-a-1'].attr('href'), '/site/s-2/a/a-1?country=us&q=yeah');
  equal(this.links['s-2-a-2'].attr('href'), '/site/s-2/a/a-2?country=us&q=lol&z=1');
  equal(this.links['s-2-a-3'].attr('href'), '/site/s-2/a/a-3?country=us&q=hay');
  equal(this.links['s-3-a-1'].attr('href'), '/site/s-3/a/a-1?q=yeah');
  equal(this.links['s-3-a-2'].attr('href'), '/site/s-3/a/a-2?q=lol&z=1');
  equal(this.links['s-3-a-3'].attr('href'), '/site/s-3/a/a-3?q=hay');

  this.expectedSiteModelHookParams = { site_id: 's-3', country: 'nz' };
  this.expectedArticleModelHookParams = { article_id: 'a-3', q: 'hay', z: 3 };
  Ember.run(router, 'transitionTo', 'site.article', 's-3', 'a-3', { queryParams: { country: 'nz', z: 3 } });

  deepEqual(this.site_controller.get('model'), { id: 's-3' });
  deepEqual(this.article_controller.get('model'), { id: 'a-3' });
  equal(this.site_controller.get('country'), 'nz');
  equal(this.article_controller.get('q'), 'hay');
  equal(this.article_controller.get('z'), 3);
  equal(this.links['s-1-a-1'].attr('href'), '/site/s-1/a/a-1?q=yeah');
  equal(this.links['s-1-a-2'].attr('href'), '/site/s-1/a/a-2?q=lol&z=1');
  equal(this.links['s-1-a-3'].attr('href'), '/site/s-1/a/a-3?q=hay&z=3');
  equal(this.links['s-2-a-1'].attr('href'), '/site/s-2/a/a-1?country=us&q=yeah');
  equal(this.links['s-2-a-2'].attr('href'), '/site/s-2/a/a-2?country=us&q=lol&z=1');
  equal(this.links['s-2-a-3'].attr('href'), '/site/s-2/a/a-3?country=us&q=hay&z=3');
  equal(this.links['s-3-a-1'].attr('href'), '/site/s-3/a/a-1?country=nz&q=yeah');
  equal(this.links['s-3-a-2'].attr('href'), '/site/s-3/a/a-2?country=nz&q=lol&z=1');
  equal(this.links['s-3-a-3'].attr('href'), '/site/s-3/a/a-3?country=nz&q=hay&z=3');
});
