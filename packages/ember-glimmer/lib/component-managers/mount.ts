import {
  Arguments,
  ComponentDefinition,
} from '@glimmer/runtime';
import {
  Destroyable,
  Opaque,
  Option
} from '@glimmer/util';
import {
  VersionedPathReference
} from '@glimmer/reference';
import { DEBUG } from 'ember-env-flags';

import { generateControllerFactory } from 'ember-routing';
import { EMBER_ENGINES_MOUNT_PARAMS } from 'ember/features';
import { RootReference } from '../utils/references';
import Environment from '../environment';
import AbstractManager from './abstract';
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
  controller?: any;
  modelReference?: any;
  modelRevision?: any;
}

class MountManager extends AbstractManager<EngineBucket> {
  create(environment: Environment, { name }: ComponentDefinition<EngineBucket>, args: Arguments) {
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

  layoutFor(_definition: ComponentDefinition<EngineBucket>, { engine }: EngineBucket, env: Environment) {
    let template = engine.lookup(`template:application`);
    return env.getCompiledBlock(OutletLayoutCompiler, template);
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

export class MountDefinition extends ComponentDefinition<Opaque> {
  constructor(name: string) {
    super(name, MOUNT_MANAGER, null);
  }
}
