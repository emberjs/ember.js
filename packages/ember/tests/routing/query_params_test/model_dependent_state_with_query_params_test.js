import Controller from '@ember/controller';
import { A as emberA } from '@ember/array';
import Route from '@ember/routing/route';
import { computed } from '@ember/object';
import { precompileTemplate } from '@ember/template-compilation';
import { QueryParamTestCase, moduleFor, runLoopSettled } from 'internal-test-helpers';

class ModelDependentQPTestCase extends QueryParamTestCase {
  boot() {
    this.setupApplication();
    return this.visitApplication();
  }

  teardown() {
    super.teardown(...arguments);
    this.assert.ok(
      !this.expectedModelHookParams,
      'there should be no pending expectation of expected model hook params'
    );
  }

  reopenController(name, options) {
    this.application.resolveRegistration(`controller:${name}`).reopen(options);
  }

  reopenRoute(name, options) {
    this.application.resolveRegistration(`route:${name}`).reopen(options);
  }
}

moduleFor(
  'Query Params - model-dependent state',
  class extends ModelDependentQPTestCase {
    setupApplication() {
      this.router.map(function () {
        this.route('article', { path: '/a/:id' }, function () {
          this.route('comments', { resetNamespace: true });
        });
        this.route('about');
      });

      let articles = emberA([{ id: 'a-1' }, { id: 'a-2' }, { id: 'a-3' }]);

      this.add(
        'controller:application',
        class extends Controller {
          articles = articles;
        }
      );

      let self = this;
      let assert = this.assert;
      this.add(
        'route:article',
        class extends Route {
          model(params) {
            if (self.expectedModelHookParams) {
              assert.deepEqual(
                params,
                self.expectedModelHookParams,
                'the ArticleRoute model hook received the expected merged dynamic segment + query params hash'
              );
              self.expectedModelHookParams = null;
            }
            return articles.findBy('id', params.id);
          }
        }
      );

      this.add(
        'controller:article',
        Controller.extend({
          queryParams: ['q', 'z'],
          q: 'wat',
          z: 0,
        })
      );

      this.add(
        'controller:comments',
        Controller.extend({
          queryParams: 'page',
          page: 1,
        })
      );

      this.add(
        'template:application',
        precompileTemplate(
          `
        {{#each this.articles as |a|}}
          <LinkTo @route='article' @model={{a}} id={{a.id}}>Article</LinkTo>
        {{/each}}
        {{outlet}}
        `
        )
      );
    }

    visitApplication() {
      return this.visit('/').then(() => {
        let assert = this.assert;

        this.$link1 = document.getElementById('a-1');
        this.$link2 = document.getElementById('a-2');
        this.$link3 = document.getElementById('a-3');

        assert.equal(this.$link1.getAttribute('href'), '/a/a-1');
        assert.equal(this.$link2.getAttribute('href'), '/a/a-2');
        assert.equal(this.$link3.getAttribute('href'), '/a/a-3');

        this.controller = this.getController('article');
      });
    }

    async ["@test query params have 'model' stickiness by default"]() {
      let assert = this.assert;

      assert.expect(14);

      await this.boot();
      this.$link1.click();
      await runLoopSettled();

      this.assertCurrentPath('/a/a-1');

      await this.setAndFlush(this.controller, 'q', 'lol');

      assert.equal(this.$link1.getAttribute('href'), '/a/a-1?q=lol');
      assert.equal(this.$link2.getAttribute('href'), '/a/a-2');
      assert.equal(this.$link3.getAttribute('href'), '/a/a-3');

      this.$link2.click();
      await runLoopSettled();

      assert.equal(this.controller.get('q'), 'wat');
      assert.equal(this.controller.get('z'), 0);
      assert.deepEqual(this.controller.get('model'), { id: 'a-2' });
      assert.equal(this.$link1.getAttribute('href'), '/a/a-1?q=lol');
      assert.equal(this.$link2.getAttribute('href'), '/a/a-2');
      assert.equal(this.$link3.getAttribute('href'), '/a/a-3');
    }

    async ["@test query params have 'model' stickiness by default (url changes)"]() {
      let assert = this.assert;

      assert.expect(24);

      await this.boot();
      this.expectedModelHookParams = { id: 'a-1', q: 'lol', z: 0 };

      await this.transitionTo('/a/a-1?q=lol');

      assert.deepEqual(this.controller.get('model'), { id: 'a-1' });
      assert.equal(this.controller.get('q'), 'lol');
      assert.equal(this.controller.get('z'), 0);
      assert.equal(this.$link1.getAttribute('href'), '/a/a-1?q=lol');
      assert.equal(this.$link2.getAttribute('href'), '/a/a-2');
      assert.equal(this.$link3.getAttribute('href'), '/a/a-3');

      this.expectedModelHookParams = { id: 'a-2', q: 'lol', z: 0 };

      await this.transitionTo('/a/a-2?q=lol');

      assert.deepEqual(
        this.controller.get('model'),
        { id: 'a-2' },
        "controller's model changed to a-2"
      );
      assert.equal(this.controller.get('q'), 'lol');
      assert.equal(this.controller.get('z'), 0);
      assert.equal(this.$link1.getAttribute('href'), '/a/a-1?q=lol');
      assert.equal(this.$link2.getAttribute('href'), '/a/a-2?q=lol');
      assert.equal(this.$link3.getAttribute('href'), '/a/a-3');

      this.expectedModelHookParams = { id: 'a-3', q: 'lol', z: 123 };

      await this.transitionTo('/a/a-3?q=lol&z=123');

      assert.equal(this.controller.get('q'), 'lol');
      assert.equal(this.controller.get('z'), 123);
      assert.equal(this.$link1.getAttribute('href'), '/a/a-1?q=lol');
      assert.equal(this.$link2.getAttribute('href'), '/a/a-2?q=lol');
      assert.equal(this.$link3.getAttribute('href'), '/a/a-3?q=lol&z=123');
    }

    async ["@test query params have 'model' stickiness by default (params-based transitions)"]() {
      let assert = this.assert;

      assert.expect(32);

      this.add(
        'template:application',
        precompileTemplate(
          `
      {{#each articles as |a|}}
        <LinkTo @route='article' @model={{a.id}} id={{a.id}}>Article</LinkTo>
      {{/each}}
      `
        )
      );

      await this.boot();
      this.expectedModelHookParams = { id: 'a-1', q: 'wat', z: 0 };
      await this.transitionTo('article', 'a-1');

      assert.deepEqual(this.controller.get('model'), { id: 'a-1' });
      assert.equal(this.controller.get('q'), 'wat');
      assert.equal(this.controller.get('z'), 0);
      assert.equal(this.$link1.getAttribute('href'), '/a/a-1');
      assert.equal(this.$link2.getAttribute('href'), '/a/a-2');
      assert.equal(this.$link3.getAttribute('href'), '/a/a-3');

      this.expectedModelHookParams = { id: 'a-2', q: 'lol', z: 0 };
      await this.transitionTo('article', 'a-2', { queryParams: { q: 'lol' } });

      assert.deepEqual(this.controller.get('model'), { id: 'a-2' });
      assert.equal(this.controller.get('q'), 'lol');
      assert.equal(this.controller.get('z'), 0);
      assert.equal(this.$link1.getAttribute('href'), '/a/a-1');
      assert.equal(this.$link2.getAttribute('href'), '/a/a-2?q=lol');
      assert.equal(this.$link3.getAttribute('href'), '/a/a-3');

      this.expectedModelHookParams = { id: 'a-3', q: 'hay', z: 0 };
      await this.transitionTo('article', 'a-3', { queryParams: { q: 'hay' } });

      assert.deepEqual(this.controller.get('model'), { id: 'a-3' });
      assert.equal(this.controller.get('q'), 'hay');
      assert.equal(this.controller.get('z'), 0);
      assert.equal(this.$link1.getAttribute('href'), '/a/a-1');
      assert.equal(this.$link2.getAttribute('href'), '/a/a-2?q=lol');
      assert.equal(this.$link3.getAttribute('href'), '/a/a-3?q=hay');

      this.expectedModelHookParams = { id: 'a-2', q: 'lol', z: 1 };
      await this.transitionTo('article', 'a-2', { queryParams: { z: 1 } });

      assert.deepEqual(this.controller.get('model'), { id: 'a-2' });
      assert.equal(this.controller.get('q'), 'lol');
      assert.equal(this.controller.get('z'), 1);
      assert.equal(this.$link1.getAttribute('href'), '/a/a-1');
      assert.equal(this.$link2.getAttribute('href'), '/a/a-2?q=lol&z=1');
      assert.equal(this.$link3.getAttribute('href'), '/a/a-3?q=hay');
    }

    async ["@test 'controller' stickiness shares QP state between models"]() {
      let assert = this.assert;

      assert.expect(24);

      this.setupApplication();

      this.reopenController('article', {
        queryParams: { q: { scope: 'controller' } },
      });

      await this.visitApplication();
      this.$link1.click();
      await runLoopSettled();

      this.assertCurrentPath('/a/a-1');

      await this.setAndFlush(this.controller, 'q', 'lol');

      assert.equal(this.$link1.getAttribute('href'), '/a/a-1?q=lol');
      assert.equal(this.$link2.getAttribute('href'), '/a/a-2?q=lol');
      assert.equal(this.$link3.getAttribute('href'), '/a/a-3?q=lol');

      this.$link2.click();
      await runLoopSettled();

      assert.equal(this.controller.get('q'), 'lol');
      assert.equal(this.controller.get('z'), 0);
      assert.deepEqual(this.controller.get('model'), { id: 'a-2' });

      assert.equal(this.$link1.getAttribute('href'), '/a/a-1?q=lol');
      assert.equal(this.$link2.getAttribute('href'), '/a/a-2?q=lol');
      assert.equal(this.$link3.getAttribute('href'), '/a/a-3?q=lol');

      this.expectedModelHookParams = { id: 'a-3', q: 'haha', z: 123 };
      await this.transitionTo('/a/a-3?q=haha&z=123');

      assert.deepEqual(this.controller.get('model'), { id: 'a-3' });
      assert.equal(this.controller.get('q'), 'haha');
      assert.equal(this.controller.get('z'), 123);

      assert.equal(this.$link1.getAttribute('href'), '/a/a-1?q=haha');
      assert.equal(this.$link2.getAttribute('href'), '/a/a-2?q=haha');
      assert.equal(this.$link3.getAttribute('href'), '/a/a-3?q=haha&z=123');

      await this.setAndFlush(this.controller, 'q', 'woot');

      assert.equal(this.$link1.getAttribute('href'), '/a/a-1?q=woot');
      assert.equal(this.$link2.getAttribute('href'), '/a/a-2?q=woot');
      assert.equal(this.$link3.getAttribute('href'), '/a/a-3?q=woot&z=123');
    }

    async ["@test 'model' stickiness is scoped to current or first dynamic parent route"]() {
      let assert = this.assert;

      assert.expect(12);

      await this.boot();
      await this.transitionTo('comments', 'a-1');

      let commentsCtrl = this.getController('comments');
      assert.equal(commentsCtrl.get('page'), 1);
      this.assertCurrentPath('/a/a-1/comments');

      await this.setAndFlush(commentsCtrl, 'page', 2);
      this.assertCurrentPath('/a/a-1/comments?page=2');

      await this.setAndFlush(commentsCtrl, 'page', 3);
      this.assertCurrentPath('/a/a-1/comments?page=3');

      await this.transitionTo('comments', 'a-2');
      assert.equal(commentsCtrl.get('page'), 1);
      this.assertCurrentPath('/a/a-2/comments');

      await this.transitionTo('comments', 'a-1');
      assert.equal(commentsCtrl.get('page'), 3);
      this.assertCurrentPath('/a/a-1/comments?page=3');
    }

    async ['@test can reset query params using the resetController hook']() {
      let assert = this.assert;

      assert.expect(13);

      this.setupApplication();

      this.reopenRoute('article', {
        resetController(controller, isExiting) {
          this.controllerFor('comments').set('page', 1);
          if (isExiting) {
            controller.set('q', 'imdone');
          }
        },
      });

      this.add(
        'template:about',
        precompileTemplate(
          `
      <LinkTo @route='comments' @model='a-1' id='one'>A</LinkTo>
      <LinkTo @route='comments' @model='a-2' id='two'>B</LinkTo>
      `
        )
      );

      await this.visitApplication();
      await this.transitionTo('comments', 'a-1');

      let commentsCtrl = this.getController('comments');
      assert.equal(commentsCtrl.get('page'), 1);
      this.assertCurrentPath('/a/a-1/comments');

      await this.setAndFlush(commentsCtrl, 'page', 2);
      this.assertCurrentPath('/a/a-1/comments?page=2');

      await this.transitionTo('comments', 'a-2');
      assert.equal(commentsCtrl.get('page'), 1);
      assert.equal(this.controller.get('q'), 'wat');

      await this.transitionTo('comments', 'a-1');
      this.assertCurrentPath('/a/a-1/comments');
      assert.equal(commentsCtrl.get('page'), 1);

      await this.transitionTo('about');
      assert.equal(document.getElementById('one').getAttribute('href'), '/a/a-1/comments?q=imdone');
      assert.equal(document.getElementById('two').getAttribute('href'), '/a/a-2/comments');
    }
  }
);

