import { moduleFor, ApplicationTest } from '../../utils/test-case';
import { strip } from '../../utils/abstract-test-case';
import { compile } from '../../utils/helpers';
import Controller from 'ember-runtime/controllers/controller';
import Engine from 'ember-application/system/engine';
import Route from 'ember-routing/system/route';

moduleFor('Application test: engine rendering', class extends ApplicationTest {
  setupAppAndRoutableEngine(hooks = []) {
    this.application.register('template:application', compile('Application{{outlet}}'));

    this.router.map(function() {
      this.mount('blog');
    });
    this.application.register('route-map:blog', function() { });
    this.registerRoute('application', Route.extend({
      model() {
        hooks.push('application - application');
      }
    }));

    this.registerEngine('blog', Engine.extend({
      init() {
        this._super(...arguments);
        this.register('template:application', compile('Engine{{outlet}}'));
        this.register('route:application', Route.extend({
          model() {
            hooks.push('engine - application');
          }
        }));
      }
    }));
  }

  setupAppAndRoutelessEngine(hooks) {
    this.application.register('template:application', compile('Application{{mount "chat-engine"}}'));
    this.registerRoute('application', Route.extend({
      model() {
        hooks.push('application - application');
      }
    }));

    this.registerEngine('chat-engine', Engine.extend({
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

  ['@test sharing a template between engine and application has separate refinements']() {
    this.assert.expect(1);

    let sharedTemplate = compile(strip`
      <h1>{{contextType}}</h1>
      {{ambiguous-curlies}}

      {{outlet}}
    `);

    this.application.register('template:application', sharedTemplate);
    this.registerController('application', Controller.extend({
      contextType: 'Application',
      'ambiguous-curlies': 'Controller Data!'
    }));

    this.router.map(function() {
      this.mount('blog');
    });
    this.application.register('route-map:blog', function() { });

    this.registerEngine('blog', Engine.extend({
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
});
