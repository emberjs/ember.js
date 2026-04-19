import { strictAppScenarios } from './scenarios';
import type { PreparedApp } from 'scenario-tester';
import * as QUnit from 'qunit';
const { module: Qmodule, test } = QUnit;

// Companion to `basic-test.ts`: builds a full v2 app wired up with the
// strict resolver (modules: { ...import.meta.glob(...) }) and exercises
// Ember's auto-generated loading/error substates through real route
// transitions. Covers:
//
//   - visiting /                       (plain route + template)
//   - visiting /slow                   (async model -> loading substate)
//   - visiting /broken                 (rejected model -> error substate)
//   - visiting a nested dynamic route  (posts/:post_id) to prove the
//     resolver handles sub-route templates via default lookup
strictAppScenarios
  .map('strict-resolver-substates', (project) => {
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
              ...import.meta.glob('./controllers/**/*.{js,ts}', { eager: true }),
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
            this.route('slow');
            this.route('broken');
            this.route('posts', function () {
              this.route('show', { path: '/:post_id' });
            });
          });
        `,
        services: {
          // A controllable gate for /slow's model. Tests call hold() to
          // receive a promise and release() to resolve it — that lets the
          // loading substate observably appear before the main template.
          'gate.js': `
            import Service from '@ember/service';

            export default class GateService extends Service {
              _resolve = null;

              hold() {
                return new Promise((resolve) => {
                  this._resolve = resolve;
                });
              }

              release() {
                if (this._resolve) {
                  this._resolve();
                  this._resolve = null;
                }
              }
            }
          `,
        },
        routes: {
          'index.js': `
            import Route from '@ember/routing/route';
            export default class extends Route {
              model() {
                return { welcome: 'Welcome to the strict app' };
              }
            }
          `,
          'slow.js': `
            import Route from '@ember/routing/route';
            import { service } from '@ember/service';

            export default class extends Route {
              @service gate;

              async model() {
                await this.gate.hold();
                return { message: 'Slow route ready' };
              }
            }
          `,
          'broken.js': `
            import Route from '@ember/routing/route';
            export default class extends Route {
              model() {
                return Promise.reject(new Error('intentional model failure'));
              }
            }
          `,
          'posts.js': `
            import Route from '@ember/routing/route';
            export default class extends Route {
              model() {
                return [
                  { id: 1, title: 'First Post' },
                  { id: 2, title: 'Second Post' },
                ];
              }
            }
          `,
          'posts': {
            'show.js': `
              import Route from '@ember/routing/route';
              export default class extends Route {
                model(params) {
                  return { id: params.post_id, title: 'Post ' + params.post_id };
                }
              }
            `,
          },
        },
        templates: {
          'application.hbs': `
            <div data-test="app-shell">
              {{outlet}}
            </div>
          `,
          'index.hbs': `
            <div data-test="index-welcome">{{@model.welcome}}</div>
          `,
          'slow.hbs': `
            <div data-test="slow-ready">{{@model.message}}</div>
          `,
          // Auto-generated loading substate for /slow. Ember will resolve
          // template:slow_loading -> slow-loading -> templates/slow-loading.
          'slow-loading.hbs': `
            <div data-test="slow-loading">Loading slow route...</div>
          `,
          // Auto-generated error substate for /broken. The error model is
          // the thrown value, so we render its .message to prove the
          // template received it.
          'broken-error.hbs': `
            <div data-test="broken-error">Caught error: {{@model.message}}</div>
          `,
          'posts.hbs': `
            <div data-test="posts-list">
              {{#each @model as |post|}}
                <div data-test="post-card">{{post.title}}</div>
              {{/each}}
            </div>
            {{outlet}}
          `,
          'posts': {
            'show.hbs': `
              <div data-test="post-detail">{{@model.title}}</div>
            `,
          },
        },
      },
      tests: {
        acceptance: {
          'strict-resolver-substates-test.js': `
            import { module, test } from 'qunit';
            import { visit, currentURL, waitUntil } from '@ember/test-helpers';
            import { setupApplicationTest } from 'v2-app-template/tests/helpers';

            module('Acceptance | strict resolver substates', function (hooks) {
              setupApplicationTest(hooks);

              test('visiting / renders the index template', async function (assert) {
                await visit('/');
                assert.strictEqual(currentURL(), '/');
                assert.dom('[data-test="app-shell"]').exists();
                assert.dom('[data-test="index-welcome"]').hasText(
                  'Welcome to the strict app'
                );
              });

              test('visiting /slow shows the loading substate while the model is pending', async function (assert) {
                let gate = this.owner.lookup('service:gate');

                // Don't await — the model is blocked on gate.release(),
                // so awaiting visit directly would hang.
                let visitPromise = visit('/slow');

                // Poll the DOM (doesn't depend on settled) until the
                // loading substate appears. If the resolver can't find
                // ./templates/slow-loading.hbs this will time out.
                await waitUntil(
                  () => document.querySelector('[data-test="slow-loading"]'),
                  { timeout: 2000 }
                );

                assert.dom('[data-test="slow-loading"]').exists(
                  'loading substate template is rendered'
                );
                assert.dom('[data-test="slow-ready"]').doesNotExist(
                  'main template is not yet rendered'
                );

                gate.release();
                await visitPromise;

                assert.strictEqual(currentURL(), '/slow');
                assert.dom('[data-test="slow-ready"]').hasText(
                  'Slow route ready'
                );
                assert.dom('[data-test="slow-loading"]').doesNotExist(
                  'loading substate is replaced once the model resolves'
                );
              });

              test('visiting /broken shows the error substate when the model rejects', async function (assert) {
                await visit('/broken');

                assert.dom('[data-test="broken-error"]').exists(
                  'error substate template is rendered'
                );
                assert.dom('[data-test="broken-error"]').hasText(
                  'Caught error: intentional model failure'
                );
              });

              test('visiting /posts renders the list', async function (assert) {
                await visit('/posts');
                assert.strictEqual(currentURL(), '/posts');
                assert.dom('[data-test="posts-list"]').exists();
                assert.dom('[data-test="post-card"]').exists({ count: 2 });
              });

              test('visiting a nested dynamic sub-route renders the detail template', async function (assert) {
                await visit('/posts/42');
                assert.strictEqual(currentURL(), '/posts/42');
                assert.dom('[data-test="post-detail"]').hasText('Post 42');
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
