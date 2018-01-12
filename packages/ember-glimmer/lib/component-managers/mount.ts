import {
  ComponentCapabilities, Unique,
} from '@glimmer/interfaces';
import {
  CONSTANT_TAG,
  Tag,
  VersionedPathReference,
} from '@glimmer/reference';
import {
  Arguments,
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
import { Component } from '../utils/curly-component-state-bucket';
import { RootReference } from '../utils/references';
import AbstractManager from './abstract';

// TODO: remove these stubbed interfaces when better typing is in place
interface Engine {
  boot(): void;
  destroy(): void;
  lookup(name: string): any;
  factoryFor(name: string): any;
}

interface EngineBucket {
  engine: Engine;
  component?: Component;
  controller?: any;
  modelReference?: any;
  modelRevision?: any;
}

interface EngineDefinitionState {
  name: string;
  capabilities: ComponentCapabilities;
}

class MountManager extends AbstractManager<EngineBucket, EngineDefinitionState>
    implements WithDynamicLayout<EngineBucket, OwnedTemplateMeta, RuntimeResolver> {

  getDynamicLayout(state: EngineBucket, _: RuntimeResolver): Invocation {
    let template = state.engine.lookup('template:application') as OwnedTemplate;
    let layout = template.asLayout();
    return {
      handle: layout.compile(),
      symbolTable: layout.symbolTable
    };
  }

  layoutFor(_definition: EngineDefinitionState, _component: EngineBucket, _env: Environment): Unique<'Handle'> {
    throw new Error('Method not implemented.');
  }

  getCapabilities(state: EngineDefinitionState): ComponentCapabilities {
    return state.capabilities;
  }

  create(environment: Environment, { name }: EngineDefinitionState, args: Arguments) {
    if (DEBUG) {
      this._pushEngineToDebugStack(`engine:${name}`, environment);
    }

    let engine = environment.owner.buildChildEngineInstance<Engine>(name);

    engine.boot();

    let bucket: EngineBucket = { engine };

    if (EMBER_ENGINES_MOUNT_PARAMS) {
      bucket.modelReference = args.named.get('model');
    }

    return bucket;
  }

  getSelf(bucket: EngineBucket): VersionedPathReference<Opaque> {
    let { engine, modelReference } = bucket;

    let applicationFactory = engine.factoryFor(`controller:application`);
    let controllerFactory = applicationFactory || generateControllerFactory(engine, 'application');
    let controller = bucket.controller = controllerFactory.create();

    if (EMBER_ENGINES_MOUNT_PARAMS) {
      let model = modelReference.value();
      bucket.modelRevision = modelReference.tag.value();
      controller.set('model', model);
    }

    return new RootReference(controller);
  }

  getTag(): Tag {
    return CONSTANT_TAG;
  }

  getDestructor({ engine }: EngineBucket): Option<Destroyable> {
    return engine;
  }

  didRenderLayout(): void {
    if (DEBUG) {
      this.debugStack.pop();
    }
  }

  update(bucket: EngineBucket): void {
    if (EMBER_ENGINES_MOUNT_PARAMS) {
      let { controller, modelReference, modelRevision } = bucket;

      if (!modelReference.tag.validate(modelRevision)) {
        let model = modelReference.value();
        bucket.modelRevision = modelReference.tag.value();
        controller.set('model', model);
      }
    }
  }
}

const MOUNT_MANAGER = new MountManager();

export class MountDefinition implements ComponentDefinition {
  public state: EngineDefinitionState;
  public manager = MOUNT_MANAGER;

  constructor(public name: string) {
    this.state = {
      name,
      capabilities: {
        dynamicLayout: true,
        dynamicTag: false,
        prepareArgs: false,
        createArgs: true,
        attributeHook: false,
        elementHook: false
      }
    };
  }
}
