import {
  Controller,
  A as emberA
} from 'ember-runtime';
import { Route } from 'ember-routing';
import { run, computed } from 'ember-metal';
import { jQuery } from 'ember-views';
import { QueryParamTestCase, moduleFor } from 'internal-test-helpers';

class ModelDependentQPTestCase extends QueryParamTestCase {
  boot() {
    this.setupApplication();
    return this.visitApplication();
  }

  teardown() {
    super.teardown(...arguments);
    this.assert.ok(!this.expectedModelHookParams, 'there should be no pending expectation of expected model hook params');
  }

  reopenController(name, options) {
    this.application.resolveRegistration(`controller:${name}`).reopen(options);
  }

  reopenRoute(name, options) {
    this.application.resolveRegistration(`route:${name}`).reopen(options);
  }

  queryParamsStickyTest1(urlPrefix) {
    let assert = this.assert;

    assert.expect(14);

    return this.boot().then(() => {
      run(this.$link1, 'click');
      this.assertCurrentPath(`${urlPrefix}/a-1`);

      this.setAndFlush(this.controller, 'q', 'lol');

      assert.equal(this.$link1.attr('href'), `${urlPrefix}/a-1?q=lol`);
      assert.equal(this.$link2.attr('href'), `${urlPrefix}/a-2`);
      assert.equal(this.$link3.attr('href'), `${urlPrefix}/a-3`);

      run(this.$link2, 'click');

      assert.equal(this.controller.get('q'), 'wat');
      assert.equal(this.controller.get('z'), 0);
      assert.deepEqual(this.controller.get('model'), { id: 'a-2' });
      assert.equal(this.$link1.attr('href'), `${urlPrefix}/a-1?q=lol`);
      assert.equal(this.$link2.attr('href'), `${urlPrefix}/a-2`);
      assert.equal(this.$link3.attr('href'), `${urlPrefix}/a-3`);
    });
  }

  queryParamsStickyTest2(urlPrefix) {
    let assert = this.assert;

    assert.expect(24);

    return this.boot().then(() => {
      this.expectedModelHookParams = { id: 'a-1', q: 'lol', z: 0 };
      this.transitionTo(`${urlPrefix}/a-1?q=lol`);

      assert.deepEqual(this.controller.get('model'), { id: 'a-1' });
      assert.equal(this.controller.get('q'), 'lol');
      assert.equal(this.controller.get('z'), 0);
      assert.equal(this.$link1.attr('href'), `${urlPrefix}/a-1?q=lol`);
      assert.equal(this.$link2.attr('href'), `${urlPrefix}/a-2`);
      assert.equal(this.$link3.attr('href'), `${urlPrefix}/a-3`);

      this.expectedModelHookParams = { id: 'a-2', q: 'lol', z: 0 };
      this.transitionTo(`${urlPrefix}/a-2?q=lol`);

      assert.deepEqual(this.controller.get('model'), { id: 'a-2' }, 'controller\'s model changed to a-2');
      assert.equal(this.controller.get('q'), 'lol');
      assert.equal(this.controller.get('z'), 0);
      assert.equal(this.$link1.attr('href'), `${urlPrefix}/a-1?q=lol`);
      assert.equal(this.$link2.attr('href'), `${urlPrefix}/a-2?q=lol`);
      assert.equal(this.$link3.attr('href'), `${urlPrefix}/a-3`);

      this.expectedModelHookParams = { id: 'a-3', q: 'lol', z: 123 };
      this.transitionTo(`${urlPrefix}/a-3?q=lol&z=123`);

      assert.equal(this.controller.get('q'), 'lol');
      assert.equal(this.controller.get('z'), 123);
      assert.equal(this.$link1.attr('href'), `${urlPrefix}/a-1?q=lol`);
      assert.equal(this.$link2.attr('href'), `${urlPrefix}/a-2?q=lol`);
      assert.equal(this.$link3.attr('href'), `${urlPrefix}/a-3?q=lol&z=123`);
    });
  }

  queryParamsStickyTest3(urlPrefix, articleLookup) {
    let assert = this.assert;

    assert.expect(32);

    this.addTemplate('application', `{{#each articles as |a|}} {{link-to 'Article' '${articleLookup}' a.id id=a.id}} {{/each}}`);

    return this.boot().then(() => {
      this.expectedModelHookParams = { id: 'a-1', q: 'wat', z: 0 };
      this.transitionTo(articleLookup, 'a-1');

      assert.deepEqual(this.controller.get('model'), { id: 'a-1' });
      assert.equal(this.controller.get('q'), 'wat');
      assert.equal(this.controller.get('z'), 0);
      assert.equal(this.$link1.attr('href'), `${urlPrefix}/a-1`);
      assert.equal(this.$link2.attr('href'), `${urlPrefix}/a-2`);
      assert.equal(this.$link3.attr('href'), `${urlPrefix}/a-3`);

      this.expectedModelHookParams = { id: 'a-2', q: 'lol', z: 0 };
      this.transitionTo(articleLookup, 'a-2', { queryParams: { q: 'lol' } });

      assert.deepEqual(this.controller.get('model'), { id: 'a-2' });
      assert.equal(this.controller.get('q'), 'lol');
      assert.equal(this.controller.get('z'), 0);
      assert.equal(this.$link1.attr('href'), `${urlPrefix}/a-1`);
      assert.equal(this.$link2.attr('href'), `${urlPrefix}/a-2?q=lol`);
      assert.equal(this.$link3.attr('href'), `${urlPrefix}/a-3`);

      this.expectedModelHookParams = { id: 'a-3', q: 'hay', z: 0 };
      this.transitionTo(articleLookup, 'a-3', { queryParams: { q: 'hay' } });

      assert.deepEqual(this.controller.get('model'), { id: 'a-3' });
      assert.equal(this.controller.get('q'), 'hay');
      assert.equal(this.controller.get('z'), 0);
      assert.equal(this.$link1.attr('href'), `${urlPrefix}/a-1`);
      assert.equal(this.$link2.attr('href'), `${urlPrefix}/a-2?q=lol`);
      assert.equal(this.$link3.attr('href'), `${urlPrefix}/a-3?q=hay`);

      this.expectedModelHookParams = { id: 'a-2', q: 'lol', z: 1 };
      this.transitionTo(articleLookup, 'a-2', { queryParams: { z: 1 } });

      assert.deepEqual(this.controller.get('model'), { id: 'a-2' });
      assert.equal(this.controller.get('q'), 'lol');
      assert.equal(this.controller.get('z'), 1);
      assert.equal(this.$link1.attr('href'), `${urlPrefix}/a-1`);
      assert.equal(this.$link2.attr('href'), `${urlPrefix}/a-2?q=lol&z=1`);
      assert.equal(this.$link3.attr('href'), `${urlPrefix}/a-3?q=hay`);
    });
  }

