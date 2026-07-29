import type { InternalOwner } from '@ember/-internals/owner';
import type { Nullable } from '@ember/-internals/utility-types';
import { assert } from '@ember/debug';
import type EngineInstance from '@ember/engine/instance';
import { _instrumentStart } from '@ember/instrumentation';
import type {
  CompilableProgram,
  CustomRenderNode,
  Destroyable,
  Environment,
  InternalComponentCapabilities,
  PreparedArguments,
  TemplateFactory,
  WithCreateInstance,
  WithCustomDebugRenderTree,
  WithDynamicLayout,
  WithPrepareArgs,
  WithSubOwner,
} from '@glimmer/interfaces';
import { DEBUG } from '@glimmer/env';
import { setInternalComponentManager } from '@glimmer/manager/lib/internal/api';
import type { Reference } from '@glimmer/reference/lib/reference';
import {
  createComputeRef,
  createConstRef,
  createDebugAliasRef,
  UNDEFINED_REFERENCE,
  valueForRef,
} from '@glimmer/reference/lib/reference';
import { EMPTY_ARGS, EMPTY_POSITIONAL } from '@glimmer/runtime/lib/vm/arguments';
import { precompileTemplate } from '@ember/template-compilation';

import { unwrapTemplate } from '../../../glimmer/lib/component-managers/unwrap-template';
import type { OutletState, RenderState } from '../outlet-state';
import { CLASSIC_ROUTE_WRAPPER, CLASSIC_WRAPPER_TEMPLATE } from './wrapper';
// EXPERIMENT ONLY — see EXPERIMENT-CLASSIC-OUTLET-USAGE.md
import { recordUse } from '../probe';

/**
  The `{{outlet}}` helper lets you specify where a child route will render in
  your template. An important use of the `{{outlet}}` helper is in your
  application's `application.gjs` file:

  ```app/templates/application.gjs
  import MyHeader from '../components/my-header';
  import MyFooter from '../components/my-footer';

  <template>
    <MyHeader />

    <div class="my-dynamic-content">
      <!-- this content will change based on the current route, which depends on the current URL -->
      {{outlet}}
    </div>

    <MyFooter />
  </template>
  ```

  See the [routing guide](https://guides.emberjs.com/release/routing/rendering-a-template/) for more
  information on how your `route` interacts with the `{{outlet}}` helper.
  Note: Your content __will not render__ if there isn't an `{{outlet}}` for it.

  `outlet` is built-in and does not need to be imported.

  @method outlet
  @for Ember.Templates.helpers
  @public
*/

const NO_WRAPPER_LAYOUT = precompileTemplate(
  `<@Component @context={{@context}} @outlet={{@outlet}} />`,
  {
    moduleName: 'packages/@ember/-internals/routing/route-managers/classic/outlet-no-wrapper.hbs',
    strictMode: true,
  }
);

// Invoking the wrapper as a component costs a second component boundary per
// active route level. The classic wrapper is exempt; see `layoutFor`.
const WRAPPER_LAYOUT = precompileTemplate(
  `<@wrapper @Component={{@Component}} @bucket={{@bucket}} @context={{@context}} @outlet={{@outlet}} />`,
  {
    moduleName: 'packages/@ember/-internals/routing/route-managers/classic/outlet-wrapper.hbs',
    strictMode: true,
  }
);

function layoutFor(wrapper: object | undefined, owner: InternalOwner): CompilableProgram {
  let factory: TemplateFactory;

  if (wrapper === undefined) {
    factory = NO_WRAPPER_LAYOUT;
  } else if (wrapper === CLASSIC_ROUTE_WRAPPER) {
    // Render classic's wrapper template across the boundary the outlet already
    // has instead of opening a second one. Sound only because that wrapper's
    // manager contributes nothing at render time — the invariant is stated
    // where `CLASSIC_ROUTE_WRAPPER` is defined. Strict-mode scope travels with
    // the template, so its upvars still resolve when invoked from here.
    factory = CLASSIC_WRAPPER_TEMPLATE;
  } else {
    factory = WRAPPER_LAYOUT;
  }

  // Both `factory(owner)` and `asLayout()` memoize, so this is one lookup.
  return unwrapTemplate(factory(owner)).asLayout();
}

