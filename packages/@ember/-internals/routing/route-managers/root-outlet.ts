/**
  The component rendered at the very top of the application by
  `Router#_setOutlets` (via `ApplicationInstance#renderRootComponent`), and the
  resolution it drives: what renders at each outlet position below it, and how
  to walk to the next one.

  The walk lives here rather than beside an outlet implementation because
  resolution has to import every implementation it can dispatch to. An
  implementation is instead *handed* `childOutletRefFor` — as the
  `ChildOutletRefFactory` argument to `getCachedComponent`, or as the second
  argument to `RouteManager#getOutlet`. That keeps the imports pointing one way
  (and the build rejects the cycle if they ever stop), but the reason is
  `@outlet` opacity: an implementation receives a finished ref for the level
  beneath it and has no way to construct or reparameterize one, because it
  never holds the resolver.
*/

import type {
  CustomRenderNode,
  DynamicScope,
  InternalComponentCapabilities,
  InternalComponentManager,
  WithCreateInstance,
  WithCustomDebugRenderTree,
} from '@glimmer/interfaces';
import type { InternalOwner } from '@ember/-internals/owner';
import type { Reference } from '@glimmer/reference/lib/reference';
import { createComputeRef, createConstRef, valueForRef } from '@glimmer/reference/lib/reference';
import { setInternalComponentManager } from '@glimmer/manager/lib/internal/api';
import { setComponentTemplate } from '@glimmer/manager/lib/public/template';
import { precompileTemplate } from '@ember/template-compilation';
import { assert } from '@ember/debug';
import { DEBUG } from '@glimmer/env';
import type { OutletState } from './outlet-state';
import { OutletComponent } from './classic/outlet-manager';
// EXPERIMENT ONLY — see EXPERIMENT-CLASSIC-OUTLET-USAGE.md
import { recordUse } from './probe';
import { consumeTag } from '@glimmer/validator/lib/tracking';
import { createTag, DIRTY_TAG as dirtyTag } from '@glimmer/validator/lib/validators';
import { EMPTY_ARGS } from '@glimmer/runtime/lib/vm/arguments';

const ROOT_OUTLET_TEMPLATE = precompileTemplate('{{this}}', {
  moduleName: 'packages/@ember/-internals/routing/route-managers/root-outlet.hbs',
  strictMode: true,
});

const CAPABILITIES: InternalComponentCapabilities = {
  dynamicLayout: false,
  dynamicTag: false,
  prepareArgs: false,
  createArgs: false,
  attributeHook: false,
  elementHook: false,
  createCaller: false,
  dynamicScope: true,
  updateHook: false,
  createInstance: true,
  wrapped: false,
  willDestroy: false,
  hasSubOwner: false,
};

/**
 * Classic components track their `parentView` through a `view` on `scope`
 */
interface ViewCarryingScope extends DynamicScope {
  view?: unknown;
  child(): ViewCarryingScope;
}

function carryParentView(scope: ViewCarryingScope): ViewCarryingScope {
  if (!('view' in scope)) {
    scope.view = null;
  }

  let child = scope.child.bind(scope);
  scope.child = () => {
    let next = child();
    next.view = scope.view;
    return carryParentView(next);
  };

  return scope;
}

/**
 * The buckets identify the two synthetic debug-render-tree nodes the root
 * outlet contributes (the top-level `{{outlet}}` and its `-top-level`
 * route-template). They must be stable across the create/didRender passes, so
 * they live on the component instance state.
 */
interface RootOutletState {
  outletBucket: object;
  routeTemplateBucket: object;
  self: Reference;
}

class RootOutletManager
  implements
    InternalComponentManager<RootOutletState, RootOutlet>,
    WithCreateInstance<RootOutletState, RootOutlet>,
    WithCustomDebugRenderTree<RootOutletState, RootOutlet>
{
  getCapabilities(): InternalComponentCapabilities {
    return CAPABILITIES;
  }

  create(
    owner: object,
    definition: RootOutlet,
    _args: unknown,
    _env: unknown,
    dynamicScope: DynamicScope | null
  ): RootOutletState {
    recordUse('root-outlet:create');
    assert('Expected the root outlet to be created with a dynamic scope', dynamicScope !== null);

    carryParentView(dynamicScope as ViewCarryingScope);

    return {
      outletBucket: {},
      routeTemplateBucket: {},
      self: childOutletRefFor(definition.stateRef, owner as InternalOwner),
    };
  }

  getDebugName(): string {
    return '-top-level-outlet';
  }

  /**
   * Emit the top-level frame the classic `OutletView` used to provide: an
   * `{{outlet}}` node wrapping the `-top-level` route-template. These nest (so
   * the application's own outlet renders beneath them) and both inherit the
   * root outlet's bounds — matching the render tree Ember Inspector expects.
   */
  getDebugCustomRenderTree(_definition: RootOutlet, state: RootOutletState): CustomRenderNode[] {
    return [
      {
        bucket: state.outletBucket,
        type: 'outlet',
        name: 'main',
        args: EMPTY_ARGS,
        instance: undefined,
      },
      {
        bucket: state.routeTemplateBucket,
        type: 'route-template',
        name: '-top-level',
        args: EMPTY_ARGS,
        instance: undefined,
      },
    ];
  }

  getSelf({ self }: RootOutletState): Reference {
    return self;
  }

  didCreate() {}
  didUpdate() {}
  didRenderLayout() {}
  didUpdateLayout() {}

  getDestroyable(): null {
    return null;
  }
}

