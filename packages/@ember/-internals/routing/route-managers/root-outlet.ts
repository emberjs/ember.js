/** The top-level that boots your 'application' route */

import type {
  CustomRenderNode,
  InternalComponentCapabilities,
  InternalComponentManager,
  PreparedArguments,
  WithCreateInstance,
  WithCustomDebugRenderTree,
  WithPrepareArgs,
} from '@glimmer/interfaces';
import type { Reference } from '@glimmer/reference/lib/reference';
import {
  createComputeRef,
  createConstRef,
  NULL_REFERENCE,
  valueForRef,
} from '@glimmer/reference/lib/reference';
import { EMPTY_POSITIONAL } from '@glimmer/runtime/lib/vm/arguments';
import { setInternalComponentManager } from '@glimmer/manager/lib/internal/api';
import { setComponentTemplate } from '@glimmer/manager/lib/public/template';
import { precompileTemplate } from '@ember/template-compilation';
import { DEBUG } from '@glimmer/env';
import type { OutletParent, OutletState } from './outlet-state';
import { consumeTag } from '@glimmer/validator/lib/tracking';
import { createTag, DIRTY_TAG as dirtyTag } from '@glimmer/validator/lib/validators';

// `this` == <@outlet />; returned by `getSelf`
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
  dynamicScope: false,
  updateHook: false,
  createInstance: true,
  wrapped: false,
  willDestroy: false,
  hasSubOwner: false,
};

interface RootOutletState {
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

  create(_owner: object, definition: RootOutlet): RootOutletState {
    return { self: definition.self };
  }

  getDebugName(): string {
    return '-top-level-outlet';
  }

  // Empty, not absent: hides the shim.
  getDebugCustomRenderTree(): CustomRenderNode[] {
    return [];
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
  readonly self: Reference;

  constructor(state: UpdatableOutletRootState) {
    this.self = childOutletRefFor(createConstRef(state.state, '-top-level'));
  }
}

export interface UpdatableOutletRootState {
  state: OutletParent;
  set(root: OutletState): void;
}

/** The chain's head: a reactive first level. */
export function createRootOutletState(initial: OutletState): UpdatableOutletRootState {
  let tag = createTag();
  let current = initial;

  let state: OutletParent = {
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

/**
 * Delivers a manager's outlet its state, so the manager doesn't have to.
 *
 * Both boundaries that render an outlet — `{{this}}` above and `<@outlet />`
 * inside a route template — invoke it with no arguments. Without this shim the
 * only way to get `bucket`, `context` and the child outlet into the rendered
 * component is to carry them on an instance, which is why a manager returning
 * a plain component previously had to hand-roll a component manager. The shim
 * supplies them as arguments instead, so `getRouteWrapper` can return an
 * ordinary component.
 *
 * `prepareArgs` is what keeps `{{outlet}}` opaque: it discards whatever the
 * caller passed and substitutes these. A manager that still returns its own
 * instance is unaffected — it ignores the arguments it is handed.
 */
const SHIM_TEMPLATE = precompileTemplate(
  '<@Component @bucket={{@bucket}} @context={{@context}} @outlet={{@outlet}} />',
  {
    moduleName: 'packages/@ember/-internals/routing/route-managers/route-outlet-shim.hbs',
    strictMode: true,
  }
);

const SHIM_CAPABILITIES: InternalComponentCapabilities = {
  dynamicLayout: false,
  dynamicTag: false,
  // Supplies the layout's arguments, and discards the caller's.
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

class RouteOutletShim {
  constructor(
    readonly component: object,
    readonly bucket: object,
    readonly name: string,
    readonly context: Reference,
    readonly childOutlet: Reference
  ) {}
}

const SHIM_MANAGER: InternalComponentManager<null, RouteOutletShim> &
  WithPrepareArgs<null, RouteOutletShim> &
  WithCustomDebugRenderTree<null, RouteOutletShim> = {
  getCapabilities(): InternalComponentCapabilities {
    return SHIM_CAPABILITIES;
  },

  prepareArgs(definition: RouteOutletShim): PreparedArguments {
    return {
      positional: EMPTY_POSITIONAL,
      named: {
        Component: createConstRef(definition.component, '@Component'),
        bucket: createConstRef(definition.bucket, '@bucket'),
        context: definition.context,
        outlet: definition.childOutlet,
      },
    };
  },

  getDebugName(definition: RouteOutletShim): string {
    return `{{outlet}} for ${definition.name}`;
  },

  // Empty, not absent: hides the shim.
  getDebugCustomRenderTree(): CustomRenderNode[] {
    return [];
  },

  getSelf(): Reference {
    return NULL_REFERENCE;
  },

  getDestroyable(): null {
    return null;
  },
};

setInternalComponentManager(SHIM_MANAGER, RouteOutletShim.prototype);
setComponentTemplate(SHIM_TEMPLATE, RouteOutletShim.prototype);

// bucket → its manager's outlet.
const managerOutlets = new WeakMap<object, object>();

/** One outlet level, or `null`. */
function outletFor(outletRef: Reference<OutletState | undefined>): object | null {
  let state = valueForRef(outletRef);

  if (state === undefined) {
    return null;
  }

  let { render, manager } = state;

  // Asserted in `_setOutlets`.
  let bucket = render.bucket;

  if (bucket === undefined) {
    return null;
  }

  let outlet = managerOutlets.get(bucket);

  if (outlet !== undefined) {
    return outlet;
  }

  let childOutletRef = childOutletRefFor(outletRef);
  let provided = manager.getRouteWrapper(bucket, () => valueForRef(childOutletRef));

  // `null` is retried, not cached.
  if (provided == null) {
    return null;
  }

  let shim = new RouteOutletShim(
    provided,
    bucket,
    render.name,
    createComputeRef(() => manager.getRouteContext?.(bucket)),
    childOutletRef
  );

  managerOutlets.set(bucket, shim);

  return shim;
}

function childOutletRefFor(
  parentRef: Reference<OutletParent | undefined>
): Reference<object | null> {
  let outletRef = createComputeRef(() => valueForRef(parentRef)?.outlets?.main);

  let ref = createComputeRef(() => outletFor(outletRef));

  if (DEBUG) {
    // A truthy label shadows `getDebugName()`.
    ref.debugLabel = false;
  }

  return ref;
}

setInternalComponentManager(new RootOutletManager(), RootOutlet.prototype);
setComponentTemplate(ROOT_OUTLET_TEMPLATE, RootOutlet.prototype);
