import { DEBUG } from '@glimmer/env';
import { ComponentCapabilities } from '@glimmer/interfaces';
import { CONSTANT_TAG, Tag, VersionedPathReference } from '@glimmer/reference';
import { Arguments, ComponentDefinition, Invocation, WithDynamicLayout } from '@glimmer/runtime';
import { Destroyable, Opaque, Option } from '@glimmer/util';

import { Owner } from '@ember/-internals/owner';
import { generateControllerFactory } from '@ember/-internals/routing';
import { OwnedTemplateMeta } from '@ember/-internals/views';
import { EMBER_ROUTING_MODEL_ARG } from '@ember/canary-features';
import { assert } from '@ember/debug';

import { TemplateFactory } from '../..';
import Environment from '../environment';
import RuntimeResolver from '../resolver';
import { RootReference } from '../utils/references';
import AbstractManager from './abstract';

// TODO: remove these stubbed interfaces when better typing is in place
interface EngineInstance extends Owner {
  boot(): void;
  destroy(): void;
}

interface EngineState {
  engine: EngineInstance;
  controller: any;
  self: RootReference<any>;
  modelRef?: VersionedPathReference<Opaque>;
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
      this._pushEngineToDebugStack(`engine:${name}`, environment);
    }

    // TODO
    // mount is a runtime helper, this shouldn't use dynamic layout
    // we should resolve the engine app template in the helper
    // it also should use the owner that looked up the mount helper.

    let engine = environment.owner.buildChildEngineInstance<EngineInstance>(name);

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
      bucket = { engine, controller, self };
    } else {
      let model = modelRef.value();
      controller = controllerFactory.create({ model });
      self = new RootReference(controller);
      bucket = { engine, controller, self, modelRef };
    }

    return bucket;
  }

  getSelf({ self }: EngineState): VersionedPathReference<Opaque> {
    return self;
  }

  getTag(state: EngineState): Tag {
    if (state.modelRef) {
      return state.modelRef.tag;
    } else {
      return CONSTANT_TAG;
    }
  }

  getDestructor({ engine }: EngineState): Option<Destroyable> {
    return engine;
  }

  didRenderLayout(): void {
    if (DEBUG) {
      this.debugStack.pop();
    }
  }

  update({ controller, modelRef }: EngineState): void {
    assert('[BUG] `update` should only be called when modelRef is present', modelRef !== undefined);
    controller.set('model', modelRef!.value());
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
