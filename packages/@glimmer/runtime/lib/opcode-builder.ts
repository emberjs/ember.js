import { VersionedPathReference } from '@glimmer/reference';
import { ComponentDefinition } from './component/interfaces';
import { IArguments } from './vm/arguments';

import {
  Opaque,
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
  ): VersionedPathReference<Option<ComponentDefinition<Opaque>>>;
}
