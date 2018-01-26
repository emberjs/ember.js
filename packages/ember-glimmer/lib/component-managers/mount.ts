import {
  ComponentCapabilities,
} from '@glimmer/interfaces';
import {
  CONSTANT_TAG,
  Tag,
  VersionedPathReference,
} from '@glimmer/reference';
import {
  ComponentDefinition,
  Invocation,
  WithDynamicLayout,
} from '@glimmer/runtime';
import {
  Destroyable,
  Opaque,
  Option
} from '@glimmer/util';
import { DEBUG } from 'ember-env-flags';

import { generateControllerFactory } from 'ember-routing';
import { OwnedTemplateMeta } from 'ember-views';
import { EMBER_ENGINES_MOUNT_PARAMS } from 'ember/features';
import Environment from '../environment';
import RuntimeResolver from '../resolver';
import { OwnedTemplate } from '../template';
import { RootReference } from '../utils/references';
import AbstractManager from './abstract';

// TODO: remove these stubbed interfaces when better typing is in place
interface Engine {
  boot(): void;
  destroy(): void;
  lookup(name: string): any;
  factoryFor(name: string): any;
}

interface EngineState {
  engine: Engine;
  controller: any;
  self: RootReference<any>;
  tag: Tag;
}

interface EngineWithModelState extends EngineState {
  modelRef: VersionedPathReference<Opaque>;
  modelRev: number;
}

interface EngineDefinitionState {
  name: string;
  modelRef: VersionedPathReference<Opaque> | undefined;
}

const CAPABILITIES =  {
  dynamicLayout: true,
  dynamicTag: false,
  prepareArgs: false,
  createArgs: false,
  attributeHook: false,
  elementHook: false
};

class MountManager extends AbstractManager<EngineState | EngineWithModelState, EngineDefinitionState>
    implements WithDynamicLayout<EngineState | EngineWithModelState, OwnedTemplateMeta, RuntimeResolver> {

  getDynamicLayout(state: EngineState, _: RuntimeResolver): Invocation {
    let template = state.engine.lookup('template:application') as OwnedTemplate;
    let layout = template.asLayout();
    return {
      handle: layout.compile(),
      symbolTable: layout.symbolTable
    };
  }

  getCapabilities(): ComponentCapabilities {
    return CAPABILITIES;
  }

  create(environment: Environment, state: EngineDefinitionState) {
    if (DEBUG) {
      this._pushEngineToDebugStack(`engine:${state.name}`, environment);
    }

    // TODO
    // mount is a runtime helper, this shouldn't use dynamic layout
    // we should resolve the engine app template in the helper
    // it also should use the owner that looked up the mount helper.

    let engine = environment.owner.buildChildEngineInstance<Engine>(state.name);

    engine.boot();

    let applicationFactory = engine.factoryFor(`controller:application`);
    let controllerFactory = applicationFactory || generateControllerFactory(engine, 'application');
    let controller: any;
    let self: RootReference<any>;
    let bucket: EngineState | EngineWithModelState;
    let tag: Tag;
    if (EMBER_ENGINES_MOUNT_PARAMS) {
      let modelRef = state.modelRef;
      if (modelRef === undefined) {
        controller = controllerFactory.create();
        self = new RootReference(controller);
        tag = CONSTANT_TAG;
        bucket = { engine, controller, self, tag };
      } else {
        let model = modelRef.value();
        let modelRev = modelRef.tag.value();
        controller = controllerFactory.create({ model });
        self = new RootReference(controller);
        tag = modelRef.tag;
        bucket = { engine, controller, self, tag, modelRef, modelRev };
      }
    } else {
      controller = controllerFactory.create();
      self = new RootReference(controller);
      tag = CONSTANT_TAG;
      bucket = { engine, controller, self, tag };
    }
    return bucket;
  }

  getSelf({ self }: EngineState): VersionedPathReference<Opaque> {
    return self;
  }

  getTag(state: EngineState | EngineWithModelState): Tag {
    return state.tag;
  }

  getDestructor({ engine }: EngineState): Option<Destroyable> {
    return engine;
  }

  didRenderLayout(): void {
    if (DEBUG) {
      this.debugStack.pop();
    }
  }

  update(bucket: EngineWithModelState): void {
    if (EMBER_ENGINES_MOUNT_PARAMS) {
      let { controller, modelRef, modelRev } = bucket;
      if (!modelRef.tag.validate(modelRev!)) {
        let model = modelRef.value();
        bucket.modelRev = modelRef.tag.value();
        controller.set('model', model);
      }
    }
  }
}

const MOUNT_MANAGER = new MountManager();

export class MountDefinition implements ComponentDefinition {
  public state: EngineDefinitionState;
  public manager = MOUNT_MANAGER;

  constructor(name: string, modelRef: VersionedPathReference<Opaque> | undefined) {
    this.state = { name, modelRef };
  }
}
