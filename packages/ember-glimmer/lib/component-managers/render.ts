import {
  ComponentDefinition,
  ComponentManager,
} from '@glimmer/runtime';
import { IArguments } from '@glimmer/runtime/dist/types/lib/vm/arguments';

import { assert } from 'ember-debug';
import { DEBUG } from 'ember-env-flags';
import { generateController, generateControllerFactory } from 'ember-routing';
import Environment from '../environment';
import { DynamicScope } from '../renderer';
import { OwnedTemplate } from '../template';
import { RootReference } from '../utils/references';
import AbstractManager from './abstract';
import { OutletLayoutCompiler } from './outlet';

export abstract class AbstractRenderManager extends AbstractManager<RenderState> {
  layoutFor(definition: RenderDefinition, _bucket: RenderState, env: Environment) {
    // only curly components can have lazy layout
    assert('definition is missing a template', !!definition.template);
    return env.getCompiledBlock(OutletLayoutCompiler, definition.template!);
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

    return { controller } as RenderState;
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

    let factory: any = controllerFactory || generateControllerFactory(env.owner, name);
    let controller = factory.create({ model: modelRef.value() });

    if (DEBUG) {
      this._pushToDebugStack(`controller:${name} (with the render helper)`, environment);
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
  public template: OwnedTemplate | undefined;
  public env: Environment;

  constructor(name: string, template: OwnedTemplate | undefined, env: Environment, manager: ComponentManager<RenderState>) {
    super('render', manager, null);

    this.name = name;
    this.template = template;
    this.env = env;
  }
}
