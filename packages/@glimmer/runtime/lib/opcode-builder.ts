import { VersionedPathReference } from '@glimmer/reference';

import { Option } from '@glimmer/util';

import { PublicVM } from './vm/append';
import { RuntimeResolver, VMArguments, TemplateMeta } from '@glimmer/interfaces';
import { CurriedComponentDefinition } from './component/curried-component';

export interface DynamicComponentDefinition {
  (
    vm: PublicVM,
    args: VMArguments,
    meta: TemplateMeta,
    resolver: RuntimeResolver
  ): VersionedPathReference<Option<CurriedComponentDefinition>>;
}
