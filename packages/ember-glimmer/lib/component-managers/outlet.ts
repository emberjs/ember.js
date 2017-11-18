import {
  ComponentCapabilities,
  Option,
  VMHandle
} from '@glimmer/interfaces';
import {
  Tag
} from '@glimmer/reference';
import {
  Arguments,
  ComponentDefinition,
  DynamicScope,
  Environment
} from '@glimmer/runtime';
import { Destroyable } from '@glimmer/util/dist/types';
import { DEBUG } from 'ember-env-flags';
import { _instrumentStart } from 'ember-metal';
import { generateGuid, guidFor } from 'ember-utils';
import { DIRTY_TAG } from '../component';
import {
  OwnedTemplate,
  WrappedTemplateFactory,
} from '../template';
import { Component } from '../utils/curly-component-state-bucket';
import { RootReference } from '../utils/references';
import AbstractManager from './abstract';
import DefinitionState from './definition-state';

function instrumentationPayload({ render: { name, outlet } }: {render: {name: string, outlet: string}}) {
  return { object: `${name}:${outlet}` };
}

function NOOP() {/**/}

interface OutletDynamicScope extends DynamicScope {
  outletState: any;
}

class StateBucket {
  public outletState: any;
  public finalizer: any;
  public component: Component;

  constructor(outletState: any) {
    this.outletState = outletState;
    this.instrument();
  }

  instrument() {
    this.finalizer = _instrumentStart('render.outlet', instrumentationPayload, this.outletState);
  }

  finalize() {
    let { finalizer } = this;
    finalizer();
    this.finalizer = NOOP;
  }
}

class OutletComponentManager extends AbstractManager<StateBucket, DefinitionState> {
  create(environment: Environment,
         definition: DefinitionState,
         _args: Arguments,
         dynamicScope: OutletDynamicScope) {
    if (DEBUG) {
      this._pushToDebugStack(`template:${definition.template.meta.moduleName}`, environment);
    }

    let outletStateReference = dynamicScope.outletState =
      dynamicScope.outletState.get('outlets').get(definition.outletName);
    let outletState = outletStateReference.value();
    return new StateBucket(outletState);
  }

  getCapabilities(state: DefinitionState): ComponentCapabilities {
    return state.capabilities;
  }

  layoutFor(
    _definition: OutletComponentDefinition,
    _component: StateBucket,
    _env: Environment): VMHandle {
    throw new Error('TODO');
    // TODO resolver.compileTemplate
    // return (env as EmberEnvironment).getCompiledBlock(OutletLayoutCompiler, definition.template);
  }

  getSelf({ outletState }: StateBucket) {
    return new RootReference(outletState.render.controller);
  }

  getTag({ component }: StateBucket): Tag {
    // TODO: is this the right tag?
    return component[DIRTY_TAG];
  }

  didRenderLayout(bucket: StateBucket) {
    bucket.finalize();

    if (DEBUG) {
      this.debugStack.pop();
    }
  }

  getDestructor(): Option<Destroyable> {
    return null;
  }
}

class TopLevelOutletComponentManager extends OutletComponentManager {
  create(environment: Environment, definition: DefinitionState, _args: Arguments, dynamicScope: OutletDynamicScope) {
    if (DEBUG) {
      this._pushToDebugStack(`template:${definition.template.meta.moduleName}`, environment);
    }
    return new StateBucket(dynamicScope.outletState.value());
  }

  layoutFor(_definition: OutletComponentDefinition, _bucket: StateBucket, _env: Environment): VMHandle {
    throw new Error('TODO resolver.compileTemplate and get invocation handle');
    // eturn (env as EmberEnvironment).getCompiledBlock(TopLevelOutletLayoutCompiler, definition.template);
  }
}

export class TopLevelOutletComponentDefinition implements ComponentDefinition {
  public template: WrappedTemplateFactory;
  public state: DefinitionState;
  public manager: TopLevelOutletComponentManager;

  constructor(instance: any) {
    this.template = instance.template;
    generateGuid(this);
  }
}

class TopLevelOutletLayoutCompiler {
  static id: string;
  public template: WrappedTemplateFactory;
  constructor(template: WrappedTemplateFactory) {
    this.template = template;
  }

  compile(builder: any) {
    builder.wrapLayout(this.template);
    builder.tag.static('div');
    builder.attrs.static('id', guidFor(this));
    builder.attrs.static('class', 'ember-view');
  }
}

TopLevelOutletLayoutCompiler.id = 'top-level-outlet';

export class OutletComponentDefinition implements ComponentDefinition {
  public outletName: string;
  public template: OwnedTemplate;
  public state: DefinitionState;
  public manager: OutletComponentManager;

  constructor(outletName: string, template: OwnedTemplate) {
    this.outletName = outletName;
    this.template = template;
    generateGuid(this);
  }
}

export class OutletLayoutCompiler {
  static id: string;
  public template: WrappedTemplateFactory;
  constructor(template: WrappedTemplateFactory) {
    this.template = template;
  }

  compile(builder: any) {
    builder.wrapLayout(this.template);
  }
}

OutletLayoutCompiler.id = 'outlet';
