import { VersionedPathReference } from '@glimmer/reference';

import { Option } from '@glimmer/util';

import {
  RuntimeResolverDelegate,
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
    resolver: RuntimeResolverDelegate
  ): VersionedPathReference<Option<CurriedComponentDefinition>>;
}
