import { Owner } from '@ember/-internals/owner';
import { generateControllerFactory } from '@ember/-internals/routing';
import EngineInstance from '@ember/engine/instance';
import {
  CapturedArguments,
  ComponentCapabilities,
  ComponentDefinition,
  CustomRenderNode,
  Destroyable,
  Environment,
  Option,
  Template,
  TemplateFactory,
  VMArguments,
  WithCustomDebugRenderTree,
  WithDynamicLayout,
} from '@glimmer/interfaces';
import { createConstRef, Reference, valueForRef } from '@glimmer/reference';
import { associateDestroyableChild } from '@glimmer/runtime';
import RuntimeResolver from '../resolver';
import AbstractManager from './abstract';

interface EngineState {
  engine: EngineInstance;
  controller: any;
  self: Reference;
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
  implements
    WithDynamicLayout<EngineState, RuntimeResolver>,
    WithCustomDebugRenderTree<EngineState, EngineDefinitionState> {
  getDynamicLayout(state: EngineState) {
    let templateFactory = state.engine.lookup('template:application') as TemplateFactory;
    return templateFactory(state.engine);
  }

  getCapabilities(): ComponentCapabilities {
    return CAPABILITIES;
  }

  create(env: Environment<Owner>, { name }: EngineDefinitionState, args: VMArguments) {
    // TODO
    // mount is a runtime helper, this shouldn't use dynamic layout
    // we should resolve the engine app template in the helper
    // it also should use the owner that looked up the mount helper.

    let engine = env.owner.buildChildEngineInstance(name);

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
      bucket = { engine, controller, self, modelRef };
    } else {
      let model = valueForRef(modelRef);
      controller = controllerFactory.create({ model });
      self = createConstRef(controller, 'this');
      bucket = { engine, controller, self, modelRef };
    }

    if (env.debugRenderTree) {
      associateDestroyableChild(engine, controller);
    }

    return bucket;
  }

  getDebugName({ name }: EngineDefinitionState) {
    return name;
  }

  getDebugCustomRenderTree(
    definition: EngineDefinitionState,
    state: EngineState,
    args: CapturedArguments,
    template?: Template
  ): CustomRenderNode[] {
    return [
      {
        bucket: state.engine,
        instance: state.engine,
        type: 'engine',
        name: definition.name,
        args,
      },
      {
        bucket: state.controller,
        instance: state.controller,
        type: 'route-template',
        name: 'application',
        args,
        template,
      },
    ];
  }

  getSelf({ self }: EngineState): Reference {
    return self;
  }

  getDestroyable(bucket: EngineState): Option<Destroyable> {
    return bucket.engine;
  }

  didRenderLayout(): void {}

  update(bucket: EngineState): void {
    let { controller, modelRef } = bucket;

    if (modelRef !== undefined) {
      controller.set('model', valueForRef(modelRef!));
    }
  }

  didUpdateLayout(): void {}
}

const MOUNT_MANAGER = new MountManager();

export class MountDefinition implements ComponentDefinition {
  public state: EngineDefinitionState;
  public manager = MOUNT_MANAGER;

  constructor(name: string) {
    this.state = { name };
  }
}
