import {
  ComponentCapabilities, VMHandle,
} from '@glimmer/interfaces';
import {
  CONSTANT_TAG, Tag
} from '@glimmer/reference';
import {
  Arguments,
  ComponentDefinition
} from '@glimmer/runtime';

import { assert } from 'ember-debug';
import { DEBUG } from 'ember-env-flags';
import { generateController, generateControllerFactory } from 'ember-routing';
import Environment from '../environment';
import { DynamicScope } from '../renderer';
import { OwnedTemplate } from '../template';
import { RootReference } from '../utils/references';
import AbstractManager from './abstract';

export interface RenderDefinitionState {
  name: string;
  template: OwnedTemplate | undefined;
}

export abstract class AbstractRenderManager extends AbstractManager<RenderState, RenderDefinitionState> {
  layoutFor(definition: RenderDefinition, _bucket: RenderState, _env: Environment): VMHandle {
    // only curly components can have lazy layout
    assert('definition is missing a template', !!definition.template);

    throw Error('use resolver.lookupTemplate resolver.compileTemplate');
    // return env.getCompiledBlock(OutletLayoutCompiler, definition.template!);
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
  createArgs: false,
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
      dynamicScope.outletState = dynamicScope.rootOutletState.getOrphan(name);
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
      dynamicScope.outletState = dynamicScope.rootOutletState.getOrphan(name);
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
  public name: string;
  public template: OwnedTemplate | undefined;
  public env: Environment;
  public state: RenderDefinitionState;
  public manager: SingletonRenderManager | NonSingletonRenderManager;

  constructor(name: string, template: OwnedTemplate, env: Environment, manager: SingletonRenderManager | NonSingletonRenderManager) {
    this.name = name;
    this.template = template;
    this.env = env;
    this.manager = manager;
  }
}