export function childOutletRefFor(
  parentRef: Reference<OutletState | undefined>,
  owner: InternalOwner
): Reference {
  let outletRef = createComputeRef(() => valueForRef(parentRef)?.outlets?.main);

  let ref = createComputeRef(() =>
    OutletComponent.getCachedComponent(valueForRef(outletRef), outletRef, owner)
  );

  if (DEBUG) {
    // A truthy label would be stamped onto the definition, shadowing
    // `getDebugName()` in render stacks.
    ref.debugLabel = false;
  }

  return ref;
}

function invokableFor(state: OutletState | undefined): object | undefined {
  if (state === undefined) {
    return undefined;
  }

  let { render, manager } = state;

  if (render === undefined) {
    return undefined;
  }

  if (manager?.getRenderInvokable !== undefined) {
    return manager.getRenderInvokable(render.bucket!) ?? render.invokable;
  }

  return render.invokable;
}

function instrumentationPayload(def: OutletDefinitionState) {
  // "main" used to be the outlet name, keeping it around for compatibility
  return { object: `${def.name}:main` };
}

interface OutletInstanceState {
  owner: InternalOwner;
  // `getDynamicLayout` only receives the instance state, never the definition.
  layout: CompilableProgram;
  engine?: {
    instance: EngineInstance;
    mountPoint: string;
  };
  finalize: () => void;
}

/** The definition shape `OutletComponent` presents to the VM. */
export interface OutletDefinitionState {
  ref: Reference<OutletState | undefined>;
  name: string;
  wrapper?: object;
  invokable?: object;
  bucket?: object;
}

const CAPABILITIES: InternalComponentCapabilities = {
  // The layout is chosen per outlet; see `layoutFor`.
  dynamicLayout: true,
  dynamicTag: false,
  prepareArgs: true,
  createArgs: false,
  attributeHook: false,
  elementHook: false,
  createCaller: false,
  dynamicScope: false,
  updateHook: false,
  createInstance: true,
  wrapped: false,
  willDestroy: false,
  hasSubOwner: true,
};

class OutletComponentManager
  implements
    WithCreateInstance<OutletInstanceState, OutletComponent>,
    WithCustomDebugRenderTree<OutletInstanceState, OutletComponent>,
    WithDynamicLayout<OutletInstanceState>,
    WithPrepareArgs<OutletInstanceState, OutletComponent>,
    WithSubOwner<OutletInstanceState, OutletComponent>
{
  prepareArgs(definition: OutletComponent): PreparedArguments {
    return {
      positional: EMPTY_POSITIONAL,
      named: {
        Component: createConstRef(definition.invokable, '@Component'),
        wrapper: createConstRef(definition.wrapper, '@wrapper'),
        bucket: createConstRef(definition.bucket, '@bucket'),
        context: definition.context,
        outlet: definition.childOutlet,
      },
    };
  }

  create(
    owner: InternalOwner,
    definition: OutletComponent,
    _args: unknown,
    env: Environment
  ): OutletInstanceState {
    recordUse('outlet:component-create');

    let state: OutletInstanceState = {
      owner: definition.owner,
      layout: definition.layout,
      finalize: _instrumentStart('render.outlet', instrumentationPayload, definition),
    };

    if (env.debugRenderTree !== undefined && owner !== definition.owner) {
      let currentOwner = definition.owner;

      assert(
        'Expected currentOwner to be an EngineInstance',
        'buildChildEngineInstance' in currentOwner
      );

      let engineInstance = currentOwner as EngineInstance;
      let { mountPoint } = engineInstance;

      if (mountPoint) {
        state.engine = {
          mountPoint,
          instance: engineInstance,
        };
      }
    }

    return state;
  }

  // How a routable engine's subtree gets the engine instance rather than
  // inheriting the parent app's owner from the call site.
  getOwner(state: OutletInstanceState): InternalOwner {
    return state.owner;
  }

  getDynamicLayout(state: OutletInstanceState): CompilableProgram {
    return state.layout;
  }

  getDebugName({ name }: OutletComponent): string {
    return `{{outlet}} for ${name}`;
  }

  getDebugCustomRenderTree(
    _definition: OutletComponent,
    state: OutletInstanceState
  ): CustomRenderNode[] {
    let nodes: CustomRenderNode[] = [];

    nodes.push({
      bucket: state,
      type: 'outlet',
      // "main" used to be the outlet name, keeping it around for compatibility
      name: 'main',
      args: EMPTY_ARGS,
      instance: undefined,
    });

    if (state.engine) {
      nodes.push({
        bucket: state.engine,
        type: 'engine',
        name: state.engine.mountPoint,
        args: EMPTY_ARGS,
        instance: state.engine.instance,
      });
    }

    return nodes;
  }

  getCapabilities(): InternalComponentCapabilities {
    return CAPABILITIES;
  }

  getSelf() {
    return UNDEFINED_REFERENCE;
  }

  didCreate() {}
  didUpdate() {}

  didRenderLayout(state: OutletInstanceState): void {
    state.finalize();
  }

  didUpdateLayout() {}

  getDestroyable(): Nullable<Destroyable> {
    return null;
  }
}

