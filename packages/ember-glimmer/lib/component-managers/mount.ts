import {
  Arguments,
  ComponentDefinition,
} from '@glimmer/runtime';
import {
  ComponentCapabilities,
  VMHandle
} from '@glimmer/interfaces';
import {
  Destroyable,
  Opaque,
  Option
} from '@glimmer/util';
import {
  Tag,
  VersionedPathReference
} from '@glimmer/reference';
import { DEBUG } from 'ember-env-flags';

import { generateControllerFactory } from 'ember-routing';
import { EMBER_ENGINES_MOUNT_PARAMS } from 'ember/features';
import { Component } from '../utils/curly-component-state-bucket';
import { DIRTY_TAG } from '../component';
import { RootReference } from '../utils/references';
import Environment from '../environment';
import AbstractManager from './abstract';
import DefinitionState, { CAPABILITIES } from './definition-state';
import { OutletLayoutCompiler } from './outlet';

// TODO: remove these stubbed interfaces when better typing is in place
interface EngineType {
  boot(): void;
  destroy(): void;
  lookup(name: string): any;
  factoryFor(name: string): any;
}

interface EngineBucket {
  engine: EngineType;
  component?: Component;
  controller?: any;
  modelReference?: any;
  modelRevision?: any;
}

class MountManager extends AbstractManager<EngineBucket, DefinitionState> {
  getCapabilities(state: DefinitionState): ComponentCapabilities {
    return state.capabilities;
  }

  create(environment: Environment, { name }: DefinitionState, args: Arguments) {
    if (DEBUG) {
      this._pushEngineToDebugStack(`engine:${name}`, environment);
    }

    let engine = environment.owner.buildChildEngineInstance<EngineType>(name);

    engine.boot();

    let bucket: EngineBucket = { engine };

    if (EMBER_ENGINES_MOUNT_PARAMS) {
      bucket.modelReference = args.named.get('model');
    }

    return bucket;
  }

  layoutFor(_definition: ComponentDefinition<EngineBucket>, _bucket: EngineBucket, _env: Environment) {
    // let template = engine.lookup(`template:application`);
    throw Error('use resolver.lookupTemplate resolver.compileTemplate');
    // needs to use resolver
    // return env.getCompiledBlock(CurlyComponentLayoutCompiler, template);
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

  getTag({ component }: EngineBucket): Tag {
    // TODO: is this the right tag?
    return component[DIRTY_TAG];
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

export class MountDefinition implements ComponentDefinition {
  public state: DefinitionState;

  constructor(public name: string, public manager: MountManager, public ComponentClass: any, public handle: Option<VMHandle>) {
    this.state = {
      name,
      ComponentClass,
      handle,
      capabilities: CAPABILITIES
    };
  }
}
