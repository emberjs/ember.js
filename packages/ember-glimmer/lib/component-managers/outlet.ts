import { generateGuid, guidFor } from 'ember-utils';
import {
  ComponentDefinition
} from '@glimmer/runtime';
import { DEBUG } from 'ember-env-flags';
import { _instrumentStart } from 'ember-metal';
import { RootReference } from '../utils/references';
import AbstractManager from './abstract';

function instrumentationPayload({ render: { name, outlet } }) {
  return { object: `${name}:${outlet}` };
}

function NOOP() {}

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

class OutletComponentManager extends AbstractManager {
  create(environment, definition, args, dynamicScope) {
    if (DEBUG) {
      this._pushToDebugStack(`template:${definition.template.meta.moduleName}`, environment);
    }

    let outletStateReference = dynamicScope.outletState = dynamicScope.outletState.get('outlets').get(definition.outletName);
    let outletState = outletStateReference.value();
    return new StateBucket(outletState);
  }

  layoutFor(definition, bucket, env) {
    return env.getCompiledBlock(OutletLayoutCompiler, definition.template);
  }

  getSelf({ outletState }) {
    return new RootReference(outletState.render.controller);
  }

  didRenderLayout(bucket) {
    bucket.finalize();

    if (DEBUG) {
      this.debugStack.pop();
    }
  }
}

const MANAGER = new OutletComponentManager();

class TopLevelOutletComponentManager extends OutletComponentManager {
  create(environment, definition, args, dynamicScope) {
    if (DEBUG) {
      this._pushToDebugStack(`template:${definition.template.meta.moduleName}`, environment);
    }
    return new StateBucket(dynamicScope.outletState.value());
  }

  layoutFor(definition, bucket, env) {
    return env.getCompiledBlock(TopLevelOutletLayoutCompiler, definition.template);
  }
}

const TOP_LEVEL_MANAGER = new TopLevelOutletComponentManager();


export class TopLevelOutletComponentDefinition extends ComponentDefinition<any> {
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
