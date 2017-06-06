/**
@module ember
@submodule ember-glimmer
*/

import {
  ComponentDefinition
} from '@glimmer/runtime';
import { assert } from 'ember-debug';
import { DEBUG } from 'ember-env-flags';
import { RootReference } from '../utils/references';
import { generateController, generateControllerFactory } from 'ember-routing';
import { OutletLayoutCompiler } from './outlet';
import AbstractManager from './abstract';

export class AbstractRenderManager extends AbstractManager {
  layoutFor(definition, bucket, env) {
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

class SingletonRenderManager extends AbstractRenderManager {
  create(environment, definition, args, dynamicScope) {
    let { name, env } = definition;
    let controller = env.owner.lookup(`controller:${name}`) || generateController(env.owner, name);

    if (DEBUG) {
      this._pushToDebugStack(`controller:${name} (with the render helper)`, environment);
    }

    if (dynamicScope.rootOutletState) {
      dynamicScope.outletState = dynamicScope.rootOutletState.getOrphan(name);
    }

    return { controller };
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

  update({ controller, model }, dynamicScope) {
    controller.set('model', model.value());
  }

  getDestructor({ controller }) {
    return controller;
  }
}

export const NON_SINGLETON_RENDER_MANAGER = new NonSingletonRenderManager();

export class RenderDefinition extends ComponentDefinition {
  constructor(name, template, env, manager) {
    super('render', manager, null);

    this.name = name;
    this.template = template;
    this.env = env;
  }
}
