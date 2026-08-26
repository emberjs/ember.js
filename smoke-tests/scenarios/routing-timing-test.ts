import { strictAppScenarios } from './scenarios';
import type { PreparedApp } from 'scenario-tester';
import * as QUnit from 'qunit';
const { module: Qmodule, test } = QUnit;

strictAppScenarios
  .map('routing-timing', (project) => {
    project.mergeFiles({
      app: {
        'app.js': `
          import Application from '@ember/application';
          import Router from './router';

          export default class App extends Application {
            modules = {
              './router': { default: Router },
              ...import.meta.glob('./services/**/*.{js,ts}', { eager: true }),
              ...import.meta.glob('./routes/**/*.{js,ts}', { eager: true }),
              ...import.meta.glob('./templates/**/*.hbs', { eager: true }),
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
            this.route('parent', function () {
              this.route('child');
            });
          });
        `,
        services: {
          'flow.js': `
            import Service from '@ember/service';

            export default class FlowService extends Service {
              starts = [];
              _resolvers = {};
              _released = {};

              hold(key) {
                this.starts.push(key);

                if (this._released[key]) {
                  delete this._released[key];
                  return Promise.resolve();
                }

                return new Promise((resolve) => {
                  this._resolvers[key] = resolve;
                });
              }

              release(key) {
                let resolve = this._resolvers[key];

                if (resolve) {
                  delete this._resolvers[key];
                  resolve();
                } else {
                  this._released[key] = true;
                }
              }
            }
          `,
        },
        routes: {
          'parent.js': `
            import Route from '@ember/routing/route';
            import { service } from '@ember/service';

            export default class extends Route {
              @service flow;

              async model() {
                await this.flow.hold('parent');
                return { name: 'parent' };
              }
            }
          `,
          parent: {
            'child.js': `
              import Route from '@ember/routing/route';
              import { service } from '@ember/service';

              export default class extends Route {
                @service flow;

                async model() {
                  await this.flow.hold('child');
                  return { name: 'child', ancestor: this.modelFor('parent').name };
                }
              }
            `,
          },
        },
        templates: {
          'application.hbs': `
            <div data-test="app-shell">{{outlet}}</div>
          `,
          'parent.hbs': `
            <div data-test="parent">{{@model.name}}{{outlet}}</div>
          `,
          parent: {
            'child.hbs': `
              <div data-test="child">{{@model.name}}</div>
              <div data-test="child-ancestor">{{@model.ancestor}}</div>
            `,
          },
        },
      },
      tests: {
        acceptance: {
          'routing-timing-test.js': `
            import { module, test } from 'qunit';
            import { settled, visit, waitUntil } from '@ember/test-helpers';
            import { setupApplicationTest } from 'v2-app-template/tests/helpers';

            module('Acceptance | routing timing', function (hooks) {
              setupApplicationTest(hooks);

              test('a descendant model does not start while its ancestor model is pending', async function (assert) {
                let flow = this.owner.lookup('service:flow');

                visit('/parent/child');

                try {
                  await waitUntil(() => flow.starts.length === 2, { timeout: 2000 });
                } catch (e) {
                  // Fall through: the snapshot below reports what did start.
                }

                let startedWhilePending = flow.starts.slice();

                flow.release('parent');
                flow.release('child');
                await settled();

                assert.deepEqual(
                  startedWhilePending,
                  ['parent'],
                  'only the ancestor model had started'
                );
              });

              test('a child route reads its ancestor model through modelFor', async function (assert) {
                let flow = this.owner.lookup('service:flow');

                visit('/parent/child');

                await waitUntil(() => flow.starts.length >= 1, { timeout: 2000 });
                assert
                  .dom('[data-test="child"]')
                  .doesNotExist('not rendered while the ancestor model is pending');

                flow.release('parent');

                await waitUntil(() => flow.starts.length === 2, { timeout: 2000 });
                assert
                  .dom('[data-test="child"]')
                  .doesNotExist('not rendered while its own model is pending');

                flow.release('child');
                await settled();

                assert
                  .dom('[data-test="child-ancestor"]')
                  .hasText('parent', 'modelFor returned the ancestor model');
              });

              test('a child route waits for its ancestor even when released first', async function (assert) {
                let flow = this.owner.lookup('service:flow');

                flow.release('child');

                visit('/parent/child');

                await waitUntil(() => flow.starts.length >= 1, { timeout: 2000 });

                assert.deepEqual(
                  flow.starts.slice(),
                  ['parent'],
                  'the child model had not started'
                );
                assert
                  .dom('[data-test="child"]')
                  .doesNotExist('not rendered while the ancestor model is pending');

                flow.release('parent');
                await settled();

                assert
                  .dom('[data-test="child-ancestor"]')
                  .hasText('parent', 'modelFor returned the ancestor model');
              });

              test('a route does not render while its own model is pending', async function (assert) {
                let flow = this.owner.lookup('service:flow');

                visit('/parent/child');

                await waitUntil(() => flow.starts.length >= 1, { timeout: 2000 });

                let renderedWhilePending = Boolean(
                  document.querySelector('[data-test="parent"]')
                );

                flow.release('parent');
                flow.release('child');
                await settled();

                assert.false(renderedWhilePending, 'the ancestor had not rendered');
                assert.dom('[data-test="child"]').hasText('child');
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

      test('ember test', async function (assert) {
        let result = await app.execute('pnpm test');
        assert.equal(result.exitCode, 0, result.output);
      });
    });
  });