const OUTLET_MANAGER = /*@__PURE__*/ new OutletComponentManager();

// Keyed by the manager's `bucket` when it supplies one, otherwise by `outletRef`.
const outletComponents = new WeakMap<object, OutletComponent>();

export class OutletComponent implements OutletDefinitionState {
  /**
   * `<@Component />` stabilizes on `===`: the same object re-renders in place,
   * a different one tears the old route down. The invokable is per-render, so
   * a bucket's component can still go stale — hence `isStableFor`.
   */
  static getCachedComponent(
    state: OutletState | undefined,
    outletRef: Reference<OutletState | undefined>,
    callerOwner: InternalOwner
  ): OutletComponent | null {
    let render = state?.render;
    let invokable = invokableFor(state);

    if (render === undefined || invokable === undefined) {
      outletComponents.delete(outletRef);
      return null;
    }

    let key = render.bucket ?? outletRef;
    let cached = outletComponents.get(key);

    if (cached !== undefined && cached.isStableFor(render, invokable)) {
      return cached;
    }

    let component = new OutletComponent(render, invokable, outletRef, callerOwner);

    outletComponents.set(key, component);

    return component;
  }

  readonly owner: InternalOwner;
  readonly context: Reference;

  // Both are per-`OutletComponent`: `isStableFor` already rejects a render
  // whose wrapper or invokable changed, so a cached layout can never outlive
  // the wrapper it was derived from.
  private cachedLayout: CompilableProgram | undefined;
  private cachedChildOutlet: Reference | undefined;

  private constructor(
    private readonly render: RenderState,
    readonly invokable: object,
    readonly ref: Reference<OutletState | undefined>,
    callerOwner: InternalOwner
  ) {
    this.owner = render.owner ?? callerOwner;

    let context = this.contextRefFor(render);

    this.context = DEBUG ? createDebugAliasRef!('@context', context) : context;
  }

  private contextRefFor(render: RenderState): Reference {
    let last: unknown = render.model;

    return createComputeRef(() => {
      let state = valueForRef(this.ref);

      if (state !== undefined) {
        let current = state.render;

        if (current !== undefined && this.isStableFor(current, invokableFor(state))) {
          let manager = state.manager;

          last =
            manager?.getRenderContext !== undefined
              ? manager.getRenderContext(current.bucket!)
              : current.model;
        }
      }

      return last;
    });
  }

  get name(): string {
    return this.render.name;
  }

  get controller(): unknown {
    return this.render.controller;
  }

  get wrapper(): object | undefined {
    return this.render.wrapper;
  }

  get bucket(): object | undefined {
    return this.render.bucket;
  }

  get layout(): CompilableProgram {
    let layout = this.cachedLayout;

    if (layout === undefined) {
      layout = this.cachedLayout = layoutFor(this.wrapper, this.owner);
    }

    return layout;
  }

  get childOutlet(): Reference {
    let ref = this.cachedChildOutlet;

    if (ref === undefined) {
      ref = this.cachedChildOutlet = childOutletRefFor(this.ref, this.owner);
    }

    return ref;
  }

  private isStableFor(render: RenderState, invokable: object | undefined): boolean {
    if (this.wrapper !== undefined || render.wrapper !== undefined) {
      return this.wrapper === render.wrapper && this.invokable === invokable;
    }

    return this.invokable === invokable && this.controller === render.controller;
  }
}

setInternalComponentManager(OUTLET_MANAGER, OutletComponent.prototype);

// No `setComponentTemplate` here on purpose: `getComponentTemplate` walks the
// prototype chain when the VM builds the `ComponentDefinition`, and a template
// found there would be compiled into `definition.compilable` — which makes
// `VM_GET_COMPONENT_LAYOUT_OP` skip `getDynamicLayout` entirely
// (`@glimmer/runtime/lib/compiled/opcodes/component.ts:750`).
