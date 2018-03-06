import { ComponentManager } from '@glimmer/runtime';

import { assert } from 'ember-debug';
import { Owner, symbol } from 'ember-utils';

import DefinitionState from '../component-managers/definition-state';
import ComponentStateBucket from '../utils/curly-component-state-bucket';

import { GLIMMER_CUSTOM_COMPONENT_MANAGER } from 'ember/features';

export const COMPONENT_MANAGER = symbol('COMPONENT_MANAGER');

export function componentManager(obj: any, managerId: String) {
  if ('reopenClass' in obj) {
    return obj.reopenClass({
      [COMPONENT_MANAGER]: managerId
    });
  }

  obj[COMPONENT_MANAGER] = managerId;
  return obj;
}

export default function getCustomComponentManager(owner: Owner, obj: {}): ComponentManager<ComponentStateBucket, DefinitionState> | undefined {
  if (!GLIMMER_CUSTOM_COMPONENT_MANAGER) { return; }

  if (!obj) { return; }

  let managerId = obj[COMPONENT_MANAGER];
  if (!managerId) { return; }

  let manager = owner.lookup(`component-manager:${managerId}`) as ComponentManager<ComponentStateBucket, DefinitionState>;
  assert(`Could not find custom component manager '${managerId}' for ${obj}`, !!manager);

  return manager;
}