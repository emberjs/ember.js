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

import * as WireFormat from 'glimmer-wire-format';

export type StaticDefinition = ComponentDefinition<Opaque>;
export type DynamicDefinition = FunctionExpression<ComponentDefinition<Opaque>>;

export interface ComponentBuilder {
  static(definition: ComponentDefinition<Opaque>, args: WireFormat.Core.Args, symbolTable: SymbolTable, shadow?: string[]);
  dynamic(definitionArgs: WireFormat.Core.Args, definition: DynamicDefinition, args: WireFormat.Core.Args, symbolTable: SymbolTable, shadow?: string[]);
}
