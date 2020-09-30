import { ENV } from '@ember/-internals/environment';
import { generateControllerFactory } from '@ember/-internals/routing';
import EngineInstance from '@ember/engine/instance';
import {
  Bounds,
  ComponentCapabilities,
  ComponentDefinition,
  Destroyable,
  Option,
  VMArguments,
  WithDynamicLayout,
} from '@glimmer/interfaces';
import { createConstRef, Reference, valueForRef } from '@glimmer/reference';
import { registerDestructor } from '@glimmer/runtime';
import { TemplateFactory } from '../..';
import { EmberVMEnvironment } from '../environment';
import RuntimeResolver from '../resolver';
import AbstractManager from './abstract';

interface EngineState {
  engine: EngineInstance;
  controller: any;
  self: Reference;
  environment: EmberVMEnvironment;
  modelRef?: Reference;
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
  willDestroy: false,
};

class MountManager
  extends AbstractManager<EngineState, EngineDefinitionState>
  implements WithDynamicLayout<EngineState, RuntimeResolver> {
  getDynamicLayout(state: EngineState, _: RuntimeResolver) {
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
    let self: Reference;
    let bucket: EngineState;
    let modelRef;

    if (args.named.has('model')) {
      modelRef = args.named.get('model');
    }

    if (modelRef === undefined) {
      controller = controllerFactory.create();
      self = createConstRef(controller, 'this');
      bucket = { engine, controller, self, environment };
    } else {
      let model = valueForRef(modelRef);
      controller = controllerFactory.create({ model });
      self = createConstRef(controller, 'this');
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

      registerDestructor(engine, () => {
        environment.extra.debugRenderTree.willDestroy(controller);
        environment.extra.debugRenderTree.willDestroy(bucket);
      });
    }

    return bucket;
  }

  getDebugName({ name }: EngineDefinitionState) {
    return name;
  }

  getSelf({ self }: EngineState): Reference {
    return self;
  }

  getDestroyable(bucket: EngineState): Option<Destroyable> {
    return bucket.engine;
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
      controller.set('model', valueForRef(modelRef!));
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