  queryParamsStickyTest4(urlPrefix, articleLookup) {
    let assert = this.assert;

    assert.expect(24);

    this.setupApplication();

    this.reopenController(articleLookup, {
      queryParams: { q: { scope: 'controller' } }
    });

    return this.visitApplication().then(() => {
      run(this.$link1, 'click');
      this.assertCurrentPath(`${urlPrefix}/a-1`);

      this.setAndFlush(this.controller, 'q', 'lol');

      assert.equal(this.$link1.attr('href'), `${urlPrefix}/a-1?q=lol`);
      assert.equal(this.$link2.attr('href'), `${urlPrefix}/a-2?q=lol`);
      assert.equal(this.$link3.attr('href'), `${urlPrefix}/a-3?q=lol`);

      run(this.$link2, 'click');

      assert.equal(this.controller.get('q'), 'lol');
      assert.equal(this.controller.get('z'), 0);
      assert.deepEqual(this.controller.get('model'), { id: 'a-2' });

      assert.equal(this.$link1.attr('href'), `${urlPrefix}/a-1?q=lol`);
      assert.equal(this.$link2.attr('href'), `${urlPrefix}/a-2?q=lol`);
      assert.equal(this.$link3.attr('href'), `${urlPrefix}/a-3?q=lol`);

      this.expectedModelHookParams = { id: 'a-3', q: 'haha', z: 123 };
      this.transitionTo(`${urlPrefix}/a-3?q=haha&z=123`);

      assert.deepEqual(this.controller.get('model'), { id: 'a-3' });
      assert.equal(this.controller.get('q'), 'haha');
      assert.equal(this.controller.get('z'), 123);

      assert.equal(this.$link1.attr('href'), `${urlPrefix}/a-1?q=haha`);
      assert.equal(this.$link2.attr('href'), `${urlPrefix}/a-2?q=haha`);
      assert.equal(this.$link3.attr('href'), `${urlPrefix}/a-3?q=haha&z=123`);

      this.setAndFlush(this.controller, 'q', 'woot');

      assert.equal(this.$link1.attr('href'), `${urlPrefix}/a-1?q=woot`);
      assert.equal(this.$link2.attr('href'), `${urlPrefix}/a-2?q=woot`);
      assert.equal(this.$link3.attr('href'), `${urlPrefix}/a-3?q=woot&z=123`);
    });
  }

  queryParamsStickyTest5(urlPrefix, commentsLookupKey) {
    let assert = this.assert;

    assert.expect(12);

    return this.boot().then(() => {
      this.transitionTo(commentsLookupKey, 'a-1');

      let commentsCtrl = this.getController(commentsLookupKey);
      assert.equal(commentsCtrl.get('page'), 1);
      this.assertCurrentPath(`${urlPrefix}/a-1/comments`);

      this.setAndFlush(commentsCtrl, 'page', 2);
      this.assertCurrentPath(`${urlPrefix}/a-1/comments?page=2`);

      this.setAndFlush(commentsCtrl, 'page', 3);
      this.assertCurrentPath(`${urlPrefix}/a-1/comments?page=3`);

      this.transitionTo(commentsLookupKey, 'a-2');
      assert.equal(commentsCtrl.get('page'), 1);
      this.assertCurrentPath(`${urlPrefix}/a-2/comments`);

      this.transitionTo(commentsLookupKey, 'a-1');
      assert.equal(commentsCtrl.get('page'), 3);
      this.assertCurrentPath(`${urlPrefix}/a-1/comments?page=3`);
    });
  }

  queryParamsStickyTest6(urlPrefix, articleLookup, commentsLookup) {
    let assert = this.assert;

    assert.expect(13);

    this.setupApplication();

    this.reopenRoute(articleLookup, {
      resetController(controller, isExiting) {
        this.controllerFor(commentsLookup).set('page', 1);
        if (isExiting) {
          controller.set('q', 'imdone');
        }
      }
    });

    this.addTemplate('about', `{{link-to 'A' '${commentsLookup}' 'a-1' id='one'}} {{link-to 'B' '${commentsLookup}' 'a-2' id='two'}}`);

    return this.visitApplication().then(() => {
      this.transitionTo(commentsLookup, 'a-1');

      let commentsCtrl = this.getController(commentsLookup);
      assert.equal(commentsCtrl.get('page'), 1);
      this.assertCurrentPath(`${urlPrefix}/a-1/comments`);

      this.setAndFlush(commentsCtrl, 'page', 2);
      this.assertCurrentPath(`${urlPrefix}/a-1/comments?page=2`);

      this.transitionTo(commentsLookup, 'a-2');
      assert.equal(commentsCtrl.get('page'), 1);
      assert.equal(this.controller.get('q'), 'wat');

      this.transitionTo(commentsLookup, 'a-1');

      this.assertCurrentPath(`${urlPrefix}/a-1/comments`);
      assert.equal(commentsCtrl.get('page'), 1);

      this.transitionTo('about');
      assert.equal(jQuery('#one').attr('href'), `${urlPrefix}/a-1/comments?q=imdone`);
      assert.equal(jQuery('#two').attr('href'), `${urlPrefix}/a-2/comments`);
    });
  }
}

