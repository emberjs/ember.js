// gxt NATIVE layer — alias target for `@ember/-internals/glimmer/lib/views/outlet`
// (registered as `view:-outlet`), plus the two outlet pieces classic Ember keeps
// in `syntax/outlet.ts` / `component-managers/{outlet,route-template}.ts` /
// `templates/outlet.ts`:
//
//   OutletView     the router's top-level view. Holds the router's outlet state
//                  in a gxt cell: `setOutletState` = one cell write, which
//                  re-renders exactly the outlet levels whose state changed.
//                  `appendTo` schedules `renderer.appendOutletView` in the render
//                  queue like classic; the renderer renders `Outlet` as an app
//                  root (native/renderer.ts `renderRoot`).
//   Outlet         the component gxt renders for `{{outlet}}` (`$_outlet(ctx)`,
//                  registered as the gxt `outletComponent` host hook by
//                  install.ts). Reads the PARENT outlet state from the render
//                  context (`OUTLET_STATE`), renders `outlets.main.render.template`
//                  with `@model` / `@controller`, and provides its own state to
//                  the outlets below it.
//   OutletTemplate the `template:-outlet` template (a route template that renders
//                  just `{{outlet}}`): the top level and routes without a template.
//
// Classic semantics kept (syntax/outlet.ts `outletHelper`):
//   - an outlet level re-renders only when its definition is UNSTABLE — a
//     different template or controller; otherwise the rendered route stays and
//     only `@model` follows the state;
//   - once a definition has been replaced, its `@model` stays frozen (the
//     outgoing route never sees the incoming route's model);
//   - the route renders with the outlet state's owner (`render.owner`).
//
// Route templates are COMPONENTS (`hasInternalComponentManager`: a strict
// `.gjs`/`.gts` template (gxt template function), a component class, a
// `templateOnly()` definition) or LOOSE templates (`this` = the controller,
// rendered through `selfComponent`, NATIVE_FLAGS.EMBER_SELF): runtime-compiled
// or a build-time `precompileTemplate(…)` compiled by gxt. Anything else (a
// wire-format template from a stale pre-compiled addon) fails loudly instead of
// rendering wrongly.
//
// The outlet manages its own region instead of gxt `$_dc` (`$_dc` leaves one
// anchor comment behind per swap and treats object definitions
// (`templateOnly()`) as rendered instances). Like Glimmer's, the region is
// exactly the route's content — no anchor around it (the Inspector bounds of
// every outlet / route-template level are the content's first / last nodes);
// a swap inserts the incoming route where the outgoing one was. Only an EMPTY
// level (no route, or a route that rendered no DOM) holds a placeholder
// comment, as Glimmer leaves `<!---->`.
import { type InternalOwner, getOwner } from '@ember/-internals/owner';
import { assert } from '@ember/debug';
import { _instrumentStart } from '@ember/instrumentation';
import { schedule } from '@ember/runloop';
import {
  $_args,
  $_c,
  $_edp,
  $_fin,
  $_GET_ARGS,
  $_outlet,
  $_tpl,
  cell,
  destroyElementSync,
  effect,
  getContext,
  getTracker,
  initDOM,
  provideContext,
  registerDestructor,
  RENDERED_NODES_PROPERTY,
  renderElement,
  setTracker,
  type Cell,
} from '@lifeart/gxt';
import { hasInternalComponentManager } from './manager-api';
import { nameNode, OWNER } from './managers';
import type { NativeRenderRoot, Renderer } from './renderer';
import {
  factoryForTemplate,
  isLooseTemplate,
  selfComponent,
  templateFor,
} from './template-factory';

export interface BootEnvironment {
  hasDOM: boolean;
  isInteractive: boolean;
  _renderMode?: string;
  options: unknown;
}

/** `@ember/-internals/glimmer/lib/utils/outlet` RenderState (route.ts builds it). */
interface RenderState {
  owner: InternalOwner;
  name: string;
  controller: unknown;
  model: unknown;
  template: unknown;
}

/** `@ember/-internals/glimmer/lib/utils/outlet` OutletState (router `_setOutlets`). */
interface OutletState {
  render: RenderState | undefined;
  outlets: { main: OutletState | undefined };
}

/**
 * A live view of the outlet state one outlet level reads. Provided as an object
 * with a getter — gxt `getContext` would INVOKE a provided function once.
 * Reading `state` reads through to the OutletView cell, so it subscribes the
 * reading formula.
 */
interface OutletRef {
  readonly state: OutletState | undefined;
}

/** gxt render context key: the outlet state for the `{{outlet}}`s below a node. */
export const OUTLET_STATE: unique symbol = Symbol('ember-native-outlet-state');

const TOP_LEVEL_NAME = '-top-level';

// ---------------------------------------------------------------- render tree
// Inspector: outlet nodes become `type: 'outlet'` (name `main`), the node an
// outlet renders for a route TEMPLATE becomes `type: 'route-template'` (name =
// the route, instance = its controller) like classic (native/renderer.ts
// debugRenderTree).
const OUTLET_NODES = new WeakSet<object>();
const ROUTE_NODES = new WeakSet<object>();

