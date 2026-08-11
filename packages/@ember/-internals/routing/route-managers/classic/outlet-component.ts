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
  WithCreateInstance,
  WithCustomDebugRenderTree,
  WithSubOwner,
} from '@glimmer/interfaces';
import { setInternalComponentManager } from '@glimmer/manager/lib/internal/api';
import { setComponentTemplate } from '@glimmer/manager/lib/public/template';
import { precompileTemplate } from '@ember/template-compilation';
import type { Reference } from '@glimmer/reference/lib/reference';
import { createConstRef } from '@glimmer/reference/lib/reference';
import { EMPTY_ARGS } from '@glimmer/runtime/lib/vm/arguments';
import type { ChildOutlet } from 'router_js';

import type { ClassicRenderState } from './bucket';

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

/**
  Classic's argument contract.

  The outlet *is* its own definition — `getSelf` hands it back, so everything
  is read off `this` rather than copied onto named args by `prepareArgs`. The
  template declares no arguments of its own, which is what keeps `{{outlet}}`
  opaque: a parent can place it, but has nothing to parameterize.
*/
const CLASSIC_TEMPLATE = precompileTemplate(
  `<this.render.invokable @model={{this.render.context}} @controller={{this.render.bucket.controller}} @outlet={{this.childOutlet}}/>`,
  {
    moduleName: 'packages/@ember/-internals/routing/route-managers/classic/route-template.hbs',
    strictMode: true,
  }
);

function instrumentationPayload(def: { name: string }) {
  // legacy outlet name
  return { object: `${def.name}:main` };
}

interface OutletInstanceState {
  owner: InternalOwner;
  /** `this` in the layout: the definition itself. */
  self: Reference;
  engine?: {
    instance: EngineInstance;
    mountPoint: string;
  };
  finalize: () => void;
}

const CAPABILITIES: InternalComponentCapabilities = {
  dynamicLayout: false,
  dynamicTag: false,
  // The layout reads `this`, so there is nothing to project onto args.
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
    WithSubOwner<OutletInstanceState, OutletComponent>
{
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
      self: createConstRef(definition, 'this'),
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

  getSelf(state: OutletInstanceState): Reference {
    return state.self;
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

export class OutletComponent {
  readonly owner: InternalOwner;

  #childOutlet: ChildOutlet;

  constructor(
    readonly render: ClassicRenderState,
    childOutlet: ChildOutlet
  ) {
    this.owner = render.owner;
    this.#childOutlet = childOutlet;
  }

  /**
    The next outlet down the chain. A getter, not a stored value: the layout
    reads it as a path off `this`, so it is re-read — and re-entangled — on
    every revalidation, which is what lets a transition swap the level below.
  */
  get childOutlet(): object | null {
    return this.#childOutlet();
  }

  get name(): string {
    return this.render.name;
  }

  get bucket(): object {
    return this.render.bucket;
  }
}

setInternalComponentManager(OUTLET_MANAGER, OutletComponent.prototype);
setComponentTemplate(CLASSIC_TEMPLATE, OutletComponent.prototype);
