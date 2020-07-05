import { PathReference } from '@glimmer/reference';
import { ComponentManager } from './components/component-manager';
import { Dict } from './core';

export type ComponentDefinitionState = unknown;
export type ComponentInstanceState = unknown;

export interface ComponentDefinition<
  D = ComponentDefinitionState,
  I = ComponentInstanceState,
  M extends ComponentManager<I, D> = ComponentManager<I, D>
> {
  state: D;
  manager: ComponentManager<I, D>;
}

export interface PreparedArguments {
  positional: Array<PathReference<unknown>>;
  named: Dict<PathReference<unknown>>;
}
