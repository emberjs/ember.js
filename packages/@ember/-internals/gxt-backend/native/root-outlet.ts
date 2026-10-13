// gxt NATIVE layer — alias target for
// `@ember/-internals/routing/route-managers/root-outlet`.
//
// Upstream's router renders routes through route managers: `_setOutlets` builds
// a chain of `OutletState`s (route-managers/outlet-state.ts: `manager`,
// `bucket`, `routeInfo`, tracked `context` / `invokable`), keeps it in the
// `UpdatableOutletRootState` this module creates, and renders the `RootOutlet`
// component with `ApplicationInstance#renderRootComponent`. That component
// renders through Glimmer VM internal component managers, so native replaces
// the module: the root outlet is the native `OutletView` (native/outlet.ts),
// which renders the `{ render, outlets }` outlet-state chain the native
// `Outlet` component reads. Each level of that chain is a live view of one
// upstream `OutletState`:
//
//   render.owner       the route's owner (an engine instance below a mount)
//   render.name        the route name
//   render.controller  a classic route's controller (`bucket.controller`)
//   render.model       the state's tracked `context` (reading it subscribes)
//   render.template    a classic route's template, looked up once per route
//                      bucket (upstream builds a route's invokable once per
//                      bucket too): `template:<name>` called with the owner,
//                      a component as is, or the native `-outlet` template
//                      for a route without one; for a route of another route
//                      manager, the state's tracked `invokable`.
//
// native/renderer.ts `renderComponent` renders a `RootOutlet` with
// `Renderer#appendOutletView`.
import { getOwner, type InternalOwner } from '@ember/-internals/owner';
import { assert } from '@ember/debug';
import { DEBUG } from '@glimmer/env';
import { hasInternalComponentManager } from './manager-api';
import OutletView, { outletTemplateFactory, type BootEnvironment } from './outlet';
import { templateFor } from './template-factory';

/** What native reads of upstream's `OutletState` (route-managers/outlet-state.ts). */
interface UpstreamOutletState {
  readonly name: string;
  readonly bucket: object;
  readonly context: unknown;
  readonly invokable: object | undefined;
  readonly outlets: { main: UpstreamOutletState | undefined };
}

interface ClassicRouteLike {
  routeName: string;
  templateName?: string | null;
  controller?: unknown;
}

/** The `{ render, outlets }` level the native `Outlet` reads. */
interface LegacyOutletState {
  render: {
    owner: InternalOwner;
    name: string;
    controller: unknown;
    model: unknown;
    template: unknown;
  };
  outlets: { main: LegacyOutletState | undefined };
}

/** classic route bucket → its route template (one lookup per bucket). */
const ROUTE_TEMPLATES = new WeakMap<object, object>();

function routeTemplate(route: ClassicRouteLike, owner: InternalOwner): object {
  let name = route.templateName || route.routeName;
  let found = owner.lookup(`template:${name}`) as unknown;

  if (found === undefined || found === null) {
    // default `{{outlet}}`
    return templateFor(outletTemplateFactory as never, owner) as object;
  }

  if (hasInternalComponentManager(found as object)) {
    return found as object;
  }

  if (DEBUG && typeof found !== 'function') {
    let label: string;
    try {
      label = `\`${String(found)}\``;
    } catch {
      label = 'an unknown object';
    }
    assert(
      `Failed to render the ${route.routeName} route, expected ` +
        `\`template:${name}\` to resolve into ` +
        `a component or a \`TemplateFactory\`, got: ${label}. ` +
        `Most likely an improperly defined class or an invalid module export.`
    );
  }

  return (found as (owner: InternalOwner) => object)(owner);
}

function legacyLevel(state: UpstreamOutletState, rootOwner: InternalOwner): LegacyOutletState {
  let bucket = state.bucket as { route?: ClassicRouteLike; controller?: unknown };
  let route = bucket.route;
  let owner = (route !== undefined ? getOwner(route as object) : rootOwner) as InternalOwner;

  let template: () => unknown;
  if (route !== undefined) {
    let cached = ROUTE_TEMPLATES.get(bucket);
    if (cached === undefined) {
      cached = routeTemplate(route, owner);
      ROUTE_TEMPLATES.set(bucket, cached);
    }
    let found = cached;
    template = () => found;
  } else {
    template = () => state.invokable;
  }

  return {
    render: {
      owner,
      name: state.name,
      get controller() {
        return bucket.controller;
      },
      get model() {
        return state.context;
      },
      get template() {
        return template();
      },
    },
    outlets: {
      get main() {
        let child = state.outlets.main;
        return child === undefined ? undefined : legacyLevel(child, rootOwner);
      },
    },
  };
}

/**
 * The router's root outlet state: upstream's `UpdatableOutletRootState`
 * surface (`state`, `set`), held for the native `OutletView` that renders it.
 */
export class NativeRootOutletState {
  #current: UpstreamOutletState;
  #view: OutletView | null = null;
  #owner: InternalOwner | null = null;

  constructor(initial: UpstreamOutletState) {
    this.#current = initial;
  }

  get state(): { outlets: { main: UpstreamOutletState } } {
    let current = this.#current;
    return { outlets: { main: current } };
  }

  set(root: UpstreamOutletState): void {
    this.#current = root;
    let view = this.#view;
    if (view !== null) view.setOutletState(legacyLevel(root, this.#owner!) as never);
  }

  /** The top-level view for `owner`, created on the first render. */
  viewFor(owner: InternalOwner): OutletView {
    let view = this.#view;
    if (view === null) {
      let environment = owner.lookup('-environment:main') as BootEnvironment;
      let application = owner.lookup('application:main');
      view = new OutletView(
        environment,
        owner,
        templateFor(outletTemplateFactory as never, owner) ?? outletTemplateFactory,
        application
      );
      this.#view = view;
      this.#owner = owner;
      view.setOutletState(legacyLevel(this.#current, owner) as never);
    }
    return view;
  }
}

export type UpdatableOutletRootState = NativeRootOutletState;

export function createRootOutletState(initial: UpstreamOutletState): NativeRootOutletState {
  return new NativeRootOutletState(initial);
}

/** The root outlet `renderRootComponent` renders (native/renderer.ts). */
export class RootOutlet {
  constructor(readonly state: NativeRootOutletState) {}
}
