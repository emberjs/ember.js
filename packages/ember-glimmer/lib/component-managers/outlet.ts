import { ComponentCapabilities, Option, Unique } from '@glimmer/interfaces';
import {
  CONSTANT_TAG, Tag, VersionedPathReference
} from '@glimmer/reference';
import {
  Arguments,
  ComponentDefinition,
  ElementOperations,
  Environment,
  Invocation,
  UNDEFINED_REFERENCE,
  WithDynamicTagName,
  WithStaticLayout
} from '@glimmer/runtime';
import { Destroyable } from '@glimmer/util';
import { DEBUG } from 'ember-env-flags';
import { ENV } from 'ember-environment';
import { _instrumentStart } from 'ember-metal';
import { assign, guidFor } from 'ember-utils';
import { OwnedTemplateMeta } from 'ember-views';
import { DynamicScope } from '../renderer';
import RuntimeResolver from '../resolver';
import {
  OwnedTemplate,
} from '../template';
import { OutletState } from '../utils/outlet';
import { RootReference } from '../utils/references';
import OutletView from '../views/outlet';
import AbstractManager from './abstract';

function instrumentationPayload(def: OutletDefinitionState) {
  return { object: `${def.name}:${def.outlet}` };
}

interface OutletInstanceState {
  self: VersionedPathReference<any | undefined>;
  finalize: () => void;
}

export interface OutletDefinitionState {
  ref: VersionedPathReference<OutletState | undefined>;
  name: string;
  outlet: string;
  template: OwnedTemplate;
  controller: any | undefined;
}

const CAPABILITIES: ComponentCapabilities = {
  dynamicLayout: false,
  dynamicTag: false,
  prepareArgs: false,
  createArgs: false,
  attributeHook: false,
  elementHook: false
};

class OutletComponentManager extends AbstractManager<OutletInstanceState, OutletDefinitionState>
  implements WithStaticLayout<OutletInstanceState, OutletDefinitionState, OwnedTemplateMeta, RuntimeResolver> {
  create(environment: Environment,
         definition: OutletDefinitionState,
         _args: Arguments,
         dynamicScope: DynamicScope) {
    if (DEBUG) {
      this._pushToDebugStack(`template:${definition.template.referrer.moduleName}`, environment);
    }
    dynamicScope.outletState = definition.ref;

    // this is only used for render helper which is legacy
    if (dynamicScope.rootOutletState === undefined) {
      dynamicScope.rootOutletState = dynamicScope.outletState;
    }

    let controller = definition.controller;
    let self = controller === undefined ? UNDEFINED_REFERENCE : new RootReference(controller);
    return {
      self,
      finalize: _instrumentStart('render.outlet', instrumentationPayload, definition),
    };
  }

  layoutFor(_state: OutletDefinitionState, _component: OutletInstanceState, _env: Environment): Unique<'Handle'> {
    throw new Error('Method not implemented.');
  }

  getLayout({ template }: OutletDefinitionState, _resolver: RuntimeResolver): Invocation {
    // The router has already resolved the template
    const layout = template.asLayout();
    return {
      handle: layout.compile(),
      symbolTable: layout.symbolTable
    };
  }

  getCapabilities(): ComponentCapabilities {
    return CAPABILITIES;
  }

  getSelf({ self }: OutletInstanceState) {
    return self;
  }

  getTag(): Tag {
    // an outlet has no hooks
    return CONSTANT_TAG;
  }

  didRenderLayout(state: OutletInstanceState) {
    state.finalize();

    if (DEBUG) {
      this.debugStack.pop();
    }
  }

  getDestructor(): Option<Destroyable> {
    return null;
  }
}

const OUTLET_MANAGER = new OutletComponentManager();

export class OutletComponentDefinition implements ComponentDefinition<OutletDefinitionState, OutletComponentManager> {
  constructor(public state: OutletDefinitionState, public manager: OutletComponentManager = OUTLET_MANAGER) {
  }
}

export function createRootOutlet(outletView: OutletView): OutletComponentDefinition {
  if (ENV._APPLICATION_TEMPLATE_WRAPPER) {
    const WRAPPED_CAPABILITIES = assign({}, CAPABILITIES, {
      dynamicTag: true,
      elementHook: true,
    });

    const WrappedOutletComponentManager = class extends OutletComponentManager
    implements WithDynamicTagName<OutletInstanceState> {

      getTagName(_component: OutletInstanceState) {
        return 'div';
      }

      getLayout(state: OutletDefinitionState): Invocation {
        // The router has already resolved the template
        const template = state.template;
        const layout = template.asWrappedLayout();
        return {
          handle: layout.compile(),
          symbolTable: layout.symbolTable
        };
      }

      getCapabilities(): ComponentCapabilities {
        return WRAPPED_CAPABILITIES;
      }

      didCreateElement(component: OutletInstanceState, element: Element, _operations: ElementOperations): void {
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
