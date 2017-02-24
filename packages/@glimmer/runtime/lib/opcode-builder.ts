import {
  ComponentDefinition
} from './component/interfaces';

import {
  FunctionExpression
} from './compiled/expressions/function';

import { SymbolTable } from '@glimmer/interfaces';

import {
  Opaque,
  Option
} from '@glimmer/util';

import * as WireFormat from '@glimmer/wire-format';

import { Block } from './scanner';

import { Helper } from './environment';

export type StaticDefinition = ComponentDefinition<Opaque>;
export type DynamicDefinition = FunctionExpression<ComponentDefinition<Opaque>>;

export type ComponentArgs = [WireFormat.Core.Params, WireFormat.Core.Hash, Option<Block>, Option<Block>];

export interface ComponentBuilder {
  static(definition: ComponentDefinition<Opaque>, args: ComponentArgs): void;
  dynamic(definitionArgs: ComponentArgs, getDefinition: Helper, args: ComponentArgs): void;
}
