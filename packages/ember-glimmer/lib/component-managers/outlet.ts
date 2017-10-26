/**
@module ember
@submodule ember-glimmer
*/
import { Option } from '@glimmer/interfaces/dist/types';
import {
  ComponentDefinition,
  DynamicScope,
} from '@glimmer/runtime';
import { Destroyable } from '@glimmer/util/dist/types';
import { DEBUG } from 'ember-env-flags';
import { Environment } from 'ember-glimmer';
import { _instrumentStart } from 'ember-metal';
import { generateGuid, guidFor } from 'ember-utils';
import { RootReference } from '../utils/references';
import AbstractManager from './abstract';

function instrumentationPayload({ render: { name, outlet } }) {
  return { object: `${name}:${outlet}` };
}

function NOOP() {/**/}

interface OutletDynamicScope extends DynamicScope {
  outletState: any;
}

class StateBucket {
  public outletState: any;
  public finalizer: any;

  constructor(outletState) {
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
  create(environment: Environment, definition: OutletComponentDefinition, _args, dynamicScope: OutletDynamicScope) {
    if (DEBUG) {
      this._pushToDebugStack(`template:${definition.template.meta.moduleName}`, environment);
    }

    let outletStateReference = dynamicScope.outletState =
      dynamicScope.outletState.get('outlets').get(definition.outletName);
    let outletState = outletStateReference.value();
    return new StateBucket(outletState);
  }

  layoutFor(definition, _bucket, env: Environment) {
    return env.getCompiledBlock(OutletLayoutCompiler, definition.template);
  }

  getSelf({ outletState }) {
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
  create(environment, definition, _args, dynamicScope) {
    if (DEBUG) {
      this._pushToDebugStack(`template:${definition.template.meta.moduleName}`, environment);
    }
    return new StateBucket(dynamicScope.outletState.value());
  }

  layoutFor(definition, _bucket, env) {
    return env.getCompiledBlock(TopLevelOutletLayoutCompiler, definition.template);
  }
}

const TOP_LEVEL_MANAGER = new TopLevelOutletComponentManager();

export class TopLevelOutletComponentDefinition extends ComponentDefinition<StateBucket> {
  public template: any;
  constructor(instance) {
    super('outlet', TOP_LEVEL_MANAGER, instance);
    this.template = instance.template;
    generateGuid(this);
  }
}

class TopLevelOutletLayoutCompiler {
  static id: string;
  public template: any;
  constructor(template) {
    this.template = template;
  }

  compile(builder) {
    builder.wrapLayout(this.template);
    builder.tag.static('div');
    builder.attrs.static('id', guidFor(this));
    builder.attrs.static('class', 'ember-view');
  }
}

TopLevelOutletLayoutCompiler.id = 'top-level-outlet';

export class OutletComponentDefinition extends ComponentDefinition<any> {
  public outletName: string;
  public template: any;

  constructor(outletName, template) {
    super('outlet', MANAGER, null);
    this.outletName = outletName;
    this.template = template;
    generateGuid(this);
  }
}

export class OutletLayoutCompiler {
  static id: string;
  public template: any;
  constructor(template) {
    this.template = template;
  }

  compile(builder) {
    builder.wrapLayout(this.template);
  }
}

OutletLayoutCompiler.id = 'outlet';
