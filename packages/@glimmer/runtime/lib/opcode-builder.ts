import { VersionedPathReference } from '@glimmer/reference';
import { ComponentDefinition } from './component/interfaces';
import { IArguments } from './vm/arguments';

import {
  Opaque,
  Option
} from '@glimmer/util';

import * as WireFormat from '@glimmer/wire-format';

import { Block } from './scanner';

import { PublicVM } from './vm/append';

export type ComponentArgs = [WireFormat.Core.Params, WireFormat.Core.Hash, Option<Block>, Option<Block>];

export interface DynamicComponentDefinition {
  (vm: PublicVM, args: IArguments, meta: WireFormat.TemplateMeta): VersionedPathReference<Option<ComponentDefinition<Opaque>>>;
}

export interface ComponentBuilder {
  static(definition: ComponentDefinition<Opaque>, args: ComponentArgs): void;
  dynamic(definitionArgs: ComponentArgs, getDefinition: DynamicComponentDefinition, args: ComponentArgs): void;
}