moduleFor(
  'Query Params - model-dependent state (nested)',
  class extends ModelDependentQPTestCase {
    setupApplication() {
      this.router.map(function () {
        this.route('site', function () {
          this.route('article', { path: '/a/:id' }, function () {
            this.route('comments');
          });
        });
        this.route('about');
      });

      let site_articles = emberA([{ id: 'a-1' }, { id: 'a-2' }, { id: 'a-3' }]);

      this.add(
        'controller:application',
        class extends Controller {
          articles = site_articles;
        }
      );

      let self = this;
      let assert = this.assert;
      this.add(
        'route:site.article',
        class extends Route {
          model(params) {
            if (self.expectedModelHookParams) {
              assert.deepEqual(
                params,
                self.expectedModelHookParams,
                'the ArticleRoute model hook received the expected merged dynamic segment + query params hash'
              );
              self.expectedModelHookParams = null;
            }
            return site_articles.findBy('id', params.id);
          }
        }
      );

      this.add(
        'controller:site.article',
        Controller.extend({
          queryParams: ['q', 'z'],
          q: 'wat',
          z: 0,
        })
      );

      this.add(
        'controller:site.article.comments',
        Controller.extend({
          queryParams: 'page',
          page: 1,
        })
      );

      this.add(
        'template:application',
        precompileTemplate(
          `
        {{#each this.articles as |a|}}
          <LinkTo @route='site.article' @model={{a}} id={{a.id}}>Article</LinkTo>
        {{/each}}
        {{outlet}}
        `
        )
      );
    }

    visitApplication() {
      return this.visit('/').then(() => {
        let assert = this.assert;

        this.$link1 = document.getElementById('a-1');
        this.$link2 = document.getElementById('a-2');
        this.$link3 = document.getElementById('a-3');

        assert.equal(this.$link1.getAttribute('href'), '/site/a/a-1');
        assert.equal(this.$link2.getAttribute('href'), '/site/a/a-2');
        assert.equal(this.$link3.getAttribute('href'), '/site/a/a-3');

        this.controller = this.getController('site.article');
      });
    }

    async ["@test query params have 'model' stickiness by default"]() {
      let assert = this.assert;

      assert.expect(14);

      await this.boot();
      this.$link1.click();
      await runLoopSettled();

      this.assertCurrentPath('/site/a/a-1');

      await this.setAndFlush(this.controller, 'q', 'lol');

      assert.equal(this.$link1.getAttribute('href'), '/site/a/a-1?q=lol');
      assert.equal(this.$link2.getAttribute('href'), '/site/a/a-2');
      assert.equal(this.$link3.getAttribute('href'), '/site/a/a-3');

      this.$link2.click();
      await runLoopSettled();

      assert.equal(this.controller.get('q'), 'wat');
      assert.equal(this.controller.get('z'), 0);
      assert.deepEqual(this.controller.get('model'), { id: 'a-2' });
      assert.equal(this.$link1.getAttribute('href'), '/site/a/a-1?q=lol');
      assert.equal(this.$link2.getAttribute('href'), '/site/a/a-2');
      assert.equal(this.$link3.getAttribute('href'), '/site/a/a-3');
    }

    async ["@test query params have 'model' stickiness by default (url changes)"]() {
      let assert = this.assert;

      assert.expect(24);

      await this.boot();
      this.expectedModelHookParams = { id: 'a-1', q: 'lol', z: 0 };

      await this.transitionTo('/site/a/a-1?q=lol');

      assert.deepEqual(this.controller.get('model'), { id: 'a-1' });
      assert.equal(this.controller.get('q'), 'lol');
      assert.equal(this.controller.get('z'), 0);
      assert.equal(this.$link1.getAttribute('href'), '/site/a/a-1?q=lol');
      assert.equal(this.$link2.getAttribute('href'), '/site/a/a-2');
      assert.equal(this.$link3.getAttribute('href'), '/site/a/a-3');

      this.expectedModelHookParams = { id: 'a-2', q: 'lol', z: 0 };

      await this.transitionTo('/site/a/a-2?q=lol');

      assert.deepEqual(
        this.controller.get('model'),
        { id: 'a-2' },
        "controller's model changed to a-2"
      );
      assert.equal(this.controller.get('q'), 'lol');
      assert.equal(this.controller.get('z'), 0);
      assert.equal(this.$link1.getAttribute('href'), '/site/a/a-1?q=lol');
      assert.equal(this.$link2.getAttribute('href'), '/site/a/a-2?q=lol');
      assert.equal(this.$link3.getAttribute('href'), '/site/a/a-3');

      this.expectedModelHookParams = { id: 'a-3', q: 'lol', z: 123 };

      await this.transitionTo('/site/a/a-3?q=lol&z=123');

      assert.equal(this.controller.get('q'), 'lol');
      assert.equal(this.controller.get('z'), 123);
      assert.equal(this.$link1.getAttribute('href'), '/site/a/a-1?q=lol');
      assert.equal(this.$link2.getAttribute('href'), '/site/a/a-2?q=lol');
      assert.equal(this.$link3.getAttribute('href'), '/site/a/a-3?q=lol&z=123');
    }

    async ["@test query params have 'model' stickiness by default (params-based transitions)"]() {
      let assert = this.assert;

      assert.expect(32);

      this.add(
        'template:application',
        precompileTemplate(
          `
      {{#each articles as |a|}}
        <LinkTo @route='site.article' @model={{a.id}} id={{a.id}}>Article</LinkTo>
      {{/each}}
      `
        )
      );

      await this.boot();
      this.expectedModelHookParams = { id: 'a-1', q: 'wat', z: 0 };
      await this.transitionTo('site.article', 'a-1');

      assert.deepEqual(this.controller.get('model'), { id: 'a-1' });
      assert.equal(this.controller.get('q'), 'wat');
      assert.equal(this.controller.get('z'), 0);
      assert.equal(this.$link1.getAttribute('href'), '/site/a/a-1');
      assert.equal(this.$link2.getAttribute('href'), '/site/a/a-2');
      assert.equal(this.$link3.getAttribute('href'), '/site/a/a-3');

      this.expectedModelHookParams = { id: 'a-2', q: 'lol', z: 0 };
      await this.transitionTo('site.article', 'a-2', { queryParams: { q: 'lol' } });

      assert.deepEqual(this.controller.get('model'), { id: 'a-2' });
      assert.equal(this.controller.get('q'), 'lol');
      assert.equal(this.controller.get('z'), 0);
      assert.equal(this.$link1.getAttribute('href'), '/site/a/a-1');
      assert.equal(this.$link2.getAttribute('href'), '/site/a/a-2?q=lol');
      assert.equal(this.$link3.getAttribute('href'), '/site/a/a-3');

      this.expectedModelHookParams = { id: 'a-3', q: 'hay', z: 0 };
      await this.transitionTo('site.article', 'a-3', { queryParams: { q: 'hay' } });

      assert.deepEqual(this.controller.get('model'), { id: 'a-3' });
      assert.equal(this.controller.get('q'), 'hay');
      assert.equal(this.controller.get('z'), 0);
      assert.equal(this.$link1.getAttribute('href'), '/site/a/a-1');
      assert.equal(this.$link2.getAttribute('href'), '/site/a/a-2?q=lol');
      assert.equal(this.$link3.getAttribute('href'), '/site/a/a-3?q=hay');

      this.expectedModelHookParams = { id: 'a-2', q: 'lol', z: 1 };
      await this.transitionTo('site.article', 'a-2', { queryParams: { z: 1 } });

      assert.deepEqual(this.controller.get('model'), { id: 'a-2' });
      assert.equal(this.controller.get('q'), 'lol');
      assert.equal(this.controller.get('z'), 1);
      assert.equal(this.$link1.getAttribute('href'), '/site/a/a-1');
      assert.equal(this.$link2.getAttribute('href'), '/site/a/a-2?q=lol&z=1');
      assert.equal(this.$link3.getAttribute('href'), '/site/a/a-3?q=hay');
    }

    async ["@test 'controller' stickiness shares QP state between models"]() {
      let assert = this.assert;

      assert.expect(24);

      this.setupApplication();

      this.reopenController('site.article', {
        queryParams: { q: { scope: 'controller' } },
      });

      await this.visitApplication();
      this.$link1.click();
      await runLoopSettled();

      this.assertCurrentPath('/site/a/a-1');

      await this.setAndFlush(this.controller, 'q', 'lol');

      assert.equal(this.$link1.getAttribute('href'), '/site/a/a-1?q=lol');
      assert.equal(this.$link2.getAttribute('href'), '/site/a/a-2?q=lol');
      assert.equal(this.$link3.getAttribute('href'), '/site/a/a-3?q=lol');

      this.$link2.click();
      await runLoopSettled();

      assert.equal(this.controller.get('q'), 'lol');
      assert.equal(this.controller.get('z'), 0);
      assert.deepEqual(this.controller.get('model'), { id: 'a-2' });

      assert.equal(this.$link1.getAttribute('href'), '/site/a/a-1?q=lol');
      assert.equal(this.$link2.getAttribute('href'), '/site/a/a-2?q=lol');
      assert.equal(this.$link3.getAttribute('href'), '/site/a/a-3?q=lol');

      this.expectedModelHookParams = { id: 'a-3', q: 'haha', z: 123 };
      await this.transitionTo('/site/a/a-3?q=haha&z=123');

      assert.deepEqual(this.controller.get('model'), { id: 'a-3' });
      assert.equal(this.controller.get('q'), 'haha');
      assert.equal(this.controller.get('z'), 123);

      assert.equal(this.$link1.getAttribute('href'), '/site/a/a-1?q=haha');
      assert.equal(this.$link2.getAttribute('href'), '/site/a/a-2?q=haha');
      assert.equal(this.$link3.getAttribute('href'), '/site/a/a-3?q=haha&z=123');

      await this.setAndFlush(this.controller, 'q', 'woot');

      assert.equal(this.$link1.getAttribute('href'), '/site/a/a-1?q=woot');
      assert.equal(this.$link2.getAttribute('href'), '/site/a/a-2?q=woot');
      assert.equal(this.$link3.getAttribute('href'), '/site/a/a-3?q=woot&z=123');
    }

    async ["@test 'model' stickiness is scoped to current or first dynamic parent route"]() {
      let assert = this.assert;

      assert.expect(12);

      await this.boot();
      await this.transitionTo('site.article.comments', 'a-1');

      let commentsCtrl = this.getController('site.article.comments');
      assert.equal(commentsCtrl.get('page'), 1);
      this.assertCurrentPath('/site/a/a-1/comments');

      await this.setAndFlush(commentsCtrl, 'page', 2);
      this.assertCurrentPath('/site/a/a-1/comments?page=2');

      await this.setAndFlush(commentsCtrl, 'page', 3);
      this.assertCurrentPath('/site/a/a-1/comments?page=3');

      await this.transitionTo('site.article.comments', 'a-2');
      assert.equal(commentsCtrl.get('page'), 1);
      this.assertCurrentPath('/site/a/a-2/comments');

      await this.transitionTo('site.article.comments', 'a-1');
      assert.equal(commentsCtrl.get('page'), 3);
      this.assertCurrentPath('/site/a/a-1/comments?page=3');
    }

    async ['@test can reset query params using the resetController hook']() {
      let assert = this.assert;

      assert.expect(13);

      this.setupApplication();

      this.reopenRoute('site.article', {
        resetController(controller, isExiting) {
          this.controllerFor('site.article.comments').set('page', 1);
          if (isExiting) {
            controller.set('q', 'imdone');
          }
        },
      });

      this.add(
        'template:about',
        precompileTemplate(
          `
      <LinkTo @route='site.article.comments' @model='a-1' id='one'>A</LinkTo>
      <LinkTo @route='site.article.comments' @model='a-2' id='two'>B</LinkTo>
      `
        )
      );

      await this.visitApplication();
      await this.transitionTo('site.article.comments', 'a-1');

      let commentsCtrl = this.getController('site.article.comments');
      assert.equal(commentsCtrl.get('page'), 1);
      this.assertCurrentPath('/site/a/a-1/comments');

      await this.setAndFlush(commentsCtrl, 'page', 2);
      this.assertCurrentPath('/site/a/a-1/comments?page=2');

      await this.transitionTo('site.article.comments', 'a-2');
      assert.equal(commentsCtrl.get('page'), 1);
      assert.equal(this.controller.get('q'), 'wat');

      await this.transitionTo('site.article.comments', 'a-1');
      this.assertCurrentPath('/site/a/a-1/comments');
      assert.equal(commentsCtrl.get('page'), 1);

      await this.transitionTo('about');
      assert.equal(
        document.getElementById('one').getAttribute('href'),
        '/site/a/a-1/comments?q=imdone'
      );
      assert.equal(document.getElementById('two').getAttribute('href'), '/site/a/a-2/comments');
    }
  }
);

