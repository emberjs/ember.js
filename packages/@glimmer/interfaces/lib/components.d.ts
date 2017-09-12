import { Option, Opaque, Unique } from './core';

export type ComponentDefinitionState = Unique<'ComponentDefinitionState'>;
export type ComponentInstanceState = Unique<'ComponentInstanceState'>;

export interface ComponentDefinition<ComponentManager = {}, StaticComponentState = {}> {
  state: StaticComponentState;
  manager: ComponentManager;
}

export type ComponentManager = Opaque;