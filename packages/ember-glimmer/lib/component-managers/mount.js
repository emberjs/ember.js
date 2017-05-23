import {
  ComponentDefinition
} from '@glimmer/runtime';
import { UNDEFINED_REFERENCE } from '@glimmer/reference';
import { DEBUG } from 'ember-env-flags';

import { RootReference } from '../utils/references';
import { OutletLayoutCompiler } from './outlet';
import AbstractManager from './abstract';
import { generateControllerFactory } from 'ember-routing';
import { EMBER_ENGINES_MOUNT_PARAMS } from 'ember/features';

class MountManager extends AbstractManager {
  prepareArgs(definition, args) {
    return null;
  }

  create(environment, { name }, args, dynamicScope) {
    if (DEBUG) {
      this._pushEngineToDebugStack(`engine:${name}`, environment)
    }

    dynamicScope.outletState = UNDEFINED_REFERENCE;

    let engine = environment.owner.buildChildEngineInstance(name);

    engine.boot();

    return { engine, args };
  }

  layoutFor(definition, { engine }, env) {
    let template = engine.lookup(`template:application`);
    return env.getCompiledBlock(OutletLayoutCompiler, template);
  }

  getSelf(bucket) {
    let { engine, args } = bucket;

    let applicationFactory = engine.factoryFor(`controller:application`);
    let controllerFactory = applicationFactory || generateControllerFactory(engine, 'application');
    let controller = bucket.controller = controllerFactory.create();

    if (EMBER_ENGINES_MOUNT_PARAMS) {
      let model = args.named.value();
      bucket.argsRevision = args.tag.value();
      controller.set('model', model);
    }

    return new RootReference(controller);
  }

  getTag() {
    return null;
  }

  getDestructor({ engine }) {
    return engine;
  }

  didCreateElement() {}

  didRenderLayout() {
    if (DEBUG) {
      this.debugStack.pop()
    }
  }

  didCreate(state) {}

  update(bucket) {
    if (EMBER_ENGINES_MOUNT_PARAMS) {
      let { controller, args, argsRevision } = bucket;

      if (!args.tag.validate(argsRevision)) {
        let model = args.named.value();
        bucket.argsRevision = args.tag.value();
        controller.set('model', model);
      }
    }
  }

  didUpdateLayout() {}
  didUpdate(state) {}
}

const MOUNT_MANAGER = new MountManager();

export class MountDefinition extends ComponentDefinition {
  constructor(name) {
    super(name, MOUNT_MANAGER, null);
  }
}
