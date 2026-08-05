/** The app's root mount point, and the outlet walk it anchors. */

import type {
  CustomRenderNode,
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
import { DEBUG } from '@glimmer/env';
import type { OutletState } from './outlet-state';
import { OutletComponent } from './classic/outlet-component';
import { consumeTag } from '@glimmer/validator/lib/tracking';
import { createTag, DIRTY_TAG as dirtyTag } from '@glimmer/validator/lib/validators';

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
// @TODO: RootOutlet likely doesn't need the manager anymore
class RootOutletManager
  implements
    InternalComponentManager<RootOutletState, RootOutlet>,
    WithCreateInstance<RootOutletState, RootOutlet>,
    WithCustomDebugRenderTree<RootOutletState, RootOutlet>
{
  getCapabilities(): InternalComponentCapabilities {
    return CAPABILITIES;
  }

  create(owner: object, definition: RootOutlet): RootOutletState {
    return {
      self: childOutletRefFor(definition.stateRef, owner as InternalOwner),
    };
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
  let tag = createTag();
  let current = initial;

  let state: OutletState = {
    render: {
      owner,
      name: '-top-level',
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

// bucket → its manager's outlet.
const managerOutlets = new WeakMap<object, object>();

/** One outlet level, or `null`. */
function outletFor(
  outletRef: Reference<OutletState | undefined>,
  callerOwner: InternalOwner
): object | null {
  let state = valueForRef(outletRef);

  if (state === undefined) {
    return null;
  }

  let { render, manager } = state;

  if (render === undefined || manager === undefined) {
    return null;
  }

  // Asserted in `_setOutlets`.
  let bucket = render.bucket;

  if (bucket === undefined) {
    return null;
  }

  let outlet = managerOutlets.get(bucket);

  if (outlet !== undefined) {
    return outlet;
  }

  let childOutlet = childOutletRefFor(outletRef, callerOwner);

  let provided = manager.getRouteWrapper
    ? manager.getRouteWrapper(bucket, childOutlet)
    : OutletComponent.forLevel(outletRef, callerOwner, childOutlet);

  // `null` is retried, not cached.
  if (provided == null) {
    return null;
  }

  managerOutlets.set(bucket, provided);

  return provided;
}

function childOutletRefFor(
  parentRef: Reference<OutletState | undefined>,
  owner: InternalOwner
): Reference {
  let outletRef = createComputeRef(() => valueForRef(parentRef)?.outlets?.main);

  let ref = createComputeRef(() => outletFor(outletRef, owner));

  if (DEBUG) {
    // A truthy label shadows `getDebugName()`.
    ref.debugLabel = false;
  }

  return ref;
}

setInternalComponentManager(new RootOutletManager(), RootOutlet.prototype);
setComponentTemplate(ROOT_OUTLET_TEMPLATE, RootOutlet.prototype);
