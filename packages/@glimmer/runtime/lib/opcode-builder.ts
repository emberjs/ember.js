import { VersionedPathReference } from '@glimmer/reference';
import { BrandedComponentDefinition } from './component/interfaces';
import { IArguments } from './vm/arguments';

import {
  Option
} from '@glimmer/util';

import * as WireFormat from '@glimmer/wire-format';

import { PublicVM } from './vm/append';
import { Resolver } from './internal-interfaces';

export interface DynamicComponentDefinition {
  (
    vm: PublicVM,
    args: IArguments,
    meta: WireFormat.TemplateMeta,
    resolver: Resolver
  ): VersionedPathReference<Option<BrandedComponentDefinition>>;
}
