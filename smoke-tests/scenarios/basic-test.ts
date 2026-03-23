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

                louder = () => {
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
            'debug-render-tree-test.gjs': `
              import { module, test } from 'qunit';
              import { setupRenderingTest } from 'ember-qunit';
              import { render } from '@ember/test-helpers';
              import { captureRenderTree } from '@ember/debug';
              import Component from '@glimmer/component';

              function flattenTree(nodes) {
                let result = [];
                for (let node of nodes) {
                  result.push(node);
                  if (node.children) {
                    result.push(...flattenTree(node.children));
                  }
                }
                return result;
              }

              class HelloWorld extends Component {
                <template>{{@arg}}</template>
              }

              module('Integration | captureRenderTree', function (hooks) {
                setupRenderingTest(hooks);

                test('scope-based components have correct names in debugRenderTree', async function (assert) {
                  await render(<template><HelloWorld @arg="first" /></template>);

                  let tree = captureRenderTree(this.owner);
                  let allNodes = flattenTree(tree);
                  let names = allNodes.filter(n => n.type === 'component').map(n => n.name);
                  assert.true(names.includes('HelloWorld'), 'HelloWorld component name is preserved in the render tree (found: ' + names.join(', ') + ')');
                });
              });
            `,
            'on-as-keyword-test.gjs': `
              import { module, test } from 'qunit';
              import { setupRenderingTest } from 'ember-qunit';
              import { render, click } from '@ember/test-helpers';

              import Component from '@glimmer/component';
              import { tracked } from '@glimmer/tracking';

              class Demo extends Component {
                @tracked message = 'hello';
                louder = () => this.message = this.message + '!';

                <template>
                  <button {{on 'click' this.louder}}>{{this.message}}</button>
                </template>
              }

              module('{{on}} as keyword', function(hooks) {
                setupRenderingTest(hooks);

                test('it works', async function(assert) {
                  await render(Demo);
                  assert.dom('button').hasText('hello');
                  await click('button');
                  assert.dom('button').hasText('hello!');
                });
              });
            `,
            'helper-keywords-test.gjs': `
              import { module, test } from 'qunit';
              import { setupRenderingTest } from 'ember-qunit';
              import { render } from '@ember/test-helpers';

              import Component from '@glimmer/component';
              import { tracked } from '@glimmer/tracking';

              class FnDemo extends Component {
                greet = (name) => 'Hello, ' + name + '!';

                <template>
                  {{#let (fn this.greet "World") as |sayHello|}}
                    <span id="fn-result">{{sayHello}}</span>
                  {{/let}}
                </template>
              }

              class HashDemo extends Component {
                <template>
                  {{#let (hash name="Ember" version="6") as |obj|}}
                    <span id="hash-result">{{obj.name}} {{obj.version}}</span>
                  {{/let}}
                </template>
              }

              class ArrayDemo extends Component {
                <template>
                  {{#each (array "a" "b" "c") as |item|}}
                    <span class="array-item">{{item}}</span>
                  {{/each}}
                </template>
              }

              class EqDemo extends Component {
                @tracked status = 'active';

                <template>
                  <span id="eq-result">{{if (eq this.status "active") "yes" "no"}}</span>
                </template>
              }

              class LogicalDemo extends Component {
                <template>
                  <span id="and-result">{{if (and true true) "yes" "no"}}</span>
                  <span id="or-result">{{if (or false true) "yes" "no"}}</span>
                  <span id="not-result">{{if (not false) "yes" "no"}}</span>
                </template>
              }

              class ComparisonDemo extends Component {
                <template>
                  <span id="lt-result">{{if (lt 1 2) "yes" "no"}}</span>
                  <span id="gt-result">{{if (gt 2 1) "yes" "no"}}</span>
                </template>
              }

              module('helper keywords', function(hooks) {
                setupRenderingTest(hooks);

                test('fn works as keyword', async function(assert) {
                  await render(FnDemo);
                  assert.dom('#fn-result').hasText('Hello, World!');
                });

                test('hash works as keyword', async function(assert) {
                  await render(HashDemo);
                  assert.dom('#hash-result').hasText('Ember 6');
                });

                test('array works as keyword', async function(assert) {
                  await render(ArrayDemo);
                  assert.dom('.array-item').exists({ count: 3 });
                });

                test('eq works as keyword', async function(assert) {
                  await render(EqDemo);
                  assert.dom('#eq-result').hasText('yes');
                });

                test('logical operators work as keywords', async function(assert) {
                  await render(LogicalDemo);
                  assert.dom('#and-result').hasText('yes');
                  assert.dom('#or-result').hasText('yes');
                  assert.dom('#not-result').hasText('yes');
                });

                test('comparison operators work as keywords', async function(assert) {
                  await render(ComparisonDemo);
                  assert.dom('#lt-result').hasText('yes');
                  assert.dom('#gt-result').hasText('yes');
                });
              });
            `,
            'on-as-keyword-but-its-shadowed-test.gjs': `
              import QUnit, { module, test } from 'qunit';
              import { setupRenderingTest } from 'ember-qunit';
              import { render, click } from '@ember/test-helpers';

              import Component from '@glimmer/component';
              import { tracked } from '@glimmer/tracking';
              import { modifier as eModifier } from 'ember-modifier';

              module('{{on}} as keyword (but it is shadowed)', function(hooks) {
                setupRenderingTest(hooks);

                test('it works', async function(assert) {
                  // shadows keyword!
                  const on = eModifier(() => {
                    assert.step('shadowed:on:create');
                  });

                  class Demo extends Component {
                    @tracked message = 'hello';
                    louder = () => this.message = this.message + '!';

                    <template>
                      <button {{on 'click' this.louder}}>{{this.message}}</button>
                    </template>
                  }

                  await render(Demo);
                  assert.verifySteps(['shadowed:on:create']);

                  assert.dom('button').hasText('hello');
                  await click('button');
                  assert.dom('button').hasText('hello', 'not changed because this on modifier does not add event listeners');

                  assert.verifySteps([]);
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
          let result = await app.execute(`pnpm test`);
          assert.equal(result.exitCode, 0, result.output);
        });
      });
    });
}

basicTest(v1AppScenarios, 'ember-test-app');
basicTest(v2AppScenarios, 'v2-app-template');
