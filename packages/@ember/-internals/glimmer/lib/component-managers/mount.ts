import { DEBUG } from '@glimmer/env';
import {
  Bounds,
  ComponentCapabilities,
  ComponentDefinition,
  Destroyable,
  Option,
  VMArguments,
  WithJitDynamicLayout,
} from '@glimmer/interfaces';
import { ComponentRootReference, VersionedPathReference } from '@glimmer/reference';
import {
  CONSTANT_TAG,
  createTag,
  isConstTag,
  Tag,
} from '@glimmer/validator';

import { generateControllerFactory } from '@ember/-internals/routing';
import { EMBER_ROUTING_MODEL_ARG } from '@ember/canary-features';

import { ENV } from '@ember/-internals/environment';
import EngineInstance from '@ember/engine/instance';
import { TemplateFactory } from '../..';
import { EmberVMEnvironment } from '../environment';
import RuntimeResolver from '../resolver';
import AbstractManager from './abstract';

interface EngineState {
  engine: EngineInstance;
  controller: any;
  self: ComponentRootReference<any>;
  environment: EmberVMEnvironment;
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
  wrapped: false,
};

// TODO
// This "disables" the "@model" feature by making the arg untypable syntatically
// Delete this when EMBER_ROUTING_MODEL_ARG has shipped
export const MODEL_ARG_NAME = EMBER_ROUTING_MODEL_ARG || !DEBUG ? 'model' : ' untypable model arg ';

class MountManager extends AbstractManager<EngineState, EngineDefinitionState>
  implements WithJitDynamicLayout<EngineState, RuntimeResolver> {
  getJitDynamicLayout(state: EngineState, _: RuntimeResolver) {
    let templateFactory = state.engine.lookup('template:application') as TemplateFactory;
    let template = templateFactory(state.engine);

    if (ENV._DEBUG_RENDER_TREE) {
      state.environment.extra.debugRenderTree.setTemplate(state.controller, template);
    }

    return template;
  }

  getCapabilities(): ComponentCapabilities {
    return CAPABILITIES;
  }

  create(environment: EmberVMEnvironment, { name }: EngineDefinitionState, args: VMArguments) {
    // TODO
    // mount is a runtime helper, this shouldn't use dynamic layout
    // we should resolve the engine app template in the helper
    // it also should use the owner that looked up the mount helper.

    let engine = environment.extra.owner.buildChildEngineInstance(name);

    engine.boot();

    let applicationFactory = engine.factoryFor(`controller:application`);
    let controllerFactory = applicationFactory || generateControllerFactory(engine, 'application');
    let controller: any;
    let self: ComponentRootReference<any>;
    let bucket: EngineState;
    let modelRef;

    if (args.named.has(MODEL_ARG_NAME)) {
      modelRef = args.named.get(MODEL_ARG_NAME);
    }

    if (modelRef === undefined) {
      controller = controllerFactory.create();
      self = new ComponentRootReference(controller, environment);
      bucket = { engine, controller, self, environment };
    } else {
      let model = modelRef.value();
      controller = controllerFactory.create({ model });
      self = new ComponentRootReference(controller, environment);
      bucket = { engine, controller, self, modelRef, environment };
    }

    if (ENV._DEBUG_RENDER_TREE) {
      environment.extra.debugRenderTree.create(bucket, {
        type: 'engine',
        name,
        args: args.capture(),
        instance: engine,
        template: undefined,
      });

      environment.extra.debugRenderTree.create(controller, {
        type: 'route-template',
        name: 'application',
        args: args.capture(),
        instance: controller,
        // set in getDynamicLayout
        template: undefined,
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
          environment.extra.debugRenderTree.willDestroy(controller);
          environment.extra.debugRenderTree.willDestroy(bucket);
          engine.destroy();
        },
      };
    } else {
      return engine;
    }
  }

  didRenderLayout(bucket: EngineState, bounds: Bounds): void {
    if (ENV._DEBUG_RENDER_TREE) {
      bucket.environment.extra.debugRenderTree.didRender(bucket.controller, bounds);
      bucket.environment.extra.debugRenderTree.didRender(bucket, bounds);
    }
  }

  update(bucket: EngineState): void {
    let { controller, environment, modelRef } = bucket;

    if (modelRef !== undefined) {
      controller.set('model', modelRef!.value());
    }

    if (ENV._DEBUG_RENDER_TREE) {
      environment.extra.debugRenderTree.update(bucket);
      environment.extra.debugRenderTree.update(bucket.controller);
    }
  }

  didUpdateLayout(bucket: EngineState, bounds: Bounds): void {
    if (ENV._DEBUG_RENDER_TREE) {
      bucket.environment.extra.debugRenderTree.didRender(bucket.controller, bounds);
      bucket.environment.extra.debugRenderTree.didRender(bucket, bounds);
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
