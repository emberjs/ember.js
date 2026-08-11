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
    {
      routerMap: `
        this.route('funky-reentry', { path: '/funky-reentry/:thing_id' });
      `,
      routes: {
        'funky-reentry.js': `
          import FunkyRoute from '${appName}/routes/funky';

          export default class extends FunkyRoute {
            model(params) {
              return params.thing_id;
            }
          }
        `,
      },
      routeComponent: createRouteComponent(
        'FunkyReentry',
        `<div data-test-funky-route="funky-reentry">
          funky reentry
          <span data-test-route-model>{{@model}}</span>
        </div>`
      ),
      managerInvokableMap: `
        'funky-reentry': COMPONENTS.FunkyReentry,
      `,
    },
    {
      routerMap: `
        this.route('reactive-context', function () {
          this.route('child');
        });
      `,
      routes: {
        'reactive-context.js': `
          import ReactiveRoute from '${appName}/routes/reactive';

          let resolve;
          export function resolveModel(value) {
            resolve(value);
          }

          export default class extends ReactiveRoute {
            model() {
              return new Promise((r) => (resolve = r));
            }
          }
        `,
        'reactive-context': {
          'child.js': `
            import ReactiveRoute from '${appName}/routes/reactive';

            let resolve;
            export function resolveModel(value) {
              resolve(value);
            }

            export default class extends ReactiveRoute {
              model() {
                return new Promise((r) => (resolve = r));
              }
            }
          `,
        },
      },
      routeComponent:
        createRouteComponent(
          'ReactiveContextParent',
          `<div data-test-reactive-route="reactive-context">
            <span data-test-route-model>{{@context}}</span>
            <div data-test-outlet-boundary>{{outlet}}</div>
          </div>`
        ) +
        createRouteComponent(
          'ReactiveContextChild',
          `<div data-test-reactive-route="reactive-context.child">
            <span data-test-route-model>{{@context}}</span>
          </div>`
        ),
      managerInvokableMap: `
        'reactive-context': COMPONENTS.ReactiveContextParent,
        'reactive-context.child': COMPONENTS.ReactiveContextChild,
      `,
    },
    {
      routerMap: `
        this.route('swap-invokable');
      `,
      routes: {
        'swap-invokable.js': `
          import SwapRoute from '${appName}/routes/swap';

          export default class extends SwapRoute {}
        `,
      },
      routeComponent:
        createRouteComponent(
          'SwapInvokableLoading',
          `<div data-test-swap-invokable="loading">swap loading</div>`
        ) +
        createRouteComponent(
          'SwapInvokableReady',
          `<div data-test-swap-invokable="ready">swap ready</div>`
        ),
      managerInvokableMap: `
        'swap-invokable': COMPONENTS.SwapInvokableReady,
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
            'funky-outlet.gjs': `
              import Component from '@glimmer/component';
              import { tracked } from '@glimmer/tracking';
              import { on } from '@ember/modifier';
              import {
                getComponentTemplate,
                setComponentTemplate,
                setInternalComponentManager,
              } from '@glimmer/manager';
              import { createComputeRef, createConstRef, NULL_REFERENCE } from '@glimmer/reference';

              // \`model\` is tracked; no render-state plumbing.
              export class FunkyBucket {
                @tracked model;

                constructor(name, route, invokable) {
                  this.name = name;
                  this.route = route;
                  this.invokable = invokable;
                }
              }

              // Component lifetime re-closes the gate.
              class FunkyGate extends Component {
                @tracked shouldRender = false;

                renderRoute = () => {
                  this.shouldRender = true;
                };

                <template>
                  {{#if this.shouldRender}}
                    <@bucket.invokable @model={{@bucket.model}} @outlet={{@outlet}} />
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

              const LAYOUT = <template>
                <FunkyGate @bucket={{@bucket}} @outlet={{@outlet}} />
              </template>;

              // What \`getRouteWrapper\` returns.
              export class FunkyOutlet {
                constructor(bucket, childOutlet) {
                  this.bucket = bucket;
                  // Managers get a callback; \`prepareArgs\` passes \`@outlet\`
                  // to the template as an argument, which wants a reference.
                  this.childOutlet = createComputeRef(childOutlet);
                }
              }

              setInternalComponentManager(
                {
                  getCapabilities() {
                    return {
                      dynamicLayout: false,
                      dynamicTag: false,
                      // Supplies args; discards a parent's.
                      prepareArgs: true,
                      createArgs: false,
                      attributeHook: false,
                      elementHook: false,
                      createCaller: false,
                      dynamicScope: false,
                      updateHook: false,
                      createInstance: false,
                      wrapped: false,
                      willDestroy: false,
                      hasSubOwner: false,
                    };
                  },

                  prepareArgs(definition) {
                    return {
                      positional: [],
                      named: {
                        bucket: createConstRef(definition.bucket, '@bucket'),
                        outlet: definition.childOutlet,
                      },
                    };
                  },

                  getDebugName(definition) {
                    return \`funky outlet for \${definition.bucket.name}\`;
                  },

                  getSelf() {
                    return NULL_REFERENCE;
                  },

                  getDestroyable() {
                    return null;
                  },
                },
                FunkyOutlet.prototype
              );

              setComponentTemplate(getComponentTemplate(LAYOUT), FunkyOutlet.prototype);
            `,
            'swap-outlet.gjs': `
              import {
                capabilities,
                getComponentTemplate,
                setComponentManager,
                setComponentTemplate,
              } from '@ember/component';
              import { SwapInvokableLoading } from '${appName}/components/funky-route-components';

              // Definition-as-self: \`createComponent\` hands the definition back
              // and \`getContext\` returns it unchanged, so \`this\` in the layout
              // is the outlet the route manager built. No args are copied, so
              // there is no \`prepareArgs\` and no reference anywhere.
              const MANAGER = {
                capabilities: capabilities('3.13'),
                createComponent: (definition) => definition,
                getContext: (component) => component,
              };

              export class SwapOutlet {
                #childOutlet;

                constructor(bucket, childOutlet) {
                  this.bucket = bucket;
                  this.#childOutlet = childOutlet;
                }

                /** The next outlet down, re-read on every transition. */
                get outlet() {
                  return this.#childOutlet();
                }

                // \`ready\` is tracked; no _setOutlets pass.
                <template>
                  {{#if this.bucket.ready}}
                    <this.bucket.invokable @outlet={{this.outlet}} />
                  {{else}}
                    <SwapInvokableLoading @outlet={{this.outlet}} />
                  {{/if}}
                </template>
              }

              // The manager renders an *instance*, and both the component
              // manager and the template are found by walking that instance's
              // prototype chain. A class-body \`<template>\` lands on the class
              // itself, which is not on that chain, so it is re-hung here.
              setComponentTemplate(getComponentTemplate(SwapOutlet), SwapOutlet.prototype);
              setComponentManager(() => MANAGER, SwapOutlet.prototype);
            `,
            'reactive-outlet.gjs': `
              import {
                capabilities,
                getComponentTemplate,
                setComponentManager,
                setComponentTemplate,
              } from '@ember/component';

              // Definition-as-self; see \`swap-outlet.gjs\`. No references.
              const MANAGER = {
                capabilities: capabilities('3.13'),
                createComponent: (definition) => definition,
                getContext: (component) => component,
              };

              export class ReactiveOutlet {
                #childOutlet;

                constructor(bucket, childOutlet) {
                  this.bucket = bucket;
                  this.#childOutlet = childOutlet;
                }

                /** The next outlet down, re-read on every transition. */
                get outlet() {
                  return this.#childOutlet();
                }

                // \`context\` is tracked; late models land.
                <template>
                  <this.bucket.invokable
                    @context={{this.bucket.context}}
                    @outlet={{this.outlet}}
                  />
                </template>
              }

              // See \`swap-outlet.gjs\`: a class-body template has to be re-hung
              // on the prototype, because the manager renders an instance.
              setComponentTemplate(getComponentTemplate(ReactiveOutlet), ReactiveOutlet.prototype);
              setComponentManager(() => MANAGER, ReactiveOutlet.prototype);
            `,
            'funky-route-components.gjs': ROUTE_COMPONENTS,
          },
          'route-managers': {
            'swap.js': `
              import { routeCapabilities } from '@ember/routing';
              import { tracked } from '@glimmer/tracking';

              import { SwapOutlet } from '${appName}/components/swap-outlet';
              import * as COMPONENTS from '${appName}/components/funky-route-components';

              const ROUTES = {
                ${MANAGER_INVOKABLE_MAP}
              };

              const BUCKETS = new Map();
              let renderStateCalls = 0;

              export function renderStateCallCount() {
                return renderStateCalls;
              }

              export function finishLoading(name) {
                BUCKETS.get(name).ready = true;
              }

              class SwapBucket {
                @tracked ready = false;

                constructor(name, route, invokable) {
                  this.name = name;
                  this.route = route;
                  this.invokable = invokable;
                }
              }

              export default class SwapRouteManager {
                capabilities = routeCapabilities('1.0');

                constructor(owner) {
                  this.owner = owner;
                }

                createRoute(RouteClass, { name }) {
                  let bucket = new SwapBucket(name, new RouteClass(this.owner), ROUTES[name]);
                  BUCKETS.set(name, bucket);
                  return bucket;
                }

                getRoute(bucket) {
                  return bucket.route;
                }

                getDestroyable() {
                  return null;
                }

                getRouteWrapper(bucket, childOutlet) {
                  return new SwapOutlet(bucket, childOutlet);
                }

                getRenderState(bucket) {
                  renderStateCalls++;

                  return {
                    owner: this.owner,
                    name: bucket.name,
                    invokable: bucket.invokable,
                    bucket,
                  };
                }

                willEnter() {}
                async enter() {}
                didEnter() {}
                willExit() {}
                exit() {}
                didExit() {}

                async getInvokable(bucket) {
                  return bucket.invokable;
                }
              }
            `,
            'reactive.js': `
              import { routeCapabilities } from '@ember/routing';
              import { tracked } from '@glimmer/tracking';

              import { ReactiveOutlet } from '${appName}/components/reactive-outlet';
              import * as COMPONENTS from '${appName}/components/funky-route-components';

              const ROUTES = {
                ${MANAGER_INVOKABLE_MAP}
              };

              class ReactiveBucket {
                @tracked context = undefined;

                constructor(name, route, invokable) {
                  this.name = name;
                  this.route = route;
                  this.invokable = invokable;
                }
              }

              export default class ReactiveRouteManager {
                capabilities = routeCapabilities('1.0');

                constructor(owner) {
                  this.owner = owner;
                }

                createRoute(RouteClass, { name }) {
                  return new ReactiveBucket(name, new RouteClass(this.owner), ROUTES[name]);
                }

                getRoute(bucket) {
                  return bucket.route;
                }

                getDestroyable() {
                  return null;
                }

                getRouteWrapper(bucket, childOutlet) {
                  return new ReactiveOutlet(bucket, childOutlet);
                }

                getRenderState(bucket) {
                  return {
                    owner: this.owner,
                    name: bucket.name,
                    invokable: bucket.invokable,
                    bucket,
                  };
                }

                willEnter() {}

                async enter(bucket) {
                  bucket.route.model().then((value) => {
                    bucket.context = value;
                  });
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
            'funky.js': `
              import { routeCapabilities } from '@ember/routing';
              import { FunkyBucket, FunkyOutlet } from '${appName}/components/funky-outlet';
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
                  return new FunkyBucket(name, new RouteClass(this.owner), ROUTES[name]);
                }

                getRoute(bucket) {
                  return bucket.route;
                }

                getDestroyable() {
                  return null;
                }

                getRouteWrapper(bucket, childOutlet) {
                  return new FunkyOutlet(bucket, childOutlet);
                }

                getRenderState(bucket) {
                  return {
                    owner: this.owner,
                    name: bucket.name,
                    invokable: bucket.invokable,
                    bucket,
                  };
                }

                willEnter() {}

                async enter(bucket, state) {
                  let info = state.to.find((i) => i.name === bucket.name) ?? state.to;
                  let model = await bucket.route.model?.(info.params);
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
            'reactive.js': `
              import { setOwner } from '@ember/owner';
              import { setRouteManager } from '@ember/routing';
              import ReactiveRouteManager from '${appName}/route-managers/reactive';

              export default class ReactiveRoute {
                constructor(owner) {
                  setOwner(this, owner);
                }
              }

              setRouteManager((owner) => new ReactiveRouteManager(owner), ReactiveRoute);
            `,
            'swap.js': `
              import { setOwner } from '@ember/owner';
              import { setRouteManager } from '@ember/routing';
              import SwapRouteManager from '${appName}/route-managers/swap';

              export default class SwapRoute {
                constructor(owner) {
                  setOwner(this, owner);
                }
              }

              setRouteManager((owner) => new SwapRouteManager(owner), SwapRoute);
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
              import { click, findAll, settled, visit } from '@ember/test-helpers';
              import { setupApplicationTest } from '${appName}/tests/helpers';
              import { resolveModel as resolveParentModel } from '${appName}/routes/reactive-context';
              import { resolveModel as resolveChildModel } from '${appName}/routes/reactive-context/child';
              import {
                finishLoading as finishSwapLoading,
                renderStateCallCount,
              } from '${appName}/route-managers/swap';

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

                test('a manager whose context arrives after the transition settles still renders it', async function (assert) {
                  await visit('/reactive-context/child');

                  assert
                    .dom('[data-test-reactive-route="reactive-context"] > [data-test-route-model]')
                    .hasText('');
                  assert
                    .dom('[data-test-reactive-route="reactive-context.child"] > [data-test-route-model]')
                    .hasText('');

                  resolveParentModel('PARENT-CTX');
                  resolveChildModel('CHILD-CTX');
                  await settled();

                  assert
                    .dom('[data-test-reactive-route="reactive-context"] > [data-test-route-model]')
                    .hasText('PARENT-CTX');
                  assert
                    .dom('[data-test-reactive-route="reactive-context.child"] > [data-test-route-model]')
                    .hasText('CHILD-CTX');
                });

                test('a manager swaps what is rendered from tracked state, with no router pass', async function (assert) {
                  await visit('/swap-invokable');

                  assert.dom('[data-test-swap-invokable="loading"]').exists();
                  assert.dom('[data-test-swap-invokable="ready"]').doesNotExist();

                  let passesBefore = renderStateCallCount();

                  finishSwapLoading('swap-invokable');
                  await settled();

                  assert.strictEqual(
                    renderStateCallCount(),
                    passesBefore,
                    'the swap happened without a _setOutlets pass'
                  );
                  assert.dom('[data-test-swap-invokable="loading"]').doesNotExist();
                  assert.dom('[data-test-swap-invokable="ready"]').exists();
                });

                test('re-entering a route with a changed model updates @context', async function (assert) {
                  await visit('/funky-reentry/alpha');
                  await openFunkyRoute(assert, 'funky-reentry');
                  assertFunkyRoute(assert, 0, 'funky-reentry', 'alpha');

                  await visit('/funky-reentry/beta');

                  assert.dom(GATE_SELECTOR).doesNotExist();
                  assertFunkyRoute(assert, 0, 'funky-reentry', 'beta');
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
