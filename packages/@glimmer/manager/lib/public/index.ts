import { _WeakSet } from '@glimmer/util';
import { ComponentManager, HelperManager, ModifierManager, Owner } from '@glimmer/interfaces';
import {
  setInternalComponentManager,
  setInternalHelperManager,
  setInternalModifierManager,
} from '../internal/index';
import { CustomComponentManager } from './component';
import { DEBUG } from '@glimmer/env';
import { FROM_CAPABILITIES } from '../util/capabilities';
import { CustomModifierManager } from './modifier';
import customHelper from './helper';

type Manager = ComponentManager<unknown> | ModifierManager<unknown> | HelperManager<unknown>;

export type ManagerFactory<O, D extends Manager = Manager> = (owner: O) => D;

export function setComponentManager<O extends Owner>(
  factory: ManagerFactory<O, ComponentManager<unknown>>,
  obj: object
) {
  return setInternalComponentManager((owner: O) => {
    let manager = factory(owner);

    if (DEBUG && !FROM_CAPABILITIES!.has(manager.capabilities)) {
      // TODO: This error message should make sense in both Ember and Glimmer https://github.com/glimmerjs/glimmer-vm/issues/1200
      throw new Error(
        `Custom component managers must have a \`capabilities\` property that is the result of calling the \`capabilities('3.4' | '3.13')\` (imported via \`import { capabilities } from '@ember/component';\`). Received: \`${JSON.stringify(
          manager.capabilities
        )}\` for: \`${manager}\``
      );
    }

    return new CustomComponentManager(manager);
  }, obj);
}

export function setModifierManager<O extends Owner>(
  factory: ManagerFactory<O, ModifierManager<unknown>>,
  obj: object
) {
  return setInternalModifierManager((owner: O) => {
    let manager = factory(owner);

    if (DEBUG && !FROM_CAPABILITIES!.has(manager.capabilities)) {
      // TODO: This error message should make sense in both Ember and Glimmer https://github.com/glimmerjs/glimmer-vm/issues/1200
      throw new Error(
        `Custom modifier managers must have a \`capabilities\` property that is the result of calling the \`capabilities('3.13' | '3.22')\` (imported via \`import { capabilities } from '@ember/modifier';\`). Received: \`${JSON.stringify(
          manager.capabilities
        )}\` for: \`${manager}\``
      );
    }

    return new CustomModifierManager(manager);
  }, obj);
}

export function setHelperManager<O extends Owner>(
  factory: ManagerFactory<O | undefined, HelperManager<unknown>>,
  obj: object
) {
  return setInternalHelperManager((owner: O | undefined) => {
    let manager = factory(owner);

    if (DEBUG && !FROM_CAPABILITIES!.has(manager.capabilities)) {
      // TODO: This error message should make sense in both Ember and Glimmer https://github.com/glimmerjs/glimmer-vm/issues/1200
      throw new Error(
        `Custom helper managers must have a \`capabilities\` property that is the result of calling the \`capabilities('3.23')\` (imported via \`import { capabilities } from '@ember/helper';\`). Received: \`${JSON.stringify(
          manager.capabilities
        )}\` for: \`${manager}\``
      );
    }

    return { helper: customHelper(manager, obj), manager };
  }, obj);
}
