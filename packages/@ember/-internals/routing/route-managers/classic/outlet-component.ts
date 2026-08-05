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
} from '@glimmer/reference/lib/reference';
import { EMPTY_ARGS, EMPTY_POSITIONAL } from '@glimmer/runtime/lib/vm/arguments';

import type { ClassicRenderState } from './bucket';
import { ClassicRoute } from '../../../../../router_js/lib/route-info';
import { ClassicRouteManager } from './manager';

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
  // legacy outlet name
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

export interface OutletDefinitionState {
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

/** Classic reads `parentView` off scope. */
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

  // Engine subtrees need the engine owner.
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
      // legacy outlet name
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
  /** Nothing to render until the invokable resolves. */
  static forLevel(
    render: ClassicRenderState,
    childOutlet: Reference,
    manager: ClassicRouteManager
  ): OutletComponent | null {
    if (render.invokable === undefined) {
      return null;
    }

    return new OutletComponent(render, childOutlet, manager);
  }

  readonly owner: InternalOwner;
  readonly context: Reference;
  readonly component: Reference;

  private constructor(
    private readonly render: ClassicRenderState,
    readonly childOutlet: Reference,
    private readonly manager: ClassicRouteManager
  ) {
    this.owner = render.owner;

    let context = this.contextRefFor();
    let component = this.componentRefFor();

    this.context = DEBUG ? createDebugAliasRef!('@context', context) : context;
    this.component = DEBUG ? createDebugAliasRef!('@Component', component) : component;
  }

  /** Frozen if the level ever stops resolving. */
  private componentRefFor(): Reference {
    let last = this.render.invokable!;

    return createComputeRef(() => (last = this.render.consume().invokable ?? last));
  }

  private contextRefFor(): Reference {
    return createComputeRef(() => this.manager.getRenderContext?.(this.render.consume().bucket));
  }

  get name(): string {
    return this.render.name;
  }

  get invokable(): object | undefined {
    return this.render.invokable;
  }

  get bucket(): object {
    return this.render.bucket;
  }
}

setInternalComponentManager(OUTLET_MANAGER, OutletComponent.prototype);
setComponentTemplate(CLASSIC_TEMPLATE, OutletComponent.prototype);
