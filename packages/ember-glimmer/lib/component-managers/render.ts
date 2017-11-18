import {
  ComponentCapabilities, VMHandle,
} from '@glimmer/interfaces';
import {
  Tag
} from '@glimmer/reference';
import {
  Arguments,
  ComponentDefinition
} from '@glimmer/runtime';

import { assert } from 'ember-debug';
import { DEBUG } from 'ember-env-flags';
import { generateController, generateControllerFactory } from 'ember-routing';
import { DIRTY_TAG } from '../component';
import Environment from '../environment';
import { DynamicScope } from '../renderer';
import { OwnedTemplate } from '../template';
import { RootReference } from '../utils/references';
import AbstractManager from './abstract';
import DefinitionState from './definition-state';

export abstract class AbstractRenderManager extends AbstractManager<RenderState, DefinitionState> {
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

class SingletonRenderManager extends AbstractRenderManager {
  create(env: Environment,
         definition: DefinitionState,
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

  getCapabilities(state: DefinitionState): ComponentCapabilities {
    return state.capabilities;
  }

  getTag({ component }: RenderState): Tag {
    // TODO: is this the right tag?
    return component[DIRTY_TAG];
  }

  getDestructor() {
    return null;
  }
}

export const SINGLETON_RENDER_MANAGER = new SingletonRenderManager();

class NonSingletonRenderManager extends AbstractRenderManager {
  create(environment: Environment,
         definition: DefinitionState,
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

  getCapabilities(state: DefinitionState): ComponentCapabilities {
    return state.capabilities;
  }

  getTag({ component }: RenderState): Tag {
    // TODO: is this the right tag?
    return component[DIRTY_TAG];
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
  public state: DefinitionState;
  public manager: SingletonRenderManager | NonSingletonRenderManager;

  constructor(name: string, template: OwnedTemplate, env: Environment, manager: SingletonRenderManager | NonSingletonRenderManager) {

    this.name = name;
    this.template = template;
    this.env = env;
    this.manager = manager;
  }
}
