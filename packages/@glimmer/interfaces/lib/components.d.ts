import { Option, Opaque, Unique } from './core';

export type ComponentDefinitionState = Unique<'ComponentDefinitionState'>;
export type ComponentInstanceState = Unique<'ComponentInstanceState'>;

export interface ComponentDefinition<ComponentManager = {}, ComponentDefinitionState = {}> {
  state: ComponentDefinitionState;
  manager: ComponentManager;
}

export type ComponentManager = Opaque;
