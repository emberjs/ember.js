import { v1AppScenarios } from './scenarios';
import type { PreparedApp } from 'scenario-tester';
import * as QUnit from 'qunit';
const { module: Qmodule, test } = QUnit;

const appName = 'ember-test-app';

v1AppScenarios
  .only('classic')
  .map('pioneer-route-timing', (project) => {
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
        components: {
          'pioneer-components.gjs': `
            export const PioneerOutlet = <template>
              <@Component @context={{@context}} @outlet={{@outlet}} />
            </template>;

            export const ParentComponent = <template>
              <div data-test="parent">{{@context.name}}</div>
              {{outlet}}
            </template>;

            export const ChildComponent = <template>
              <div data-test="child">{{@context.name}}</div>
            </template>;
          `,
        },
        'route-managers': {
          'pioneer.js': `
            import { routeCapabilities } from '@ember/routing';
            import {
              ChildComponent,
              ParentComponent,
              PioneerOutlet,
            } from '${appName}/components/pioneer-components';

            const ROUTES = {
              parent: ParentComponent,
              'parent.child': ChildComponent,
            };

            class PioneerBucket {
              constructor(name, route, invokable) {
                this.name = name;
                this.route = route;
                this.invokable = invokable;
              }
            }

            export default class PioneerRouteManager {
              capabilities = routeCapabilities('1.0');

              constructor(owner) {
                this.owner = owner;
              }

              createRoute(RouteClass, { name }) {
                return new PioneerBucket(name, new RouteClass(this.owner), ROUTES[name]);
              }

              getDestroyable() {
                return null;
              }

              getRouteWrapper() {
                return PioneerOutlet;
              }

              willEnter() {}

              async enter(bucket) {
                return bucket.route.model();
              }

              didEnter() {}
              willExit() {}
              exit() {}
              didExit() {}

              async getInvokable(bucket) {
                return bucket.invokable;
              }
            }
          `,
        },
        routes: {
          'pioneer.js': `
            import { setOwner } from '@ember/owner';
            import { setRouteManager } from '@ember/routing';
            import PioneerRouteManager from '${appName}/route-managers/pioneer';

            export default class PioneerRoute {
              constructor(owner) {
                setOwner(this, owner);
              }
            }

            setRouteManager((owner) => new PioneerRouteManager(owner), PioneerRoute);
          `,
          'parent.js': `
            import { service } from '@ember/service';
            import PioneerRoute from '${appName}/routes/pioneer';

            export default class extends PioneerRoute {
              @service flow;

              async model() {
                await this.flow.hold('parent');
                return { name: 'parent' };
              }
            }
          `,
          parent: {
            'child.js': `
              import { service } from '@ember/service';
              import PioneerRoute from '${appName}/routes/pioneer';

              export default class extends PioneerRoute {
                @service flow;

                async model() {
                  await this.flow.hold('child');
                  return { name: 'child' };
                }
              }
            `,
          },
        },
      },
      tests: {
        acceptance: {
          'pioneer-route-timing-test.js': `
            import { module, test } from 'qunit';
            import { settled, visit, waitUntil } from '@ember/test-helpers';
            import { setupApplicationTest } from '${appName}/tests/helpers';

            module('Acceptance | pioneer route timing', function (hooks) {
              setupApplicationTest(hooks);

              test('a descendant model starts while its ancestor model is pending', async function (assert) {
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
                  ['parent', 'child'],
                  'the descendant loaded alongside its ancestor'
                );
              });

              test('a route does not render while its own model is pending', async function (assert) {
                let flow = this.owner.lookup('service:flow');

                visit('/parent/child');

                await waitUntil(() => flow.starts.length >= 1, { timeout: 2000 });

                assert
                  .dom('[data-test="parent"]')
                  .doesNotExist('the ancestor had not rendered');

                flow.release('parent');
                flow.release('child');
                await settled();

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
