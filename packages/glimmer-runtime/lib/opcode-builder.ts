import {
  ComponentDefinition
} from './component/interfaces';

import {
  FunctionExpression
} from './compiled/expressions/function';

import {
  Args
} from './syntax/core';

import { SymbolTable } from 'glimmer-interfaces';

import {
  Opaque
} from 'glimmer-util';

export type StaticDefinition = ComponentDefinition<Opaque>;
export type DynamicDefinition = FunctionExpression<ComponentDefinition<Opaque>>;

export interface ComponentBuilder {
  static(definition: ComponentDefinition<Opaque>, args: Args, symbolTable: SymbolTable, shadow?: string[]);
  dynamic(definitionArgs: Args, definition: DynamicDefinition, args: Args, symbolTable: SymbolTable, shadow?: string[]);
}
