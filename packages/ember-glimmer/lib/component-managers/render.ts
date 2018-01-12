import {
  ComponentCapabilities, VMHandle,
} from '@glimmer/interfaces';
import {
  CONSTANT_TAG, Tag
} from '@glimmer/reference';
import {
  Arguments,
  ComponentDefinition,
  Invocation,
  WithStaticLayout
} from '@glimmer/runtime';

import { DEBUG } from 'ember-env-flags';
import { generateController, generateControllerFactory } from 'ember-routing';
import { OwnedTemplateMeta } from 'ember-views';
import Environment from '../environment';
import { DynamicScope } from '../renderer';
import { OwnedTemplate } from '../template';
import { OrphanedOutletReference } from '../utils/outlet';
import { RootReference } from '../utils/references';
import AbstractManager from './abstract';

export interface RenderDefinitionState {
  name: string;
  template: OwnedTemplate | undefined;
  env: Environment;
}

export abstract class AbstractRenderManager extends AbstractManager<RenderState, RenderDefinitionState>
  implements WithStaticLayout<RenderState, RenderDefinitionState, OwnedTemplateMeta, any> {

  getLayout({ template }: RenderDefinitionState): Invocation {
    const layout = template!.asLayout();
    return {
      handle: layout.compile(),
      symbolTable: layout.symbolTable
    };
  }

  layoutFor(_definition: RenderDefinition, _bucket: RenderState, _env: Environment): VMHandle {
    throw new Error('not implemented');
  }

  getSelf({ controller }: RenderState) {
    return new RootReference(controller);
  }
}

if (DEBUG) {
  AbstractRenderManager.prototype.didRenderLayout = function() {
    this.debugStack.pop();
  };
}

export interface RenderState {
  controller: any;
  model: any;
  component: any;
}

const CAPABILITIES = {
  dynamicLayout: false,
  dynamicTag: false,
  prepareArgs: false,
  createArgs: true,
  attributeHook: false,
  elementHook: false
};

class SingletonRenderManager extends AbstractRenderManager {
  create(env: Environment,
         definition: RenderDefinitionState,
         _args: Arguments,
         dynamicScope: DynamicScope) {
    let { name } = definition;
    let controller = env.owner.lookup<any>(`controller:${name}`) || generateController(env.owner, name);

    if (DEBUG) {
      this._pushToDebugStack(`controller:${name} (with the render helper)`, env);
    }

    if (dynamicScope.rootOutletState) {
      dynamicScope.outletState = new OrphanedOutletReference(dynamicScope.rootOutletState, name);
    }

    return { controller } as RenderState;
  }

  getCapabilities(_: RenderDefinitionState): ComponentCapabilities {
    return CAPABILITIES;
  }

  getTag(): Tag {
    // todo this should be the tag of the state args
    return CONSTANT_TAG;
  }

  getDestructor() {
    return null;
  }
}

export const SINGLETON_RENDER_MANAGER = new SingletonRenderManager();

class NonSingletonRenderManager extends AbstractRenderManager {
  create(environment: Environment,
         definition: RenderDefinitionState,
         args: Arguments,
         dynamicScope: DynamicScope) {
    let { name, env } = definition;
    let modelRef = args.positional.at(0);
    let controllerFactory = env.owner.factoryFor(`controller:${name}`);

    let factory: any = controllerFactory || generateControllerFactory(env.owner, name);
    let controller = factory.create({ model: modelRef.value() });

    if (DEBUG) {
      this._pushToDebugStack(`controller:${name} (with the render helper)`, environment);
    }

    if (dynamicScope.rootOutletState) {
      dynamicScope.outletState = new OrphanedOutletReference(dynamicScope.rootOutletState, name);
    }

    return <RenderState>{ controller, model: modelRef };
  }

  update({ controller, model }: RenderState) {
    controller.set('model', model.value());
  }

  getCapabilities(_: RenderDefinitionState): ComponentCapabilities {
    return CAPABILITIES;
  }

  getTag(): Tag {
    return CONSTANT_TAG;
  }

  getDestructor({ controller }: RenderState) {
    return controller;
  }
}

export const NON_SINGLETON_RENDER_MANAGER = new NonSingletonRenderManager();

export class RenderDefinition implements ComponentDefinition {

  public state: RenderDefinitionState;

  constructor(name: string, template: OwnedTemplate, env: Environment, public manager: SingletonRenderManager | NonSingletonRenderManager) {
    this.state = {
      name,
      template,
      env,
    };
  }
}
