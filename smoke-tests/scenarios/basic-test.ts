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
          unit: {
            'v1-addon-without-eai-test.js': `
              import { module, test } from 'qunit';
              import { accessGlimmerValidator } from 'v1-addon-without-eai';
              module('Acceptance | v1-addon-without-eai', function (hooks) {
                // a v1 addon without ember-auto-import needs to maintain access
                // to all the backward-compatible ember-provided packages, regardless
                // of our build environment and optional-features.
                test('can access things from ember', function(assert) {
                  assert.strictEqual(accessGlimmerValidator(), 'it works');
                })
              });
            `,
          },
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
            'element-helper-test.gjs': `
              import { module, test } from 'qunit';
              import { render } from '@ember/test-helpers';
              import { setupRenderingTest } from 'ember-qunit';
              import { element } from '@ember/helper';

              module('Integration | helper | element (strict mode)', function (hooks) {
                setupRenderingTest(hooks);

                test('it renders a dynamic tag in strict mode gjs', async function (assert) {
                  await render(
                    <template>
                      {{#let (element "h1") as |Tag|}}
                        <Tag data-test="element-helper">hello world!</Tag>
                      {{/let}}
                    </template>
                  );

                  assert.dom('[data-test="element-helper"]').hasText('hello world!');
                  assert.dom('h1[data-test="element-helper"]').exists();
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
            'on-modifier-error-test.gjs': `
              import { module, test } from 'qunit';
              import { render, setupOnerror, resetOnerror } from '@ember/test-helpers';
              import { setupRenderingTest } from 'ember-qunit';
              import { on } from '@ember/modifier';

              module('on modifier | error handling', function (hooks) {
                setupRenderingTest(hooks);

                hooks.afterEach(function () {
                  resetOnerror();
                });

                test('throws helpful error when callback is missing', async function (assert) {
                  assert.expect(1);
                  const noop = undefined;
                  setupOnerror((error) => {
                    assert.true(
                      /You must pass a function as the second argument to the \`on\` modifier/.test(error.message),
                      'Expected helpful error message, got: ' + error.message
                    );
                  });
                  await render(<template><div {{on "click" noop}}>Click</div></template>);
                });

                test('throws helpful error when event name is missing', async function (assert) {
                  assert.expect(1);
                  const noop = () => {};
                  setupOnerror((error) => {
                    assert.true(
                      /You must pass a valid DOM event name as the first argument to the \`on\` modifier/.test(error.message),
                      'Expected helpful error message, got: ' + error.message
                    );
                  });
                  await render(<template><div {{on}}>Click</div></template>);
                });

                test('error message includes element selector', async function (assert) {
                  assert.expect(1);
                  const noop = undefined;
                  setupOnerror((error) => {
                    assert.true(
                      /button#my-id\\.class1\\.class2/.test(error.message),
                      'Expected element selector in error, got: ' + error.message
                    );
                  });
                  await render(<template><button id="my-id" class="class1 class2" {{on "click" noop}}>Click</button></template>);
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
            'eq-neq-as-keyword-test.gjs': `
              import { module, test } from 'qunit';
              import { setupRenderingTest } from 'ember-qunit';
              import { render } from '@ember/test-helpers';

              module('{{eq}} / {{neq}} as keywords', function(hooks) {
                setupRenderingTest(hooks);

                test('it works', async function(assert) {
                  let a = 1;
                  let b = 1;

                  await render(
                    <template>
                      <span data-eq>{{eq a b}}</span>
                      <span data-neq>{{neq a b}}</span>
                    </template>
                  );

                  assert.dom('[data-eq]').hasText('true');
                  assert.dom('[data-neq]').hasText('false');
                });

                test('can be shadowed', async function (assert) {
                  let a = 1;
                  let b = 1;
                  let eq = () => 'surprise:eq';
                  let neq = () => 'surprise:neq';

                  await render(
                    <template>
                      <span data-eq>{{eq a b}}</span>
                      <span data-neq>{{neq a b}}</span>
                    </template>
                  );

                  assert.dom('[data-eq]').hasText('surprise:eq');
                  assert.dom('[data-neq]').hasText('surprise:neq');
                });
              });
            `,
            'fn-as-keyword-test.gjs': `
              import { module, test } from 'qunit';
              import { setupRenderingTest } from 'ember-qunit';
              import { render, click } from '@ember/test-helpers';

              import Component from '@glimmer/component';
              import { tracked } from '@glimmer/tracking';

              class Demo extends Component {
                @tracked message = 'hello';
                setMessage = (msg) => this.message = msg;

                <template>
                  <button {{on 'click' (fn this.setMessage 'goodbye')}}>{{this.message}}</button>
                </template>
              }

              module('{{fn}} as keyword', function(hooks) {
                setupRenderingTest(hooks);

                test('it works', async function(assert) {
                  await render(Demo);
                  assert.dom('button').hasText('hello');
                  await click('button');
                  assert.dom('button').hasText('goodbye');
                });
              });
            `,
            'fn-as-keyword-but-its-shadowed-test.gjs': `
              import QUnit, { module, test } from 'qunit';
              import { setupRenderingTest } from 'ember-qunit';
              import { render, click } from '@ember/test-helpers';

              import Component from '@glimmer/component';
              import { tracked } from '@glimmer/tracking';

              module('{{fn}} as keyword (but it is shadowed)', function(hooks) {
                setupRenderingTest(hooks);

                test('it works', async function(assert) {
                  // shadows keyword!
                  const fn = () => {
                    assert.step('shadowed:fn:invoke');
                    return () => {};
                  };

                  class Demo extends Component {
                    @tracked message = 'hello';
                    setMessage = (msg) => this.message = msg;

                    <template>
                      <button {{on 'click' (fn this.setMessage 'goodbye')}}>{{this.message}}</button>
                    </template>
                  }

                  await render(Demo);
                  assert.verifySteps(['shadowed:fn:invoke']);

                  assert.dom('button').hasText('hello');
                  await click('button');
                  assert.dom('button').hasText('hello', 'not changed because the shadowed fn returns a no-op');

                  assert.verifySteps([]);
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
            'hash-as-keyword-test.gjs': `
              import { module, test } from 'qunit';
              import { setupRenderingTest } from 'ember-qunit';
              import { render, click } from '@ember/test-helpers';

              import Component from '@glimmer/component';
              import { tracked } from '@glimmer/tracking';

              class Demo extends Component {
                @tracked data = null;
                setData = (d) => this.data = d;

                <template>
                  <button {{on 'click' (fn this.setData (hash greeting="hello" farewell="goodbye"))}}>
                    {{#if this.data}}
                      {{this.data.greeting}} {{this.data.farewell}}
                    {{else}}
                      click me
                    {{/if}}
                  </button>
                </template>
              }

              module('{{hash}} as keyword', function(hooks) {
                setupRenderingTest(hooks);

                test('it works', async function(assert) {
                  await render(Demo);
                  assert.dom('button').hasText('click me');
                  await click('button');
                  assert.dom('button').hasText('hello goodbye');
                });
              });
            `,
            'hash-as-keyword-shadowed-test.gjs': `
              import { module, test } from 'qunit';
              import { setupRenderingTest } from 'ember-qunit';
              import { render } from '@ember/test-helpers';

              module('{{hash}} as keyword (shadowed)', function(hooks) {
                setupRenderingTest(hooks);

                test('it works', async function(assert) {
                  const hash = (data) => data;
                  await render(<template>{{hash "hello"}}</template>);
                  assert.dom().hasText('hello');
                });
              });
            `,
            'array-as-keyword-test.gjs': `
              import { module, test } from 'qunit';
              import { setupRenderingTest } from 'ember-qunit';
              import { render } from '@ember/test-helpers';

              module('{{array}} as keyword', function(hooks) {
                setupRenderingTest(hooks);

                test('it works', async function(assert) {
                  await render(
                    <template>
                      {{JSON.stringify (array "hello" "goodbye")}}
                    </template>
                  );
                  assert.dom().hasText('["hello","goodbye"]');
                });
              });
            `,
            'array-as-keyword-shadowed-test.gjs': `
              import { module, test } from 'qunit';
              import { setupRenderingTest } from 'ember-qunit';
              import { render } from '@ember/test-helpers';

              module('{{array}} as keyword (shadowed)', function(hooks) {
                setupRenderingTest(hooks);

                test('it works', async function(assert) {
                  const array = (data) => data;
                  await render(<template>{{array "hello"}}</template>);
                  assert.dom().hasText('hello');
                });
              });
            `,
          },
        },
      });

      let v1AddonWithoutEAI = project.addDependency('v1-addon-without-eai');
      v1AddonWithoutEAI.pkg.keywords = ['ember-addon'];
      v1AddonWithoutEAI.linkDependency('ember-cli-babel', { baseDir: __dirname } );
      v1AddonWithoutEAI.mergeFiles({
        'index.js': 'module.exports = { name: "v1-addon-without-eai" }',
        addon: {
          'index.js': `
            import { consumeTag } from '@glimmer/validator';
            export function accessGlimmerValidator() {
              if (typeof consumeTag === 'function') {
                return "it works"
              }
            }
          `
        }
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
