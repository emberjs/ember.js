/**
  The component rendered at the very top of the application by
  `Router#_setOutlets` (via `ApplicationInstance#renderRootComponent`).
  Provides `outletState` via `dynamicScope` for child outlets.
*/

import type {
  CustomRenderNode,
  DynamicScope,
  InternalComponentCapabilities,
  InternalComponentManager,
  WithCreateInstance,
  WithCustomDebugRenderTree,
} from '@glimmer/interfaces';
import type { InternalOwner } from '@ember/-internals/owner';
import type { Reference } from '@glimmer/reference/lib/reference';
import { createConstRef, NULL_REFERENCE } from '@glimmer/reference/lib/reference';
import { setInternalComponentManager } from '@glimmer/manager/lib/internal/api';
import { setComponentTemplate } from '@glimmer/manager/lib/public/template';
import { precompileTemplate } from '@ember/template-compilation';
import { assert } from '@ember/debug';
import type { OutletState } from '../../glimmer/lib/utils/outlet';
import { outletHelper } from './classic/outlet';
import { consumeTag, createTag, dirtyTag } from '@glimmer/validator';

const ROOT_OUTLET_TEMPLATE = precompileTemplate('{{component (outlet)}}', {
  moduleName: 'packages/@ember/-internals/routing/route-managers/root-outlet.hbs',
  strictMode: true,
  scope() {
    return {
      outlet: outletHelper,
    };
  },
});

const CAPABILITIES: InternalComponentCapabilities = {
  dynamicLayout: false,
  dynamicTag: false,
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
  hasSubOwner: false,
};

class RootOutletManager
  implements
    InternalComponentManager<null, RootOutlet>,
    WithCreateInstance<null, RootOutlet>,
    WithCustomDebugRenderTree<null, RootOutlet>
{
  getCapabilities(): InternalComponentCapabilities {
    return CAPABILITIES;
  }

  create(
    _owner: object,
    definition: RootOutlet,
    _args: unknown,
    _env: unknown,
    dynamicScope: DynamicScope | null
  ): null {
    assert('Expected the root outlet to be created with a dynamic scope', dynamicScope !== null);

    dynamicScope.set('outletState', definition.stateRef);

    return null;
  }

  getDebugName(): string {
    return '-top-level-outlet';
  }

  getDebugCustomRenderTree(): CustomRenderNode[] {
    return [];
  }

  getSelf(): Reference {
    return NULL_REFERENCE;
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
      controller: undefined,
      model: undefined,
      wrapper: undefined,
      invokable: undefined,
    },
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

setInternalComponentManager(new RootOutletManager(), RootOutlet.prototype);
setComponentTemplate(ROOT_OUTLET_TEMPLATE, RootOutlet.prototype);
