import {
  ComponentCapabilities,
  Option,
  Unique
} from '@glimmer/interfaces';
import {
  Tag, VersionedPathReference
} from '@glimmer/reference';
import {
  Arguments,
  ComponentDefinition,
  ElementOperations,
  Environment,
  Invocation,
  WithDynamicTagName,
  WithStaticLayout
} from '@glimmer/runtime';
import { Destroyable } from '@glimmer/util/dist/types';
import { DEBUG } from 'ember-env-flags';
import { _instrumentStart } from 'ember-metal';
import { guidFor } from 'ember-utils';
import { TemplateMeta } from 'ember-views';
import { DynamicScope } from '../renderer';
import RuntimeResolver from '../resolver';
import {
  OwnedTemplate,
} from '../template';
import { default as OutletView, OutletState } from '../views/outlet';
import AbstractManager from './abstract';

function instrumentationPayload({ render: { name, outlet } }: {render: {name: string, outlet: string}}) {
  return { object: `${name}:${outlet}` };
}

function NOOP() {/**/}

class OutletInstanceState {
  public finalizer: () => void;

  constructor(public outletState: VersionedPathReference<OutletState>) {
    this.instrument();
  }

  instrument() {
    this.finalizer = _instrumentStart('render.outlet', instrumentationPayload, this.outletState.value());
  }

  finalize() {
    let { finalizer } = this;
    finalizer();
    this.finalizer = NOOP;
  }
}

export const CAPABILITIES: ComponentCapabilities = {
  dynamicLayout: false,
  dynamicTag: false,
  prepareArgs: false,
  createArgs: false,
  attributeHook: false,
  elementHook: false
};

class OutletComponentManager extends AbstractManager<OutletInstanceState, OutletComponentDefinitionState>
  implements WithStaticLayout<OutletInstanceState, OutletComponentDefinitionState, TemplateMeta, RuntimeResolver> {

  create(environment: Environment,
         definition: OutletComponentDefinitionState,
         _args: Arguments,
         dynamicScope: DynamicScope) {
    if (DEBUG) {
      this._pushToDebugStack(`template:${definition.template.referrer.moduleName}`, environment);
    }
    // TODO revisit missing outletName
    let outletStateReference = dynamicScope.outletState =
      dynamicScope.outletState.get('outlets').get(definition.outletName!) as VersionedPathReference<OutletState>;
    return new OutletInstanceState(outletStateReference);
  }

  layoutFor(_state: OutletComponentDefinitionState, _component: OutletInstanceState, _env: Environment): Unique<'Handle'> {
    throw new Error('Method not implemented.');
  }

  getLayout(state: OutletComponentDefinitionState, _resolver: RuntimeResolver): Invocation {
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

  getSelf({ outletState }: OutletInstanceState) {
    return outletState.get('render').get('controller');
  }

  getTag({ outletState }: OutletInstanceState): Tag {
    // TODO: is this the right tag?
    return outletState.tag;
  }

  didRenderLayout(bucket: OutletInstanceState) {
    bucket.finalize();

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

  create(environment: Environment, definition: TopOutletComponentDefinitionState, _args: Arguments, dynamicScope: DynamicScope) {
    if (DEBUG) {
      this._pushToDebugStack(`template:${definition.template.referrer.moduleName}`, environment);
    }
    // TODO: top level outlet should always have outletState, assert
    return new OutletInstanceState(dynamicScope.outletState as VersionedPathReference<OutletState>);
  }

  getCapabilities(): ComponentCapabilities {
    return TOP_CAPABILITIES;
  }

  didCreateElement(_component: OutletInstanceState, _element: Element, _operations: ElementOperations): void {
    // to add GUID id and class
    _element.setAttribute('class', 'ember-view');
    _element.setAttribute('id', guidFor(_component));
  }
}

const TOP_MANAGER = new TopLevelOutletComponentManager();

export interface TopOutletComponentDefinitionState {
  template: OwnedTemplate;
}

export class TopLevelOutletComponentDefinition implements ComponentDefinition<TopOutletComponentDefinitionState, TopLevelOutletComponentManager> {
  public state: TopOutletComponentDefinitionState;
  public manager: TopLevelOutletComponentManager = TOP_MANAGER;

  constructor(instance: OutletView) {
    this.state = {
      template: instance.template as OwnedTemplate,
    };
  }
}

const OUTLET_MANAGER = new OutletComponentManager();

export interface OutletComponentDefinitionState {
  outletName: string;
  template: OwnedTemplate;
}

export class OutletComponentDefinition implements ComponentDefinition<OutletComponentDefinitionState, OutletComponentManager> {
  public state: OutletComponentDefinitionState;
  public manager: OutletComponentManager = OUTLET_MANAGER;

  constructor(outletName: string, template: OwnedTemplate) {
    this.state = { outletName, template };
  }
}
