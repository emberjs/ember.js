export interface FileTree {
  [name: string]: string | FileTree;
}

export interface Scenario {
  nav: { route: string; label: string; model?: string };
  routerMap: string;
  routes: FileTree;
  controllers?: FileTree;
  templates?: FileTree;
  routeComponent?: string;
  invokable?: string;
}

const OUTLET = `<div data-test-outlet-boundary>{{outlet}}</div>`;

const childLink = (name: string, label: string) =>
  `<LinkTo @route="${name}" data-test-child-link="${name}">${label}</LinkTo>`;

const modelLink = (route: string, model: string) =>
  `<LinkTo @route="${route}" @model="${model}" data-test-model-link="${model}">go to ${model}</LinkTo>`;

const level = (kind: string, name: string, inner = '') => `
      <div data-test-route="${name}" data-test-route-kind="${kind}">
        <span data-test-route-context>{{${kind === 'classic' ? '@model' : '@context'}}}</span>
        ${inner}
      </div>`;

const classicTemplate = (markup: string) => `
  import { LinkTo } from '@ember/routing';

  <template>${markup}
  </template>
`;

const routeComponent = (componentName: string, markup: string) => `
  export const ${componentName} = <template>${markup}
  </template>;
`;

const classicRoute = (name: string) => `
  import Route from '@ember/routing/route';

  export default class extends Route {
    model() {
      return 'model:${name}';
    }
  }
`;

const funkyRoute = (name: string) => `
  import FunkyRoute from '__APP__/routes/funky';

  export default class extends FunkyRoute {
    model() {
      return 'model:${name}';
    }
  }
`;

const glimmerRoute = (name: string) => `
  import GlimmerRoute from '__APP__/routes/glimmer-route';

  export default class extends GlimmerRoute {
    model() {
      return 'model:${name}';
    }
  }
`;

// Holds its model open so a test can resolve it by hand and watch the order
// levels started in.
const reactiveRoute = (name: string) => `
  import ReactiveRoute from '__APP__/routes/reactive';
  import { modelStarts } from '__APP__/router';

  let resolve;
  export function resolveModel(value) {
    resolve(value);
  }

  export default class extends ReactiveRoute {
    model() {
      modelStarts.push('${name}');
      return new Promise((r) => (resolve = r));
    }
  }
`;