export function outletNodeKind(node: unknown): 'outlet' | 'route-template' | undefined {
  if (typeof node !== 'object' || node === null) return undefined;
  if (OUTLET_NODES.has(node)) return 'outlet';
  if (ROUTE_NODES.has(node)) return 'route-template';
  return undefined;
}

// The first / last DOM node a rendered gxt node (or rendered-nodes list) placed
// at its own level, descending into nested nodes; null when it has none.
function edgeNode(item: unknown, fromStart: boolean): Node | null {
  if (item === null || typeof item !== 'object') return null;
  if (typeof (item as Node).nodeType === 'number') return item as Node;
  const list = Array.isArray(item)
    ? item
    : ((item as Record<PropertyKey, unknown>)[RENDERED_NODES_PROPERTY] as unknown[] | undefined);
  if (!Array.isArray(list)) return null;
  for (let i = 0; i < list.length; i++) {
    const found = edgeNode(list[fromStart ? i : list.length - 1 - i], fromStart);
    if (found !== null) return found;
  }
  return null;
}

// ---------------------------------------------------------------- definitions
// What one outlet level renders (classic `OutletDefinitionState`).
interface Definition {
  readonly name: string;
  readonly template: object;
  readonly controller: unknown;
  readonly render: RenderState;
}

// classic component-managers/outlet.ts: "main" used to be the outlet name.
function instrumentationPayload(definition: Definition): { object: string } {
  return { object: `${definition.name}:main` };
}

function definitionOf(state: OutletState | undefined): Definition | null {
  const render = state?.render;
  if (render === undefined) return null;
  const template = render.template;
  if (template === undefined || template === null) return null;
  return { name: render.name, template: template as object, controller: render.controller, render };
}

// classic `isStable` (plus "nothing rendered / nothing to render" stays put).
function isStable(next: Definition | null, current: Definition | null): boolean {
  if (next === null || current === null) return next === current;
  return next.template === current.template && next.controller === current.controller;
}

function untracked<T>(fn: () => T): T {
  const tracker = getTracker();
  setTracker(null);
  try {
    return fn();
  } finally {
    setTracker(tracker);
  }
}

type GxtNode = Record<PropertyKey, unknown> & object;

/**
 * The `{{outlet}}` component (gxt `outletComponent` host hook). Constructed by
 * gxt (`new Outlet(args)`) as a render-tree child of the context the
 * `{{outlet}}` appears in.
 */
export function Outlet(this: GxtNode): unknown {
  $_GET_ARGS(this as never, arguments);
  const outlet = this;
  OUTLET_NODES.add(outlet);
  nameNode(outlet, 'main');

  const parent = getContext<OutletRef>(outlet as never, OUTLET_STATE, false);
  const ref: OutletRef = {
    get state() {
      return parent?.state?.outlets.main;
    },
  };
  provideContext(outlet as never, OUTLET_STATE, ref);

  const api = initDOM(outlet as never);
  // Holds the position of an EMPTY level (see the module comment).
  const placeholder = api.comment('');
  let current: Definition | null = null;
  let rendered: GxtNode | null = null;
  let destroyed = false;
  registerDestructor(outlet, () => {
    destroyed = true;
  });
  outlet[RENDERED_NODES_PROPERTY] = [placeholder];

  const renderRoute = (definition: Definition): GxtNode => {
    const { template, render } = definition;
    // A LOOSE route template (runtime-compiled, `this` = the controller):
    // rendered on a fresh gxt node whose self is the controller.
    const loose = isLooseTemplate(template);
    if (!loose && !hasInternalComponentManager(template)) {
      throw new Error(
        `native route template for \`${definition.name}\` is neither a component nor a gxt-compiled template (a wire-format template from a pre-compiled addon?): compile it with the gxt compiler — a \`.gjs\`/\`.gts\` route template, or a \`precompileTemplate(…)\` call`
      );
    }
    // Routable engines render with their own owner (classic outletOwner).
    if (render.owner !== undefined) provideContext(outlet as never, OWNER, render.owner);
    // `@model` follows the state while this definition is current, then stays
    // frozen at its last value (classic).
    let model = render.model;
    const args = $_args(
      {
        model: () => (current === definition ? (model = ref.state?.render?.model) : model),
        controller: definition.controller,
      },
      false,
      $_edp as never
    );
    const definitionToRender = loose ? selfComponent(template, definition.controller) : template;
    const node = $_c(definitionToRender as never, args, outlet as never) as unknown as GxtNode;
    nameNode(node, definition.name);
    // Classic: a route TEMPLATE (loose, or the default `{{outlet}}` one) renders
    // as a `route-template` node; a route template that IS a component (a
    // `.gjs` / `.gts` template, a component class) renders as that component.
    if (loose || template === OutletTemplate) ROUTE_NODES.add(node);
    return node;
  };

  const swap = (next: Definition | null): void => {
    const previous = rendered;
    rendered = null;
    current = next;
    // Where the level's content sits now (before the outlet itself is
    // inserted — the first render — nowhere: the parent inserts our nodes).
    const shown = (outlet[RENDERED_NODES_PROPERTY] as unknown[]) ?? [];
    const last = edgeNode(shown, false);
    const parent = last === null ? null : api.parent(last);
    const before = last === null ? null : last.nextSibling;
    // Outgoing route first: its destructors run and its DOM leaves.
    if (previous !== null) destroyElementSync(previous as never, false, api);
    if (placeholder.parentNode !== null) placeholder.parentNode.removeChild(placeholder);
    if (next !== null) {
      // Classic `render.outlet` instrumentation: every route level an outlet
      // renders (a view-less node), from its creation to its rendered layout.
      const finalize = _instrumentStart('render.outlet', instrumentationPayload, next);
      rendered = renderRoute(next);
      // In place: where the outgoing content / the placeholder was.
      if (parent !== null) renderElement(api, outlet as never, parent, rendered as never, before);
      finalize();
    }
    // A level without DOM keeps the placeholder so it can be filled in place.
    // (On the first render the content is not resolved yet — pending text /
    // thunks — so only a route that rendered nothing at all counts as empty.)
    const empty =
      rendered === null ||
      (parent !== null
        ? edgeNode(rendered, true) === null
        : ((rendered[RENDERED_NODES_PROPERTY] as unknown[] | undefined) ?? []).length === 0);
    if (empty && parent !== null) parent.insertBefore(placeholder, before);
    outlet[RENDERED_NODES_PROPERTY] =
      rendered === null ? [placeholder] : empty ? [rendered, placeholder] : [rendered];
  };

  // Re-runs whenever the outlet state this level reads changes (one gxt cell,
  // written by OutletView.setOutletState); rendering itself is untracked.
  effect(() => {
    const next = definitionOf(ref.state);
    if (destroyed || isStable(next, current)) return;
    untracked(() => swap(next));
  }, outlet);

  return $_fin(outlet[RENDERED_NODES_PROPERTY] as never, outlet as never);
}

