/** The top-level that boots your 'application' route */

import type {
  CapturedArguments,
  CustomRenderNode,
  DynamicScope,
  InternalComponentCapabilities,
  InternalComponentManager,
  WithCreateInstance,
  WithCustomDebugRenderTree,
} from '@glimmer/interfaces';
import { internalHelper } from '@ember/-internals/glimmer/lib/helpers/internal-helper';
import type { Reference } from '@glimmer/reference/lib/reference';
import {
  createComputeRef,
  createConstRef,
  createPrimitiveRef,
  valueForRef,
} from '@glimmer/reference/lib/reference';
import { hasClassicInterop } from 'router_js';
import { setInternalComponentManager } from '@glimmer/manager/lib/internal/api';
import { setComponentTemplate } from '@glimmer/manager/lib/public/template';
import { precompileTemplate } from '@ember/template-compilation';
import { DEBUG } from '@glimmer/env';
import { assert } from '@ember/debug';
import type { OutletParent, OutletState } from './outlet-state';
import { TrackedValue } from '@glimmer/validator/lib/tracked-value';

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

/** A set of the root always notifies, also with the same state object. */
const ROOT_OPTIONS = Object.freeze({ equals: () => false, description: undefined });

/** The chain's head: a reactive first level. */
export function createRootOutletState(initial: OutletState): UpdatableOutletRootState {
  let current = new TrackedValue(initial, ROOT_OPTIONS);

  let state: OutletParent = {
    outlets: {
      get main(): OutletState {
        return current.value;
      },
    },
  };

  return {
    state,
    set(root: OutletState) {
      current.value = root;
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
  '<this.component @Component={{this.state.invokable}} @bucket={{this.bucket}} @context={{this.state.context}} @outlet={{asReference this.childOutletRef}} />',
  {
    moduleName: 'packages/@ember/-internals/routing/route-managers/outlet-arg-provider.hbs',
    strictMode: true,
    scope: () => ({ asReference }),
  }
);

/**
  What a non-classic level puts into the dynamic scope.
  It renders nothing, like `null`, but `outletHelper` can tell it apart.
*/
const NON_CLASSIC_SCOPE: Reference<null> = createPrimitiveRef(null);

export class OutletArgProvider {
  readonly childOutletRef: Reference<OutletArgProvider | null>;

  /**
    What `{{outlet}}` renders in components below this level.
    Only classic levels support it. A route template reads `@outlet` instead.
  */
  readonly scopeOutletRef: Reference<OutletArgProvider | null>;

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
    this.scopeOutletRef = hasClassicInterop(this.lastState.manager)
      ? this.childOutletRef
      : NON_CLASSIC_SCOPE;
    this.self = createConstRef(this, 'this');
  }

  private get state(): OutletState {
    let state = valueForRef(this.outletRef);

    if (state?.bucket === this.bucket) {
      this.lastState = state;
    }

    return this.lastState;
  }
}

const PROVIDER_CAPABILITIES: InternalComponentCapabilities = {
  ...CAPABILITIES,
  /**
    Carries the child outlet to `{{outlet}}` in components below this level.
    A non-classic level puts `NON_CLASSIC_SCOPE` there. Else a component below
    it reads the value of the parent level, which is this level, again.
  */
  dynamicScope: true,
};

class OutletArgProviderManager
  implements
    InternalComponentManager<OutletArgProvider, OutletArgProvider>,
    WithCreateInstance<OutletArgProvider, OutletArgProvider>,
    WithCustomDebugRenderTree<OutletArgProvider, OutletArgProvider>
{
  getCapabilities(): InternalComponentCapabilities {
    return PROVIDER_CAPABILITIES;
  }

  create(
    _owner: object,
    definition: OutletArgProvider,
    _args: unknown,
    _env: unknown,
    dynamicScope: DynamicScope | null
  ): OutletArgProvider {
    assert('Expected the outlet to be created with a dynamic scope', dynamicScope !== null);

    dynamicScope.set('outletState', definition.scopeOutletRef);

    return definition;
  }

  getSelf({ self }: OutletArgProvider): Reference {
    return self;
  }

  getDebugName({ outletRef }: OutletArgProvider): string {
    return `{{outlet}} for ${valueForRef(outletRef)?.name}`;
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
const managerOutlets = new WeakMap<object, OutletArgProvider>();

/** One outlet level, or `null`. */
function outletFor(outletStateRef: Reference<OutletState | undefined>): OutletArgProvider | null {
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
): Reference<OutletArgProvider | null> {
  let outletStateRef = createComputeRef(() => valueForRef(parentRef)?.outlets?.main);

  let ref = createComputeRef(() => outletFor(outletStateRef));

  if (DEBUG) {
    // A truthy label shadows `getDebugName()`.
    ref.debugLabel = false;
  }

  return ref;
}

/**
  `{{outlet}}` compiles to `{{component (-outlet @outlet)}}`.

  A route template has `@outlet`, for every route manager.
  A component has no `@outlet`, so it reads the dynamic scope.
  Only classic levels fill the scope, for example for a layout wrapper.

  Under a non-classic level, a component `{{outlet}}` asserts.
*/
export const outletHelper = /*@__PURE__*/ internalHelper(
  ({ positional }: CapturedArguments, _owner?: object, scope?: DynamicScope) => {
    assert(
      'Expected dynamic scope to be present. You may have attempted to use the {{outlet}} keyword dynamically. This keyword cannot be used dynamically.',
      scope
    );

    let argRef = positional[0]!;
    let scopeRef = scope.get('outletState');

    return createComputeRef(() => {
      let outlet = valueForRef(argRef) as OutletArgProvider | null | undefined;

      assert(
        '{{outlet}} in a component works only under a classic route. ' +
          'Render {{outlet}} in the route template, or pass @outlet={{@outlet}} to the component.',
        outlet !== undefined || scopeRef !== NON_CLASSIC_SCOPE
      );

      return outlet === undefined ? valueForRef(scopeRef) : outlet;
    });
  }
);

setInternalComponentManager(new RootOutletManager(), RootOutlet.prototype);
setComponentTemplate(ROOT_OUTLET_TEMPLATE, RootOutlet.prototype);
