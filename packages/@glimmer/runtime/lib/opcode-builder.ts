import { VersionedPathReference } from '@glimmer/reference';

import { Option } from '@glimmer/util';

import {
  RuntimeResolverOptions,
  VMArguments,
  TemplateMeta,
  VM as PublicVM,
} from '@glimmer/interfaces';
import { CurriedComponentDefinition } from './component/curried-component';

export interface DynamicComponentDefinition {
  (
    vm: PublicVM,
    args: VMArguments,
    meta: TemplateMeta,
    resolver: RuntimeResolverOptions
  ): VersionedPathReference<Option<CurriedComponentDefinition>>;
}
