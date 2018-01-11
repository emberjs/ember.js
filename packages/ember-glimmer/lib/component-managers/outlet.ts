import { ComponentCapabilities, Option, Unique } from '@glimmer/interfaces';
import { ParsedLayout, WrappedBuilder } from '@glimmer/opcode-compiler';
import {
  Tag, VersionedPathReference
} from '@glimmer/reference';
import {
  Arguments,
  ComponentDefinition,
  ElementOperations,
  Environment,
  Invocation,
  TopLevelSyntax,
  WithDynamicTagName,
  WithStaticLayout
} from '@glimmer/runtime';
import { Destroyable } from '@glimmer/util/dist/types';
import { DEBUG } from 'ember-env-flags';
import { _instrumentStart } from 'ember-metal';
import { guidFor } from 'ember-utils';
import { OwnedTemplateMeta } from 'ember-views';
import {
  EMBER_GLIMMER_REMOVE_APPLICATION_TEMPLATE_WRAPPER,
} from 'ember/features';
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
  tag: Tag;
  controller: any | undefined;
  finalize: () => void;
}

function createInstanceState(definition: OutletDefinitionState): OutletInstanceState {
  return {
    tag: definition.ref.tag,
    controller: definition.controller,
    finalize: _instrumentStart('render.outlet', instrumentationPayload, definition),
  };
}

export interface OutletDefinitionState {
  ref: VersionedPathReference<OutletState | undefined>;
  name: string;
  outlet: string;
  template: OwnedTemplate;
  controller: any | undefined;
}

export const CAPABILITIES: ComponentCapabilities = {
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
    return createInstanceState(definition);
  }

  layoutFor(_state: OutletDefinitionState, _component: OutletInstanceState, _env: Environment): Unique<'Handle'> {
    throw new Error('Method not implemented.');
  }

  getLayout(state: OutletDefinitionState, _resolver: RuntimeResolver): Invocation {
    // The router has already resolved the template
    const layout = state.template.asLayout();
    return {
      handle: layout.compile(),
      symbolTable: layout.symbolTable
    };
  }

  getCapabilities(): ComponentCapabilities {
    return CAPABILITIES;
  }

  getSelf({ controller }: OutletInstanceState) {
    // RootReference initializes the object dirtyable tag state
    // basically the entry point from Ember to Glimmer.
    // So even though outletState is a path reference, it is not
    // the correct Tag to support self here.
    return new RootReference(controller);
  }

  getTag(state: OutletInstanceState): Tag {
    return state.tag;
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

export const TOP_CAPABILITIES = Object.assign({}, CAPABILITIES, {
  dynamicTag: true,
  elementHook: true,
});

class TopLevelOutletComponentManager extends OutletComponentManager
  implements WithDynamicTagName<OutletInstanceState> {

  getTagName(_component: OutletInstanceState) {
    return 'div';
  }

  getLayout(state: OutletDefinitionState, resolver: RuntimeResolver): Invocation {
    // The router has already resolved the template
    const template = state.template;
    let layout: TopLevelSyntax;
    if (EMBER_GLIMMER_REMOVE_APPLICATION_TEMPLATE_WRAPPER) {
      layout = template.asLayout();
    } else {
      const compileOptions = Object.assign({},
        resolver.templateOptions,
        { asPartial: false, referrer: template.referrer});
      // TODO fix this getting private
      const parsed: ParsedLayout<OwnedTemplateMeta> = (template as any).parsedLayout;
      layout = new WrappedBuilder(
        compileOptions,
        parsed,
        TOP_CAPABILITIES,
      );
    }
    return {
      handle: layout.compile(),
      symbolTable: layout.symbolTable
    };
  }

  getCapabilities(): ComponentCapabilities {
    if (EMBER_GLIMMER_REMOVE_APPLICATION_TEMPLATE_WRAPPER) {
      return CAPABILITIES;
    }
    return TOP_CAPABILITIES;
  }

  didCreateElement(_component: OutletInstanceState, _element: Element, _operations: ElementOperations): void {
    // to add GUID id and class
    _element.setAttribute('class', 'ember-view');
    _element.setAttribute('id', guidFor(_component));
  }
}

const TOP_MANAGER = new TopLevelOutletComponentManager();

export class TopLevelOutletComponentDefinition implements ComponentDefinition<OutletDefinitionState, TopLevelOutletComponentManager> {
  public state: OutletDefinitionState;
  public manager: TopLevelOutletComponentManager = TOP_MANAGER;

  constructor(instance: OutletView) {
    this.state = instance.state;
  }
}

const OUTLET_MANAGER = new OutletComponentManager();

export class OutletComponentDefinition implements ComponentDefinition<OutletDefinitionState, OutletComponentManager> {
  public manager: OutletComponentManager = OUTLET_MANAGER;

  constructor(public state: OutletDefinitionState) {
  }
}
