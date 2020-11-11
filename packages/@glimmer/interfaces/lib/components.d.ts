// eslint-disable-next-line node/no-extraneous-import
import { Reference } from '@glimmer/reference';
import { InternalComponentManager } from './managers';
import { Dict } from './core';

export type ComponentDefinitionState = unknown;
export type ComponentInstanceState = unknown;

export interface ComponentDefinition<
  D = ComponentDefinitionState,
  I = ComponentInstanceState,
  M extends InternalComponentManager<I, D> = InternalComponentManager<I, D>
> {
  state: D;
  manager: M;
}

export interface PreparedArguments {
  positional: Array<Reference>;
  named: Dict<Reference>;
}
