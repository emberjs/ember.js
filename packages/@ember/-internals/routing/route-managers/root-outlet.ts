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

class RootOutletManager
  implements
    InternalComponentManager<RootOutlet, RootOutlet>,
    WithCreateInstance<RootOutlet, RootOutlet>,
    WithCustomDebugRenderTree<RootOutlet, RootOutlet>
{
  getCapabilities(): InternalComponentCapabilities {
    return CAPABILITIES;
  }

  create(_owner: object, definition: RootOutlet): RootOutlet {
    return definition;
  }

  getDebugName(): string {
    return '-top-level-outlet';
  }

  // Empty, not absent: hides the shim.
  getDebugCustomRenderTree(): CustomRenderNode[] {
    return [];
  }

  getSelf({ self }: RootOutlet): Reference {
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
  '<this.component @Component={{this.invokable}} @bucket={{this.bucket}} @context={{this.context}} @outlet={{asReference this.childOutletRef}} />',
  {
    moduleName: 'packages/@ember/-internals/routing/route-managers/outlet-arg-provider.hbs',
    strictMode: true,
    scope: () => ({ asReference }),
  }
);

class OutletArgProvider {
  readonly childOutletRef: Reference<object | null>;
  readonly self: Reference;

  // Without it, an exiting level renders whatever route replaced it.
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

  private get state(): OutletState {
    let state = valueForRef(this.outletRef);

    if (state?.bucket === this.bucket) {
      this.lastState = state;
    }

    return this.lastState;
  }

  get invokable(): object | undefined {
    return this.state.invokable;
  }

  get context(): unknown {
    return this.state.context;
  }
}

class OutletArgProviderManager
  implements
    InternalComponentManager<OutletArgProvider, OutletArgProvider>,
    WithCreateInstance<OutletArgProvider, OutletArgProvider>,
    WithCustomDebugRenderTree<OutletArgProvider, OutletArgProvider>
{
  getCapabilities(): InternalComponentCapabilities {
    return CAPABILITIES;
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
function outletFor(outletStateRef: Reference<OutletState | undefined>): object | null {
  let state = valueForRef(outletStateRef);

  if (state === undefined) {
    return null;
  }

  let { bucket, manager } = state;

  let outlet = managerOutlets.get(bucket);

  if (outlet !== undefined) {
    return outlet;
  }

  let provider = new OutletArgProvider(manager.getRouteWrapper(), bucket, outletStateRef);

  managerOutlets.set(bucket, provider);

  return provider;
}

function childOutletRefFor(
  parentRef: Reference<OutletParent | undefined>
): Reference<object | null> {
  let outletStateRef = createComputeRef(() => valueForRef(parentRef)?.outlets?.main);

  let ref = createComputeRef(() => outletFor(outletStateRef));

  if (DEBUG) {
    // A truthy label shadows `getDebugName()`.
    ref.debugLabel = false;
  }

  return ref;
}

setInternalComponentManager(new RootOutletManager(), RootOutlet.prototype);
setComponentTemplate(ROOT_OUTLET_TEMPLATE, RootOutlet.prototype);