moduleFor('Query Params - model-dependent state', class extends ModelDependentQPTestCase {
  setupApplication() {
    this.router.map(function() {
      this.route('article', { path: '/a/:id' }, function() {
        this.route('comments', { resetNamespace: true });
      });
      this.route('about');
    });

    let articles = emberA([{ id: 'a-1' }, { id: 'a-2' }, { id: 'a-3' }]);

    this.add('controller:application', Controller.extend({
      articles
    }));

    let self = this;
    let assert = this.assert;
    this.add('route:article', Route.extend({
      model(params) {
        if (self.expectedModelHookParams) {
          assert.deepEqual(params, self.expectedModelHookParams, 'the ArticleRoute model hook received the expected merged dynamic segment + query params hash');
          self.expectedModelHookParams = null;
        }
        return articles.findBy('id', params.id);
      }
    }));

    this.add('controller:article', Controller.extend({
      queryParams: ['q', 'z'],
      q: 'wat',
      z: 0
    }));

    this.add('controller:comments', Controller.extend({
      queryParams: 'page',
      page: 1
    }));

    this.addTemplate('application', '{{#each articles as |a|}} 1{{link-to \'Article\' \'article\' a id=a.id}} {{/each}} {{outlet}}');
  }

  visitApplication() {
    return this.visit('/').then(() => {
      let assert = this.assert;

      this.$link1 = jQuery('#a-1');
      this.$link2 = jQuery('#a-2');
      this.$link3 = jQuery('#a-3');

      assert.equal(this.$link1.attr('href'), '/a/a-1');
      assert.equal(this.$link2.attr('href'), '/a/a-2');
      assert.equal(this.$link3.attr('href'), '/a/a-3');

      this.controller = this.getController('article');
    });
  }

  ['@test query params have \'model\' stickiness by default']() {
    return this.queryParamsStickyTest1('/a');
  }

  ['@test query params have \'model\' stickiness by default (url changes)']() {
    return this.queryParamsStickyTest2('/a');
  }

  ['@test query params have \'model\' stickiness by default (params-based transitions)']() {
    return this.queryParamsStickyTest3('/a', 'article');
  }

  ['@test \'controller\' stickiness shares QP state between models']() {
    return this.queryParamsStickyTest4('/a', 'article');
  }

  ['@test \'model\' stickiness is scoped to current or first dynamic parent route']() {
    return this.queryParamsStickyTest5('/a', 'comments');
  }

  ['@test can reset query params using the resetController hook']() {
    return this.queryParamsStickyTest6('/a', 'article', 'comments');
  }
});

moduleFor('Query Params - model-dependent state (nested)', class extends ModelDependentQPTestCase {
  setupApplication() {
    this.router.map(function() {
      this.route('site', function() {
        this.route('article', { path: '/a/:id' }, function() {
          this.route('comments');
        });
      });
      this.route('about');
    });

    let site_articles = emberA([{ id: 'a-1' }, { id: 'a-2' }, { id: 'a-3' }]);

    this.add('controller:application', Controller.extend({
      articles: site_articles
    }));

    let self = this;
    let assert = this.assert;
    this.add('route:site.article', Route.extend({
      model(params) {
        if (self.expectedModelHookParams) {
          assert.deepEqual(params, self.expectedModelHookParams, 'the ArticleRoute model hook received the expected merged dynamic segment + query params hash');
          self.expectedModelHookParams = null;
        }
        return site_articles.findBy('id', params.id);
      }
    }));

    this.add('controller:site.article', Controller.extend({
      queryParams: ['q', 'z'],
      q: 'wat',
      z: 0
    }));

    this.add('controller:site.article.comments', Controller.extend({
      queryParams: 'page',
      page: 1
    }));

    this.addTemplate('application', '{{#each articles as |a|}} {{link-to \'Article\' \'site.article\' a id=a.id}} {{/each}} {{outlet}}');
  }

  visitApplication() {
    return this.visit('/').then(() => {
      let assert = this.assert;

      this.$link1 = jQuery('#a-1');
      this.$link2 = jQuery('#a-2');
      this.$link3 = jQuery('#a-3');

      assert.equal(this.$link1.attr('href'), '/site/a/a-1');
      assert.equal(this.$link2.attr('href'), '/site/a/a-2');
      assert.equal(this.$link3.attr('href'), '/site/a/a-3');

      this.controller = this.getController('site.article');
    });
  }

  ['@test query params have \'model\' stickiness by default']() {
    return this.queryParamsStickyTest1('/site/a');
  }

  ['@test query params have \'model\' stickiness by default (url changes)']() {
    return this.queryParamsStickyTest2('/site/a');
  }

  ['@test query params have \'model\' stickiness by default (params-based transitions)']() {
    return this.queryParamsStickyTest3('/site/a', 'site.article');
  }

  ['@test \'controller\' stickiness shares QP state between models']() {
    return this.queryParamsStickyTest4('/site/a', 'site.article');
  }

  ['@test \'model\' stickiness is scoped to current or first dynamic parent route']() {
    return this.queryParamsStickyTest5('/site/a', 'site.article.comments');
  }

  ['@test can reset query params using the resetController hook']() {
    return this.queryParamsStickyTest6('/site/a', 'site.article', 'site.article.comments');
  }
});

