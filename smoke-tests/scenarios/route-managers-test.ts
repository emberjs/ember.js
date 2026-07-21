import { v1AppScenarios, v2AppScenarios } from './scenarios';
import type { PreparedApp, Scenarios } from 'scenario-tester';
import * as QUnit from 'qunit';

const { module: Qmodule, test } = QUnit;

interface FileTree {
  [name: string]: string | FileTree;
}

interface RouteChainManifest {
  routerMap: string;
  routes: FileTree;
  templates?: FileTree;
  routeComponent?: string;
  managerInvokableMap?: string;
}

function createRouteComponent(componentName: string, route: string): string {
  return `
    export const ${componentName} = <template>
      ${route}
    </template>;
  `;
}

function routeManagerTests(scenarios: Scenarios, appName: string) {
  const FUNKY_ROUTE_SOURCE = `
    import FunkyRoute from '${appName}/routes/funky';
    export default class extends FunkyRoute {}
  `;

  const ROUTE_FIXTURES: RouteChainManifest[] = [
    {
      routerMap: `
        this.route('classic-to-funky', function () {
          this.route('child');
        });
      `,
      routes: {
        'classic-to-funky': {
          'child.js': FUNKY_ROUTE_SOURCE,
        },
      },
      templates: {
        'classic-to-funky.gjs': `
          <template>
            <div data-test-classic-route="classic-to-funky">
              classic parent
              <div data-test-outlet-boundary>{{outlet}}</div>
            </div>
          </template>
        `,
      },
      routeComponent: createRouteComponent(
        'ClassicToFunkyChild',
        `<div data-test-funky-route="classic-to-funky.child">funky child</div>`
      ),
      managerInvokableMap: `
        'classic-to-funky.child': COMPONENTS.ClassicToFunkyChild,
      `,
    },
    {
      routerMap: `
        this.route('funky-to-classic', function () {
          this.route('child');
        });
      `,
      routes: {
        'funky-to-classic.js': FUNKY_ROUTE_SOURCE,
      },
      templates: {
        'funky-to-classic': {
          'child.gjs': `
            <template>
              <div data-test-classic-route="funky-to-classic.child">classic child</div>
            </template>
          `,
        },
      },
      routeComponent: createRouteComponent(
        'FunkyToClassic',
        `<div data-test-funky-route="funky-to-classic">
          funky parent
          <div data-test-outlet-boundary>{{outlet}}</div>
        </div>`
      ),
      managerInvokableMap: `
        'funky-to-classic': COMPONENTS.FunkyToClassic,
      `,
    },
    {
      routerMap: `
        this.route('classic-to-funky-to-classic', function () {
          this.route('child', function () {
            this.route('grandchild');
          });
        });
      `,
      routes: {
        'classic-to-funky-to-classic.js': `
          import Route from '@ember/routing/route';

          export default class extends Route {
            model() {
              return '1';
            }
          }
        `,
        'classic-to-funky-to-classic': {
          'child.js': `
            import FunkyRoute from '${appName}/routes/funky';

            export default class extends FunkyRoute {
              model() {
                return '2';
              }
            }
          `,
          child: {
            'grandchild.js': `
              import Route from '@ember/routing/route';

              export default class extends Route {
                model() {
                  return '3';
                }
              }
            `,
          },
        },
      },
      templates: {
        'classic-to-funky-to-classic.gjs': `
          <template>
            <div data-test-classic-route="classic-to-funky-to-classic">
              classic parent
              <span data-test-route-model>{{@model}}</span>
              <div data-test-outlet-boundary>{{outlet}}</div>
            </div>
          </template>
        `,
        'classic-to-funky-to-classic': {
          child: {
            'grandchild.gjs': `
              <template>
                <div data-test-classic-route="classic-to-funky-to-classic.child.grandchild">
                  classic grandchild
                  <span data-test-route-model>{{@model}}</span>
                </div>
              </template>
            `,
          },
        },
      },
      routeComponent: createRouteComponent(
        'ClassicToFunkyToClassicChild',
        `<div data-test-funky-route="classic-to-funky-to-classic.child">
            funky child
            <span data-test-route-model>{{@model}}</span>
            <div data-test-outlet-boundary>{{outlet}}</div>
          </div>`
      ),
      managerInvokableMap: `
        'classic-to-funky-to-classic.child': COMPONENTS.ClassicToFunkyToClassicChild,
      `,
    },
    {
      routerMap: `
        this.route('funky-to-classic-to-funky', function () {
          this.route('child', function () {
            this.route('grandchild');
          });
        });
      `,
      routes: {
        'funky-to-classic-to-funky.js': `
          import FunkyRoute from '${appName}/routes/funky';

          export default class extends FunkyRoute {
            model() {
              return '1';
            }
          }
        `,
        'funky-to-classic-to-funky': {
          'child.js': `
            import Route from '@ember/routing/route';

            export default class extends Route {
              model() {
                return '2';
              }
            }
          `,
          child: {
            'grandchild.js': `
              import FunkyRoute from '${appName}/routes/funky';

              export default class extends FunkyRoute {
                model() {
                  return '3';
                }
              }
            `,
          },
        },
      },
      templates: {
        'funky-to-classic-to-funky': {
          'child.gjs': `
            <template>
              <div data-test-classic-route="funky-to-classic-to-funky.child">
                classic child
                <span data-test-route-model>{{@model}}</span>
                <div data-test-outlet-boundary>{{outlet}}</div>
              </div>
            </template>
          `,
        },
      },
      routeComponent:
        createRouteComponent(
          'FunkyToClassicToFunky',
          `<div data-test-funky-route="funky-to-classic-to-funky">
            funky parent
            <span data-test-route-model>{{@model}}</span>
            <div data-test-outlet-boundary>{{outlet}}</div>
          </div>`
        ) +
        createRouteComponent(
          'FunkyToClassicToFunkyGrandchild',
          `<div data-test-funky-route="funky-to-classic-to-funky.child.grandchild">
            funky grandchild
            <span data-test-route-model>{{@model}}</span>
          </div>`
        ),
      managerInvokableMap: `
        'funky-to-classic-to-funky': COMPONENTS.FunkyToClassicToFunky,
        'funky-to-classic-to-funky.child.grandchild': COMPONENTS.FunkyToClassicToFunkyGrandchild,
      `,
    },
    {
      routerMap: `
        this.route('funky-to-funky-to-funky-to-classic', function () {
          this.route('child', function () {
            this.route('grandchild', function () {
              this.route('great-grandchild');
            });
          });
        });
      `,
      routes: {
        'funky-to-funky-to-funky-to-classic.js': FUNKY_ROUTE_SOURCE,
        'funky-to-funky-to-funky-to-classic': {
          'child.js': FUNKY_ROUTE_SOURCE,
          child: {
            'grandchild.js': FUNKY_ROUTE_SOURCE,
          },
        },
      },
      templates: {
        'funky-to-funky-to-funky-to-classic': {
          child: {
            grandchild: {
              'great-grandchild.gjs': `
                <template>
                  <div data-test-classic-route="funky-to-funky-to-funky-to-classic.child.grandchild.great-grandchild">
                    classic leaf
                  </div>
                </template>
              `,
            },
          },
        },
      },
      routeComponent:
        createRouteComponent(
          'FunkyToFunkyToFunkyToClassic',
          `<div data-test-funky-route="funky-to-funky-to-funky-to-classic">
            funky parent
            <div data-test-outlet-boundary>{{outlet}}</div>
          </div>`
        ) +
        createRouteComponent(
          'FunkyToFunkyToFunkyToClassicChild',
          `<div data-test-funky-route="funky-to-funky-to-funky-to-classic.child">
            funky middle
            <div data-test-outlet-boundary>{{outlet}}</div>
          </div>`
        ) +
        createRouteComponent(
          'FunkyToFunkyToFunkyToClassicGrandchild',
          `<div data-test-funky-route="funky-to-funky-to-funky-to-classic.child.grandchild">
            funky child
            <div data-test-outlet-boundary>{{outlet}}</div>
          </div>`
        ),
      managerInvokableMap: `
        'funky-to-funky-to-funky-to-classic': COMPONENTS.FunkyToFunkyToFunkyToClassic,
        'funky-to-funky-to-funky-to-classic.child': COMPONENTS.FunkyToFunkyToFunkyToClassicChild,
        'funky-to-funky-to-funky-to-classic.child.grandchild': COMPONENTS.FunkyToFunkyToFunkyToClassicGrandchild,
      `,
    },
    {
      routerMap: `
        this.route('funky-to-funky-to-classic-to-classic-to-funky', function () {
          this.route('child', function () {
            this.route('grandchild', function () {
              this.route('great-grandchild', function () {
                this.route('great-great-grandchild');
              });
            });
          });
        });
      `,
      routes: {
        'funky-to-funky-to-classic-to-classic-to-funky.js': FUNKY_ROUTE_SOURCE,
        'funky-to-funky-to-classic-to-classic-to-funky': {
          'child.js': FUNKY_ROUTE_SOURCE,
          child: {
            grandchild: {
              'great-grandchild': {
                'great-great-grandchild.js': FUNKY_ROUTE_SOURCE,
              },
            },
          },
        },
      },
      templates: {
        'funky-to-funky-to-classic-to-classic-to-funky': {
          child: {
            'grandchild.gjs': `
              <template>
                <div data-test-classic-route="funky-to-funky-to-classic-to-classic-to-funky.child.grandchild">
                  classic middle
                  <div data-test-outlet-boundary>{{outlet}}</div>
                </div>
              </template>
            `,
            grandchild: {
              'great-grandchild.gjs': `
                <template>
                  <div data-test-classic-route="funky-to-funky-to-classic-to-classic-to-funky.child.grandchild.great-grandchild">
                    classic child
                    <div data-test-outlet-boundary>{{outlet}}</div>
                  </div>
                </template>
              `,
            },
          },
        },
      },
      routeComponent:
        createRouteComponent(
          'FunkyToFunkyToClassicToClassicToFunky',
          `<div data-test-funky-route="funky-to-funky-to-classic-to-classic-to-funky">
            funky parent
            <div data-test-outlet-boundary>{{outlet}}</div>
          </div>`
        ) +
        createRouteComponent(
          'FunkyToFunkyToClassicToClassicToFunkyChild',
          `<div data-test-funky-route="funky-to-funky-to-classic-to-classic-to-funky.child">
            funky child
            <div data-test-outlet-boundary>{{outlet}}</div>
          </div>`
        ) +
        createRouteComponent(
          'FunkyToFunkyToClassicToClassicToFunkyLeaf',
          `<div data-test-funky-route="funky-to-funky-to-classic-to-classic-to-funky.child.grandchild.great-grandchild.great-great-grandchild">
            funky leaf
          </div>`
        ),
      managerInvokableMap: `
        'funky-to-funky-to-classic-to-classic-to-funky': COMPONENTS.FunkyToFunkyToClassicToClassicToFunky,
        'funky-to-funky-to-classic-to-classic-to-funky.child': COMPONENTS.FunkyToFunkyToClassicToClassicToFunkyChild,
        'funky-to-funky-to-classic-to-classic-to-funky.child.grandchild.great-grandchild.great-great-grandchild': COMPONENTS.FunkyToFunkyToClassicToClassicToFunkyLeaf,
      `,
    },
    {
      routerMap: `
        this.route('classic-to-classic-to-funky-to-funky-to-classic', function () {
          this.route('child', function () {
            this.route('grandchild', function () {
              this.route('great-grandchild', function () {
                this.route('great-great-grandchild');
              });
            });
          });
        });
      `,
      routes: {
        'classic-to-classic-to-funky-to-funky-to-classic': {
          child: {
            'grandchild.js': FUNKY_ROUTE_SOURCE,
            grandchild: {
              'great-grandchild.js': FUNKY_ROUTE_SOURCE,
            },
          },
        },
      },
      templates: {
        'classic-to-classic-to-funky-to-funky-to-classic.gjs': `
          <template>
            <div data-test-classic-route="classic-to-classic-to-funky-to-funky-to-classic">
              classic parent
              <div data-test-outlet-boundary>{{outlet}}</div>
            </div>
          </template>
        `,
        'classic-to-classic-to-funky-to-funky-to-classic': {
          'child.gjs': `
            <template>
              <div data-test-classic-route="classic-to-classic-to-funky-to-funky-to-classic.child">
                classic child
                <div data-test-outlet-boundary>{{outlet}}</div>
              </div>
            </template>
          `,
          child: {
            grandchild: {
              'great-grandchild': {
                'great-great-grandchild.gjs': `
                  <template>
                    <div data-test-classic-route="classic-to-classic-to-funky-to-funky-to-classic.child.grandchild.great-grandchild.great-great-grandchild">
                      classic leaf
                    </div>
                  </template>
                `,
              },
            },
          },
        },
      },
      routeComponent:
        createRouteComponent(
          'ClassicToClassicToFunkyToFunkyToClassicGrandchild',
          `<div data-test-funky-route="classic-to-classic-to-funky-to-funky-to-classic.child.grandchild">
            funky middle
            <div data-test-outlet-boundary>{{outlet}}</div>
          </div>`
        ) +
        createRouteComponent(
          'ClassicToClassicToFunkyToFunkyToClassicGreatGrandchild',
          `<div data-test-funky-route="classic-to-classic-to-funky-to-funky-to-classic.child.grandchild.great-grandchild">
            funky child
            <div data-test-outlet-boundary>{{outlet}}</div>
          </div>`
        ),
      managerInvokableMap: `
        'classic-to-classic-to-funky-to-funky-to-classic.child.grandchild': COMPONENTS.ClassicToClassicToFunkyToFunkyToClassicGrandchild,
        'classic-to-classic-to-funky-to-funky-to-classic.child.grandchild.great-grandchild': COMPONENTS.ClassicToClassicToFunkyToFunkyToClassicGreatGrandchild,
      `,
    },
    {
      routerMap: `
        this.route('sibling-transitions', function () {
          this.route('classic-child');
          this.route('funky-child');
        });
      `,
      routes: {
        'sibling-transitions.js': FUNKY_ROUTE_SOURCE,
        'sibling-transitions': {
          'funky-child.js': FUNKY_ROUTE_SOURCE,
        },
      },
      templates: {
        'sibling-transitions': {
          'classic-child.gjs': `
            <template>
              <div data-test-classic-route="sibling-transitions.classic-child">
                classic sibling
              </div>
            </template>
          `,
        },
      },
      routeComponent:
        createRouteComponent(
          'SiblingTransitions',
          `<div data-test-funky-route="sibling-transitions">
            funky parent
            <div data-test-outlet-boundary>{{outlet}}</div>
          </div>`
        ) +
        createRouteComponent(
          'SiblingTransitionsFunkyChild',
          `<div data-test-funky-route="sibling-transitions.funky-child">
            funky sibling
          </div>`
        ),
      managerInvokableMap: `
        'sibling-transitions': COMPONENTS.SiblingTransitions,
        'sibling-transitions.funky-child': COMPONENTS.SiblingTransitionsFunkyChild,
      `,
    },
  ];

  const ROUTER_MAP = ROUTE_FIXTURES.map((fixture) => fixture.routerMap).join('\n');
  const ROUTE_FILES = Object.assign({}, ...ROUTE_FIXTURES.map((fixture) => fixture.routes));
  const TEMPLATE_FILES = Object.assign(
    {},
    ...ROUTE_FIXTURES.map((fixture) => fixture.templates ?? {})
  );
  const ROUTE_COMPONENTS = ROUTE_FIXTURES.map((fixture) => fixture.routeComponent ?? '').join('\n');
  const MANAGER_INVOKABLE_MAP = ROUTE_FIXTURES.map(
    (fixture) => fixture.managerInvokableMap ?? ''
  ).join('\n');

  scenarios
    .map('route-managers', (project) => {
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
            ${ROUTER_MAP}
            });
          `,
          styles: {
            'app.css': `
              :root {
                color: #172033;
                font-family: Inter, ui-sans-serif, system-ui, sans-serif;
                background: #f4f7fb;
              }

              body {
                margin: 0;
              }

              button[data-test-render-route] {
                display: block;
                width: min(100%, 36rem);
                margin: 1rem 0;
                padding: 1rem;
                border: 2px solid #2563eb;
                border-radius: 0.75rem;
                color: #1d4ed8;
                background: white;
                text-align: left;
                font: inherit;
                font-weight: 800;
                cursor: pointer;
                box-shadow: 0 0.25rem 0.75rem rgb(23 32 51 / 8%);
              }

              [data-test-classic-route],
              [data-test-funky-route] {
                display: block;
                margin-top: 1rem;
                padding: 1rem;
                border: 2px solid;
                border-radius: 0.75rem;
                background: white;
                box-shadow: 0 0.25rem 0.75rem rgb(23 32 51 / 8%);
              }

              [data-test-classic-route]::before,
              [data-test-funky-route]::before {
                display: block;
                margin: -1rem -1rem 1rem;
                padding: 0.75rem 1rem;
                color: white;
                font-size: 0.75rem;
                font-weight: 800;
                letter-spacing: 0.08em;
                text-transform: uppercase;
              }

              [data-test-classic-route] {
                border-color: #b45309;
              }

              [data-test-classic-route]::before {
                content: "Classic Route Manager · " attr(data-test-classic-route);
                background: #b45309;
              }

              [data-test-funky-route] {
                border-color: #2563eb;
              }

              [data-test-funky-route]::before {
                content: "Funky Route Manager · " attr(data-test-funky-route);
                background: #2563eb;
              }

              [data-test-outlet-boundary] {
                margin-top: 1rem;
                padding: 0.75rem;
                border: 1px dashed #94a3b8;
                border-radius: 0.5rem;
                background: #f8fafc;
              }

              [data-test-outlet-boundary]::before {
                content: "outlet · child route";
                display: block;
                margin-bottom: 0.5rem;
                color: #64748b;
                font-size: 0.7rem;
                font-weight: 700;
                letter-spacing: 0.06em;
                text-transform: uppercase;
              }

              [data-test-outlet-boundary] > [data-test-classic-route],
              [data-test-outlet-boundary] > [data-test-funky-route] {
                margin-top: 0;
              }
            `,
          },
          components: {
            'funky-route-wrapper.gjs': `
              import Component from '@glimmer/component';
              import { tracked } from '@glimmer/tracking';
              import { on } from '@ember/modifier';

              export default class FunkyRouteWrapper extends Component {
                @tracked shouldRender = false;

                renderRoute = () => {
                  this.shouldRender = true;
                };

                <template>
                  {{#if this.shouldRender}}
                    {{!--@TODO the 'outlet' should be transparent to manager outlet --}}
                    <@Component @model={{@context}} @outlet={{@outlet}} />
                    {{log "funky" @outlet}}
                  {{else}}
                    <button
                      type="button"
                      data-test-render-route={{@bucket.name}}
                      {{on "click" this.renderRoute}}
                    >
                      Funky Route Manager · {{@bucket.name}} — click to render
                    </button>
                  {{/if}}
                </template>
              }
            `,
            'funky-route-components.gjs': ROUTE_COMPONENTS,
          },
          'route-managers': {
            'funky.js': `
              import { routeCapabilities } from '@ember/routing';
              import { createConstRef } from '@glimmer/reference';
              import FunkyRouteWrapper from '${appName}/components/funky-route-wrapper';
              import * as COMPONENTS from '${appName}/components/funky-route-components';

              const ROUTES = {
                ${MANAGER_INVOKABLE_MAP}
              };

              export default class FunkyRouteManager {
                capabilities = routeCapabilities('1.0');

                constructor(owner) {
                  this.owner = owner;
                }

                createRoute(RouteClass, { name }) {
                  return {
                    name,
                    route: new RouteClass(this.owner),
                    invokable: ROUTES[name],
                  };
                }

                getRoute(bucket) {
                  return bucket.route;
                }

                getDestroyable() {
                  return null;
                }

                getRouteWrapper() {
                  return FunkyRouteWrapper;
                }

                getRenderState(bucket) {
                  return {
                    owner: this.owner,
                    name: bucket.name,
                    controller: undefined,
                    model: bucket.model,
                    wrapper: this.getRouteWrapper(),
                    invokable: bucket.invokable,
                    bucket,
                    produceContext() {
                      return createConstRef(bucket.model, '@context');
                    },
                  };
                }

                willEnter() {}

                async enter(bucket) {
                  let model = await bucket.route.model?.();
                  bucket.model = model;
                  return model;
                }

                didEnter() {}
                willExit() {}
                exit() {}
                didExit() {}

                async getInvokable(bucket, enterPromise) {
                  await enterPromise;
                  return bucket.invokable;
                }
              }
            `,
          },
          routes: {
            'funky.js': `
              import { setOwner } from '@ember/owner';
              import { setRouteManager } from '@ember/routing';
              import FunkyRouteManager from '${appName}/route-managers/funky';

              export default class FunkyRoute {
                constructor(owner) {
                  setOwner(this, owner);
                }
              }

              setRouteManager((owner) => new FunkyRouteManager(owner), FunkyRoute);
            `,
            ...ROUTE_FILES,
          },
          templates: {
            'application.gjs': `<template>{{outlet}}</template>`,
            ...TEMPLATE_FILES,
          },
        },
        tests: {
          acceptance: {
            'route-managers-test.js': `
              import { module, test } from 'qunit';
              import { click, findAll, visit } from '@ember/test-helpers';
              import { setupApplicationTest } from '${appName}/tests/helpers';

              const CLASSIC_ROUTE_SELECTOR = '[data-test-classic-route]';
              const FUNKY_ROUTE_SELECTOR = '[data-test-funky-route]';
              const GATE_SELECTOR = 'button[data-test-render-route]';

              function assertClassicRoute(assert, index, name, expectedModel) {
                let route = findAll(CLASSIC_ROUTE_SELECTOR)[index];

                assert.dom(route).hasAttribute(
                  'data-test-classic-route',
                  name
                );

                if (expectedModel !== undefined) {
                  assert
                    .dom(route.querySelector(':scope > [data-test-route-model]'))
                    .hasText(expectedModel);
                }
              }

              function assertFunkyRoute(assert, index, name, expectedModel) {
                let route = findAll(FUNKY_ROUTE_SELECTOR)[index];

                assert.dom(route).hasAttribute(
                  'data-test-funky-route',
                  name
                );

                if (expectedModel !== undefined) {
                  assert
                    .dom(route.querySelector(':scope > [data-test-route-model]'))
                    .hasText(expectedModel);
                }
              }

              async function openFunkyRoute(assert, name) {
                assert.dom(GATE_SELECTOR).hasAttribute('data-test-render-route', name);
                await click(GATE_SELECTOR);
              }

              module('Acceptance | route-managers', function (hooks) {
                setupApplicationTest(hooks);

                test('classic -> funky', async function (assert) {
                  await visit('/classic-to-funky/child');

                  assertClassicRoute(assert, 0, 'classic-to-funky');
                  assert.dom(FUNKY_ROUTE_SELECTOR).doesNotExist();
                  await openFunkyRoute(assert, 'classic-to-funky.child');
                  assertFunkyRoute(assert, 0, 'classic-to-funky.child');
                });

                test('funky -> classic', async function (assert) {
                  await visit('/funky-to-classic/child');

                  assert.dom(FUNKY_ROUTE_SELECTOR).doesNotExist();
                  assert.dom(CLASSIC_ROUTE_SELECTOR).doesNotExist();
                  await openFunkyRoute(assert, 'funky-to-classic');
                  assertClassicRoute(assert, 0, 'funky-to-classic.child');
                });

                test('classic -> funky -> classic', async function (assert) {
                  await visit('/classic-to-funky-to-classic/child/grandchild');

                  assertClassicRoute(assert, 0, 'classic-to-funky-to-classic', '1');
                  assert.dom(FUNKY_ROUTE_SELECTOR).doesNotExist();
                  await openFunkyRoute(assert, 'classic-to-funky-to-classic.child');
                  assertFunkyRoute(assert, 0, 'classic-to-funky-to-classic.child', '2');
                  assertClassicRoute(
                    assert,
                    1,
                    'classic-to-funky-to-classic.child.grandchild',
                    '3'
                  );
                });

                test('funky.parent -> funky -> funky.child -> classic', async function (assert) {
                  await visit(
                    '/funky-to-funky-to-funky-to-classic/child/grandchild/great-grandchild'
                  );
                  assert.dom(FUNKY_ROUTE_SELECTOR).doesNotExist();
                  await openFunkyRoute(assert, 'funky-to-funky-to-funky-to-classic');
                  await openFunkyRoute(assert, 'funky-to-funky-to-funky-to-classic.child');
                  await openFunkyRoute(
                    assert,
                    'funky-to-funky-to-funky-to-classic.child.grandchild'
                  );
                  assertClassicRoute(
                    assert,
                    0,
                    'funky-to-funky-to-funky-to-classic.child.grandchild.great-grandchild'
                  );
                });

                test('funky -> funky -> classic -> classic -> funky', async function (assert) {
                  await visit(
                    '/funky-to-funky-to-classic-to-classic-to-funky/child/grandchild/great-grandchild/great-great-grandchild'
                  );

                  await openFunkyRoute(assert, 'funky-to-funky-to-classic-to-classic-to-funky');
                  await openFunkyRoute(
                    assert,
                    'funky-to-funky-to-classic-to-classic-to-funky.child'
                  );
                  assertClassicRoute(
                    assert,
                    1,
                    'funky-to-funky-to-classic-to-classic-to-funky.child.grandchild.great-grandchild'
                  );
                  assert.dom(FUNKY_ROUTE_SELECTOR).exists({ count: 2 });
                  await openFunkyRoute(
                    assert,
                    'funky-to-funky-to-classic-to-classic-to-funky.child.grandchild.great-grandchild.great-great-grandchild'
                  );
                  assertFunkyRoute(
                    assert,
                    2,
                    'funky-to-funky-to-classic-to-classic-to-funky.child.grandchild.great-grandchild.great-great-grandchild'
                  );
                });

                test('classic -> classic -> funky -> funky -> classic', async function (assert) {
                  await visit(
                    '/classic-to-classic-to-funky-to-funky-to-classic/child/grandchild/great-grandchild/great-great-grandchild'
                  );

                  assertClassicRoute(
                    assert,
                    1,
                    'classic-to-classic-to-funky-to-funky-to-classic.child'
                  );
                  assert.dom(FUNKY_ROUTE_SELECTOR).doesNotExist();
                  await openFunkyRoute(
                    assert,
                    'classic-to-classic-to-funky-to-funky-to-classic.child.grandchild'
                  );
                  await openFunkyRoute(
                    assert,
                    'classic-to-classic-to-funky-to-funky-to-classic.child.grandchild.great-grandchild'
                  );
                  assertClassicRoute(
                    assert,
                    2,
                    'classic-to-classic-to-funky-to-funky-to-classic.child.grandchild.great-grandchild.great-great-grandchild'
                  );
                });

                test('retained funky parent switches between classic and funky siblings', async function (assert) {
                  await visit('/sibling-transitions/classic-child');
                  await openFunkyRoute(assert, 'sibling-transitions');
                  assertClassicRoute(assert, 0, 'sibling-transitions.classic-child');

                  await visit('/sibling-transitions/funky-child');

                  assertFunkyRoute(assert, 0, 'sibling-transitions');
                  assert.dom(CLASSIC_ROUTE_SELECTOR).doesNotExist();
                  assert.dom(FUNKY_ROUTE_SELECTOR).exists({ count: 1 });
                  await openFunkyRoute(assert, 'sibling-transitions.funky-child');
                  assertFunkyRoute(assert, 1, 'sibling-transitions.funky-child');

                  await visit('/sibling-transitions/classic-child');
                  await visit('/sibling-transitions/funky-child');

                  assert.dom(FUNKY_ROUTE_SELECTOR).exists({ count: 1 });
                  assert
                    .dom(GATE_SELECTOR)
                    .hasAttribute('data-test-render-route', 'sibling-transitions.funky-child');
                });

                test('funky -> classic -> funky', async function (assert) {
                  await visit('/funky-to-classic-to-funky/child/grandchild');

                  assert.dom(FUNKY_ROUTE_SELECTOR).doesNotExist();
                  await openFunkyRoute(assert, 'funky-to-classic-to-funky');
                  assertFunkyRoute(assert, 0, 'funky-to-classic-to-funky', '1');
                  assertClassicRoute(assert, 0, 'funky-to-classic-to-funky.child', '2');
                  assert.dom(FUNKY_ROUTE_SELECTOR).exists({ count: 1 });
                  await openFunkyRoute(
                    assert,
                    'funky-to-classic-to-funky.child.grandchild'
                  );
                  assertFunkyRoute(
                    assert,
                    1,
                    'funky-to-classic-to-funky.child.grandchild',
                    '3'
                  );
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
}

routeManagerTests(v1AppScenarios, 'ember-test-app');
routeManagerTests(v2AppScenarios, 'v2-app-template');
