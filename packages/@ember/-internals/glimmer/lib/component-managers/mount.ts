import { DEBUG } from '@glimmer/env';
import { ComponentCapabilities } from '@glimmer/interfaces';
import {
  CONSTANT_TAG,
  createTag,
  isConstTag,
  Tag,
  VersionedPathReference,
} from '@glimmer/reference';
import {
  Arguments,
  Bounds,
  ComponentDefinition,
  Invocation,
  WithDynamicLayout,
} from '@glimmer/runtime';
import { Destroyable, Option } from '@glimmer/util';

import { generateControllerFactory } from '@ember/-internals/routing';
import { OwnedTemplateMeta } from '@ember/-internals/views';
import { EMBER_ROUTING_MODEL_ARG } from '@ember/canary-features';

import { ENV } from '@ember/-internals/environment';
import EngineInstance from '@ember/engine/instance';
import { TemplateFactory } from '../..';
import Environment from '../environment';
import RuntimeResolver from '../resolver';
import { RootReference } from '../utils/references';
import AbstractManager from './abstract';

interface EngineState {
  engine: EngineInstance;
  controller: any;
  self: RootReference<any>;
  environment: Environment;
  modelRef?: VersionedPathReference<unknown>;
}

interface EngineDefinitionState {
  name: string;
}

const CAPABILITIES = {
  dynamicLayout: true,
  dynamicTag: false,
  prepareArgs: false,
  createArgs: true,
  attributeHook: false,
  elementHook: false,
  createCaller: true,
  dynamicScope: true,
  updateHook: true,
  createInstance: true,
};

// TODO
// This "disables" the "@model" feature by making the arg untypable syntatically
// Delete this when EMBER_ROUTING_MODEL_ARG has shipped
export const MODEL_ARG_NAME = EMBER_ROUTING_MODEL_ARG || !DEBUG ? 'model' : ' untypable model arg ';

class MountManager extends AbstractManager<EngineState, EngineDefinitionState>
  implements WithDynamicLayout<EngineState, OwnedTemplateMeta, RuntimeResolver> {
  getDynamicLayout(state: EngineState, _: RuntimeResolver): Invocation {
    let templateFactory = state.engine.lookup('template:application') as TemplateFactory;
    let template = templateFactory(state.engine);
    let layout = template.asLayout();

    return {
      handle: layout.compile(),
      symbolTable: layout.symbolTable,
    };
  }

  getCapabilities(): ComponentCapabilities {
    return CAPABILITIES;
  }

  create(environment: Environment, { name }: EngineDefinitionState, args: Arguments) {
    if (DEBUG) {
      environment.debugStack.pushEngine(`engine:${name}`);
    }

    // TODO
    // mount is a runtime helper, this shouldn't use dynamic layout
    // we should resolve the engine app template in the helper
    // it also should use the owner that looked up the mount helper.

    let engine = environment.owner.buildChildEngineInstance(name);

    engine.boot();

    let applicationFactory = engine.factoryFor(`controller:application`);
    let controllerFactory = applicationFactory || generateControllerFactory(engine, 'application');
    let controller: any;
    let self: RootReference<any>;
    let bucket: EngineState;
    let modelRef;

    if (args.named.has(MODEL_ARG_NAME)) {
      modelRef = args.named.get(MODEL_ARG_NAME);
    }

    if (modelRef === undefined) {
      controller = controllerFactory.create();
      self = new RootReference(controller);
      bucket = { engine, controller, self, environment };
    } else {
      let model = modelRef.value();
      controller = controllerFactory.create({ model });
      self = new RootReference(controller);
      bucket = { engine, controller, self, modelRef, environment };
    }

    if (ENV._DEBUG_RENDER_TREE) {
      environment.debugRenderTree.create(bucket, {
        type: 'engine',
        name,
        args: args.capture(),
        instance: engine,
      });

      environment.debugRenderTree.create(controller, {
        type: 'route-template',
        name: 'application',
        args: args.capture(),
        instance: controller,
      });
    }

    return bucket;
  }

  getSelf({ self }: EngineState): VersionedPathReference<unknown> {
    return self;
  }

  getTag(state: EngineState): Tag {
    let tag: Tag = CONSTANT_TAG;

    if (state.modelRef) {
      tag = state.modelRef.tag;
    }

    if (ENV._DEBUG_RENDER_TREE && isConstTag(tag)) {
      tag = createTag();
    }

    return tag;
  }

  getDestructor(bucket: EngineState): Option<Destroyable> {
    let { engine, environment, controller } = bucket;

    if (ENV._DEBUG_RENDER_TREE) {
      return {
        destroy() {
          environment.debugRenderTree.willDestroy(controller);
          environment.debugRenderTree.willDestroy(bucket);
          engine.destroy();
        },
      };
    } else {
      return engine;
    }
  }

  didRenderLayout(bucket: EngineState, bounds: Bounds): void {
    if (DEBUG) {
      bucket.environment.debugStack.pop();
    }

    if (ENV._DEBUG_RENDER_TREE) {
      bucket.environment.debugRenderTree.didRender(bucket.controller, bounds);
      bucket.environment.debugRenderTree.didRender(bucket, bounds);
    }
  }

  update(bucket: EngineState): void {
    let { controller, environment, modelRef } = bucket;

    if (modelRef !== undefined) {
      controller.set('model', modelRef!.value());
    }

    if (ENV._DEBUG_RENDER_TREE) {
      environment.debugRenderTree.update(bucket);
      environment.debugRenderTree.update(bucket.controller);
    }
  }

  didUpdateLayout(bucket: EngineState, bounds: Bounds): void {
    if (ENV._DEBUG_RENDER_TREE) {
      bucket.environment.debugRenderTree.didRender(bucket.controller, bounds);
      bucket.environment.debugRenderTree.didRender(bucket, bounds);
    }
  }
}

const MOUNT_MANAGER = new MountManager();

export class MountDefinition implements ComponentDefinition {
  public state: EngineDefinitionState;
  public manager = MOUNT_MANAGER;

  constructor(name: string) {
    this.state = { name };
  }
}
