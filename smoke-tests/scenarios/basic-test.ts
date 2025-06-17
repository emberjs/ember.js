import { appScenarios } from './scenarios';
import type { PreparedApp } from 'scenario-tester';
import * as QUnit from 'qunit';
const { module: Qmodule, test } = QUnit;

appScenarios.map('basics', project => {
  project.mergeFiles({
    'app': {
      'router.js': `
        import EmberRouter from '@ember/routing/router';
        import config from 'ember-test-app/config/environment';

        export default class Router extends EmberRouter {
          location = config.locationType;
          rootURL = config.rootURL;
        }

        Router.map(function () {
          this.route('example-gjs-route')
        });
      `,
      components: {
        'interactive-example.js': `
          import { template } from '@ember/template-compiler';
          import Component from '@glimmer/component';
          import { tracked } from '@glimmer/tracking';
          import { on } from '@ember/modifier';

          export default class extends Component {
            @tracked
            message = 'Hello';

            static {
              template("<div class='interactive-example' {{on 'click' this.louder}}>{{this.message}}</div>", {
                component: this,
                scope: () => ({ on })
              })
            }

            louder = () => {
              this.message = this.message + '!';
            }

          }
        `
      },
      routes: {
        'example-gjs-route.js': `
          import Route from '@ember/routing/route';
          export default class extends Route {
            model() {
              return {
                message: "I am the model"
              }
            }
          }
        `
      },
      templates: {
        'example-gjs-route.gjs': `
          import Component from '@glimmer/component';

          export default class extends Component {
            get componentGetter() {
              return "I am on the component"
            }

            <template>
              <div data-test="model-field">{{@model.message}}</div>
              <div data-test="controller-field">{{@controller.exampleControllerField}}</div>
              <div data-test="component-getter">{{this.componentGetter}}</div>
            </template>
          }

        `
      }
    },
    'tests': {
      'acceptance': {
        'example-gjs-route-test.js': `
          import { module, test } from 'qunit';
          import { visit, currentURL } from '@ember/test-helpers';
          import { setupApplicationTest } from 'ember-test-app/tests/helpers';

          module('Acceptance | example gjs route', function (hooks) {
            setupApplicationTest(hooks);

            test('visiting /example-gjs-route', async function (assert) {
              await visit('/example-gjs-route');
              assert.strictEqual(currentURL(), '/example-gjs-route');
              assert.dom('[data-test="model-field"]').containsText('I am the model');
              assert.dom('[data-test="controller-field"]').containsText('This is on the controller');
              assert.dom('[data-test="component-getter"]').containsText('I am on the component');
            });
          });
        `
      },
      'integration': {
        'interactive-example-test.js': `
          import { module, test } from 'qunit';
          import { setupRenderingTest } from 'ember-qunit';
          import { render, click } from '@ember/test-helpers';
          import { template } from '@ember/template-compiler';
          import InteractiveExample from 'ember-test-app/components/interactive-example';

          module('Integration | component | interactive-example', function(hooks) {
            setupRenderingTest(hooks);

            test('initial render', async function(assert) {
              await render(template("<InteractiveExample />", {
                scope: () => ({ InteractiveExample })
              }));
              assert.dom('.interactive-example').hasText('Hello');
            });

            test('interactive update', async function(assert) {
              await render(template("<InteractiveExample />", {
                scope: () => ({ InteractiveExample })
              }));
              await click('.interactive-example');
              assert.dom('.interactive-example').hasText('Hello!');
            });

          });
        `
      }
    }
  })
}).forEachScenario(scenario => {
  Qmodule(scenario.name, function (hooks) {
    let app: PreparedApp;
    hooks.before(async () => {
      app = await scenario.prepare();
    });

    test(`ember test`, async function (assert) {
      let result = await app.execute(`ember test`);
      assert.equal(result.exitCode, 0, result.output);
    });
  });
})
