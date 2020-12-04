import { Owner } from '@ember/-internals/owner';
import { generateControllerFactory } from '@ember/-internals/routing';
import EngineInstance from '@ember/engine/instance';
import { associateDestroyableChild } from '@glimmer/destroyable';
import {
  CapturedArguments,
  ComponentDefinition,
  CustomRenderNode,
  Destroyable,
  Environment,
  InternalComponentCapabilities,
  Option,
  TemplateFactory,
  VMArguments,
  WithCreateInstance,
  WithCustomDebugRenderTree,
  WithDynamicLayout,
} from '@glimmer/interfaces';
import { capabilityFlagsFrom } from '@glimmer/manager';
import { createConstRef, Reference, valueForRef } from '@glimmer/reference';
import { unwrapTemplate } from '@glimmer/util';
import RuntimeResolver from '../resolver';

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
  implements
    WithCreateInstance<EngineState, Environment>,
    WithDynamicLayout<EngineState, RuntimeResolver>,
    WithCustomDebugRenderTree<EngineState, EngineDefinitionState> {
  getDynamicLayout(state: EngineState) {
    let templateFactory = state.engine.lookup('template:application') as TemplateFactory;
    return unwrapTemplate(templateFactory(state.engine)).asLayout();
  }

  getCapabilities(): InternalComponentCapabilities {
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
    templateModuleName?: string
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
        template: templateModuleName,
      },
    ];
  }

  getSelf({ self }: EngineState): Reference {
    return self;
  }

  getDestroyable(bucket: EngineState): Option<Destroyable> {
    return bucket.engine;
  }

  didCreate() {}
  didUpdate() {}

  didRenderLayout(): void {}
  didUpdateLayout(): void {}

  update(bucket: EngineState): void {
    let { controller, modelRef } = bucket;

    if (modelRef !== undefined) {
      controller.set('model', valueForRef(modelRef!));
    }
  }
}

const MOUNT_MANAGER = new MountManager();

export class MountDefinition implements ComponentDefinition {
  // handle is not used by this custom definition
  public handle = -1;

  public state: EngineDefinitionState;
  public manager = MOUNT_MANAGER;
  public compilable = null;
  public capabilities = capabilityFlagsFrom(CAPABILITIES);

  constructor(public resolvedName: string) {
    this.state = { name: resolvedName };
  }
}