moduleFor(
  'Query Params - model-dependent state (nested & more than 1 dynamic segment)',
  class extends ModelDependentQPTestCase {
    setupApplication() {
      this.router.map(function () {
        this.route('site', { path: '/site/:site_id' }, function () {
          this.route('article', { path: '/a/:article_id' }, function () {
            this.route('comments');
          });
        });
      });

      let sites = emberA([{ id: 's-1' }, { id: 's-2' }, { id: 's-3' }]);
      let site_articles = emberA([{ id: 'a-1' }, { id: 'a-2' }, { id: 'a-3' }]);

      this.add(
        'controller:application',
        class extends Controller {
          siteArticles = site_articles;
          sites = sites;
          @computed
          get allSitesAllArticles() {
            let ret = [];
            let siteArticles = this.siteArticles;
            let sites = this.sites;
            sites.forEach((site) => {
              ret = ret.concat(
                siteArticles.map((article) => {
                  return {
                    id: `${site.id}-${article.id}`,
                    site_id: site.id,
                    article_id: article.id,
                  };
                })
              );
            });
            return ret;
          }
        }
      );

      let self = this;
      let assert = this.assert;
      this.add(
        'route:site',
        class extends Route {
          model(params) {
            if (self.expectedSiteModelHookParams) {
              assert.deepEqual(
                params,
                self.expectedSiteModelHookParams,
                'the SiteRoute model hook received the expected merged dynamic segment + query params hash'
              );
              self.expectedSiteModelHookParams = null;
            }
            return sites.findBy('id', params.site_id);
          }
        }
      );

      this.add(
        'route:site.article',
        class extends Route {
          model(params) {
            if (self.expectedArticleModelHookParams) {
              assert.deepEqual(
                params,
                self.expectedArticleModelHookParams,
                'the SiteArticleRoute model hook received the expected merged dynamic segment + query params hash'
              );
              self.expectedArticleModelHookParams = null;
            }
            return site_articles.findBy('id', params.article_id);
          }
        }
      );

      this.add(
        'controller:site',
        Controller.extend({
          queryParams: ['country'],
          country: 'au',
        })
      );

      this.add(
        'controller:site.article',
        Controller.extend({
          queryParams: ['q', 'z'],
          q: 'wat',
          z: 0,
        })
      );

      this.add(
        'controller:site.article.comments',
        Controller.extend({
          queryParams: ['page'],
          page: 1,
        })
      );

      this.add(
        'template:application',
        precompileTemplate(
          `
        {{#each this.allSitesAllArticles as |a|}}
          <LinkTo @route='site.article' @models={{array a.site_id a.article_id}} id={{a.id}}>
            Article [{{a.site_id}}] [{{a.article_id}}]
          </LinkTo>
        {{/each}}
        {{outlet}}
        `
        )
      );
    }

    visitApplication() {
      return this.visit('/').then(() => {
        let assert = this.assert;

        this.links = {};
        this.links['s-1-a-1'] = document.getElementById('s-1-a-1');
        this.links['s-1-a-2'] = document.getElementById('s-1-a-2');
        this.links['s-1-a-3'] = document.getElementById('s-1-a-3');
        this.links['s-2-a-1'] = document.getElementById('s-2-a-1');
        this.links['s-2-a-2'] = document.getElementById('s-2-a-2');
        this.links['s-2-a-3'] = document.getElementById('s-2-a-3');
        this.links['s-3-a-1'] = document.getElementById('s-3-a-1');
        this.links['s-3-a-2'] = document.getElementById('s-3-a-2');
        this.links['s-3-a-3'] = document.getElementById('s-3-a-3');

        assert.equal(this.links['s-1-a-1'].getAttribute('href'), '/site/s-1/a/a-1');
        assert.equal(this.links['s-1-a-2'].getAttribute('href'), '/site/s-1/a/a-2');
        assert.equal(this.links['s-1-a-3'].getAttribute('href'), '/site/s-1/a/a-3');
        assert.equal(this.links['s-2-a-1'].getAttribute('href'), '/site/s-2/a/a-1');
        assert.equal(this.links['s-2-a-2'].getAttribute('href'), '/site/s-2/a/a-2');
        assert.equal(this.links['s-2-a-3'].getAttribute('href'), '/site/s-2/a/a-3');
        assert.equal(this.links['s-3-a-1'].getAttribute('href'), '/site/s-3/a/a-1');
        assert.equal(this.links['s-3-a-2'].getAttribute('href'), '/site/s-3/a/a-2');
        assert.equal(this.links['s-3-a-3'].getAttribute('href'), '/site/s-3/a/a-3');

        this.site_controller = this.getController('site');
        this.article_controller = this.getController('site.article');
      });
    }

    async ["@test query params have 'model' stickiness by default"](assert) {
      assert.expect(59);

      await this.boot();
      this.links['s-1-a-1'].click();
      await runLoopSettled();
      assert.deepEqual(this.site_controller.get('model'), { id: 's-1' });
      assert.deepEqual(this.article_controller.get('model'), { id: 'a-1' });
      this.assertCurrentPath('/site/s-1/a/a-1');

      await this.setAndFlush(this.article_controller, 'q', 'lol');

      assert.equal(this.links['s-1-a-1'].getAttribute('href'), '/site/s-1/a/a-1?q=lol');
      assert.equal(this.links['s-1-a-2'].getAttribute('href'), '/site/s-1/a/a-2');
      assert.equal(this.links['s-1-a-3'].getAttribute('href'), '/site/s-1/a/a-3');
      assert.equal(this.links['s-2-a-1'].getAttribute('href'), '/site/s-2/a/a-1?q=lol');
      assert.equal(this.links['s-2-a-2'].getAttribute('href'), '/site/s-2/a/a-2');
      assert.equal(this.links['s-2-a-3'].getAttribute('href'), '/site/s-2/a/a-3');
      assert.equal(this.links['s-3-a-1'].getAttribute('href'), '/site/s-3/a/a-1?q=lol');
      assert.equal(this.links['s-3-a-2'].getAttribute('href'), '/site/s-3/a/a-2');
      assert.equal(this.links['s-3-a-3'].getAttribute('href'), '/site/s-3/a/a-3');

      await this.setAndFlush(this.site_controller, 'country', 'us');

      assert.equal(this.links['s-1-a-1'].getAttribute('href'), '/site/s-1/a/a-1?country=us&q=lol');
      assert.equal(this.links['s-1-a-2'].getAttribute('href'), '/site/s-1/a/a-2?country=us');
      assert.equal(this.links['s-1-a-3'].getAttribute('href'), '/site/s-1/a/a-3?country=us');
      assert.equal(this.links['s-2-a-1'].getAttribute('href'), '/site/s-2/a/a-1?q=lol');
      assert.equal(this.links['s-2-a-2'].getAttribute('href'), '/site/s-2/a/a-2');
      assert.equal(this.links['s-2-a-3'].getAttribute('href'), '/site/s-2/a/a-3');
      assert.equal(this.links['s-3-a-1'].getAttribute('href'), '/site/s-3/a/a-1?q=lol');
      assert.equal(this.links['s-3-a-2'].getAttribute('href'), '/site/s-3/a/a-2');
      assert.equal(this.links['s-3-a-3'].getAttribute('href'), '/site/s-3/a/a-3');

      this.links['s-1-a-2'].click();
      await runLoopSettled();

      assert.equal(this.site_controller.get('country'), 'us');
      assert.equal(this.article_controller.get('q'), 'wat');
      assert.equal(this.article_controller.get('z'), 0);
      assert.deepEqual(this.site_controller.get('model'), { id: 's-1' });
      assert.deepEqual(this.article_controller.get('model'), { id: 'a-2' });
      assert.equal(this.links['s-1-a-1'].getAttribute('href'), '/site/s-1/a/a-1?country=us&q=lol');
      assert.equal(this.links['s-1-a-2'].getAttribute('href'), '/site/s-1/a/a-2?country=us');
      assert.equal(this.links['s-1-a-3'].getAttribute('href'), '/site/s-1/a/a-3?country=us');
      assert.equal(this.links['s-2-a-1'].getAttribute('href'), '/site/s-2/a/a-1?q=lol');
      assert.equal(this.links['s-2-a-2'].getAttribute('href'), '/site/s-2/a/a-2');
      assert.equal(this.links['s-2-a-3'].getAttribute('href'), '/site/s-2/a/a-3');
      assert.equal(this.links['s-3-a-1'].getAttribute('href'), '/site/s-3/a/a-1?q=lol');
      assert.equal(this.links['s-3-a-2'].getAttribute('href'), '/site/s-3/a/a-2');
      assert.equal(this.links['s-3-a-3'].getAttribute('href'), '/site/s-3/a/a-3');

      this.links['s-2-a-2'].click();
      await runLoopSettled();

      assert.equal(this.site_controller.get('country'), 'au');
      assert.equal(this.article_controller.get('q'), 'wat');
      assert.equal(this.article_controller.get('z'), 0);
      assert.deepEqual(this.site_controller.get('model'), { id: 's-2' });
      assert.deepEqual(this.article_controller.get('model'), { id: 'a-2' });
      assert.equal(this.links['s-1-a-1'].getAttribute('href'), '/site/s-1/a/a-1?country=us&q=lol');
      assert.equal(this.links['s-1-a-2'].getAttribute('href'), '/site/s-1/a/a-2?country=us');
      assert.equal(this.links['s-1-a-3'].getAttribute('href'), '/site/s-1/a/a-3?country=us');
      assert.equal(this.links['s-2-a-1'].getAttribute('href'), '/site/s-2/a/a-1?q=lol');
      assert.equal(this.links['s-2-a-2'].getAttribute('href'), '/site/s-2/a/a-2');
      assert.equal(this.links['s-2-a-3'].getAttribute('href'), '/site/s-2/a/a-3');
      assert.equal(this.links['s-3-a-1'].getAttribute('href'), '/site/s-3/a/a-1?q=lol');
      assert.equal(this.links['s-3-a-2'].getAttribute('href'), '/site/s-3/a/a-2');
      assert.equal(this.links['s-3-a-3'].getAttribute('href'), '/site/s-3/a/a-3');
    }

    async ["@test query params have 'model' stickiness by default (url changes)"](assert) {
      assert.expect(88);

      await this.boot();
      this.expectedSiteModelHookParams = { site_id: 's-1', country: 'au' };
      this.expectedArticleModelHookParams = {
        article_id: 'a-1',
        q: 'lol',
        z: 0,
      };
      await this.transitionTo('/site/s-1/a/a-1?q=lol');

      assert.deepEqual(
        this.site_controller.get('model'),
        { id: 's-1' },
        "site controller's model is s-1"
      );
      assert.deepEqual(
        this.article_controller.get('model'),
        { id: 'a-1' },
        "article controller's model is a-1"
      );
      assert.equal(this.site_controller.get('country'), 'au');
      assert.equal(this.article_controller.get('q'), 'lol');
      assert.equal(this.article_controller.get('z'), 0);
      assert.equal(this.links['s-1-a-1'].getAttribute('href'), '/site/s-1/a/a-1?q=lol');
      assert.equal(this.links['s-1-a-2'].getAttribute('href'), '/site/s-1/a/a-2');
      assert.equal(this.links['s-1-a-3'].getAttribute('href'), '/site/s-1/a/a-3');
      assert.equal(this.links['s-2-a-1'].getAttribute('href'), '/site/s-2/a/a-1?q=lol');
      assert.equal(this.links['s-2-a-2'].getAttribute('href'), '/site/s-2/a/a-2');
      assert.equal(this.links['s-2-a-3'].getAttribute('href'), '/site/s-2/a/a-3');
      assert.equal(this.links['s-3-a-1'].getAttribute('href'), '/site/s-3/a/a-1?q=lol');
      assert.equal(this.links['s-3-a-2'].getAttribute('href'), '/site/s-3/a/a-2');
      assert.equal(this.links['s-3-a-3'].getAttribute('href'), '/site/s-3/a/a-3');

      this.expectedSiteModelHookParams = { site_id: 's-2', country: 'us' };
      this.expectedArticleModelHookParams = {
        article_id: 'a-1',
        q: 'lol',
        z: 0,
      };
      await this.transitionTo('/site/s-2/a/a-1?country=us&q=lol');

      assert.deepEqual(
        this.site_controller.get('model'),
        { id: 's-2' },
        "site controller's model is s-2"
      );
      assert.deepEqual(
        this.article_controller.get('model'),
        { id: 'a-1' },
        "article controller's model is a-1"
      );
      assert.equal(this.site_controller.get('country'), 'us');
      assert.equal(this.article_controller.get('q'), 'lol');
      assert.equal(this.article_controller.get('z'), 0);
      assert.equal(this.links['s-1-a-1'].getAttribute('href'), '/site/s-1/a/a-1?q=lol');
      assert.equal(this.links['s-1-a-2'].getAttribute('href'), '/site/s-1/a/a-2');
      assert.equal(this.links['s-1-a-3'].getAttribute('href'), '/site/s-1/a/a-3');
      assert.equal(this.links['s-2-a-1'].getAttribute('href'), '/site/s-2/a/a-1?country=us&q=lol');
      assert.equal(this.links['s-2-a-2'].getAttribute('href'), '/site/s-2/a/a-2?country=us');
      assert.equal(this.links['s-2-a-3'].getAttribute('href'), '/site/s-2/a/a-3?country=us');
      assert.equal(this.links['s-3-a-1'].getAttribute('href'), '/site/s-3/a/a-1?q=lol');
      assert.equal(this.links['s-3-a-2'].getAttribute('href'), '/site/s-3/a/a-2');
      assert.equal(this.links['s-3-a-3'].getAttribute('href'), '/site/s-3/a/a-3');

      this.expectedSiteModelHookParams = { site_id: 's-2', country: 'us' };
      this.expectedArticleModelHookParams = {
        article_id: 'a-2',
        q: 'lol',
        z: 0,
      };
      await this.transitionTo('/site/s-2/a/a-2?country=us&q=lol');

      assert.deepEqual(
        this.site_controller.get('model'),
        { id: 's-2' },
        "site controller's model is s-2"
      );
      assert.deepEqual(
        this.article_controller.get('model'),
        { id: 'a-2' },
        "article controller's model is a-2"
      );
      assert.equal(this.site_controller.get('country'), 'us');
      assert.equal(this.article_controller.get('q'), 'lol');
      assert.equal(this.article_controller.get('z'), 0);
      assert.equal(this.links['s-1-a-1'].getAttribute('href'), '/site/s-1/a/a-1?q=lol');
      assert.equal(this.links['s-1-a-2'].getAttribute('href'), '/site/s-1/a/a-2?q=lol');
      assert.equal(this.links['s-1-a-3'].getAttribute('href'), '/site/s-1/a/a-3');
      assert.equal(this.links['s-2-a-1'].getAttribute('href'), '/site/s-2/a/a-1?country=us&q=lol');
      assert.equal(this.links['s-2-a-2'].getAttribute('href'), '/site/s-2/a/a-2?country=us&q=lol');
      assert.equal(this.links['s-2-a-3'].getAttribute('href'), '/site/s-2/a/a-3?country=us');
      assert.equal(this.links['s-3-a-1'].getAttribute('href'), '/site/s-3/a/a-1?q=lol');
      assert.equal(this.links['s-3-a-2'].getAttribute('href'), '/site/s-3/a/a-2?q=lol');
      assert.equal(this.links['s-3-a-3'].getAttribute('href'), '/site/s-3/a/a-3');

      this.expectedSiteModelHookParams = { site_id: 's-2', country: 'us' };
      this.expectedArticleModelHookParams = {
        article_id: 'a-3',
        q: 'lol',
        z: 123,
      };
      await this.transitionTo('/site/s-2/a/a-3?country=us&q=lol&z=123');

      assert.deepEqual(
        this.site_controller.get('model'),
        { id: 's-2' },
        "site controller's model is s-2"
      );
      assert.deepEqual(
        this.article_controller.get('model'),
        { id: 'a-3' },
        "article controller's model is a-3"
      );
      assert.equal(this.site_controller.get('country'), 'us');
      assert.equal(this.article_controller.get('q'), 'lol');
      assert.equal(this.article_controller.get('z'), 123);
      assert.equal(this.links['s-1-a-1'].getAttribute('href'), '/site/s-1/a/a-1?q=lol');
      assert.equal(this.links['s-1-a-2'].getAttribute('href'), '/site/s-1/a/a-2?q=lol');
      assert.equal(this.links['s-1-a-3'].getAttribute('href'), '/site/s-1/a/a-3?q=lol&z=123');
      assert.equal(this.links['s-2-a-1'].getAttribute('href'), '/site/s-2/a/a-1?country=us&q=lol');
      assert.equal(this.links['s-2-a-2'].getAttribute('href'), '/site/s-2/a/a-2?country=us&q=lol');
      assert.equal(
        this.links['s-2-a-3'].getAttribute('href'),
        '/site/s-2/a/a-3?country=us&q=lol&z=123'
      );
      assert.equal(this.links['s-3-a-1'].getAttribute('href'), '/site/s-3/a/a-1?q=lol');
      assert.equal(this.links['s-3-a-2'].getAttribute('href'), '/site/s-3/a/a-2?q=lol');
      assert.equal(this.links['s-3-a-3'].getAttribute('href'), '/site/s-3/a/a-3?q=lol&z=123');

      this.expectedSiteModelHookParams = { site_id: 's-3', country: 'nz' };
      this.expectedArticleModelHookParams = {
        article_id: 'a-3',
        q: 'lol',
        z: 123,
      };
      await this.transitionTo('/site/s-3/a/a-3?country=nz&q=lol&z=123');

      assert.deepEqual(
        this.site_controller.get('model'),
        { id: 's-3' },
        "site controller's model is s-3"
      );
      assert.deepEqual(
        this.article_controller.get('model'),
        { id: 'a-3' },
        "article controller's model is a-3"
      );
      assert.equal(this.site_controller.get('country'), 'nz');
      assert.equal(this.article_controller.get('q'), 'lol');
      assert.equal(this.article_controller.get('z'), 123);
      assert.equal(this.links['s-1-a-1'].getAttribute('href'), '/site/s-1/a/a-1?q=lol');
      assert.equal(this.links['s-1-a-2'].getAttribute('href'), '/site/s-1/a/a-2?q=lol');
      assert.equal(this.links['s-1-a-3'].getAttribute('href'), '/site/s-1/a/a-3?q=lol&z=123');
      assert.equal(this.links['s-2-a-1'].getAttribute('href'), '/site/s-2/a/a-1?country=us&q=lol');
      assert.equal(this.links['s-2-a-2'].getAttribute('href'), '/site/s-2/a/a-2?country=us&q=lol');
      assert.equal(
        this.links['s-2-a-3'].getAttribute('href'),
        '/site/s-2/a/a-3?country=us&q=lol&z=123'
      );
      assert.equal(this.links['s-3-a-1'].getAttribute('href'), '/site/s-3/a/a-1?country=nz&q=lol');
      assert.equal(this.links['s-3-a-2'].getAttribute('href'), '/site/s-3/a/a-2?country=nz&q=lol');
      assert.equal(
        this.links['s-3-a-3'].getAttribute('href'),
        '/site/s-3/a/a-3?country=nz&q=lol&z=123'
      );
    }

    async ["@test query params have 'model' stickiness by default (params-based transitions)"](
      assert
    ) {
      assert.expect(118);

      await this.boot();
      this.expectedSiteModelHookParams = { site_id: 's-1', country: 'au' };
      this.expectedArticleModelHookParams = {
        article_id: 'a-1',
        q: 'wat',
        z: 0,
      };
      await this.transitionTo('site.article', 's-1', 'a-1');

      assert.deepEqual(this.site_controller.get('model'), { id: 's-1' });
      assert.deepEqual(this.article_controller.get('model'), { id: 'a-1' });
      assert.equal(this.site_controller.get('country'), 'au');
      assert.equal(this.article_controller.get('q'), 'wat');
      assert.equal(this.article_controller.get('z'), 0);
      assert.equal(this.links['s-1-a-1'].getAttribute('href'), '/site/s-1/a/a-1');
      assert.equal(this.links['s-1-a-2'].getAttribute('href'), '/site/s-1/a/a-2');
      assert.equal(this.links['s-1-a-3'].getAttribute('href'), '/site/s-1/a/a-3');
      assert.equal(this.links['s-2-a-1'].getAttribute('href'), '/site/s-2/a/a-1');
      assert.equal(this.links['s-2-a-2'].getAttribute('href'), '/site/s-2/a/a-2');
      assert.equal(this.links['s-2-a-3'].getAttribute('href'), '/site/s-2/a/a-3');
      assert.equal(this.links['s-3-a-1'].getAttribute('href'), '/site/s-3/a/a-1');
      assert.equal(this.links['s-3-a-2'].getAttribute('href'), '/site/s-3/a/a-2');
      assert.equal(this.links['s-3-a-3'].getAttribute('href'), '/site/s-3/a/a-3');

      this.expectedSiteModelHookParams = { site_id: 's-1', country: 'au' };
      this.expectedArticleModelHookParams = {
        article_id: 'a-2',
        q: 'lol',
        z: 0,
      };
      await this.transitionTo('site.article', 's-1', 'a-2', {
        queryParams: { q: 'lol' },
      });

      assert.deepEqual(this.site_controller.get('model'), { id: 's-1' });
      assert.deepEqual(this.article_controller.get('model'), { id: 'a-2' });
      assert.equal(this.site_controller.get('country'), 'au');
      assert.equal(this.article_controller.get('q'), 'lol');
      assert.equal(this.article_controller.get('z'), 0);
      assert.equal(this.links['s-1-a-1'].getAttribute('href'), '/site/s-1/a/a-1');
      assert.equal(this.links['s-1-a-2'].getAttribute('href'), '/site/s-1/a/a-2?q=lol');
      assert.equal(this.links['s-1-a-3'].getAttribute('href'), '/site/s-1/a/a-3');
      assert.equal(this.links['s-2-a-1'].getAttribute('href'), '/site/s-2/a/a-1');
      assert.equal(this.links['s-2-a-2'].getAttribute('href'), '/site/s-2/a/a-2?q=lol');
      assert.equal(this.links['s-2-a-3'].getAttribute('href'), '/site/s-2/a/a-3');
      assert.equal(this.links['s-3-a-1'].getAttribute('href'), '/site/s-3/a/a-1');
      assert.equal(this.links['s-3-a-2'].getAttribute('href'), '/site/s-3/a/a-2?q=lol');
      assert.equal(this.links['s-3-a-3'].getAttribute('href'), '/site/s-3/a/a-3');

      this.expectedSiteModelHookParams = { site_id: 's-1', country: 'au' };
      this.expectedArticleModelHookParams = {
        article_id: 'a-3',
        q: 'hay',
        z: 0,
      };
      await this.transitionTo('site.article', 's-1', 'a-3', {
        queryParams: { q: 'hay' },
      });

      assert.deepEqual(this.site_controller.get('model'), { id: 's-1' });
      assert.deepEqual(this.article_controller.get('model'), { id: 'a-3' });
      assert.equal(this.site_controller.get('country'), 'au');
      assert.equal(this.article_controller.get('q'), 'hay');
      assert.equal(this.article_controller.get('z'), 0);
      assert.equal(this.links['s-1-a-1'].getAttribute('href'), '/site/s-1/a/a-1');
      assert.equal(this.links['s-1-a-2'].getAttribute('href'), '/site/s-1/a/a-2?q=lol');
      assert.equal(this.links['s-1-a-3'].getAttribute('href'), '/site/s-1/a/a-3?q=hay');
      assert.equal(this.links['s-2-a-1'].getAttribute('href'), '/site/s-2/a/a-1');
      assert.equal(this.links['s-2-a-2'].getAttribute('href'), '/site/s-2/a/a-2?q=lol');
      assert.equal(this.links['s-2-a-3'].getAttribute('href'), '/site/s-2/a/a-3?q=hay');
      assert.equal(this.links['s-3-a-1'].getAttribute('href'), '/site/s-3/a/a-1');
      assert.equal(this.links['s-3-a-2'].getAttribute('href'), '/site/s-3/a/a-2?q=lol');
      assert.equal(this.links['s-3-a-3'].getAttribute('href'), '/site/s-3/a/a-3?q=hay');

      this.expectedSiteModelHookParams = { site_id: 's-1', country: 'au' };
      this.expectedArticleModelHookParams = {
        article_id: 'a-2',
        q: 'lol',
        z: 1,
      };
      await this.transitionTo('site.article', 's-1', 'a-2', {
        queryParams: { z: 1 },
      });

      assert.deepEqual(this.site_controller.get('model'), { id: 's-1' });
      assert.deepEqual(this.article_controller.get('model'), { id: 'a-2' });
      assert.equal(this.site_controller.get('country'), 'au');
      assert.equal(this.article_controller.get('q'), 'lol');
      assert.equal(this.article_controller.get('z'), 1);
      assert.equal(this.links['s-1-a-1'].getAttribute('href'), '/site/s-1/a/a-1');
      assert.equal(this.links['s-1-a-2'].getAttribute('href'), '/site/s-1/a/a-2?q=lol&z=1');
      assert.equal(this.links['s-1-a-3'].getAttribute('href'), '/site/s-1/a/a-3?q=hay');
      assert.equal(this.links['s-2-a-1'].getAttribute('href'), '/site/s-2/a/a-1');
      assert.equal(this.links['s-2-a-2'].getAttribute('href'), '/site/s-2/a/a-2?q=lol&z=1');
      assert.equal(this.links['s-2-a-3'].getAttribute('href'), '/site/s-2/a/a-3?q=hay');
      assert.equal(this.links['s-3-a-1'].getAttribute('href'), '/site/s-3/a/a-1');
      assert.equal(this.links['s-3-a-2'].getAttribute('href'), '/site/s-3/a/a-2?q=lol&z=1');
      assert.equal(this.links['s-3-a-3'].getAttribute('href'), '/site/s-3/a/a-3?q=hay');

      this.expectedSiteModelHookParams = { site_id: 's-2', country: 'us' };
      this.expectedArticleModelHookParams = {
        article_id: 'a-2',
        q: 'lol',
        z: 1,
      };
      await this.transitionTo('site.article', 's-2', 'a-2', {
        queryParams: { country: 'us' },
      });

      assert.deepEqual(this.site_controller.get('model'), { id: 's-2' });
      assert.deepEqual(this.article_controller.get('model'), { id: 'a-2' });
      assert.equal(this.site_controller.get('country'), 'us');
      assert.equal(this.article_controller.get('q'), 'lol');
      assert.equal(this.article_controller.get('z'), 1);
      assert.equal(this.links['s-1-a-1'].getAttribute('href'), '/site/s-1/a/a-1');
      assert.equal(this.links['s-1-a-2'].getAttribute('href'), '/site/s-1/a/a-2?q=lol&z=1');
      assert.equal(this.links['s-1-a-3'].getAttribute('href'), '/site/s-1/a/a-3?q=hay');
      assert.equal(this.links['s-2-a-1'].getAttribute('href'), '/site/s-2/a/a-1?country=us');
      assert.equal(
        this.links['s-2-a-2'].getAttribute('href'),
        '/site/s-2/a/a-2?country=us&q=lol&z=1'
      );
      assert.equal(this.links['s-2-a-3'].getAttribute('href'), '/site/s-2/a/a-3?country=us&q=hay');
      assert.equal(this.links['s-3-a-1'].getAttribute('href'), '/site/s-3/a/a-1');
      assert.equal(this.links['s-3-a-2'].getAttribute('href'), '/site/s-3/a/a-2?q=lol&z=1');
      assert.equal(this.links['s-3-a-3'].getAttribute('href'), '/site/s-3/a/a-3?q=hay');

      this.expectedSiteModelHookParams = { site_id: 's-2', country: 'us' };
      this.expectedArticleModelHookParams = {
        article_id: 'a-1',
        q: 'yeah',
        z: 0,
      };
      await this.transitionTo('site.article', 's-2', 'a-1', {
        queryParams: { q: 'yeah' },
      });

      assert.deepEqual(this.site_controller.get('model'), { id: 's-2' });
      assert.deepEqual(this.article_controller.get('model'), { id: 'a-1' });
      assert.equal(this.site_controller.get('country'), 'us');
      assert.equal(this.article_controller.get('q'), 'yeah');
      assert.equal(this.article_controller.get('z'), 0);
      assert.equal(this.links['s-1-a-1'].getAttribute('href'), '/site/s-1/a/a-1?q=yeah');
      assert.equal(this.links['s-1-a-2'].getAttribute('href'), '/site/s-1/a/a-2?q=lol&z=1');
      assert.equal(this.links['s-1-a-3'].getAttribute('href'), '/site/s-1/a/a-3?q=hay');
      assert.equal(this.links['s-2-a-1'].getAttribute('href'), '/site/s-2/a/a-1?country=us&q=yeah');
      assert.equal(
        this.links['s-2-a-2'].getAttribute('href'),
        '/site/s-2/a/a-2?country=us&q=lol&z=1'
      );
      assert.equal(this.links['s-2-a-3'].getAttribute('href'), '/site/s-2/a/a-3?country=us&q=hay');
      assert.equal(this.links['s-3-a-1'].getAttribute('href'), '/site/s-3/a/a-1?q=yeah');
      assert.equal(this.links['s-3-a-2'].getAttribute('href'), '/site/s-3/a/a-2?q=lol&z=1');
      assert.equal(this.links['s-3-a-3'].getAttribute('href'), '/site/s-3/a/a-3?q=hay');

      this.expectedSiteModelHookParams = { site_id: 's-3', country: 'nz' };
      this.expectedArticleModelHookParams = {
        article_id: 'a-3',
        q: 'hay',
        z: 3,
      };
      await this.transitionTo('site.article', 's-3', 'a-3', {
        queryParams: { country: 'nz', z: 3 },
      });

      assert.deepEqual(this.site_controller.get('model'), { id: 's-3' });
      assert.deepEqual(this.article_controller.get('model'), { id: 'a-3' });
      assert.equal(this.site_controller.get('country'), 'nz');
      assert.equal(this.article_controller.get('q'), 'hay');
      assert.equal(this.article_controller.get('z'), 3);
      assert.equal(this.links['s-1-a-1'].getAttribute('href'), '/site/s-1/a/a-1?q=yeah');
      assert.equal(this.links['s-1-a-2'].getAttribute('href'), '/site/s-1/a/a-2?q=lol&z=1');
      assert.equal(this.links['s-1-a-3'].getAttribute('href'), '/site/s-1/a/a-3?q=hay&z=3');
      assert.equal(this.links['s-2-a-1'].getAttribute('href'), '/site/s-2/a/a-1?country=us&q=yeah');
      assert.equal(
        this.links['s-2-a-2'].getAttribute('href'),
        '/site/s-2/a/a-2?country=us&q=lol&z=1'
      );
      assert.equal(
        this.links['s-2-a-3'].getAttribute('href'),
        '/site/s-2/a/a-3?country=us&q=hay&z=3'
      );
      assert.equal(this.links['s-3-a-1'].getAttribute('href'), '/site/s-3/a/a-1?country=nz&q=yeah');
      assert.equal(
        this.links['s-3-a-2'].getAttribute('href'),
        '/site/s-3/a/a-2?country=nz&q=lol&z=1'
      );
      assert.equal(
        this.links['s-3-a-3'].getAttribute('href'),
        '/site/s-3/a/a-3?country=nz&q=hay&z=3'
      );
    }
  }
);
