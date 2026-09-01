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
              this.route('child', function () {
                this.route('grandchild');
              });
            });
          });
        `,
        services: {
          'flow.js': `
            import Service from '@ember/service';

            export default class FlowService extends Service {
              starts = [];
              settles = [];
              _resolvers = {};
              _released = {};

              hold(key) {
                this.starts.push(key);

                if (this._released[key]) {
                  delete this._released[key];
                  return Promise.resolve().then(() => this.settles.push(key));
                }

                let pending = new Promise((resolve) => {
                  this._resolvers[key] = resolve;
                });

                return pending.then(() => this.settles.push(key));
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

              reset() {
                this.starts.length = 0;
                this.settles.length = 0;
                this._resolvers = {};
                this._released = {};
              }
            }
          `,
        },
        components: {
          'pioneer-components.gjs': `
            import { LinkTo } from '@ember/routing';

            export const PioneerOutlet = <template>
              <@Component @context={{@context}} @outlet={{@outlet}} />
            </template>;

            export const ApplicationComponent = <template>
              <LinkTo
                @route="parent.child.grandchild"
                data-test-deep-link
              >Deep route</LinkTo>
              <div data-test="application">{{@context.name}}</div>
              {{outlet}}
            </template>;

            export const ParentComponent = <template>
              <div data-test="parent">{{@context.name}}</div>
              {{outlet}}
            </template>;

            export const ChildComponent = <template>
              <div data-test="child">{{@context.name}}</div>
              {{outlet}}
            </template>;

            export const GrandchildComponent = <template>
              <div data-test="grandchild">{{@context.name}}</div>
            </template>;
          `,
        },
        'route-managers': {
          'pioneer.js': `
            import { routeCapabilities } from '@ember/routing';
            import {
              ApplicationComponent,
              ChildComponent,
              GrandchildComponent,
              ParentComponent,
              PioneerOutlet,
            } from '${appName}/components/pioneer-components';

            const ROUTES = {
              application: ApplicationComponent,
              parent: ParentComponent,
              'parent.child': ChildComponent,
              'parent.child.grandchild': GrandchildComponent,
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

              async enter(bucket, state) {
                let self = state.to.find((routeInfo) => routeInfo.name === bucket.name);
                let parent = self?.parent ?? null;
                let parentPromise = parent
                  ? state.getAncestorPromise(parent)
                  : Promise.resolve(undefined);

                return bucket.route.model(parentPromise);
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
          'application.js': `
            import { service } from '@ember/service';
            import PioneerRoute from '${appName}/routes/pioneer';

            export default class extends PioneerRoute {
              @service flow;

              async model() {
                await this.flow.hold('application');
                return { name: 'application' };
              }
            }
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
            child: {
              'grandchild.js': `
                import { service } from '@ember/service';
                import PioneerRoute from '${appName}/routes/pioneer';

                export default class extends PioneerRoute {
                  @service flow;

                  async model(parentPromise) {
                    await parentPromise;
                    await this.flow.hold('grandchild');
                    return { name: 'grandchild' };
                  }
                }
              `,
            },
          },
        },
      },
      tests: {
        acceptance: {
          'pioneer-route-timing-test.js': `
            import { module, test } from 'qunit';
            import { click, settled, visit, waitUntil } from '@ember/test-helpers';
            import { setupApplicationTest } from '${appName}/tests/helpers';

            async function assertLoadingOrder(assert, flow, expected, navigate) {
              let navigation = navigate();

              await waitUntil(() => flow.starts.length === expected.length, { timeout: 2000 });

              assert.deepEqual(
                flow.starts.slice(),
                expected,
                'independent models started together'
              );
              assert.false(
                flow.starts.includes('grandchild'),
                'the dependent model waited for its parent'
              );

              flow.release('child');
              await waitUntil(() => flow.starts.includes('grandchild'), { timeout: 2000 });

              assert.true(
                flow.starts.includes('grandchild'),
                'the dependent model started after its parent settled'
              );
              assert.false(
                flow.settles.includes('parent'),
                'the dependent model did not wait for an unrelated route'
              );

              flow.release('application');
              flow.release('parent');
              flow.release('grandchild');
              await navigation;
              await settled();
            }

            module('Acceptance | pioneer route timing', function (hooks) {
              setupApplicationTest(hooks);

              hooks.afterEach(async function () {
                let flow = this.owner.lookup('service:flow');

                flow.release('application');
                flow.release('parent');
                flow.release('child');
                flow.release('grandchild');
                await settled();
              });

              test('direct visits preserve model loading dependencies', async function (assert) {
                await assertLoadingOrder(
                  assert,
                  this.owner.lookup('service:flow'),
                  ['application', 'parent', 'child'],
                  () => visit('/parent/child/grandchild')
                );
              });

              test('LinkTo transitions preserve model loading dependencies', async function (assert) {
                let flow = this.owner.lookup('service:flow');
                let initialVisit = visit('/');

                await waitUntil(() => flow.starts.includes('application'));
                flow.release('application');
                await initialVisit;
                flow.reset();

                await assertLoadingOrder(
                  assert,
                  flow,
                  ['parent', 'child'],
                  () => click('[data-test-deep-link]')
                );
              });

              test('direct visits render a wrapper only after its route resolves', async function (assert) {
                let flow = this.owner.lookup('service:flow');
                let navigation = visit('/parent/child/grandchild');

                await waitUntil(() => flow.starts.length === 3, { timeout: 2000 });

                assert
                  .dom('[data-test="application"]')
                  .doesNotExist('the unresolved root route has no wrapper');

                flow.release('application');
                await waitUntil(() => document.querySelector('[data-test="application"]'));

                assert.dom('[data-test="application"]').hasText('application');
                assert
                  .dom('[data-test="parent"]')
                  .doesNotExist('the unresolved parent route has no wrapper');

                flow.release('parent');
                await waitUntil(() => document.querySelector('[data-test="parent"]'));

                assert.dom('[data-test="parent"]').hasText('parent');
                assert
                  .dom('[data-test="child"]')
                  .doesNotExist('the unresolved child route has no wrapper');

                flow.release('child');
                await waitUntil(() => document.querySelector('[data-test="child"]'));

                assert.dom('[data-test="child"]').hasText('child');
                assert
                  .dom('[data-test="grandchild"]')
                  .doesNotExist('the unresolved grandchild route has no wrapper');

                flow.release('grandchild');
                await navigation;
                await settled();

                assert.dom('[data-test="grandchild"]').hasText('grandchild');
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