moduleFor('Query Params - model-dependent state (nested & more than 1 dynamic segment)', class extends ModelDependentQPTestCase {
  setupApplication() {
    this.router.map(function() {
      this.route('site', { path: '/site/:site_id' }, function() {
        this.route('article', { path: '/a/:article_id' }, function() {
          this.route('comments');
        });
      });
    });

    let sites = emberA([{ id: 's-1' }, { id: 's-2' }, { id: 's-3' }]);
    let site_articles = emberA([{ id: 'a-1' }, { id: 'a-2' }, { id: 'a-3' }]);

    this.add('controller:application', Controller.extend({
      siteArticles: site_articles,
      sites,
      allSitesAllArticles: computed({
        get() {
          let ret = [];
          let siteArticles = this.siteArticles;
          let sites = this.sites;
          sites.forEach(site => {
            ret = ret.concat(siteArticles.map((article) => {
              return { id: `${site.id}-${article.id}`, site_id: site.id, article_id: article.id };
            }));
          });
          return ret;
        }
      })
    }));

    let self = this;
    let assert = this.assert;
    this.add('route:site', Route.extend({
      model(params) {
        if (self.expectedSiteModelHookParams) {
          assert.deepEqual(params, self.expectedSiteModelHookParams, 'the SiteRoute model hook received the expected merged dynamic segment + query params hash');
          self.expectedSiteModelHookParams = null;
        }
        return sites.findBy('id', params.site_id);
      }
    }));

    this.add('route:site.article', Route.extend({
      model(params) {
        if (self.expectedArticleModelHookParams) {
          assert.deepEqual(params, self.expectedArticleModelHookParams, 'the SiteArticleRoute model hook received the expected merged dynamic segment + query params hash');
          self.expectedArticleModelHookParams = null;
        }
        return site_articles.findBy('id', params.article_id);
      }
    }));

    this.add('controller:site', Controller.extend({
      queryParams: ['country'],
      country: 'au'
    }));

    this.add('controller:site.article', Controller.extend({
      queryParams: ['q', 'z'],
      q: 'wat',
      z: 0
    }));

    this.add('controller:site.article.comments', Controller.extend({
      queryParams: ['page'],
      page: 1
    }));

    this.addTemplate('application', '{{#each allSitesAllArticles as |a|}} {{#link-to \'site.article\' a.site_id a.article_id id=a.id}}Article [{{a.site_id}}] [{{a.article_id}}]{{/link-to}} {{/each}} {{outlet}}');
  }

  visitApplication() {
    return this.visit('/').then(() => {
      let assert = this.assert;

      this.links = {};
      this.links['s-1-a-1'] = jQuery('#s-1-a-1');
      this.links['s-1-a-2'] = jQuery('#s-1-a-2');
      this.links['s-1-a-3'] = jQuery('#s-1-a-3');
      this.links['s-2-a-1'] = jQuery('#s-2-a-1');
      this.links['s-2-a-2'] = jQuery('#s-2-a-2');
      this.links['s-2-a-3'] = jQuery('#s-2-a-3');
      this.links['s-3-a-1'] = jQuery('#s-3-a-1');
      this.links['s-3-a-2'] = jQuery('#s-3-a-2');
      this.links['s-3-a-3'] = jQuery('#s-3-a-3');

      assert.equal(this.links['s-1-a-1'].attr('href'), '/site/s-1/a/a-1');
      assert.equal(this.links['s-1-a-2'].attr('href'), '/site/s-1/a/a-2');
      assert.equal(this.links['s-1-a-3'].attr('href'), '/site/s-1/a/a-3');
      assert.equal(this.links['s-2-a-1'].attr('href'), '/site/s-2/a/a-1');
      assert.equal(this.links['s-2-a-2'].attr('href'), '/site/s-2/a/a-2');
      assert.equal(this.links['s-2-a-3'].attr('href'), '/site/s-2/a/a-3');
      assert.equal(this.links['s-3-a-1'].attr('href'), '/site/s-3/a/a-1');
      assert.equal(this.links['s-3-a-2'].attr('href'), '/site/s-3/a/a-2');
      assert.equal(this.links['s-3-a-3'].attr('href'), '/site/s-3/a/a-3');

      this.site_controller = this.getController('site');
      this.article_controller = this.getController('site.article');
    });
  }

  ['@test query params have \'model\' stickiness by default'](assert) {
    assert.expect(59);

    return this.boot().then(() => {
      run(this.links['s-1-a-1'], 'click');
      assert.deepEqual(this.site_controller.get('model'), { id: 's-1' });
      assert.deepEqual(this.article_controller.get('model'), { id: 'a-1' });
      this.assertCurrentPath('/site/s-1/a/a-1');

      this.setAndFlush(this.article_controller, 'q', 'lol');

      assert.equal(this.links['s-1-a-1'].attr('href'), '/site/s-1/a/a-1?q=lol');
      assert.equal(this.links['s-1-a-2'].attr('href'), '/site/s-1/a/a-2');
      assert.equal(this.links['s-1-a-3'].attr('href'), '/site/s-1/a/a-3');
      assert.equal(this.links['s-2-a-1'].attr('href'), '/site/s-2/a/a-1?q=lol');
      assert.equal(this.links['s-2-a-2'].attr('href'), '/site/s-2/a/a-2');
      assert.equal(this.links['s-2-a-3'].attr('href'), '/site/s-2/a/a-3');
      assert.equal(this.links['s-3-a-1'].attr('href'), '/site/s-3/a/a-1?q=lol');
      assert.equal(this.links['s-3-a-2'].attr('href'), '/site/s-3/a/a-2');
      assert.equal(this.links['s-3-a-3'].attr('href'), '/site/s-3/a/a-3');

      this.setAndFlush(this.site_controller, 'country', 'us');

      assert.equal(this.links['s-1-a-1'].attr('href'), '/site/s-1/a/a-1?country=us&q=lol');
      assert.equal(this.links['s-1-a-2'].attr('href'), '/site/s-1/a/a-2?country=us');
      assert.equal(this.links['s-1-a-3'].attr('href'), '/site/s-1/a/a-3?country=us');
      assert.equal(this.links['s-2-a-1'].attr('href'), '/site/s-2/a/a-1?q=lol');
      assert.equal(this.links['s-2-a-2'].attr('href'), '/site/s-2/a/a-2');
      assert.equal(this.links['s-2-a-3'].attr('href'), '/site/s-2/a/a-3');
      assert.equal(this.links['s-3-a-1'].attr('href'), '/site/s-3/a/a-1?q=lol');
      assert.equal(this.links['s-3-a-2'].attr('href'), '/site/s-3/a/a-2');
      assert.equal(this.links['s-3-a-3'].attr('href'), '/site/s-3/a/a-3');

      run(this.links['s-1-a-2'], 'click');

      assert.equal(this.site_controller.get('country'), 'us');
      assert.equal(this.article_controller.get('q'), 'wat');
      assert.equal(this.article_controller.get('z'), 0);
      assert.deepEqual(this.site_controller.get('model'), { id: 's-1' });
      assert.deepEqual(this.article_controller.get('model'), { id: 'a-2' });
      assert.equal(this.links['s-1-a-1'].attr('href'), '/site/s-1/a/a-1?country=us&q=lol');
      assert.equal(this.links['s-1-a-2'].attr('href'), '/site/s-1/a/a-2?country=us');
      assert.equal(this.links['s-1-a-3'].attr('href'), '/site/s-1/a/a-3?country=us');
      assert.equal(this.links['s-2-a-1'].attr('href'), '/site/s-2/a/a-1?q=lol');
      assert.equal(this.links['s-2-a-2'].attr('href'), '/site/s-2/a/a-2');
      assert.equal(this.links['s-2-a-3'].attr('href'), '/site/s-2/a/a-3');
      assert.equal(this.links['s-3-a-1'].attr('href'), '/site/s-3/a/a-1?q=lol');
      assert.equal(this.links['s-3-a-2'].attr('href'), '/site/s-3/a/a-2');
      assert.equal(this.links['s-3-a-3'].attr('href'), '/site/s-3/a/a-3');

      run(this.links['s-2-a-2'], 'click');

      assert.equal(this.site_controller.get('country'), 'au');
      assert.equal(this.article_controller.get('q'), 'wat');
      assert.equal(this.article_controller.get('z'), 0);
      assert.deepEqual(this.site_controller.get('model'), { id: 's-2' });
      assert.deepEqual(this.article_controller.get('model'), { id: 'a-2' });
      assert.equal(this.links['s-1-a-1'].attr('href'), '/site/s-1/a/a-1?country=us&q=lol');
      assert.equal(this.links['s-1-a-2'].attr('href'), '/site/s-1/a/a-2?country=us');
      assert.equal(this.links['s-1-a-3'].attr('href'), '/site/s-1/a/a-3?country=us');
      assert.equal(this.links['s-2-a-1'].attr('href'), '/site/s-2/a/a-1?q=lol');
      assert.equal(this.links['s-2-a-2'].attr('href'), '/site/s-2/a/a-2');
      assert.equal(this.links['s-2-a-3'].attr('href'), '/site/s-2/a/a-3');
      assert.equal(this.links['s-3-a-1'].attr('href'), '/site/s-3/a/a-1?q=lol');
      assert.equal(this.links['s-3-a-2'].attr('href'), '/site/s-3/a/a-2');
      assert.equal(this.links['s-3-a-3'].attr('href'), '/site/s-3/a/a-3');
    });
  }

  ['@test query params have \'model\' stickiness by default (url changes)'](assert) {
    assert.expect(88);

    return this.boot().then(() => {
      this.expectedSiteModelHookParams = { site_id: 's-1', country: 'au' };
      this.expectedArticleModelHookParams = { article_id: 'a-1', q: 'lol', z: 0 };
      this.transitionTo('/site/s-1/a/a-1?q=lol');

      assert.deepEqual(this.site_controller.get('model'), { id: 's-1' }, 'site controller\'s model is s-1');
      assert.deepEqual(this.article_controller.get('model'), { id: 'a-1' }, 'article controller\'s model is a-1');
      assert.equal(this.site_controller.get('country'), 'au');
      assert.equal(this.article_controller.get('q'), 'lol');
      assert.equal(this.article_controller.get('z'), 0);
      assert.equal(this.links['s-1-a-1'].attr('href'), '/site/s-1/a/a-1?q=lol');
      assert.equal(this.links['s-1-a-2'].attr('href'), '/site/s-1/a/a-2');
      assert.equal(this.links['s-1-a-3'].attr('href'), '/site/s-1/a/a-3');
      assert.equal(this.links['s-2-a-1'].attr('href'), '/site/s-2/a/a-1?q=lol');
      assert.equal(this.links['s-2-a-2'].attr('href'), '/site/s-2/a/a-2');
      assert.equal(this.links['s-2-a-3'].attr('href'), '/site/s-2/a/a-3');
      assert.equal(this.links['s-3-a-1'].attr('href'), '/site/s-3/a/a-1?q=lol');
      assert.equal(this.links['s-3-a-2'].attr('href'), '/site/s-3/a/a-2');
      assert.equal(this.links['s-3-a-3'].attr('href'), '/site/s-3/a/a-3');

      this.expectedSiteModelHookParams = { site_id: 's-2', country: 'us' };
      this.expectedArticleModelHookParams = { article_id: 'a-1', q: 'lol', z: 0 };
      this.transitionTo('/site/s-2/a/a-1?country=us&q=lol');

      assert.deepEqual(this.site_controller.get('model'), { id: 's-2' }, 'site controller\'s model is s-2');
      assert.deepEqual(this.article_controller.get('model'), { id: 'a-1' }, 'article controller\'s model is a-1');
      assert.equal(this.site_controller.get('country'), 'us');
      assert.equal(this.article_controller.get('q'), 'lol');
      assert.equal(this.article_controller.get('z'), 0);
      assert.equal(this.links['s-1-a-1'].attr('href'), '/site/s-1/a/a-1?q=lol');
      assert.equal(this.links['s-1-a-2'].attr('href'), '/site/s-1/a/a-2');
      assert.equal(this.links['s-1-a-3'].attr('href'), '/site/s-1/a/a-3');
      assert.equal(this.links['s-2-a-1'].attr('href'), '/site/s-2/a/a-1?country=us&q=lol');
      assert.equal(this.links['s-2-a-2'].attr('href'), '/site/s-2/a/a-2?country=us');
      assert.equal(this.links['s-2-a-3'].attr('href'), '/site/s-2/a/a-3?country=us');
      assert.equal(this.links['s-3-a-1'].attr('href'), '/site/s-3/a/a-1?q=lol');
      assert.equal(this.links['s-3-a-2'].attr('href'), '/site/s-3/a/a-2');
      assert.equal(this.links['s-3-a-3'].attr('href'), '/site/s-3/a/a-3');

      this.expectedSiteModelHookParams = { site_id: 's-2', country: 'us' };
      this.expectedArticleModelHookParams = { article_id: 'a-2', q: 'lol', z: 0 };
      this.transitionTo('/site/s-2/a/a-2?country=us&q=lol');

      assert.deepEqual(this.site_controller.get('model'), { id: 's-2' }, 'site controller\'s model is s-2');
      assert.deepEqual(this.article_controller.get('model'), { id: 'a-2' }, 'article controller\'s model is a-2');
      assert.equal(this.site_controller.get('country'), 'us');
      assert.equal(this.article_controller.get('q'), 'lol');
      assert.equal(this.article_controller.get('z'), 0);
      assert.equal(this.links['s-1-a-1'].attr('href'), '/site/s-1/a/a-1?q=lol');
      assert.equal(this.links['s-1-a-2'].attr('href'), '/site/s-1/a/a-2?q=lol');
      assert.equal(this.links['s-1-a-3'].attr('href'), '/site/s-1/a/a-3');
      assert.equal(this.links['s-2-a-1'].attr('href'), '/site/s-2/a/a-1?country=us&q=lol');
      assert.equal(this.links['s-2-a-2'].attr('href'), '/site/s-2/a/a-2?country=us&q=lol');
      assert.equal(this.links['s-2-a-3'].attr('href'), '/site/s-2/a/a-3?country=us');
      assert.equal(this.links['s-3-a-1'].attr('href'), '/site/s-3/a/a-1?q=lol');
      assert.equal(this.links['s-3-a-2'].attr('href'), '/site/s-3/a/a-2?q=lol');
      assert.equal(this.links['s-3-a-3'].attr('href'), '/site/s-3/a/a-3');

      this.expectedSiteModelHookParams = { site_id: 's-2', country: 'us' };
      this.expectedArticleModelHookParams = { article_id: 'a-3', q: 'lol', z: 123 };
      this.transitionTo('/site/s-2/a/a-3?country=us&q=lol&z=123');

      assert.deepEqual(this.site_controller.get('model'), { id: 's-2' }, 'site controller\'s model is s-2');
      assert.deepEqual(this.article_controller.get('model'), { id: 'a-3' }, 'article controller\'s model is a-3');
      assert.equal(this.site_controller.get('country'), 'us');
      assert.equal(this.article_controller.get('q'), 'lol');
      assert.equal(this.article_controller.get('z'), 123);
      assert.equal(this.links['s-1-a-1'].attr('href'), '/site/s-1/a/a-1?q=lol');
      assert.equal(this.links['s-1-a-2'].attr('href'), '/site/s-1/a/a-2?q=lol');
      assert.equal(this.links['s-1-a-3'].attr('href'), '/site/s-1/a/a-3?q=lol&z=123');
      assert.equal(this.links['s-2-a-1'].attr('href'), '/site/s-2/a/a-1?country=us&q=lol');
      assert.equal(this.links['s-2-a-2'].attr('href'), '/site/s-2/a/a-2?country=us&q=lol');
      assert.equal(this.links['s-2-a-3'].attr('href'), '/site/s-2/a/a-3?country=us&q=lol&z=123');
      assert.equal(this.links['s-3-a-1'].attr('href'), '/site/s-3/a/a-1?q=lol');
      assert.equal(this.links['s-3-a-2'].attr('href'), '/site/s-3/a/a-2?q=lol');
      assert.equal(this.links['s-3-a-3'].attr('href'), '/site/s-3/a/a-3?q=lol&z=123');

      this.expectedSiteModelHookParams = { site_id: 's-3', country: 'nz' };
      this.expectedArticleModelHookParams = { article_id: 'a-3', q: 'lol', z: 123 };
      this.transitionTo('/site/s-3/a/a-3?country=nz&q=lol&z=123');

      assert.deepEqual(this.site_controller.get('model'), { id: 's-3' }, 'site controller\'s model is s-3');
      assert.deepEqual(this.article_controller.get('model'), { id: 'a-3' }, 'article controller\'s model is a-3');
      assert.equal(this.site_controller.get('country'), 'nz');
      assert.equal(this.article_controller.get('q'), 'lol');
      assert.equal(this.article_controller.get('z'), 123);
      assert.equal(this.links['s-1-a-1'].attr('href'), '/site/s-1/a/a-1?q=lol');
      assert.equal(this.links['s-1-a-2'].attr('href'), '/site/s-1/a/a-2?q=lol');
      assert.equal(this.links['s-1-a-3'].attr('href'), '/site/s-1/a/a-3?q=lol&z=123');
      assert.equal(this.links['s-2-a-1'].attr('href'), '/site/s-2/a/a-1?country=us&q=lol');
      assert.equal(this.links['s-2-a-2'].attr('href'), '/site/s-2/a/a-2?country=us&q=lol');
      assert.equal(this.links['s-2-a-3'].attr('href'), '/site/s-2/a/a-3?country=us&q=lol&z=123');
      assert.equal(this.links['s-3-a-1'].attr('href'), '/site/s-3/a/a-1?country=nz&q=lol');
      assert.equal(this.links['s-3-a-2'].attr('href'), '/site/s-3/a/a-2?country=nz&q=lol');
      assert.equal(this.links['s-3-a-3'].attr('href'), '/site/s-3/a/a-3?country=nz&q=lol&z=123');
    });
  }

  ['@test query params have \'model\' stickiness by default (params-based transitions)'](assert) {
    assert.expect(118);

    return this.boot().then(() => {
      this.expectedSiteModelHookParams = { site_id: 's-1', country: 'au' };
      this.expectedArticleModelHookParams = { article_id: 'a-1', q: 'wat', z: 0 };
      this.transitionTo('site.article', 's-1', 'a-1');

      assert.deepEqual(this.site_controller.get('model'), { id: 's-1' });
      assert.deepEqual(this.article_controller.get('model'), { id: 'a-1' });
      assert.equal(this.site_controller.get('country'), 'au');
      assert.equal(this.article_controller.get('q'), 'wat');
      assert.equal(this.article_controller.get('z'), 0);
      assert.equal(this.links['s-1-a-1'].attr('href'), '/site/s-1/a/a-1');
      assert.equal(this.links['s-1-a-2'].attr('href'), '/site/s-1/a/a-2');
      assert.equal(this.links['s-1-a-3'].attr('href'), '/site/s-1/a/a-3');
      assert.equal(this.links['s-2-a-1'].attr('href'), '/site/s-2/a/a-1');
      assert.equal(this.links['s-2-a-2'].attr('href'), '/site/s-2/a/a-2');
      assert.equal(this.links['s-2-a-3'].attr('href'), '/site/s-2/a/a-3');
      assert.equal(this.links['s-3-a-1'].attr('href'), '/site/s-3/a/a-1');
      assert.equal(this.links['s-3-a-2'].attr('href'), '/site/s-3/a/a-2');
      assert.equal(this.links['s-3-a-3'].attr('href'), '/site/s-3/a/a-3');

      this.expectedSiteModelHookParams = { site_id: 's-1', country: 'au' };
      this.expectedArticleModelHookParams = { article_id: 'a-2', q: 'lol', z: 0 };
      this.transitionTo('site.article', 's-1', 'a-2', { queryParams: { q: 'lol' } });

      assert.deepEqual(this.site_controller.get('model'), { id: 's-1' });
      assert.deepEqual(this.article_controller.get('model'), { id: 'a-2' });
      assert.equal(this.site_controller.get('country'), 'au');
      assert.equal(this.article_controller.get('q'), 'lol');
      assert.equal(this.article_controller.get('z'), 0);
      assert.equal(this.links['s-1-a-1'].attr('href'), '/site/s-1/a/a-1');
      assert.equal(this.links['s-1-a-2'].attr('href'), '/site/s-1/a/a-2?q=lol');
      assert.equal(this.links['s-1-a-3'].attr('href'), '/site/s-1/a/a-3');
      assert.equal(this.links['s-2-a-1'].attr('href'), '/site/s-2/a/a-1');
      assert.equal(this.links['s-2-a-2'].attr('href'), '/site/s-2/a/a-2?q=lol');
      assert.equal(this.links['s-2-a-3'].attr('href'), '/site/s-2/a/a-3');
      assert.equal(this.links['s-3-a-1'].attr('href'), '/site/s-3/a/a-1');
      assert.equal(this.links['s-3-a-2'].attr('href'), '/site/s-3/a/a-2?q=lol');
      assert.equal(this.links['s-3-a-3'].attr('href'), '/site/s-3/a/a-3');

      this.expectedSiteModelHookParams = { site_id: 's-1', country: 'au' };
      this.expectedArticleModelHookParams = { article_id: 'a-3', q: 'hay', z: 0 };
      this.transitionTo('site.article', 's-1', 'a-3', { queryParams: { q: 'hay' } });

      assert.deepEqual(this.site_controller.get('model'), { id: 's-1' });
      assert.deepEqual(this.article_controller.get('model'), { id: 'a-3' });
      assert.equal(this.site_controller.get('country'), 'au');
      assert.equal(this.article_controller.get('q'), 'hay');
      assert.equal(this.article_controller.get('z'), 0);
      assert.equal(this.links['s-1-a-1'].attr('href'), '/site/s-1/a/a-1');
      assert.equal(this.links['s-1-a-2'].attr('href'), '/site/s-1/a/a-2?q=lol');
      assert.equal(this.links['s-1-a-3'].attr('href'), '/site/s-1/a/a-3?q=hay');
      assert.equal(this.links['s-2-a-1'].attr('href'), '/site/s-2/a/a-1');
      assert.equal(this.links['s-2-a-2'].attr('href'), '/site/s-2/a/a-2?q=lol');
      assert.equal(this.links['s-2-a-3'].attr('href'), '/site/s-2/a/a-3?q=hay');
      assert.equal(this.links['s-3-a-1'].attr('href'), '/site/s-3/a/a-1');
      assert.equal(this.links['s-3-a-2'].attr('href'), '/site/s-3/a/a-2?q=lol');
      assert.equal(this.links['s-3-a-3'].attr('href'), '/site/s-3/a/a-3?q=hay');

      this.expectedSiteModelHookParams = { site_id: 's-1', country: 'au' };
      this.expectedArticleModelHookParams = { article_id: 'a-2', q: 'lol', z: 1 };
      this.transitionTo('site.article', 's-1', 'a-2', { queryParams: { z: 1 } });

      assert.deepEqual(this.site_controller.get('model'), { id: 's-1' });
      assert.deepEqual(this.article_controller.get('model'), { id: 'a-2' });
      assert.equal(this.site_controller.get('country'), 'au');
      assert.equal(this.article_controller.get('q'), 'lol');
      assert.equal(this.article_controller.get('z'), 1);
      assert.equal(this.links['s-1-a-1'].attr('href'), '/site/s-1/a/a-1');
      assert.equal(this.links['s-1-a-2'].attr('href'), '/site/s-1/a/a-2?q=lol&z=1');
      assert.equal(this.links['s-1-a-3'].attr('href'), '/site/s-1/a/a-3?q=hay');
      assert.equal(this.links['s-2-a-1'].attr('href'), '/site/s-2/a/a-1');
      assert.equal(this.links['s-2-a-2'].attr('href'), '/site/s-2/a/a-2?q=lol&z=1');
      assert.equal(this.links['s-2-a-3'].attr('href'), '/site/s-2/a/a-3?q=hay');
      assert.equal(this.links['s-3-a-1'].attr('href'), '/site/s-3/a/a-1');
      assert.equal(this.links['s-3-a-2'].attr('href'), '/site/s-3/a/a-2?q=lol&z=1');
      assert.equal(this.links['s-3-a-3'].attr('href'), '/site/s-3/a/a-3?q=hay');

      this.expectedSiteModelHookParams = { site_id: 's-2', country: 'us' };
      this.expectedArticleModelHookParams = { article_id: 'a-2', q: 'lol', z: 1 };
      this.transitionTo('site.article', 's-2', 'a-2', { queryParams: { country: 'us' } });

      assert.deepEqual(this.site_controller.get('model'), { id: 's-2' });
      assert.deepEqual(this.article_controller.get('model'), { id: 'a-2' });
      assert.equal(this.site_controller.get('country'), 'us');
      assert.equal(this.article_controller.get('q'), 'lol');
      assert.equal(this.article_controller.get('z'), 1);
      assert.equal(this.links['s-1-a-1'].attr('href'), '/site/s-1/a/a-1');
      assert.equal(this.links['s-1-a-2'].attr('href'), '/site/s-1/a/a-2?q=lol&z=1');
      assert.equal(this.links['s-1-a-3'].attr('href'), '/site/s-1/a/a-3?q=hay');
      assert.equal(this.links['s-2-a-1'].attr('href'), '/site/s-2/a/a-1?country=us');
      assert.equal(this.links['s-2-a-2'].attr('href'), '/site/s-2/a/a-2?country=us&q=lol&z=1');
      assert.equal(this.links['s-2-a-3'].attr('href'), '/site/s-2/a/a-3?country=us&q=hay');
      assert.equal(this.links['s-3-a-1'].attr('href'), '/site/s-3/a/a-1');
      assert.equal(this.links['s-3-a-2'].attr('href'), '/site/s-3/a/a-2?q=lol&z=1');
      assert.equal(this.links['s-3-a-3'].attr('href'), '/site/s-3/a/a-3?q=hay');

      this.expectedSiteModelHookParams = { site_id: 's-2', country: 'us' };
      this.expectedArticleModelHookParams = { article_id: 'a-1', q: 'yeah', z: 0 };
      this.transitionTo('site.article', 's-2', 'a-1', { queryParams: { q: 'yeah' } });

      assert.deepEqual(this.site_controller.get('model'), { id: 's-2' });
      assert.deepEqual(this.article_controller.get('model'), { id: 'a-1' });
      assert.equal(this.site_controller.get('country'), 'us');
      assert.equal(this.article_controller.get('q'), 'yeah');
      assert.equal(this.article_controller.get('z'), 0);
      assert.equal(this.links['s-1-a-1'].attr('href'), '/site/s-1/a/a-1?q=yeah');
      assert.equal(this.links['s-1-a-2'].attr('href'), '/site/s-1/a/a-2?q=lol&z=1');
      assert.equal(this.links['s-1-a-3'].attr('href'), '/site/s-1/a/a-3?q=hay');
      assert.equal(this.links['s-2-a-1'].attr('href'), '/site/s-2/a/a-1?country=us&q=yeah');
      assert.equal(this.links['s-2-a-2'].attr('href'), '/site/s-2/a/a-2?country=us&q=lol&z=1');
      assert.equal(this.links['s-2-a-3'].attr('href'), '/site/s-2/a/a-3?country=us&q=hay');
      assert.equal(this.links['s-3-a-1'].attr('href'), '/site/s-3/a/a-1?q=yeah');
      assert.equal(this.links['s-3-a-2'].attr('href'), '/site/s-3/a/a-2?q=lol&z=1');
      assert.equal(this.links['s-3-a-3'].attr('href'), '/site/s-3/a/a-3?q=hay');

      this.expectedSiteModelHookParams = { site_id: 's-3', country: 'nz' };
      this.expectedArticleModelHookParams = { article_id: 'a-3', q: 'hay', z: 3 };
      this.transitionTo('site.article', 's-3', 'a-3', { queryParams: { country: 'nz', z: 3 } });

      assert.deepEqual(this.site_controller.get('model'), { id: 's-3' });
      assert.deepEqual(this.article_controller.get('model'), { id: 'a-3' });
      assert.equal(this.site_controller.get('country'), 'nz');
      assert.equal(this.article_controller.get('q'), 'hay');
      assert.equal(this.article_controller.get('z'), 3);
      assert.equal(this.links['s-1-a-1'].attr('href'), '/site/s-1/a/a-1?q=yeah');
      assert.equal(this.links['s-1-a-2'].attr('href'), '/site/s-1/a/a-2?q=lol&z=1');
      assert.equal(this.links['s-1-a-3'].attr('href'), '/site/s-1/a/a-3?q=hay&z=3');
      assert.equal(this.links['s-2-a-1'].attr('href'), '/site/s-2/a/a-1?country=us&q=yeah');
      assert.equal(this.links['s-2-a-2'].attr('href'), '/site/s-2/a/a-2?country=us&q=lol&z=1');
      assert.equal(this.links['s-2-a-3'].attr('href'), '/site/s-2/a/a-3?country=us&q=hay&z=3');
      assert.equal(this.links['s-3-a-1'].attr('href'), '/site/s-3/a/a-1?country=nz&q=yeah');
      assert.equal(this.links['s-3-a-2'].attr('href'), '/site/s-3/a/a-2?country=nz&q=lol&z=1');
      assert.equal(this.links['s-3-a-3'].attr('href'), '/site/s-3/a/a-3?country=nz&q=hay&z=3');
    });
  }
});