export const SCENARIOS: Scenario[] = [
  {
    nav: { route: 'classic-to-funky', label: 'Classic to funky' },
    routerMap: `
      this.route('classic-to-funky', function () {
        this.route('child');
      });
    `,
    routes: {
      'classic-to-funky.js': classicRoute('classic-to-funky'),
      'classic-to-funky': {
        'child.js': funkyRoute('classic-to-funky.child'),
      },
    },
    templates: {
      'classic-to-funky.gjs': classicTemplate(
        level(
          'classic',
          'classic-to-funky',
          childLink('classic-to-funky.child', 'child') + OUTLET
        )
      ),
    },
    routeComponent: routeComponent(
      'ClassicToFunkyChild',
      level('funky', 'classic-to-funky.child')
    ),
    invokable: `'classic-to-funky.child': COMPONENTS.ClassicToFunkyChild,`,
  },

  {
    nav: { route: 'funky-to-classic', label: 'Funky to classic' },
    routerMap: `
      this.route('funky-to-classic', function () {
        this.route('child');
      });
    `,
    routes: {
      'funky-to-classic.js': funkyRoute('funky-to-classic'),
      'funky-to-classic': {
        'child.js': classicRoute('funky-to-classic.child'),
      },
    },
    templates: {
      'funky-to-classic': {
        'child.gjs': classicTemplate(level('classic', 'funky-to-classic.child')),
      },
    },
    routeComponent: routeComponent(
      'FunkyToClassic',
      level('funky', 'funky-to-classic', childLink('funky-to-classic.child', 'child') + OUTLET)
    ),
    invokable: `'funky-to-classic': COMPONENTS.FunkyToClassic,`,
  },

  {
    nav: { route: 'classic-to-funky-to-classic', label: 'Classic to funky to classic' },
    routerMap: `
      this.route('classic-to-funky-to-classic', function () {
        this.route('child', function () {
          this.route('grandchild');
        });
      });
    `,
    routes: {
      'classic-to-funky-to-classic.js': classicRoute('classic-to-funky-to-classic'),
      'classic-to-funky-to-classic': {
        'child.js': funkyRoute('classic-to-funky-to-classic.child'),
        child: {
          'grandchild.js': classicRoute('classic-to-funky-to-classic.child.grandchild'),
        },
      },
    },
    templates: {
      'classic-to-funky-to-classic.gjs': classicTemplate(
        level(
          'classic',
          'classic-to-funky-to-classic',
          childLink('classic-to-funky-to-classic.child', 'child') + OUTLET
        )
      ),
      'classic-to-funky-to-classic': {
        child: {
          'grandchild.gjs': classicTemplate(
            level('classic', 'classic-to-funky-to-classic.child.grandchild')
          ),
        },
      },
    },
    routeComponent: routeComponent(
      'ClassicToFunkyToClassicChild',
      level(
        'funky',
        'classic-to-funky-to-classic.child',
        childLink('classic-to-funky-to-classic.child.grandchild', 'grandchild') + OUTLET
      )
    ),
    invokable: `'classic-to-funky-to-classic.child': COMPONENTS.ClassicToFunkyToClassicChild,`,
  },

  {
    nav: { route: 'funky-to-classic-to-funky', label: 'Funky to classic to funky' },
    routerMap: `
      this.route('funky-to-classic-to-funky', function () {
        this.route('child', function () {
          this.route('grandchild');
        });
      });
    `,
    routes: {
      'funky-to-classic-to-funky.js': funkyRoute('funky-to-classic-to-funky'),
      'funky-to-classic-to-funky': {
        'child.js': classicRoute('funky-to-classic-to-funky.child'),
        child: {
          'grandchild.js': funkyRoute('funky-to-classic-to-funky.child.grandchild'),
        },
      },
    },
    templates: {
      'funky-to-classic-to-funky': {
        'child.gjs': classicTemplate(
          level(
            'classic',
            'funky-to-classic-to-funky.child',
            childLink('funky-to-classic-to-funky.child.grandchild', 'grandchild') + OUTLET
          )
        ),
      },
    },
    routeComponent:
      routeComponent(
        'FunkyToClassicToFunky',
        level(
          'funky',
          'funky-to-classic-to-funky',
          childLink('funky-to-classic-to-funky.child', 'child') + OUTLET
        )
      ) +
      routeComponent(
        'FunkyToClassicToFunkyGrandchild',
        level('funky', 'funky-to-classic-to-funky.child.grandchild')
      ),
    invokable: `
      'funky-to-classic-to-funky': COMPONENTS.FunkyToClassicToFunky,
      'funky-to-classic-to-funky.child.grandchild': COMPONENTS.FunkyToClassicToFunkyGrandchild,
    `,
  },

  {
    nav: {
      route: 'funky-to-funky-to-funky-to-classic',
      label: 'Funky to funky to funky to classic',
    },
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
      'funky-to-funky-to-funky-to-classic.js': funkyRoute('funky-to-funky-to-funky-to-classic'),
      'funky-to-funky-to-funky-to-classic': {
        'child.js': funkyRoute('funky-to-funky-to-funky-to-classic.child'),
        child: {
          'grandchild.js': funkyRoute('funky-to-funky-to-funky-to-classic.child.grandchild'),
          grandchild: {
            'great-grandchild.js': classicRoute(
              'funky-to-funky-to-funky-to-classic.child.grandchild.great-grandchild'
            ),
          },
        },
      },
    },
    templates: {
      'funky-to-funky-to-funky-to-classic': {
        child: {
          grandchild: {
            'great-grandchild.gjs': classicTemplate(
              level(
                'classic',
                'funky-to-funky-to-funky-to-classic.child.grandchild.great-grandchild'
              )
            ),
          },
        },
      },
    },
    routeComponent:
      routeComponent(
        'FunkyToFunkyToFunkyToClassic',
        level(
          'funky',
          'funky-to-funky-to-funky-to-classic',
          childLink('funky-to-funky-to-funky-to-classic.child', 'child') + OUTLET
        )
      ) +
      routeComponent(
        'FunkyToFunkyToFunkyToClassicChild',
        level(
          'funky',
          'funky-to-funky-to-funky-to-classic.child',
          childLink('funky-to-funky-to-funky-to-classic.child.grandchild', 'grandchild') + OUTLET
        )
      ) +
      routeComponent(
        'FunkyToFunkyToFunkyToClassicGrandchild',
        level(
          'funky',
          'funky-to-funky-to-funky-to-classic.child.grandchild',
          childLink(
            'funky-to-funky-to-funky-to-classic.child.grandchild.great-grandchild',
            'great-grandchild'
          ) + OUTLET
        )
      ),
    invokable: `
      'funky-to-funky-to-funky-to-classic': COMPONENTS.FunkyToFunkyToFunkyToClassic,
      'funky-to-funky-to-funky-to-classic.child': COMPONENTS.FunkyToFunkyToFunkyToClassicChild,
      'funky-to-funky-to-funky-to-classic.child.grandchild': COMPONENTS.FunkyToFunkyToFunkyToClassicGrandchild,
    `,
  },

  {
    nav: {
      route: 'funky-to-funky-to-classic-to-classic-to-funky',
      label: 'Funky to funky to classic to classic to funky',
    },
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
      'funky-to-funky-to-classic-to-classic-to-funky.js': funkyRoute(
        'funky-to-funky-to-classic-to-classic-to-funky'
      ),
      'funky-to-funky-to-classic-to-classic-to-funky': {
        'child.js': funkyRoute('funky-to-funky-to-classic-to-classic-to-funky.child'),
        child: {
          'grandchild.js': classicRoute(
            'funky-to-funky-to-classic-to-classic-to-funky.child.grandchild'
          ),
          grandchild: {
            'great-grandchild.js': classicRoute(
              'funky-to-funky-to-classic-to-classic-to-funky.child.grandchild.great-grandchild'
            ),
            'great-grandchild': {
              'great-great-grandchild.js': funkyRoute(
                'funky-to-funky-to-classic-to-classic-to-funky.child.grandchild.great-grandchild.great-great-grandchild'
              ),
            },
          },
        },
      },
    },
    templates: {
      'funky-to-funky-to-classic-to-classic-to-funky': {
        child: {
          'grandchild.gjs': classicTemplate(
            level(
              'classic',
              'funky-to-funky-to-classic-to-classic-to-funky.child.grandchild',
              childLink(
                'funky-to-funky-to-classic-to-classic-to-funky.child.grandchild.great-grandchild',
                'great-grandchild'
              ) + OUTLET
            )
          ),
          grandchild: {
            'great-grandchild.gjs': classicTemplate(
              level(
                'classic',
                'funky-to-funky-to-classic-to-classic-to-funky.child.grandchild.great-grandchild',
                childLink(
                  'funky-to-funky-to-classic-to-classic-to-funky.child.grandchild.great-grandchild.great-great-grandchild',
                  'great-great-grandchild'
                ) + OUTLET
              )
            ),
          },
        },
      },
    },
    routeComponent:
      routeComponent(
        'FunkyToFunkyToClassicToClassicToFunky',
        level(
          'funky',
          'funky-to-funky-to-classic-to-classic-to-funky',
          childLink('funky-to-funky-to-classic-to-classic-to-funky.child', 'child') + OUTLET
        )
      ) +
      routeComponent(
        'FunkyToFunkyToClassicToClassicToFunkyChild',
        level(
          'funky',
          'funky-to-funky-to-classic-to-classic-to-funky.child',
          childLink(
            'funky-to-funky-to-classic-to-classic-to-funky.child.grandchild',
            'grandchild'
          ) + OUTLET
        )
      ) +
      routeComponent(
        'FunkyToFunkyToClassicToClassicToFunkyLeaf',
        level(
          'funky',
          'funky-to-funky-to-classic-to-classic-to-funky.child.grandchild.great-grandchild.great-great-grandchild'
        )
      ),
    invokable: `
      'funky-to-funky-to-classic-to-classic-to-funky': COMPONENTS.FunkyToFunkyToClassicToClassicToFunky,
      'funky-to-funky-to-classic-to-classic-to-funky.child': COMPONENTS.FunkyToFunkyToClassicToClassicToFunkyChild,
      'funky-to-funky-to-classic-to-classic-to-funky.child.grandchild.great-grandchild.great-great-grandchild': COMPONENTS.FunkyToFunkyToClassicToClassicToFunkyLeaf,
    `,
  },

  {
    nav: {
      route: 'classic-to-classic-to-funky-to-funky-to-classic',
      label: 'Classic to classic to funky to funky to classic',
    },
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
      'classic-to-classic-to-funky-to-funky-to-classic.js': classicRoute(
        'classic-to-classic-to-funky-to-funky-to-classic'
      ),
      'classic-to-classic-to-funky-to-funky-to-classic': {
        'child.js': classicRoute('classic-to-classic-to-funky-to-funky-to-classic.child'),
        child: {
          'grandchild.js': funkyRoute(
            'classic-to-classic-to-funky-to-funky-to-classic.child.grandchild'
          ),
          grandchild: {
            'great-grandchild.js': funkyRoute(
              'classic-to-classic-to-funky-to-funky-to-classic.child.grandchild.great-grandchild'
            ),
            'great-grandchild': {
              'great-great-grandchild.js': classicRoute(
                'classic-to-classic-to-funky-to-funky-to-classic.child.grandchild.great-grandchild.great-great-grandchild'
              ),
            },
          },
        },
      },
    },
    templates: {
      'classic-to-classic-to-funky-to-funky-to-classic.gjs': classicTemplate(
        level(
          'classic',
          'classic-to-classic-to-funky-to-funky-to-classic',
          childLink('classic-to-classic-to-funky-to-funky-to-classic.child', 'child') + OUTLET
        )
      ),
      'classic-to-classic-to-funky-to-funky-to-classic': {
        'child.gjs': classicTemplate(
          level(
            'classic',
            'classic-to-classic-to-funky-to-funky-to-classic.child',
            childLink(
              'classic-to-classic-to-funky-to-funky-to-classic.child.grandchild',
              'grandchild'
            ) + OUTLET
          )
        ),
        child: {
          grandchild: {
            'great-grandchild': {
              'great-great-grandchild.gjs': classicTemplate(
                level(
                  'classic',
                  'classic-to-classic-to-funky-to-funky-to-classic.child.grandchild.great-grandchild.great-great-grandchild'
                )
              ),
            },
          },
        },
      },
    },
    routeComponent:
      routeComponent(
        'ClassicToClassicToFunkyToFunkyToClassicGrandchild',
        level(
          'funky',
          'classic-to-classic-to-funky-to-funky-to-classic.child.grandchild',
          childLink(
            'classic-to-classic-to-funky-to-funky-to-classic.child.grandchild.great-grandchild',
            'great-grandchild'
          ) + OUTLET
        )
      ) +
      routeComponent(
        'ClassicToClassicToFunkyToFunkyToClassicGreatGrandchild',
        level(
          'funky',
          'classic-to-classic-to-funky-to-funky-to-classic.child.grandchild.great-grandchild',
          childLink(
            'classic-to-classic-to-funky-to-funky-to-classic.child.grandchild.great-grandchild.great-great-grandchild',
            'great-great-grandchild'
          ) + OUTLET
        )
      ),
    invokable: `
      'classic-to-classic-to-funky-to-funky-to-classic.child.grandchild': COMPONENTS.ClassicToClassicToFunkyToFunkyToClassicGrandchild,
      'classic-to-classic-to-funky-to-funky-to-classic.child.grandchild.great-grandchild': COMPONENTS.ClassicToClassicToFunkyToFunkyToClassicGreatGrandchild,
    `,
  },

  {
    nav: { route: 'sibling-transitions', label: 'Sibling transitions' },
    routerMap: `
      this.route('sibling-transitions', function () {
        this.route('classic-child');
        this.route('funky-child');
      });
    `,
    routes: {
      'sibling-transitions.js': funkyRoute('sibling-transitions'),
      'sibling-transitions': {
        'classic-child.js': classicRoute('sibling-transitions.classic-child'),
        'funky-child.js': funkyRoute('sibling-transitions.funky-child'),
      },
    },
    templates: {
      'sibling-transitions': {
        'classic-child.gjs': classicTemplate(
          level('classic', 'sibling-transitions.classic-child')
        ),
      },
    },
    routeComponent:
      routeComponent(
        'SiblingTransitions',
        level(
          'funky',
          'sibling-transitions',
          childLink('sibling-transitions.classic-child', 'classic-child') +
            childLink('sibling-transitions.funky-child', 'funky-child') +
            OUTLET
        )
      ) +
      routeComponent(
        'SiblingTransitionsFunkyChild',
        level('funky', 'sibling-transitions.funky-child')
      ),
    invokable: `
      'sibling-transitions': COMPONENTS.SiblingTransitions,
      'sibling-transitions.funky-child': COMPONENTS.SiblingTransitionsFunkyChild,
    `,
  },

  {
    nav: { route: 'funky-route-params', label: 'Funky route params', model: 'roger roger' },
    routerMap: `
      this.route('funky-route-params', { path: '/funky-route-params/:thing_id' });
    `,
    routes: {
      'funky-route-params.js': `
        import FunkyRoute from '__APP__/routes/funky';

        export default class extends FunkyRoute {
          model(params) {
            return params.thing_id;
          }
        }
      `,
    },
    routeComponent: routeComponent(
      'FunkyRouteParams',
      level(
        'funky',
        'funky-route-params',
        modelLink('funky-route-params', 'roger roger') +
          modelLink('funky-route-params', 'May forth be with you')
      )
    ),
    invokable: `'funky-route-params': COMPONENTS.FunkyRouteParams,`,
  },

  {
    nav: { route: 'reactive-context', label: 'Reactive context' },
    routerMap: `
      this.route('reactive-context', function () {
        this.route('child');
      });
    `,
    routes: {
      'reactive-context.js': reactiveRoute('reactive-context'),
      'reactive-context': {
        'child.js': reactiveRoute('reactive-context.child'),
      },
    },
    routeComponent:
      routeComponent(
        'ReactiveContextParent',
        level(
          'reactive',
          'reactive-context',
          childLink('reactive-context.child', 'child') + OUTLET
        )
      ) +
      routeComponent('ReactiveContextChild', level('reactive', 'reactive-context.child')),
    invokable: `
      'reactive-context': COMPONENTS.ReactiveContextParent,
      'reactive-context.child': COMPONENTS.ReactiveContextChild,
    `,
  },

  {
    nav: { route: 'glimmer-wrapper', label: 'Glimmer wrapper' },
    routerMap: `
      this.route('glimmer-wrapper', function () {
        this.route('child');
      });
    `,
    routes: {
      'glimmer-wrapper.js': glimmerRoute('glimmer-wrapper'),
      'glimmer-wrapper': {
        'child.js': glimmerRoute('glimmer-wrapper.child'),
      },
    },
    routeComponent:
      routeComponent(
        'GlimmerWrapperParent',
        level('glimmer', 'glimmer-wrapper', childLink('glimmer-wrapper.child', 'child') + OUTLET)
      ) +
      routeComponent('GlimmerWrapperChild', level('glimmer', 'glimmer-wrapper.child')),
    invokable: `
      'glimmer-wrapper': COMPONENTS.GlimmerWrapperParent,
      'glimmer-wrapper.child': COMPONENTS.GlimmerWrapperChild,
    `,
  },
  {
    nav: { route: 'qp-parent', label: 'Query params' },
    routerMap: `
      this.route('qp-parent', function () {
        this.route('qp-child');
        this.route('qp-funky');
      });
    `,
    routes: {
      'qp-parent.js': `
  import Route from '@ember/routing/route';
  import { action } from '@ember/object';
  import { actionLog, modelStarts } from '__APP__/router';

  export default class extends Route {
    queryParams = {
      parentQp: { refreshModel: true },
      aliased: { as: 'alias' },
      replaced: { replace: true },
    };

    model() {
      modelStarts.push('qp-parent');
      return 'model:qp-parent';
    }

    @action
    nonFrameworkAction(arg) {
      actionLog.push('qp-parent:nonFrameworkAction:' + arg);
    }

    @action
    willTransition() {
      actionLog.push('qp-parent:willTransition');
      return true;
    }

    @action
    didTransition() {
      actionLog.push('qp-parent:didTransition');
      return true;
    }

    @action
    loading() {
      actionLog.push('qp-parent:loading');
      return true;
    }

    @action
    error() {
      actionLog.push('qp-parent:error');
      return true;
    }
  }
`,
      'qp-parent': {
        'qp-child.js': `
  import Route from '@ember/routing/route';
  import { action } from '@ember/object';
  import { actionLog } from '__APP__/router';

  export default class extends Route {
    queryParams = { childQp: {} };

    model() {
      return 'model:qp-parent.qp-child';
    }

    beforeModel(transition) {
      transition.trigger(false, 'nonFrameworkAction', 'from-child');
    }

    @action
    queryParamsDidChange() {
      actionLog.push('qp-child:queryParamsDidChange');
      return true;
    }
  }
`,
        'qp-funky.js': funkyRoute('qp-parent.qp-funky'),
      },
    },
    controllers: {
      'qp-parent.js': `
  import Controller from '@ember/controller';

  export default class extends Controller {
    queryParams = ['parentQp', 'aliased', 'replaced'];
    parentQp = 'default';
    aliased = 'alias-default';
    replaced = 'replaced-default';
  }
`,
      'qp-parent': {
        'qp-child.js': `
  import Controller from '@ember/controller';

  export default class extends Controller {
    queryParams = ['childQp'];
    childQp = 'child-default';
  }
`,
      },
    },
    templates: {
      'qp-parent.gjs': classicTemplate(
        level(
          'classic',
          'qp-parent',
          childLink('qp-parent.qp-child', 'qp child') +
            childLink('qp-parent.qp-funky', 'qp funky') +
            OUTLET
        )
      ),
      'qp-parent': {
        'qp-child.gjs': classicTemplate(level('classic', 'qp-parent.qp-child')),
      },
    },
    routeComponent: routeComponent('QpFunky', level('funky', 'qp-parent.qp-funky')),
    invokable: `'qp-parent.qp-funky': COMPONENTS.QpFunky,`,
  },
];

export const navItem = ({ route, label, model }: Scenario['nav']) => `
            <li>
              <LinkTo @route="${route}"${
                model ? ` @model="${model}"` : ''
              } data-test-scenario-link="${route}">
                ${label}
              </LinkTo>
            </li>`;
