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
import { EMBER_GLIMMER_REMOVE_APPLICATION_TEMPLATE_WRAPPER } from 'ember/features';
import EmberEnvironment from '../environment';
import {
  OwnedTemplate,
  WrappedTemplateFactory,
} from '../template';
import { RootReference } from '../utils/references';
import AbstractManager from './abstract';
import { privateRouteInfos } from 'ember-routing';

function instrumentationPayload({ render: { name, outlet } }: {render: {name: string, outlet: string}}) {
  return { object: `${name}:${outlet}` };
}

function NOOP() {/**/}

interface OutletDynamicScope extends DynamicScope {
  outletState: any;
}

class StateBucket {
  public outletState: any; // TODO: type as a RouteInfo
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

    let outletStateReference = dynamicScope.outletState.get(definition.outletName);
    dynamicScope.outletState = outletStateReference;
    let outletState = outletStateReference.value();
    return new StateBucket(outletState);
  }

  layoutFor(definition: OutletComponentDefinition, _bucket: StateBucket, env: Environment) {
    return (env as EmberEnvironment).getCompiledBlock(OutletLayoutCompiler, definition.template);
  }

  getSelf({ outletState }: StateBucket) {
    return new RootReference(privateRouteInfos.get(outletState).controller);
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
}

const TOP_LEVEL_MANAGER = (() => {
  if (EMBER_GLIMMER_REMOVE_APPLICATION_TEMPLATE_WRAPPER) {
    return new TopLevelOutletComponentManager();
  } else {
    class WrappedTopLevelOutletLayoutCompiler {
      static id = 'wrapped-top-level-outlet';

      constructor(public template: WrappedTemplateFactory) {
      }

      compile(builder: any) {
        builder.wrapLayout(this.template);
        builder.tag.static('div');
        builder.attrs.static('id', guidFor(this));
        builder.attrs.static('class', 'ember-view');
      }
    }

    class WrappedTopLevelOutletComponentManager extends TopLevelOutletComponentManager {
      layoutFor(definition: OutletComponentDefinition, _bucket: StateBucket, env: Environment) {
        return (env as EmberEnvironment).getCompiledBlock(WrappedTopLevelOutletLayoutCompiler, definition.template);
      }
    }

    return new WrappedTopLevelOutletComponentManager();
  }
})();

export class TopLevelOutletComponentDefinition extends ComponentDefinition<StateBucket> {
  public template: WrappedTemplateFactory;
  constructor(instance: any) {
    super('outlet', TOP_LEVEL_MANAGER, instance);
    this.template = instance.template;
    generateGuid(this);
  }
}

export class OutletComponentDefinition extends ComponentDefinition<StateBucket> {
  public outletName: string;
  public template: OwnedTemplate;

  constructor(outletName: string, template: OwnedTemplate) {
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
