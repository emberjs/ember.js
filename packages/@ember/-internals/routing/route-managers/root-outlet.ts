/** The top-level that boots your 'application' route */

import type {
  CustomRenderNode,
  InternalComponentCapabilities,
  InternalComponentManager,
  WithCreateInstance,
  WithCustomDebugRenderTree,
} from '@glimmer/interfaces';
import type { Reference } from '@glimmer/reference/lib/reference';
import { createComputeRef, createConstRef, valueForRef } from '@glimmer/reference/lib/reference';
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

  let childOutlet = childOutletRefFor(outletRef);

  let provided = manager.getRouteWrapper(bucket, childOutlet);

  // `null` is retried, not cached.
  if (provided == null) {
    return null;
  }

  managerOutlets.set(bucket, provided);

  return provided;
}

function childOutletRefFor(parentRef: Reference<OutletParent | undefined>): Reference {
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
