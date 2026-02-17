import { v1AppScenarios, v2AppScenarios } from './scenarios';
import type { PreparedApp, Scenarios } from 'scenario-tester';
import * as QUnit from 'qunit';
const { module: Qmodule, test } = QUnit;

function basicTest(scenarios: Scenarios, appName: string) {
  scenarios
    .map('basics', (project) => {
      project.mergeFiles({
        app: {
          'router.js': `
            import EmberRouter from '@ember/routing/router';
            import config from '${appName}/config/environment';

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

                louder() {
                  this.message = this.message + '!';
                }

              }
            `,
          },
          controllers: {
            'example-gjs-route.js': `
              import Controller from '@ember/controller';

              export default class extends Controller {
                exampleControllerField = "This is on the controller";
              }
            `,
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
            `,
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
            `,
          },
        },
        tests: {
          acceptance: {
            'example-gjs-route-test.js': `
              import { module, test } from 'qunit';
              import { visit, currentURL } from '@ember/test-helpers';
              import { setupApplicationTest } from '${appName}/tests/helpers';

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
            `,
          },
          integration: {
            'tracked-built-ins-macro-test.gjs': `
              import { module, test } from 'qunit';
              import { TrackedArray } from 'tracked-built-ins';
              import { trackedArray } from '@ember/reactive/collections';

              module('tracked-built-ins', function () {
                test('it works', function (assert) {
                  assert.ok(new TrackedArray());
                  assert.ok(trackedArray());
                });
              });
            `,
            'destruction-test.gjs': `
              import { module, test } from 'qunit';
              import { clearRender, render } from '@ember/test-helpers';
              import { setupRenderingTest } from 'ember-qunit';
              import { destroy, registerDestructor } from '@ember/destroyable';

              import Component from '@glimmer/component';

              class WillDestroy extends Component {
                willDestroy() {
                  super.willDestroy();
                  this.args.onDestroy();
                }
              }

              class Destructor extends Component {
                constructor(...args) {
                  super(...args);

                  let onDestroy = this.args.onDestroy;
                  registerDestructor(this, () => onDestroy());
                }
              }

              module('@glimmer/component Destruction', function (hooks) {
                setupRenderingTest(hooks);

                module('after', function (hooks) {
                  hooks.after(function (assert) {
                    assert.verifySteps(['WillDestroy destroyed']);
                  });

                  test('it calls "@onDestroy"', async function (assert) {
                    const onDestroy = () => assert.step('WillDestroy destroyed');

                    await render(
                      <template><WillDestroy @onDestroy={{onDestroy}} /></template>
                    );
                  });
                });

                module('afterEach', function (hooks) {
                  hooks.afterEach(function (assert) {
                    assert.verifySteps(['WillDestroy destroyed']);
                  });

                  test('it calls "@onDestroy"', async function (assert) {
                    const onDestroy = () => assert.step('WillDestroy destroyed');

                    await render(
                      <template><WillDestroy @onDestroy={{onDestroy}} /></template>
                    );

                    destroy(this.owner);
                  });
                });

                test('it calls "@onDestroy"', async function (assert) {
                  const onDestroy = () => assert.step('destroyed');

                  await render(<template><WillDestroy @onDestroy={{onDestroy}} /></template>);

                  await clearRender();

                  assert.verifySteps(['destroyed']);
                });

                test('it calls "registerDestructor"', async function (assert) {
                  const onDestroy = () => assert.step('destroyed');

                  await render(<template><Destructor @onDestroy={{onDestroy}} /></template>);

                  await clearRender();

                  assert.verifySteps(['destroyed']);
                });
              });
            `,
            'interactive-example-test.js': `
              import { module, test } from 'qunit';
              import { setupRenderingTest } from 'ember-qunit';
              import { render, click } from '@ember/test-helpers';
              import { template } from '@ember/template-compiler';
              import InteractiveExample from '${appName}/components/interactive-example';

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
            `,
          },
        },
      });
    })
    .forEachScenario((scenario) => {
      Qmodule(scenario.name, function (hooks) {
        let app: PreparedApp;
        hooks.before(async () => {
          app = await scenario.prepare();
        });

        test(`ember test`, async function (assert) {
          let result = await app.execute(`pnpm test:ember`);
          assert.equal(result.exitCode, 0, result.output);
        });
      });
    });
}

basicTest(v1AppScenarios, 'ember-test-app');
basicTest(v2AppScenarios, 'v2-app-template');
