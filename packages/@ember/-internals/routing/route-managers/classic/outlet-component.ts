import type { InternalOwner } from '@ember/-internals/owner';
import type { Nullable } from '@ember/-internals/utility-types';
import { assert } from '@ember/debug';
import type EngineInstance from '@ember/engine/instance';
import { _instrumentStart } from '@ember/instrumentation';
import type {
  CustomRenderNode,
  Destroyable,
  DynamicScope,
  Environment,
  InternalComponentCapabilities,
  PreparedArguments,
  WithCreateInstance,
  WithCustomDebugRenderTree,
  WithPrepareArgs,
  WithSubOwner,
} from '@glimmer/interfaces';
import { DEBUG } from '@glimmer/env';
import { setInternalComponentManager } from '@glimmer/manager/lib/internal/api';
import { setComponentTemplate } from '@glimmer/manager/lib/public/template';
import { precompileTemplate } from '@ember/template-compilation';
import type { Reference } from '@glimmer/reference/lib/reference';
import {
  createComputeRef,
  createConstRef,
  createDebugAliasRef,
  UNDEFINED_REFERENCE,
  valueForRef,
} from '@glimmer/reference/lib/reference';
import { EMPTY_ARGS, EMPTY_POSITIONAL } from '@glimmer/runtime/lib/vm/arguments';

import type { OutletState, RenderState } from '../outlet-state';
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

/** Classic's argument contract. */
const CLASSIC_TEMPLATE = precompileTemplate(
  `<@Component @model={{@context}} @controller={{@bucket.controller}} @outlet={{@outlet}}/>`,
  {
    moduleName: 'packages/@ember/-internals/routing/route-managers/classic/route-template.hbs',
    strictMode: true,
  }
);

function instrumentationPayload(def: OutletDefinitionState) {
  // "main" used to be the outlet name, keeping it around for compatibility
  return { object: `${def.name}:main` };
}

interface OutletInstanceState {
  owner: InternalOwner;
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
  invokable?: object;
  bucket?: object;
}

const CAPABILITIES: InternalComponentCapabilities = {
  dynamicLayout: false,
  dynamicTag: false,
  prepareArgs: true,
  createArgs: false,
  attributeHook: false,
  elementHook: false,
  createCaller: false,
  dynamicScope: true,
  updateHook: false,
  createInstance: true,
  wrapped: false,
  willDestroy: false,
  hasSubOwner: true,
};

/** Classic components read `parentView` off the dynamic scope. */
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

class OutletComponentManager
  implements
    WithCreateInstance<OutletInstanceState, OutletComponent>,
    WithCustomDebugRenderTree<OutletInstanceState, OutletComponent>,
    WithPrepareArgs<OutletInstanceState, OutletComponent>,
    WithSubOwner<OutletInstanceState, OutletComponent>
{
  prepareArgs(definition: OutletComponent): PreparedArguments {
    return {
      positional: EMPTY_POSITIONAL,
      named: {
        Component: definition.component,
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
    env: Environment,
    dynamicScope: DynamicScope | null
  ): OutletInstanceState {
    recordUse('outlet:component-create');

    assert('Expected the outlet to be created with a dynamic scope', dynamicScope !== null);

    carryParentView(dynamicScope as ViewCarryingScope);

    let state: OutletInstanceState = {
      owner: definition.owner,
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

export class OutletComponent implements OutletDefinitionState {
  /** Deref'd here so `state` cannot disagree with `outletRef`. */
  static forLevel(
    outletRef: Reference<OutletState | undefined>,
    callerOwner: InternalOwner,
    childOutlet: Reference
  ): OutletComponent | null {
    let state = valueForRef(outletRef);
    let render = state?.render;
    let invokable = state?.render?.invokable;

    if (render === undefined || invokable === undefined) {
      return null;
    }

    return new OutletComponent(render, invokable, outletRef, callerOwner, childOutlet);
  }

  readonly owner: InternalOwner;
  readonly context: Reference;
  readonly component: Reference;

  private constructor(
    private readonly render: RenderState,
    readonly invokable: object,
    readonly ref: Reference<OutletState | undefined>,
    callerOwner: InternalOwner,
    readonly childOutlet: Reference
  ) {
    this.owner = render.owner ?? callerOwner;

    let context = this.contextRefFor(render);
    let component = this.componentRefFor(invokable);

    this.context = DEBUG ? createDebugAliasRef!('@context', context) : context;
    this.component = DEBUG ? createDebugAliasRef!('@Component', component) : component;
  }

  /** Live invokable; frozen once the level stops being ours. */
  private componentRefFor(initial: object): Reference {
    let last: object = initial;

    return createComputeRef(() => {
      let state = valueForRef(this.ref);

      if (state !== undefined) {
        let current = state.render;

        if (current !== undefined && this.isCurrentLevel(current)) {
          last = state.render?.invokable ?? last;
        }
      }

      return last;
    });
  }

  private contextRefFor(render: RenderState): Reference {
    let last: unknown = valueForRef(this.ref)?.manager?.getRenderContext?.(render.bucket!);

    return createComputeRef(() => {
      let state = valueForRef(this.ref);

      if (state !== undefined) {
        let current = state.render;

        if (current !== undefined && this.isCurrentLevel(current)) {
          let manager = state.manager;

          last = manager?.getRenderContext?.(current.bucket!);
        }
      }

      return last;
    });
  }

  get name(): string {
    return this.render.name;
  }

  get bucket(): object | undefined {
    return this.render.bucket;
  }

  /** Bucket identity; the invokable may swap without this changing. */
  private isCurrentLevel(render: RenderState): boolean {
    return this.bucket === render.bucket;
  }
}

setInternalComponentManager(OUTLET_MANAGER, OutletComponent.prototype);
setComponentTemplate(CLASSIC_TEMPLATE, OutletComponent.prototype);
