import { strictAppScenarios } from './scenarios';
import type { PreparedApp } from 'scenario-tester';
import * as QUnit from 'qunit';
const { module: Qmodule, test } = QUnit;

strictAppScenarios
  .map('strict-resolver', (project) => {
    project.mergeFiles({
      app: {
        'app.js': `
          import Application from '@ember/application';
          import Router from './router';
          import config from 'v2-app-template/config/environment';

          export default class App extends Application {
            modulePrefix = config.modulePrefix;

            modules = {
              './router': { default: Router },
              ...import.meta.glob('./services/**/*', { eager: true }),
              ...import.meta.glob('./controllers/**/*', { eager: true }),
              ...import.meta.glob('./routes/**/*', { eager: true }),
              ...import.meta.glob('./components/**/*', { eager: true }),
              ...import.meta.glob('./helpers/**/*', { eager: true }),
              ...import.meta.glob('./templates/**/*', { eager: true }),
            };
          }
        `,
        'router.js': `
          import EmberRouter from '@embroider/router';
          import config from 'v2-app-template/config/environment';

          export default class Router extends EmberRouter {
            location = config.locationType;
            rootURL = config.rootURL;
          }

          Router.map(function () {
            this.route('strict-example');
          });
        `,
        services: {
          'greeter.js': `
            import Service from '@ember/service';

            export default class GreeterService extends Service {
              greeting = 'Hello from strict resolver!';
            }
          `,
        },
        routes: {
          'strict-example.js': `
            import Route from '@ember/routing/route';
            export default class extends Route {
              model() {
                return { message: 'strict model data' };
              }
            }
          `,
        },
        controllers: {
          'strict-example.js': `
            import Controller from '@ember/controller';
            import { service } from '@ember/service';

            export default class extends Controller {
              @service greeter;
            }
          `,
        },
        templates: {
          'strict-example.gjs': `
            <template>
              <div data-test="model">{{@model.message}}</div>
              <div data-test="greeting">{{@controller.greeter.greeting}}</div>
            </template>
          `,
        },
      },
      tests: {
        acceptance: {
          'strict-resolver-test.js': `
            import { module, test } from 'qunit';
            import { visit, currentURL } from '@ember/test-helpers';
            import { setupApplicationTest } from 'v2-app-template/tests/helpers';

            module('Acceptance | strict resolver', function (hooks) {
              setupApplicationTest(hooks);

              test('visiting /strict-example resolves route, controller, template, and service', async function (assert) {
                await visit('/strict-example');
                assert.strictEqual(currentURL(), '/strict-example');
                assert.dom('[data-test="model"]').hasText('strict model data');
                assert.dom('[data-test="greeting"]').hasText('Hello from strict resolver!');
              });
            });
          `,
        },
        unit: {
          'strict-resolver-unit-test.js': `
            import { module, test } from 'qunit';
            import { setupTest } from 'v2-app-template/tests/helpers';

            module('Unit | strict resolver', function (hooks) {
              setupTest(hooks);

              test('can lookup a service registered via modules', function (assert) {
                let greeter = this.owner.lookup('service:greeter');
                assert.ok(greeter, 'service was found');
                assert.strictEqual(greeter.greeting, 'Hello from strict resolver!');
              });

              test('can register and lookup custom factories', function (assert) {
                class Foo {
                  static create() { return new this(); }
                  value = 42;
                }

                this.owner.register('custom:foo', Foo);
                let foo = this.owner.lookup('custom:foo');
                assert.strictEqual(foo.value, 42);
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
