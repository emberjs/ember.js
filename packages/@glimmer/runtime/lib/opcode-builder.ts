import {
  ComponentDefinition
} from './component/interfaces';

import {
  FunctionExpression
} from './compiled/expressions/function';

import { BaselineSyntax, InlineBlock } from './scanner';

import { SymbolTable } from '@glimmer/interfaces';

import {
  Opaque
} from '@glimmer/util';

import { Helper } from './environment';

export type StaticDefinition = ComponentDefinition<Opaque>;
export type DynamicDefinition = FunctionExpression<ComponentDefinition<Opaque>>;

export interface ComponentBuilder {
  static(definition: ComponentDefinition<Opaque>, args: BaselineSyntax.Args, symbolTable: SymbolTable, shadow?: InlineBlock): void;
  dynamic(definitionArgs: BaselineSyntax.Args, getDefinition: Helper, args: BaselineSyntax.Args, symbolTable: SymbolTable, shadow?: InlineBlock): void;
}
