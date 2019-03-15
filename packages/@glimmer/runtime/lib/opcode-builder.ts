import { VersionedPathReference } from '@glimmer/reference';

import { Option } from '@glimmer/util';

import { RuntimeResolverDelegate, VMArguments, VM as PublicVM } from '@glimmer/interfaces';
import { CurriedComponentDefinition } from './component/curried-component';

export interface DynamicComponentDefinition {
  (
    vm: PublicVM,
    args: VMArguments,
    meta: unknown,
    resolver: RuntimeResolverDelegate
  ): VersionedPathReference<Option<CurriedComponentDefinition>>;
}