export class RootOutlet {
  readonly stateRef: Reference<OutletState>;

  constructor(state: UpdatableOutletRootState) {
    this.stateRef = createConstRef(state.state, '-top-level');
  }
}

export interface UpdatableOutletRootState {
  state: OutletState;
  set(root: OutletState): void;
}

export function createRootOutletState(
  owner: InternalOwner,
  initial: OutletState
): UpdatableOutletRootState {
  recordUse('root-outlet:create-state');
  let tag = createTag();
  let current = initial;

  let state: OutletState = {
    render: {
      owner,
      name: '-top-level',
      controller: undefined,
      model: undefined,
      wrapper: undefined,
      invokable: undefined,
    },
    manager: undefined,
    outlets: {
      get main(): OutletState {
        consumeTag(tag);
        return current;
      },
    },
  };

  return {
    state,
    set(root: OutletState) {
      current = root;
      dirtyTag(tag);
    },
  };
}

// bucket → the outlet its manager provided. Keyed by bucket alone because
// `manager` is functionally determined by `bucket`: `EmberRouter#getRoute`
// (`@ember/routing/router.ts:412`) mints each bucket from exactly one manager
// and memoizes the resulting `{ manager, bucket }` pair per (owner, routeName),
// so no bucket is ever observed under a second manager. `outletComponents`
// (`classic/outlet-manager.ts`) keys on `render.bucket` on that same
// assumption; stating it once keeps the two caches in this subsystem from
// encoding contradictory claims about bucket uniqueness.
//
// Buckets are app-lifetime, so a level resolves the same way across exit and
// re-entry. Caching here is what lets `getOutlet` build its outlet inline.
const managerOutlets = new WeakMap<object, object>();

function managerOutletFor(
  state: OutletState,
  outletRef: Reference<OutletState | undefined>,
  callerOwner: InternalOwner
): object | null {
  let { render, manager } = state;
  let getOutlet = manager?.getOutlet;

  if (render === undefined || manager === undefined || getOutlet === undefined) {
    return null;
  }

  // Asserted in `Router#_setOutlets`; falling back keeps production defined.
  let bucket = render.bucket;

  if (bucket === undefined) {
    return null;
  }

  let outlet = managerOutlets.get(bucket);

  if (outlet === undefined) {
    // Label kept from the merged `outlet-chain.ts` so probe runs stay comparable.
    recordUse('outlet-chain:manager-outlet');

    // The child ref cannot go stale: the walk is a pure formula over the root
    // state, so a ref built for this level now derefs the same path later.
    outlet = getOutlet.call(manager, bucket, childOutletRefFor(outletRef, callerOwner));

    assert(
      `The route manager for "${render.name}" returned nothing from \`getOutlet\`; ` +
        `it must return a component.`,
      outlet !== undefined && outlet !== null
    );

    managerOutlets.set(bucket, outlet);
  }

  return outlet;
}

/**
  The definition for one outlet level, or `null` when nothing renders there.
  A manager providing `getOutlet` owns its own levels; every other level
  renders through `OutletComponent`.

  Only `outletRef` is passed on: handing the deref'd state along beside it made
  `state === valueForRef(outletRef)` a precondition every call site had to
  uphold and nothing checked, so deref'ing at each use removes a way to be
  wrong. `managerOutletFor` still takes the narrowed `OutletState` because it is
  reached only past the `undefined` check here.
*/
function outletFor(
  outletRef: Reference<OutletState | undefined>,
  callerOwner: InternalOwner
): object | null {
  let state = valueForRef(outletRef);

  if (state !== undefined) {
    let provided = managerOutletFor(state, outletRef, callerOwner);

    if (provided !== null) {
      return provided;
    }
  }

  return OutletComponent.getCachedComponent(outletRef, callerOwner, childOutletRefFor);
}

/** Derefs one level of `outlets.main` off `parentRef` and resolves it. */
function childOutletRefFor(
  parentRef: Reference<OutletState | undefined>,
  owner: InternalOwner
): Reference {
  let outletRef = createComputeRef(() => valueForRef(parentRef)?.outlets?.main);

  let ref = createComputeRef(() => outletFor(outletRef, owner));

  if (DEBUG) {
    // A truthy label would be stamped onto the definition, shadowing
    // `getDebugName()` in render stacks.
    ref.debugLabel = false;
  }

  return ref;
}

setInternalComponentManager(new RootOutletManager(), RootOutlet.prototype);
setComponentTemplate(ROOT_OUTLET_TEMPLATE, RootOutlet.prototype);
