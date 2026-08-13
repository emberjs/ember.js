/** The top-level that boots your 'application' route */

import type {
  CapturedArguments,
  CustomRenderNode,
  InternalComponentCapabilities,
  InternalComponentManager,
  WithCreateInstance,
  WithCustomDebugRenderTree,
} from '@glimmer/interfaces';
import { internalHelper } from '@ember/-internals/glimmer/lib/helpers/internal-helper';
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

/**
  Wrapping in a helper allows `<@outlet />` invocation to use the `getDebugName` of `OutletArgs` manager.
*/
const asReference = internalHelper(
  ({ positional }: CapturedArguments) => valueForRef(positional[0]!) as Reference
);

/**
 Curries a route's render state onto its manager's wrapper.
 This provider is what allows `getRouteWrapper` to provide a regular component without a custom manager.
 It's role is to enforce the shape of outlet.
*/
const PROVIDER_TEMPLATE = precompileTemplate(
  '<this.component @Component={{this.invokable}} @bucket={{this.bucket}} @outlet={{asReference this.childOutletRef}} />',
  {
    moduleName: 'packages/@ember/-internals/routing/route-managers/outlet-arg-provider.hbs',
    strictMode: true,
    scope: () => ({ asReference }),
  }
);

const PROVIDER_CAPABILITIES: InternalComponentCapabilities = {
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

class OutletArgProvider {
  readonly childOutletRef: Reference<object | null>;
  readonly self: Reference;

  /**
    The level's last published state. Glimmer revalidates this component's
    arguments on the way out, after `_setOutlets` has dropped the level from the
    chain, so the ref can read `undefined` while the layout still asks for
    `@Component`.
  */
  private lastState: OutletState;

  constructor(
    readonly component: object,
    readonly bucket: object,
    readonly outletRef: Reference<OutletState | undefined>
  ) {
    this.childOutletRef = childOutletRefFor(outletRef);
    this.lastState = valueForRef(outletRef)!;
    this.self = createConstRef(this, 'this');
  }

  get invokable(): object | undefined {
    return (this.lastState = valueForRef(this.outletRef) ?? this.lastState).render.invokable;
  }
}

class OutletArgProviderManager
  implements
    InternalComponentManager<OutletArgProvider, OutletArgProvider>,
    WithCreateInstance<OutletArgProvider, OutletArgProvider>,
    WithCustomDebugRenderTree<OutletArgProvider, OutletArgProvider>
{
  getCapabilities(): InternalComponentCapabilities {
    return PROVIDER_CAPABILITIES;
  }

  create(_owner: object, definition: OutletArgProvider): OutletArgProvider {
    return definition;
  }

  getSelf({ self }: OutletArgProvider): Reference {
    return self;
  }

  getDebugName({ outletRef }: OutletArgProvider): string {
    return `{{outlet}} for ${valueForRef(outletRef)?.render.name}`;
  }

  getDebugCustomRenderTree(): CustomRenderNode[] {
    return [];
  }

  didCreate() {}
  didUpdate() {}
  didRenderLayout() {}
  didUpdateLayout() {}

  getDestroyable(): null {
    return null;
  }
}

setInternalComponentManager(new OutletArgProviderManager(), OutletArgProvider.prototype);
setComponentTemplate(PROVIDER_TEMPLATE, OutletArgProvider.prototype);

// bucket -> the provider wrapping its manager's wrapper
const managerOutlets = new WeakMap<object, object>();

/** One outlet level, or `null`. */
function outletFor(outletRef: Reference<OutletState | undefined>): object | null {
  let state = valueForRef(outletRef);

  if (state === undefined) {
    return null;
  }

  let { bucket, manager } = state;

  let outlet = managerOutlets.get(bucket);

  if (outlet !== undefined) {
    return outlet;
  }

  let provider = new OutletArgProvider(manager.getRouteWrapper(), bucket, outletRef);

  managerOutlets.set(bucket, provider);

  return provider;
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
