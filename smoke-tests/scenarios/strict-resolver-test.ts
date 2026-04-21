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
              ...import.meta.glob('./services/**/*.{js,ts}', { eager: true }),
              ...import.meta.glob('./controllers/**/*.{js,ts}', { eager: true }),
              ...import.meta.glob('./routes/**/*.{js,ts}', { eager: true }),
              ...import.meta.glob('./components/**/*.{gjs,gts,js,ts}', { eager: true }),
              ...import.meta.glob('./helpers/**/*.{js,ts}', { eager: true }),
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
            this.route('posts', function () {
              this.route('show', { path: '/:post_id' });
            });
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
          'index.js': `
            import Route from '@ember/routing/route';
            export default class extends Route {
              model() {
                return { welcome: 'Welcome to the strict app' };
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
        controllers: {
          'application.js': `
            import Controller from '@ember/controller';
            import { service } from '@ember/service';

            export default class extends Controller {
              @service greeter;
            }
          `,
        },
        components: {
          'site-header.gjs': `
            <template>
              <header data-test="site-header">
                <h1>{{@title}}</h1>
              </header>
            </template>
          `,
          'post-card.gjs': `
            import Component from '@glimmer/component';

            export default class PostCard extends Component {
              <template>
                <article data-test="post-card">
                  <h2>{{@post.title}}</h2>
                </article>
              </template>
            }
          `,
        },
        templates: {
          'application.hbs': `
            <div data-test="app-greeting">{{this.greeter.greeting}}</div>
            <SiteHeader @title="Strict App" />
            {{outlet}}
          `,
          'index.hbs': `
            <div data-test="index-welcome">{{@model.welcome}}</div>
          `,
          'posts.hbs': `
            <div data-test="posts">
              {{#each @model as |post|}}
                <PostCard @post={{post}} />
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
          'strict-resolver-test.js': `
            import { module, test } from 'qunit';
            import { visit, currentURL } from '@ember/test-helpers';
            import { setupApplicationTest } from 'v2-app-template/tests/helpers';

            module('Acceptance | strict resolver', function (hooks) {
              setupApplicationTest(hooks);

              test('index route renders with model', async function (assert) {
                await visit('/');
                assert.strictEqual(currentURL(), '/');
                assert.dom('[data-test="index-welcome"]').hasText('Welcome to the strict app');
              });

              test('application template renders with service injection', async function (assert) {
                await visit('/');
                assert.dom('[data-test="app-greeting"]').hasText('Hello from strict resolver!');
              });

              test('template-only gjs component resolves from modules', async function (assert) {
                await visit('/');
                assert.dom('[data-test="site-header"]').exists();
                assert.dom('[data-test="site-header"] h1').hasText('Strict App');
              });

              test('sub-route with nested model renders a gjs component per item', async function (assert) {
                await visit('/posts');
                assert.strictEqual(currentURL(), '/posts');
                assert.dom('[data-test="post-card"]').exists({ count: 2 });
                assert.dom('[data-test="post-card"] h2').exists(
                  'PostCard gjs template renders inside the nested route'
                );
              });

              test('dynamic segment sub-route', async function (assert) {
                await visit('/posts/42');
                assert.strictEqual(currentURL(), '/posts/42');
                assert.dom('[data-test="post-detail"]').hasText('Post 42');
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
