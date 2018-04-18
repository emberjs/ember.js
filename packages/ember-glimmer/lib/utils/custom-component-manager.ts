import { assert } from '@ember/debug';
import { Owner } from 'ember-owner';
import { symbol } from 'ember-utils';

import CustomComponentManager, { CustomComponentState } from '../component-managers/custom';

import { GLIMMER_CUSTOM_COMPONENT_MANAGER } from 'ember/features';

export const COMPONENT_MANAGER = symbol('COMPONENT_MANAGER');

export function componentManager(obj: any, managerId: String) {
  if ('reopenClass' in obj) {
    return obj.reopenClass({
      [COMPONENT_MANAGER]: managerId,
    });
  }

  obj[COMPONENT_MANAGER] = managerId;
  return obj;
}

export default function getCustomComponentManager(
  owner: Owner,
  obj: {}
): CustomComponentManager<CustomComponentState<any>> | undefined {
  if (!GLIMMER_CUSTOM_COMPONENT_MANAGER) {
    return;
  }

  if (!obj) {
    return;
  }

  let managerId = obj[COMPONENT_MANAGER];
  if (!managerId) {
    return;
  }

  let manager = new CustomComponentManager(
    owner.lookup(`component-manager:${managerId}`)
  ) as CustomComponentManager<CustomComponentState<any>>;
  assert(`Could not find custom component manager '${managerId}' for ${obj}`, !!manager);

  return manager;
}
