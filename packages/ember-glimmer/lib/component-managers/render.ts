import { ComponentCapabilities } from '@glimmer/interfaces';
import { CONSTANT_TAG, Tag, VersionedPathReference } from '@glimmer/reference';
import { Arguments, ComponentDefinition, Invocation, WithStaticLayout } from '@glimmer/runtime';

import { DEBUG } from '@glimmer/env';
import { Owner } from 'ember-owner';
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
  template: OwnedTemplate;
}

export abstract class AbstractRenderManager<T extends RenderState>
  extends AbstractManager<T, RenderDefinitionState>
  implements WithStaticLayout<T, RenderDefinitionState, OwnedTemplateMeta, any> {
  create(
    env: Environment,
    definition: RenderDefinitionState,
    args: Arguments,
    dynamicScope: DynamicScope
  ): T {
    let { name } = definition;

    if (DEBUG) {
      this._pushToDebugStack(`controller:${name} (with the render helper)`, env);
    }

    if (dynamicScope.rootOutletState) {
      dynamicScope.outletState = new OrphanedOutletReference(dynamicScope.rootOutletState, name);
    }

    return this.createRenderState(args, env.owner, name);
  }

  abstract createRenderState(args: Arguments, owner: Owner, name: string): T;

  getLayout({ template }: RenderDefinitionState): Invocation {
    const layout = template!.asLayout();
    return {
      handle: layout.compile(),
      symbolTable: layout.symbolTable,
    };
  }

  getSelf({ controller }: T) {
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
}

export interface RenderStateWithModel extends RenderState {
  model: VersionedPathReference<any>;
}

const CAPABILITIES = {
  dynamicLayout: false,
  dynamicTag: false,
  prepareArgs: false,
  createArgs: false,
  attributeHook: false,
  elementHook: false,
  createCaller: true,
  dynamicScope: true,
  updateHook: true,
  createInstance: true,
};

class SingletonRenderManager extends AbstractRenderManager<RenderState> {
  createRenderState(_args: Arguments, owner: Owner, name: string) {
    let controller = owner.lookup<any>(`controller:${name}`) || generateController(owner, name);
    return { controller };
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

const NONSINGLETON_CAPABILITIES: ComponentCapabilities = {
  dynamicLayout: false,
  dynamicTag: false,
  prepareArgs: false,
  createArgs: true,
  attributeHook: false,
  elementHook: false,
  dynamicScope: true,
  createCaller: false,
  updateHook: true,
  createInstance: true,
};

class NonSingletonRenderManager extends AbstractRenderManager<RenderStateWithModel> {
  createRenderState(args: Arguments, owner: Owner, name: string) {
    let model = args.positional.at(1);
    let factory =
      owner.factoryFor(`controller:${name}`) ||
      generateControllerFactory(owner, `controller:${name}`);
    let controller = factory.create({ model: model.value() });
    return { controller, model };
  }

  update({ controller, model }: RenderStateWithModel) {
    controller.set('model', model.value());
  }

  getCapabilities(_: RenderDefinitionState): ComponentCapabilities {
    return NONSINGLETON_CAPABILITIES;
  }

  getTag({ model }: RenderStateWithModel): Tag {
    return model.tag;
  }

  getDestructor({ controller }: RenderStateWithModel) {
    return controller;
  }
}

export const NON_SINGLETON_RENDER_MANAGER = new NonSingletonRenderManager();

export class RenderDefinition implements ComponentDefinition {
  public state: RenderDefinitionState;

  constructor(
    name: string,
    template: OwnedTemplate,
    public manager: SingletonRenderManager | NonSingletonRenderManager
  ) {
    this.state = {
      name,
      template,
    };
  }
}
