import { ENV } from '@ember/-internals/environment';
import type { InternalOwner } from '@ember/-internals/owner';
import { guidFor } from '@ember/-internals/utils';
import { assert } from '@ember/-debug-basic';
import EngineInstance from '@ember/engine/instance';
import { _instrumentStart } from '@ember/instrumentation';
import type {
  CapturedArguments,
  CompilableProgram,
  ComponentDefinition,
  CustomRenderNode,
  Destroyable,
  Environment,
  InternalComponentCapabilities,
  InternalComponentCapability,
  Option,
  Template,
  VMArguments,
  WithCreateInstance,
  WithCustomDebugRenderTree,
  WithDynamicTagName,
} from '@glimmer/interfaces';
import { capabilityFlagsFrom } from '@glimmer/manager';
import type { Reference } from '@glimmer/reference';
import { createConstRef, valueForRef } from '@glimmer/reference';
import { EMPTY_ARGS } from '@glimmer/runtime';
import { unwrapTemplate } from '@glimmer/util';

import type { SimpleElement } from '@simple-dom/interface';
import type { DynamicScope } from '../renderer';
import type { OutletState } from '../utils/outlet';
import type OutletView from '../views/outlet';

function instrumentationPayload(def: OutletDefinitionState) {
  return { object: `${def.name}:${def.outlet}` };
}

interface OutletInstanceState {
  self: Reference;
  outlet?: { name: string };
  engineBucket?: { mountPoint: string };
  engine?: EngineInstance;
  finalize: () => void;
}

export interface OutletDefinitionState {
  ref: Reference<OutletState | undefined>;
  name: string;
  outlet: string;
  template: Template;
  controller: unknown;
  model: unknown;
}

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

class OutletComponentManager
  implements
    WithCreateInstance<OutletInstanceState>,
    WithCustomDebugRenderTree<OutletInstanceState, OutletDefinitionState>
{
  create(
    _owner: InternalOwner,
    definition: OutletDefinitionState,
    _args: VMArguments,
    env: Environment,
    dynamicScope: DynamicScope
  ): OutletInstanceState {
    let parentStateRef = dynamicScope.get('outletState');
    let currentStateRef = definition.ref;

    dynamicScope.set('outletState', currentStateRef);

    let state: OutletInstanceState = {
      self: createConstRef(definition.controller, 'this'),
      finalize: _instrumentStart('render.outlet', instrumentationPayload, definition),
    };

    if (env.debugRenderTree !== undefined) {
      state.outlet = { name: definition.outlet };
      let parentState = valueForRef(parentStateRef);
      let parentOwner = parentState && parentState.render && parentState.render.owner;
      let currentOwner = valueForRef(currentStateRef)!.render!.owner;

      if (parentOwner && parentOwner !== currentOwner) {
        assert(
          'Expected currentOwner to be an EngineInstance',
          currentOwner instanceof EngineInstance
        );

        let mountPoint = currentOwner.mountPoint;

        state.engine = currentOwner;

        if (mountPoint) {
          state.engineBucket = { mountPoint };
        }
      }
    }

    return state;
  }

  getDebugName({ name }: OutletDefinitionState) {
    return name;
  }

  getDebugCustomRenderTree(
    definition: OutletDefinitionState,
    state: OutletInstanceState,
    args: CapturedArguments
  ): CustomRenderNode[] {
    let nodes: CustomRenderNode[] = [];

    if (state.outlet) {
      nodes.push({
        bucket: state.outlet,
        type: 'outlet',
        name: state.outlet.name,
        args: EMPTY_ARGS,
        instance: undefined,
        template: undefined,
      });
    }

    if (state.engineBucket) {
      nodes.push({
        bucket: state.engineBucket,
        type: 'engine',
        name: state.engineBucket.mountPoint,
        args: EMPTY_ARGS,
        instance: state.engine,
        template: undefined,
      });
    }

    nodes.push({
      bucket: state,
      type: 'route-template',
      name: definition.name,
      args: args,
      instance: definition.controller,
      template: unwrapTemplate(definition.template).moduleName,
    });

    return nodes;
  }

  getCapabilities(): InternalComponentCapabilities {
    return CAPABILITIES;
  }

  getSelf({ self }: OutletInstanceState) {
    return self;
  }

  didCreate() {}
  didUpdate() {}

  didRenderLayout(state: OutletInstanceState): void {
    state.finalize();
  }

  didUpdateLayout() {}

  getDestroyable(): Option<Destroyable> {
    return null;
  }
}

const OUTLET_MANAGER = new OutletComponentManager();

export class OutletComponentDefinition
  implements
    ComponentDefinition<OutletDefinitionState, OutletInstanceState, OutletComponentManager>
{
  // handle is not used by this custom definition
  public handle = -1;

  public resolvedName: string;
  public compilable: CompilableProgram;
  public capabilities: InternalComponentCapability;

  constructor(
    public state: OutletDefinitionState,
    public manager: OutletComponentManager = OUTLET_MANAGER
  ) {
    let capabilities = manager.getCapabilities();
    this.capabilities = capabilityFlagsFrom(capabilities);
    this.compilable = capabilities.wrapped
      ? unwrapTemplate(state.template).asWrappedLayout()
      : unwrapTemplate(state.template).asLayout();
    this.resolvedName = state.name;
  }
}

export function createRootOutlet(outletView: OutletView): OutletComponentDefinition {
  if (ENV._APPLICATION_TEMPLATE_WRAPPER) {
    const WRAPPED_CAPABILITIES = Object.assign({}, CAPABILITIES, {
      dynamicTag: true,
      elementHook: true,
      wrapped: true,
    });

    const WrappedOutletComponentManager = class
      extends OutletComponentManager
      implements WithDynamicTagName<OutletInstanceState>
    {
      getTagName() {
        return 'div';
      }

      getCapabilities(): InternalComponentCapabilities {
        return WRAPPED_CAPABILITIES;
      }

      didCreateElement(component: OutletInstanceState, element: SimpleElement): void {
        // to add GUID id and class
        element.setAttribute('class', 'ember-view');
        element.setAttribute('id', guidFor(component));
      }
    };

    const WRAPPED_OUTLET_MANAGER = new WrappedOutletComponentManager();

    return new OutletComponentDefinition(outletView.state, WRAPPED_OUTLET_MANAGER);
  } else {
    return new OutletComponentDefinition(outletView.state);
  }
}
