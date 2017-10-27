import {
  ComponentDefinition,
  ComponentManager
} from '@glimmer/runtime';
import { IArguments } from '@glimmer/runtime/dist/types/lib/vm/arguments';
import { Destroyable } from '@glimmer/util';

import { DEBUG } from 'ember-env-flags';
import { generateController, generateControllerFactory } from 'ember-routing';
import Environment from '../environment';
import { WrappedTemplateFactory } from '../template';
import { DynamicScope } from '../renderer';
import { RootReference } from '../utils/references';
import AbstractManager from './abstract';
import { OutletLayoutCompiler } from './outlet';

export abstract class AbstractRenderManager extends AbstractManager<RenderState> {
  layoutFor(definition: RenderDefinition, _bucket: RenderState, env: Environment) {
    return env.getCompiledBlock(OutletLayoutCompiler, definition.template);
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
  controller: Destroyable;
  model: any;
}

class SingletonRenderManager extends AbstractRenderManager {
  create(env: Environment,
         definition: ComponentDefinition<RenderState>,
         _args: IArguments,
         dynamicScope: DynamicScope) {
    let { name } = definition;
    let controller = env.owner.lookup<any>(`controller:${name}`) || generateController(env.owner, name);

    if (DEBUG) {
      this._pushToDebugStack(`controller:${name} (with the render helper)`, env);
    }

    if (dynamicScope.rootOutletState) {
      dynamicScope.outletState = dynamicScope.rootOutletState.getOrphan(name);
    }

    return <RenderState>{ controller };
  }

  getDestructor() {
    return null;
  }
}

export const SINGLETON_RENDER_MANAGER = new SingletonRenderManager();

class NonSingletonRenderManager extends AbstractRenderManager {
  create(environment: Environment, definition: RenderDefinition, args: IArguments, dynamicScope: DynamicScope) {
    let { name, env } = definition;
    let modelRef = args.positional.at(0);
    let controllerFactory = env.owner.factoryFor(`controller:${name}`);

    let factory = controllerFactory || generateControllerFactory(env.owner, name);
    let controller = factory.create({ model: modelRef.value() });

    if (DEBUG) {
      this._pushToDebugStack(`controller:${name} (with the render helper)`, environment);
    }

    if (dynamicScope.rootOutletState) {
      dynamicScope.outletState = dynamicScope.rootOutletState.getOrphan(name);
    }

    return { controller, model: modelRef };
  }

  update({ controller, model }: RenderState) {
    controller.set('model', model.value());
  }

  getDestructor({ controller }: RenderState) {
    return controller;
  }
}

export const NON_SINGLETON_RENDER_MANAGER = new NonSingletonRenderManager();

export class RenderDefinition extends ComponentDefinition<RenderState> {
  public name: string;
  public template: WrappedTemplateFactory;
  public env: Environment;

  constructor(name: string, template: WrappedTemplateFactory, env: Environment, manager: ComponentManager<RenderState>) {
    super('render', manager, null);

    this.name = name;
    this.template = template;
    this.env = env;
  }
}
