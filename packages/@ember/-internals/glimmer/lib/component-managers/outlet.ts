import type { InternalOwner } from '@ember/-internals/owner';
import type { Nullable } from '@ember/-internals/utility-types';
import { assert } from '@ember/debug';
import EngineInstance from '@ember/engine/instance';
import { _instrumentStart } from '@ember/instrumentation';
import { precompileTemplate } from '@ember/template-compilation';
import type {
  CompilableProgram,
  ComponentDefinition,
  CustomRenderNode,
  Destroyable,
  Environment,
  InternalComponentCapabilities,
  VMArguments,
  WithCreateInstance,
  WithCustomDebugRenderTree,
} from '@glimmer/interfaces';
import { capabilityFlagsFrom } from '@glimmer/manager';
import type { Reference } from '@glimmer/reference';
import { UNDEFINED_REFERENCE, valueForRef } from '@glimmer/reference';
import { EMPTY_ARGS } from '@glimmer/runtime';
import { unwrapTemplate } from './unwrap-template';

import type { DynamicScope } from '../renderer';
import type { OutletState } from '../utils/outlet';
import type OutletView from '../views/outlet';

function instrumentationPayload(def: OutletDefinitionState) {
  // "main" used to be the outlet name, keeping it around for compatibility
  return { object: `${def.name}:main` };
}

interface OutletInstanceState {
  engine?: {
    instance: EngineInstance;
    mountPoint: string;
  };
  finalize: () => void;
}

export interface OutletDefinitionState {
  ref: Reference<OutletState | undefined>;
  name: string;
  template: object;
  controller: unknown;
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

const CAPABILITIES_MASK = capabilityFlagsFrom(CAPABILITIES);

class OutletComponentManager
  implements
    WithCreateInstance<OutletInstanceState, OutletDefinitionState>,
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

    // This is the actual primary responsibility of the outlet component –
    // it represents the switching from one route component/template into
    // the next. The rest only exists to support the debug render tree and
    // the old-school (and unreliable) instrumentation.
    dynamicScope.set('outletState', currentStateRef);

    let state: OutletInstanceState = {
      finalize: _instrumentStart('render.outlet', instrumentationPayload, definition),
    };

    if (env.debugRenderTree !== undefined) {
      let parentState = valueForRef(parentStateRef);
      let parentOwner = parentState?.render?.owner;
      let currentState = valueForRef(currentStateRef);
      let currentOwner = currentState?.render?.owner;

      if (parentOwner && parentOwner !== currentOwner) {
        assert(
          'Expected currentOwner to be an EngineInstance',
          currentOwner instanceof EngineInstance
        );

        let { mountPoint } = currentOwner;

        if (mountPoint) {
          state.engine = {
            mountPoint,
            instance: currentOwner,
          };
        }
      }
    }

    return state;
  }

  getDebugName({ name }: OutletDefinitionState): string {
    return `{{outlet}} for ${name}`;
  }

  getDebugCustomRenderTree(
    _definition: OutletDefinitionState,
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
      template: undefined,
    });

    if (state.engine) {
      nodes.push({
        bucket: state.engine,
        type: 'engine',
        name: state.engine.mountPoint,
        args: EMPTY_ARGS,
        instance: state.engine.instance,
        template: undefined,
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

const OUTLET_MANAGER = new OutletComponentManager();

const OUTLET_COMPONENT_TEMPLATE = precompileTemplate(
  '<@Component @controller={{@controller}} @model={{@model}} />',
  { strictMode: true }
);

export class OutletComponent
  implements
    ComponentDefinition<OutletDefinitionState, OutletInstanceState, OutletComponentManager>
{
  // handle is not used by this custom definition
  public handle = -1;
  public resolvedName = null;
  public manager = OUTLET_MANAGER;
  public capabilities = CAPABILITIES_MASK;
  public compilable: CompilableProgram;

  constructor(owner: InternalOwner, public state: OutletDefinitionState) {
    this.compilable = unwrapTemplate(OUTLET_COMPONENT_TEMPLATE(owner)).asLayout();
  }
}

export function createRootOutlet(outletView: OutletView): OutletComponent {
  return new OutletComponent(outletView.owner, outletView.state);
}
