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
  VMArguments,
  WithCreateInstance,
  WithCustomDebugRenderTree,
  WithSubOwner,
} from '@glimmer/interfaces';
import { setInternalComponentManager } from '@glimmer/manager/lib/internal/api';
import { setComponentTemplate } from '@glimmer/manager/lib/public/template';
import { precompileTemplate } from '@ember/template-compilation';
import type { Reference } from '@glimmer/reference/lib/reference';
import { UNDEFINED_REFERENCE, valueForRef } from '@glimmer/reference/lib/reference';
import { EMPTY_ARGS } from '@glimmer/runtime/lib/vm/arguments';

import type { ClassicRouteBucket, ClassicRenderState } from './bucket';

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
  Classic's argument contract (RFC-1169): the framework curries `@Component`,
  `@bucket` and `@outlet` onto the wrapper, and classic renames them to what a
  classic route template expects. Context is read off the bucket, during render,
  so it tracks.
*/
const CLASSIC_TEMPLATE = precompileTemplate(
  `{{#if @Component}}<@Component @model={{@bucket.render.context}} @controller={{@bucket.controller}} @outlet={{@outlet}}/>{{/if}}`,
  {
    moduleName: 'packages/@ember/-internals/routing/route-managers/classic/route-template.hbs',
    strictMode: true,
  }
);

const CAPABILITIES: InternalComponentCapabilities = {
  dynamicLayout: false,
  dynamicTag: false,
  prepareArgs: false,
  // The wrapper is module-stable, so everything per-route arrives as an
  // argument. `create` reads `@bucket` to recover this level's owner and name.
  createArgs: true,
  attributeHook: false,
  elementHook: false,
  createCaller: false,
  // Carries `parentView`.
  dynamicScope: true,
  updateHook: false,
  // The only hook that can reach the scope and the args.
  createInstance: true,
  wrapped: false,
  willDestroy: false,
  // Engines swap the owner at a mount point. Classic's business, not the
  // framework's: `render.owner` is the owner this level renders under.
  hasSubOwner: true,
};

interface OutletInstanceState {
  owner: InternalOwner;
  engine?: {
    instance: EngineInstance;
    mountPoint: string;
  };
  finalize: () => void;
}

function instrumentationPayload({ name }: ClassicRenderState) {
  // legacy outlet name
  return { object: `${name}:main` };
}

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
    _definition: OutletComponent,
    args: VMArguments,
    env: Environment,
    dynamicScope: DynamicScope | null
  ): OutletInstanceState {
    assert('Expected the outlet to be created with a dynamic scope', dynamicScope !== null);

    carryParentView(dynamicScope as ViewCarryingScope);

    // The wrapper is shared by every classic route, so this level's identity
    // comes from the argument the framework curried onto it.
    let bucket = valueForRef(args.named.get('bucket')) as ClassicRouteBucket;
    let { render } = bucket;

    let state: OutletInstanceState = {
      owner: render.owner,
      finalize: _instrumentStart('render.outlet', instrumentationPayload, render),
    };

    if (env.debugRenderTree !== undefined && owner !== render.owner) {
      let currentOwner = render.owner;

      assert(
        'Expected currentOwner to be an EngineInstance',
        'buildChildEngineInstance' in currentOwner
      );

      let engineInstance = currentOwner as unknown as EngineInstance;
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

  getCapabilities(): InternalComponentCapabilities {
    return CAPABILITIES;
  }

  getSelf(): Reference {
    return UNDEFINED_REFERENCE;
  }

  getDebugName(): string {
    return '';
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

class OutletComponent {}

setInternalComponentManager(new OutletComponentManager(), OutletComponent.prototype);
setComponentTemplate(CLASSIC_TEMPLATE, OutletComponent.prototype);

/** Module-stable per RFC-1169. */
export const CLASSIC_OUTLET = /*@__PURE__*/ new OutletComponent();
