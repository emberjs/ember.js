/**
@module ember
@submodule ember-glimmer
*/

import {
  ComponentDefinition,
} from '@glimmer/runtime';
import { IArguments } from '@glimmer/runtime/dist/types/lib/vm/arguments';
import { Destroyable } from '@glimmer/util';

import { DEBUG } from 'ember-env-flags';
import { generateController, generateControllerFactory } from 'ember-routing';
import Environment from '../environment';
import { DynamicScope } from '../renderer';
import { RootReference } from '../utils/references';
import AbstractManager from './abstract';
import { OutletLayoutCompiler } from './outlet';

export abstract class AbstractRenderManager extends AbstractManager<RenderState> {
  layoutFor(definition: RenderDefinition, _bucket, env) {
    return env.getCompiledBlock(OutletLayoutCompiler, definition.template);
  }

  getSelf({ controller }) {
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

    return { controller };
  }

  getDestructor() {
    return null;
  }
}

export const SINGLETON_RENDER_MANAGER = new SingletonRenderManager();

class NonSingletonRenderManager extends AbstractRenderManager {
  create(environment, definition, args, dynamicScope) {
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

  update({ controller, model }) {
    controller.set('model', model.value());
  }

  getDestructor({ controller }) {
    return controller;
  }
}

export const NON_SINGLETON_RENDER_MANAGER = new NonSingletonRenderManager();

export class RenderDefinition extends ComponentDefinition<any> {
  public name: string;
  public template: any;
  public env: Environment;

  constructor(name, template, env, manager) {
    super('render', manager, null);

    this.name = name;
    this.template = template;
    this.env = env;
  }
}
