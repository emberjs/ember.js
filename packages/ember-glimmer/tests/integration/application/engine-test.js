import { moduleFor, ApplicationTest } from '../../utils/test-case';
import { strip } from '../../utils/abstract-test-case';
import { compile } from '../../utils/helpers';
import { Controller, RSVP } from 'ember-runtime';
import { Component } from 'ember-glimmer';
import { Engine } from 'ember-application';
import { Route } from 'ember-routing';

moduleFor('Application test: engine rendering', class extends ApplicationTest {
  setupAppAndRoutableEngine(hooks = []) {
    let self = this;

    this.addTemplate('application', 'Application{{outlet}}');

    this.router.map(function() {
      this.mount('blog');
    });
    this.add('route-map:blog', function() {
      this.route('post', function() {
        this.route('comments');
        this.route('likes');
      });
      this.route('category', {path: 'category/:id'});
      this.route('author', {path: 'author/:id'});
    });
    this.add('route:application', Route.extend({
      model() {
        hooks.push('application - application');
      }
    }));

    this.add('engine:blog', Engine.extend({
      init() {
        this._super(...arguments);
        this.register('controller:application', Controller.extend({
          queryParams: ['lang'],
          lang: ''
        }));
        this.register('controller:category', Controller.extend({
          queryParams: ['type'],
        }));
        this.register('controller:authorKtrl', Controller.extend({
          queryParams: ['official'],
        }));
        this.register('template:application', compile('Engine{{lang}}{{outlet}}'));
        this.register('route:application', Route.extend({
          model() {
            hooks.push('engine - application');
          }
        }));
        this.register('route:author', Route.extend({
          controllerName: 'authorKtrl',
        }));

        if (self._additionalEngineRegistrations) {
          self._additionalEngineRegistrations.call(this);
        }
      }
    }));
  }

  setupAppAndRoutelessEngine(hooks) {
    this.setupRoutelessEngine(hooks);

    this.add('engine:chat-engine', Engine.extend({
      init() {
        this._super(...arguments);
        this.register('template:application', compile('Engine'));
        this.register('controller:application', Controller.extend({
          init() {
            this._super(...arguments);
            hooks.push('engine - application');
          }
        }));
      }
    }));
  }

  setupAppAndRoutableEngineWithPartial(hooks) {
    this.addTemplate('application', 'Application{{outlet}}');

    this.router.map(function() {
      this.mount('blog');
    });
    this.add('route-map:blog', function() { });
    this.add('route:application', Route.extend({
      model() {
        hooks.push('application - application');
      }
    }));

    this.add('engine:blog', Engine.extend({
      init() {
        this._super(...arguments);
        this.register('template:foo', compile('foo partial'));
        this.register('template:application', compile('Engine{{outlet}} {{partial "foo"}}'));
        this.register('route:application', Route.extend({
          model() {
            hooks.push('engine - application');
          }
        }));
      }
    }));
  }

  setupRoutelessEngine(hooks) {
    this.addTemplate('application', 'Application{{mount "chat-engine"}}');
    this.add('route:application', Route.extend({
      model() {
        hooks.push('application - application');
      }
    }));
  }

  setupAppAndRoutlessEngineWithPartial(hooks) {
    this.setupRoutelessEngine(hooks);

    this.add('engine:chat-engine', Engine.extend({
      init() {
        this._super(...arguments);
        this.register('template:foo', compile('foo partial'));
        this.register('template:application', compile('Engine {{partial "foo"}}'));
        this.register('controller:application', Controller.extend({
          init() {
            this._super(...arguments);
            hooks.push('engine - application');
          }
        }));
      }
    }));
  }

  additionalEngineRegistrations(callback) {
    this._additionalEngineRegistrations = callback;
  }

  setupEngineWithAttrs(hooks) {
    this.addTemplate('application', 'Application{{mount "chat-engine"}}');

    this.add('engine:chat-engine', Engine.extend({
      init() {
        this._super(...arguments);
        this.register('template:components/foo-bar', compile(`{{partial "troll"}}`));
        this.register('template:troll', compile('{{attrs.wat}}'));
        this.register('controller:application', Controller.extend({
          contextType: 'Engine'
        }));
        this.register('template:application', compile('Engine {{foo-bar wat=contextType}}'));
      }
    }));
  }

  stringsEndWith(str, suffix) {
    return str.indexOf(suffix, str.length - suffix.length) !== -1;
  }

  ['@test attrs in an engine']() {
    this.setupEngineWithAttrs([]);

    return this.visit('/').then(() => {
      this.assertText('ApplicationEngine Engine');
    });
  }

  ['@test sharing a template between engine and application has separate refinements']() {
    this.assert.expect(1);

    let sharedTemplate = compile(strip`
      <h1>{{contextType}}</h1>
      {{ambiguous-curlies}}

      {{outlet}}
    `);

    this.add('template:application', sharedTemplate);
    this.add('controller:application', Controller.extend({
      contextType: 'Application',
      'ambiguous-curlies': 'Controller Data!'
    }));

    this.router.map(function() {
      this.mount('blog');
    });
    this.add('route-map:blog', function() { });

    this.add('engine:blog', Engine.extend({
      init() {
        this._super(...arguments);

        this.register('controller:application', Controller.extend({
          contextType: 'Engine'
        }));
        this.register('template:application', sharedTemplate);
        this.register('template:components/ambiguous-curlies', compile(strip`
        <p>Component!</p>
      `));
      }
    }));

    return this.visit('/blog').then(() => {
      this.assertText('ApplicationController Data!EngineComponent!');
    });
  }

  ['@test sharing a layout between engine and application has separate refinements']() {
    this.assert.expect(1);

    let sharedLayout = compile(strip`
      {{ambiguous-curlies}}
    `);

    let sharedComponent = Component.extend({
      layout: sharedLayout
    });

    this.addTemplate('application', strip`
      <h1>Application</h1>
      {{my-component ambiguous-curlies="Local Data!"}}
      {{outlet}}
    `);

    this.add('component:my-component', sharedComponent);

    this.router.map(function() {
      this.mount('blog');
    });
    this.add('route-map:blog', function() { });

    this.add('engine:blog', Engine.extend({
      init() {
        this._super(...arguments);
        this.register('template:application', compile(strip`
          <h1>Engine</h1>
          {{my-component}}
          {{outlet}}
        `));
        this.register('component:my-component', sharedComponent);
        this.register('template:components/ambiguous-curlies', compile(strip`
          <p>Component!</p>
        `));
      }
    }));

    return this.visit('/blog').then(() => {
      this.assertText('ApplicationLocal Data!EngineComponent!');
    });
  }

  ['@test visit() with `shouldRender: true` returns a promise that resolves when application and engine templates have rendered'](assert) {
    assert.expect(2);

    let hooks = [];

    this.setupAppAndRoutableEngine(hooks);

    return this.visit('/blog', { shouldRender: true }).then(() => {
      this.assertText('ApplicationEngine');

      this.assert.deepEqual(hooks, [
        'application - application',
        'engine - application'
      ], 'the expected model hooks were fired');
    });
  }

  ['@test visit() with `shouldRender: false` returns a promise that resolves without rendering'](assert) {
    assert.expect(2);

    let hooks = [];

    this.setupAppAndRoutableEngine(hooks);

    return this.visit('/blog', { shouldRender: false }).then(() => {
      this.assertText('');

      this.assert.deepEqual(hooks, [
        'application - application',
        'engine - application'
      ], 'the expected model hooks were fired');
    });
  }

  ['@test visit() with `shouldRender: true` returns a promise that resolves when application and routeless engine templates have rendered'](assert) {
    assert.expect(2);

    let hooks = [];

    this.setupAppAndRoutelessEngine(hooks);

    return this.visit('/', { shouldRender: true }).then(() => {
      this.assertText('ApplicationEngine');

      this.assert.deepEqual(hooks, [
        'application - application',
        'engine - application'
      ], 'the expected hooks were fired');
    });
  }

  ['@test visit() with partials in routable engine'](assert) {
    assert.expect(2);

    let hooks = [];

    this.setupAppAndRoutableEngineWithPartial(hooks);

    return this.visit('/blog', { shouldRender: true }).then(() => {
      this.assertText('ApplicationEngine foo partial');

      this.assert.deepEqual(hooks, [
        'application - application',
        'engine - application'
      ], 'the expected hooks were fired');
    });
  }

  ['@test visit() with partials in non-routable engine'](assert) {
    assert.expect(2);

    let hooks = [];

    this.setupAppAndRoutlessEngineWithPartial(hooks);

    return this.visit('/', { shouldRender: true }).then(() => {
      this.assertText('ApplicationEngine foo partial');

      this.assert.deepEqual(hooks, [
        'application - application',
        'engine - application'
      ], 'the expected hooks were fired');
    });
  }

  ['@test deactivate should be called on Engine Routes before destruction'](assert) {
    assert.expect(3);

    this.setupAppAndRoutableEngine();

    this.add('engine:blog', Engine.extend({
      init() {
        this._super(...arguments);
        this.register('template:application', compile('Engine{{outlet}}'));
        this.register('route:application', Route.extend({
          deactivate() {
            assert.notOk(this.isDestroyed, 'Route is not destroyed');
            assert.notOk(this.isDestroying, 'Route is not being destroyed');
          }
        }));
      }
    }));

    return this.visit('/blog').then(() => {
      this.assertText('ApplicationEngine');
    });
  }

  ['@test engine should lookup and use correct controller'](assert) {
    this.setupAppAndRoutableEngine();

    return this.visit('/blog?lang=English').then(() => {
      this.assertText('ApplicationEngineEnglish');
    });
  }

  ['@test error substate route works for the application route of an Engine'](assert) {
    assert.expect(2);

    this.setupAppAndRoutableEngine();
    this.additionalEngineRegistrations(function() {
      this.register('template:application_error', compile('Error! {{model.message}}'));
      this.register('route:post', Route.extend({
        model() {
          return RSVP.reject(new Error('Oh, noes!'));
        }
      }));
    });

    return this.visit('/').then(() => {
      this.assertText('Application');
      return this.transitionTo('blog.post');
    }).catch(() => {
      this.assertText('ApplicationError! Oh, noes!');
    });
  }

  ['@test error route works for the application route of an Engine'](assert) {
    assert.expect(2);

    this.setupAppAndRoutableEngine();
    this.additionalEngineRegistrations(function() {
      this.register('template:error', compile('Error! {{model.message}}'));
      this.register('route:post', Route.extend({
        model() {
          return RSVP.reject(new Error('Oh, noes!'));
        }
      }));
    });

    return this.visit('/').then(() => {
      this.assertText('Application');
      return this.transitionTo('blog.post');
    }).catch(() => {
      this.assertText('ApplicationEngineError! Oh, noes!');
    });
  }

  ['@test error substate route works for a child route of an Engine'](assert) {
    assert.expect(2);

    this.setupAppAndRoutableEngine();
    this.additionalEngineRegistrations(function() {
      this.register('template:post_error', compile('Error! {{model.message}}'));
      this.register('route:post', Route.extend({
        model() {
          return RSVP.reject(new Error('Oh, noes!'));
        }
      }));
    });

    return this.visit('/').then(() => {
      this.assertText('Application');
      return this.transitionTo('blog.post');
    }).catch(() => {
      this.assertText('ApplicationEngineError! Oh, noes!');
    });
  }

  ['@test error route works for a child route of an Engine'](assert) {
    assert.expect(2);

    this.setupAppAndRoutableEngine();
    this.additionalEngineRegistrations(function() {
      this.register('template:post.error', compile('Error! {{model.message}}'));
      this.register('route:post.comments', Route.extend({
        model() {
          return RSVP.reject(new Error('Oh, noes!'));
        }
      }));
    });

    return this.visit('/').then(() => {
      this.assertText('Application');
      return this.transitionTo('blog.post.comments');
    }).catch(() => {
      this.assertText('ApplicationEngineError! Oh, noes!');
    });
  }

  ['@test loading substate route works for the application route of an Engine'](assert) {
    assert.expect(3);

    let resolveLoading;

    this.setupAppAndRoutableEngine();
    this.additionalEngineRegistrations(function() {
      this.register('template:application_loading', compile('Loading'));
      this.register('template:post', compile('Post'));
      this.register('route:post', Route.extend({
        model() {
          return new RSVP.Promise((resolve) => {
            resolveLoading = resolve;
          });
        }
      }));
    });

    return this.visit('/').then(() => {
      this.assertText('Application');
      let transition = this.transitionTo('blog.post');

      this.runTaskNext(() => {
        this.assertText('ApplicationLoading');
        resolveLoading();
      });

      return transition.then(() => {
        this.runTaskNext(() => this.assertText('ApplicationEnginePost'));
      });
    });
  }

  ['@test loading route works for the application route of an Engine'](assert) {
    assert.expect(3);

    let resolveLoading;

    this.setupAppAndRoutableEngine();
    this.additionalEngineRegistrations(function() {
      this.register('template:loading', compile('Loading'));
      this.register('template:post', compile('Post'));
      this.register('route:post', Route.extend({
        model() {
          return new RSVP.Promise((resolve) => {
            resolveLoading = resolve;
          });
        }
      }));
    });

    return this.visit('/').then(() => {
      this.assertText('Application');
      let transition = this.transitionTo('blog.post');

      this.runTaskNext(() => {
        this.assertText('ApplicationEngineLoading');
        resolveLoading();
      });

      return transition.then(() => {
        this.runTaskNext(() => this.assertText('ApplicationEnginePost'));
      });
    });
  }

  ['@test loading substate route works for a child route of an Engine'](assert) {
    assert.expect(3);

    let resolveLoading;

    this.setupAppAndRoutableEngine();
    this.additionalEngineRegistrations(function() {
      this.register('template:post', compile('{{outlet}}'));
      this.register('template:post.comments', compile('Comments'));
      this.register('template:post.likes_loading', compile('Loading'));
      this.register('template:post.likes', compile('Likes'));
      this.register('route:post.likes', Route.extend({
        model() {
          return new RSVP.Promise((resolve) => {
            resolveLoading = resolve;
          });
        }
      }));
    });

    return this.visit('/blog/post/comments').then(() => {
      this.assertText('ApplicationEngineComments');
      let transition = this.transitionTo('blog.post.likes');

      this.runTaskNext(() => {
        this.assertText('ApplicationEngineLoading');
        resolveLoading();
      });

      return transition.then(() => {
        this.runTaskNext(() => this.assertText('ApplicationEngineLikes'));
      });
    });
  }

  ['@test loading route works for a child route of an Engine'](assert) {
    assert.expect(3);

    let resolveLoading;

    this.setupAppAndRoutableEngine();
    this.additionalEngineRegistrations(function() {
      this.register('template:post', compile('{{outlet}}'));
      this.register('template:post.comments', compile('Comments'));
      this.register('template:post.loading', compile('Loading'));
      this.register('template:post.likes', compile('Likes'));
      this.register('route:post.likes', Route.extend({
        model() {
          return new RSVP.Promise((resolve) => {
            resolveLoading = resolve;
          });
        }
      }));
    });

    return this.visit('/blog/post/comments').then(() => {
      this.assertText('ApplicationEngineComments');
      let transition = this.transitionTo('blog.post.likes');

      this.runTaskNext(() => {
        this.assertText('ApplicationEngineLoading');
        resolveLoading();
      });

      return transition.then(() => {
        this.runTaskNext(() => this.assertText('ApplicationEngineLikes'));
      });
    });
  }

  ['@test query params don\'t have stickiness by default between model'](assert) {
    assert.expect(1);
    let tmpl = '{{#link-to "blog.category" 1337}}Category 1337{{/link-to}}';
    this.setupAppAndRoutableEngine();
    this.additionalEngineRegistrations(function() {
      this.register('template:category', compile(tmpl));
    });

    return this.visit('/blog/category/1?type=news').then(() => {
      let suffix = '/blog/category/1337';
      let href = this.element.querySelector('a').href;

      // check if link ends with the suffix
      assert.ok(this.stringsEndWith(href, suffix));
    });
  }

  ['@test query params in customized controllerName have stickiness by default between model'](assert) {
    assert.expect(2);
    let tmpl = '{{#link-to "blog.author" 1337 class="author-1337"}}Author 1337{{/link-to}}{{#link-to "blog.author" 1 class="author-1"}}Author 1{{/link-to}}';
    this.setupAppAndRoutableEngine();
    this.additionalEngineRegistrations(function() {
      this.register('template:author', compile(tmpl));
    });

    return this.visit('/blog/author/1?official=true').then(() => {
      let suffix1 = '/blog/author/1?official=true';
      let href1 = this.element.querySelector('.author-1').href;
      let suffix1337 = '/blog/author/1337';
      let href1337 = this.element.querySelector('.author-1337').href;

      // check if link ends with the suffix
      assert.ok(this.stringsEndWith(href1, suffix1));
      assert.ok(this.stringsEndWith(href1337, suffix1337));
    });
  }
});
