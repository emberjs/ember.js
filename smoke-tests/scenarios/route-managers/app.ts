import type { FileTree } from './fixtures';
import { SCENARIOS, navItem } from './fixtures';

export function appFiles(appName: string): FileTree {
  let invokableMap = SCENARIOS.map((scenario) => scenario.invokable ?? '').join('\n');

  return substitute(
    {
      'router.js': `
      import EmberRouter from '@ember/routing/router';
      import config from '__APP__/config/environment';

      export let modelStarts = [];
      export let actionLog = [];

      export function resetModelStarts() {
        modelStarts = [];
      }

      export function resetActionLog() {
        actionLog = [];
      }

      export default class Router extends EmberRouter {
        location = config.locationType;
        rootURL = config.rootURL;
      }

      Router.map(function () {${SCENARIOS.map((scenario) => scenario.routerMap).join('')}});
    `,
      styles: {
        'app.css': STYLES,
      },
      components: {
        'funky-outlet.gjs': FUNKY_OUTLET,
        'reactive-outlet.gjs': REACTIVE_OUTLET,
        'outlet-with-service.gjs': OUTLET_WITH_SERVICE,
        'funky-route-components.gjs': `
        import Component from '@glimmer/component';
        import { service } from '@ember/service';
        import { LinkTo } from '@ember/routing';
${SCENARIOS.map((scenario) => scenario.routeComponent ?? '').join('')}      `,
      },
      'route-managers': {
        'reactive.js': REACTIVE_MANAGER,
        'funky.js': FUNKY_MANAGER,
      },
      routes: {
        'funky.js': managedRouteBase('FunkyRoute', 'FunkyRouteManager', 'funky'),
        'reactive.js': managedRouteBase('ReactiveRoute', 'ReactiveRouteManager', 'reactive'),
        'glimmer-route.js': GLIMMER_ROUTE_BASE,
        ...Object.assign({}, ...SCENARIOS.map((scenario) => scenario.routes)),
      },
      controllers: Object.assign({}, ...SCENARIOS.map((scenario) => scenario.controllers ?? {})),
      services: {
        'wrapper-log.js': WRAPPER_LOG_SERVICE,
      },
      templates: {
        'application.gjs': `
      import { LinkTo } from '@ember/routing';

      <template>
        <nav aria-label="Route manager scenarios" data-test-scenario-nav>
          <h1>Route manager scenarios</h1>
          <ul>${SCENARIOS.map((scenario) => navItem(scenario.nav)).join('')}
          </ul>
        </nav>

        {{outlet}}
      </template>
    `,
        ...Object.assign({}, ...SCENARIOS.map((scenario) => scenario.templates ?? {})),
      },
    },
    { __APP__: appName, __ROUTES__: invokableMap }
  );
}

function substitute(tree: FileTree, values: Record<string, string>): FileTree {
  let out: FileTree = {};

  for (let [name, entry] of Object.entries(tree)) {
    out[name] =
      typeof entry === 'string'
        ? Object.entries(values).reduce(
            (source, [token, value]) => source.split(token).join(value),
            entry
          )
        : substitute(entry, values);
  }

  return out;
}

const managedRouteBase = (className: string, managerClass: string, managerModule: string) => `
  import { setOwner } from '@ember/owner';
  import { setRouteManager } from '@ember/routing';
  import ${managerClass} from '__APP__/route-managers/${managerModule}';

  export default class ${className} {
    constructor(owner) {
      setOwner(this, owner);
    }
  }

  setRouteManager((owner) => new ${managerClass}(owner), ${className});
`;

const GLIMMER_ROUTE_BASE = `
  import { setOwner } from '@ember/owner';
  import { setRouteManager } from '@ember/routing';
  import ReactiveRouteManager from '__APP__/route-managers/reactive';
  import OutletWithService from '__APP__/components/outlet-with-service';

  class ServiceWrapperRouteManager extends ReactiveRouteManager {
    getRouteWrapper() {
      return OutletWithService;
    }
  }

  export default class GlimmerRoute {
    constructor(owner) {
      setOwner(this, owner);
    }
  }

  setRouteManager((owner) => new ServiceWrapperRouteManager(owner), GlimmerRoute);
`;

const REACTIVE_MANAGER = `
  import { routeCapabilities } from '@ember/routing';

  import { ReactiveOutlet } from '__APP__/components/reactive-outlet';
  import * as COMPONENTS from '__APP__/components/funky-route-components';

  const ROUTES = {
__ROUTES__
  };

  class ReactiveBucket {
    constructor(name, route) {
      this.name = name;
      this.route = route;
    }
  }

  export default class ReactiveRouteManager {
    capabilities = routeCapabilities('1.0');

    constructor(owner) {
      this.owner = owner;
    }

    createRoute(RouteClass, { name }) {
      return new ReactiveBucket(name, new RouteClass(this.owner));
    }

    getDestroyable() {
      return null;
    }

    getRouteWrapper() {
      return ReactiveOutlet;
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
      return ROUTES[bucket.name];
    }
  }
`;

