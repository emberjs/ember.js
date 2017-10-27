import { Option } from '@glimmer/interfaces';
import {
  Arguments,
  ComponentDefinition,
  DynamicScope,
  Environment,
} from '@glimmer/runtime';
import { Destroyable } from '@glimmer/util/dist/types';
import { DEBUG } from 'ember-env-flags';
import { _instrumentStart } from 'ember-metal';
import { generateGuid, guidFor } from 'ember-utils';
import EmberEnvironment from '../environment';
import { WrappedTemplateFactory } from '../template';
import { RootReference } from '../utils/references';
import AbstractManager from './abstract';

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

class OutletComponentManager extends AbstractManager<StateBucket> {
  create(environment: Environment,
         definition: OutletComponentDefinition,
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

  layoutFor(definition: OutletComponentDefinition, _bucket: StateBucket, env: Environment) {
    return (env as EmberEnvironment).getCompiledBlock(OutletLayoutCompiler, definition.template);
  }

  getSelf({ outletState }: StateBucket) {
    return new RootReference(outletState.render.controller);
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

const MANAGER = new OutletComponentManager();

class TopLevelOutletComponentManager extends OutletComponentManager {
  create(environment: Environment, definition: OutletComponentDefinition, _args: Arguments, dynamicScope: OutletDynamicScope) {
    if (DEBUG) {
      this._pushToDebugStack(`template:${definition.template.meta.moduleName}`, environment);
    }
    return new StateBucket(dynamicScope.outletState.value());
  }

  layoutFor(definition: OutletComponentDefinition, _bucket: StateBucket, env: Environment) {
    return (env as EmberEnvironment).getCompiledBlock(TopLevelOutletLayoutCompiler, definition.template);
  }
}

const TOP_LEVEL_MANAGER = new TopLevelOutletComponentManager();

export class TopLevelOutletComponentDefinition extends ComponentDefinition<StateBucket> {
  public template: WrappedTemplateFactory;
  constructor(instance: any) {
    super('outlet', TOP_LEVEL_MANAGER, instance);
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

export class OutletComponentDefinition extends ComponentDefinition<StateBucket> {
  public outletName: string;
  public template: WrappedTemplateFactory;

  constructor(outletName: string, template: WrappedTemplateFactory) {
    super('outlet', MANAGER, null);
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
