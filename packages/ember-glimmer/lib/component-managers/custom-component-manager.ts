import { Opaque } from '@glimmer/interfaces';
import { ComponentManager } from '@glimmer/runtime';
import { symbol } from 'ember-utils';

export const COMPONENT_MANAGER = symbol('COMPONENT_MANAGER');

export function getCustomComponentManager(obj: {}): ComponentManager<Opaque, Opaque> | null {
  if (!obj) { return null; }

  return obj[COMPONENT_MANAGER] || null;
}