const FUNKY_MANAGER = `
  import { routeCapabilities } from '@ember/routing';
  import { FunkyBucket, FunkyOutlet } from '__APP__/components/funky-outlet';
  import * as COMPONENTS from '__APP__/components/funky-route-components';

  const ROUTES = {
__ROUTES__
  };

  export default class FunkyRouteManager {
    capabilities = routeCapabilities('1.0');

    constructor(owner) {
      this.owner = owner;
    }

    createRoute(RouteClass, { name }) {
      return new FunkyBucket(name, new RouteClass(this.owner));
    }

    getDestroyable() {
      return null;
    }

    getRouteWrapper() {
      return FunkyOutlet;
    }

    willEnter() {}

    async enter(bucket, state) {
      let info = state.to.find((i) => i.name === bucket.name) ?? state.to;
      return bucket.route.model?.(info.params);
    }

    didEnter() {}
    willExit() {}
    exit() {}
    didExit() {}

    async getInvokable(bucket) {
      return ROUTES[bucket.name];
    }
  }
`;

const FUNKY_OUTLET = `
  import Component from '@glimmer/component';
  import { tracked } from '@glimmer/tracking';
  import { on } from '@ember/modifier';

  export class FunkyBucket {
    constructor(name, route) {
      this.name = name;
      this.route = route;
    }
  }

  class FunkyGate extends Component {
    @tracked shouldRender = false;

    renderRoute = () => {
      this.shouldRender = true;
    };

    <template>
      {{#if this.shouldRender}}
        <@Component @context={{@context}} @outlet={{@outlet}} />
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

  export const FunkyOutlet = <template>
    <FunkyGate
      @Component={{@Component}}
      @context={{@context}}
      @bucket={{@bucket}}
      @outlet={{@outlet}}
    />
  </template>;
`;

const REACTIVE_OUTLET = `
  export const ReactiveOutlet = <template>
    <@Component @context={{@context}} @outlet={{@outlet}} />
  </template>;
`;

const OUTLET_WITH_SERVICE = `
  import Component from '@glimmer/component';
  import { service } from '@ember/service';
  import { getOwner } from '@ember/owner';

  export default class OutletWithService extends Component {
    @service wrapperLog;

    constructor(owner, args) {
      super(owner, args);
      this.wrapperLog.record('created:' + this.args.bucket.name);
    }

    get ownerTag() {
      return getOwner(this) === undefined ? 'missing' : 'present';
    }

    willDestroy() {
      super.willDestroy();
      this.wrapperLog.record(
        'destroyed:' + this.args.bucket.name + '=' + this.args.context
      );
    }

    <template>
      <div
        data-test-outlet-with-service={{@bucket.name}}
        data-test-wrapper-owner={{this.ownerTag}}
      >
        <@Component @context={{@context}} @outlet={{@outlet}} />
      </div>
    </template>
  }
`;

const WRAPPER_LOG_SERVICE = `
  import Service from '@ember/service';

  export default class WrapperLogService extends Service {
    entries = [];

    record(entry) {
      this.entries.push(entry);
    }

    reset() {
      this.entries = [];
    }
  }
`;

const STYLES = `
  :root {
    color: #172033;
    font-family: Inter, ui-sans-serif, system-ui, sans-serif;
    background: #f4f7fb;
  }

  body {
    margin: 0;
    padding: 1.5rem;
  }

  [data-test-scenario-nav] h1 {
    font-size: 1.25rem;
  }

  [data-test-scenario-nav] ul {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    padding: 0;
    list-style: none;
  }

  [data-test-scenario-nav] a {
    display: block;
    padding: 0.5rem 0.75rem;
    border: 1px solid #cbd5f5;
    border-radius: 0.5rem;
    color: #1d4ed8;
    background: white;
    text-decoration: none;
    font-weight: 600;
  }

  [data-test-child-link],
  [data-test-model-link] {
    display: inline-block;
    margin-top: 0.5rem;
    margin-right: 0.75rem;
    color: #1d4ed8;
    font-weight: 700;
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

  [data-test-route] {
    display: block;
    margin-top: 1rem;
    padding: 1rem;
    border: 2px solid;
    border-radius: 0.75rem;
    background: white;
    box-shadow: 0 0.25rem 0.75rem rgb(23 32 51 / 8%);
  }

  [data-test-route]::before {
    content: attr(data-test-route-kind) " route manager · " attr(data-test-route);
    display: block;
    margin: -1rem -1rem 1rem;
    padding: 0.75rem 1rem;
    color: white;
    font-size: 0.75rem;
    font-weight: 800;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  [data-test-route-kind="classic"] {
    border-color: #b45309;
  }

  [data-test-route-kind="classic"]::before {
    background: #b45309;
  }

  [data-test-route-kind="funky"] {
    border-color: #2563eb;
  }

  [data-test-route-kind="funky"]::before {
    background: #2563eb;
  }

  [data-test-route-kind="reactive"] {
    border-color: #7c3aed;
  }

  [data-test-route-kind="reactive"]::before {
    background: #7c3aed;
  }

  [data-test-route-kind="glimmer"] {
    border-color: #0f766e;
  }

  [data-test-route-kind="glimmer"]::before {
    background: #0f766e;
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

  [data-test-outlet-boundary] > [data-test-route] {
    margin-top: 0;
  }
`;
