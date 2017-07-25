import { VersionedPathReference } from '@glimmer/reference';
import { ComponentDefinition } from './component/interfaces';
import { IArguments } from './vm/arguments';

import {
  Opaque,
  Option
} from '@glimmer/util';

import * as WireFormat from '@glimmer/wire-format';

import { BlockSyntax } from './syntax/interfaces';

import { PublicVM } from './vm/append';
import { Specifier, Resolver } from './internal-interfaces';

export type ComponentArgs = [WireFormat.Core.Params, WireFormat.Core.Hash, Option<BlockSyntax>, Option<BlockSyntax>];

export interface DynamicComponentDefinition {
  (
    vm: PublicVM,
    args: IArguments,
    meta: WireFormat.TemplateMeta,
    resolver: Resolver
  ): VersionedPathReference<Option<ComponentDefinition<Opaque>>>;
}

export interface ComponentBuilder {
  static(definition: Specifier, args: ComponentArgs): void;
}
