import { VersionedPathReference } from '@glimmer/reference';
import { BrandedComponentDefinition } from './component/interfaces';
import { IArguments } from './vm/arguments';

import {
  Option
} from '@glimmer/util';

import * as WireFormat from '@glimmer/wire-format';

import { PublicVM } from './vm/append';
import { Resolver } from "@glimmer/interfaces";

export interface DynamicComponentDefinition<Specifier> {
  (
    vm: PublicVM,
    args: IArguments,
    meta: WireFormat.TemplateMeta,
    resolver: Resolver<Specifier>
  ): VersionedPathReference<Option<BrandedComponentDefinition>>;
}
