import { v1AppScenarios } from './scenarios';
import type { PreparedApp } from 'scenario-tester';
import * as QUnit from 'qunit';
const { module: Qmodule, test } = QUnit;

const appName = 'ember-test-app';

const classicRoute = (className: string, name: string) => `
  import Route from '@ember/routing/route';
  import { service } from '@ember/service';

  export default class ${className} extends Route {
    @service flow;

    async beforeModel() {
      await this.flow.hold('${name}:beforeModel');
    }

    async model() {
      await this.flow.hold('${name}:model');
      return { name: '${name}' };
    }

    async afterModel() {
      await this.flow.hold('${name}:afterModel');
    }
  }
`;

const pioneerRoute = (name: string, { awaitParent = false } = {}) => `
  import { service } from '@ember/service';
  import PioneerRoute from '${appName}/routes/pioneer';

  export default class extends PioneerRoute {
    @service flow;

    async model(parentPromise) {${awaitParent ? '\n      await parentPromise;' : ''}
      await this.flow.hold('${name}');
      return { name: '${name}' };
    }
  }
`;

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

            this.route('chain', function () {
              this.route('middle', function () {
                this.route('leaf');
              });
            });

            this.route('zebra', function () {
              this.route('classic');
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

            export const RouteComponent = <template>
              <div data-test={{@context.name}}>{{@context.name}}</div>
              {{outlet}}
            </template>;

            export const ApplicationComponent = <template>
              <LinkTo
                @route="parent.child.grandchild"
                data-test-deep-link
              >Deep route</LinkTo>
              <div data-test={{@context.name}}>{{@context.name}}</div>
              {{outlet}}
            </template>;
          `,
        },

        templates: {
          zebra: {
            'classic.gjs': `
              <template>
                <div data-test={{@model.name}}>{{@model.name}}</div>
              </template>
            `,
          },
        },
        'route-managers': {
          'pioneer.js': `
            import { routeCapabilities } from '@ember/routing';
            import {
              ApplicationComponent,
              PioneerOutlet,
              RouteComponent,
            } from '${appName}/components/pioneer-components';

            const ROUTES = {
              application: ApplicationComponent,
            };

            class PioneerBucket {
              constructor(name, route) {
                this.name = name;
                this.route = route;
              }
            }

            export default class PioneerRouteManager {
              capabilities = routeCapabilities('1.0');

              constructor(owner) {
                this.owner = owner;
              }

              createRoute(RouteClass, { name }) {
                return new PioneerBucket(name, new RouteClass(this.owner));
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
                return ROUTES[bucket.name] ?? RouteComponent;
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
          'application.js': pioneerRoute('application'),
          'chain.js': pioneerRoute('chain'),
          chain: {
            'middle.js': pioneerRoute('middle'),
            middle: {
              'leaf.js': pioneerRoute('leaf', { awaitParent: true }),
            },
          },
          'zebra.js': pioneerRoute('zebra'),
          zebra: {
            'classic.js': classicRoute('ZebraClassicRoute', 'zebra.classic'),
          },
          'parent.js': pioneerRoute('parent'),
          parent: {
            'child.js': pioneerRoute('child'),
            child: {
              'grandchild.js': pioneerRoute('grandchild', { awaitParent: true }),
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
                flow.release('chain');
                flow.release('middle');
                flow.release('leaf');
                flow.release('zebra');
                flow.release('zebra.classic:beforeModel');
                flow.release('zebra.classic:model');
                flow.release('zebra.classic:afterModel');
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

              test('a route waits only for the ancestor it asked for', async function (assert) {
                let flow = this.owner.lookup('service:flow');
                let navigation = visit('/chain/middle/leaf');

                await waitUntil(() => flow.starts.length === 3, { timeout: 2000 });
                assert.deepEqual(flow.starts.slice(), ['application', 'chain', 'middle']);

                flow.release('middle');
                await waitUntil(() => flow.starts.includes('leaf'), { timeout: 2000 });

                assert.deepEqual(flow.settles.slice(), ['middle']);

                flow.release('application');
                flow.release('chain');
                flow.release('leaf');

                await navigation;

                assert.dom('[data-test="leaf"]').hasText('leaf');
              });

              test('a classic route waits for its pioneer ancestor', async function (assert) {
                let flow = this.owner.lookup('service:flow');
                let navigation = visit('/zebra/classic');

                await waitUntil(() => flow.starts.length === 2, { timeout: 2000 });
                assert.deepEqual(flow.starts.slice(), ['application', 'zebra']);

                flow.release('application');
                await waitUntil(() => flow.settles.includes('application'), { timeout: 2000 });
                await new Promise((resolve) => setTimeout(resolve, 50));

                assert.deepEqual(flow.starts.slice(), ['application', 'zebra']);

                flow.release('zebra');
                await waitUntil(() => flow.starts.includes('zebra.classic:beforeModel'), {
                  timeout: 2000,
                });

                assert.deepEqual(flow.settles.slice().sort(), ['application', 'zebra']);

                flow.release('zebra.classic:beforeModel');
                flow.release('zebra.classic:model');
                flow.release('zebra.classic:afterModel');

                await navigation;

                assert.deepEqual(flow.settles.slice(), [
                  'application',
                  'zebra',
                  'zebra.classic:beforeModel',
                  'zebra.classic:model',
                  'zebra.classic:afterModel',
                ]);
                assert.dom('[data-test="zebra"]').hasText('zebra');
                assert.dom('[data-test="zebra.classic"]').hasText('zebra.classic');
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