/**
 * `template:-outlet`: the route template that renders only `{{outlet}}` — the
 * top level, and every route without a template of its own.
 */
const OutletTemplate = $_tpl(function OutletTemplate(this: GxtNode): unknown {
  $_GET_ARGS(this as never, arguments);
  return $_fin([$_outlet(this as never)], this as never);
});

export const outletTemplateFactory = factoryForTemplate(OutletTemplate as never);

// ---------------------------------------------------------------- OutletView
export default class OutletView {
  static extend(injections: object): typeof OutletView {
    return class extends OutletView {
      static create(options: any) {
        return super.create(options ? Object.assign({}, injections, options) : injections);
      }
    };
  }

  static reopenClass(injections: object): void {
    Object.assign(this, injections);
  }

  static create(options: {
    environment: BootEnvironment;
    application: InternalOwner;
    template: unknown;
  }): OutletView {
    const owner = getOwner(options);
    assert('OutletView is unexpectedly missing an owner', owner);
    // classic: `templateFactory(owner)`
    const template = templateFor(options.template, owner) ?? options.template;
    return new OutletView(options.environment, owner, template, options.application);
  }

  /** The top-level outlet state; `outlets.main` is the router's state (a gxt cell). */
  readonly state: OutletState;
  /** What the root outlet reads: a parent whose `outlets.main` is the router's state. */
  readonly rootRef: OutletRef;
  readonly #main: Cell<OutletState | undefined>;
  #root: NativeRenderRoot | null = null;

  constructor(
    private _environment: BootEnvironment,
    public owner: InternalOwner,
    public template: unknown,
    public namespace: unknown
  ) {
    const main = cell<OutletState | undefined>(undefined, 'ember-outlet-state');
    this.#main = main;
    this.state = {
      render: { owner, name: TOP_LEVEL_NAME, controller: undefined, model: undefined, template },
      outlets: {
        get main() {
          return main.value;
        },
      },
    };
    // The root outlet reads the router's state directly: like classic's root
    // outlet, the top level contributes no render-tree node of its own.
    const root: OutletState = {
      render: undefined,
      outlets: {
        get main() {
          return main.value;
        },
      },
    };
    this.rootRef = { state: root };
  }

  appendTo(selector: string | Element): void {
    const target =
      this._environment.hasDOM && typeof selector === 'string'
        ? document.querySelector(selector)
        : selector;
    const renderer = this.owner.lookup('renderer:-dom') as Renderer;
    schedule('render', renderer, 'appendOutletView', this, target as Element);
  }

  /** Called by `Renderer#appendOutletView` with the root it rendered. */
  attachRoot(root: NativeRenderRoot): void {
    const previous = this.#root;
    this.#root = root;
    if (previous !== null) previous.destroy();
  }

  rerender(): void {
    // updates are driven by the outlet-state cell (classic: no-op as well)
  }

  setOutletState(state: OutletState): void {
    this.#main.update(state);
  }

  destroy(): void {
    const root = this.#root;
    this.#root = null;
    if (root !== null) root.destroy();
  }
}
