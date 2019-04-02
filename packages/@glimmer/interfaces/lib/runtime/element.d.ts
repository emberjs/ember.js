import { VersionedReference } from '@glimmer/reference';
import { Option } from '../core';
import { ModifierManager } from '@glimmer/interfaces';

export interface ElementOperations {
  setAttribute(
    name: string,
    value: VersionedReference,
    trusting: boolean,
    namespace: Option<string>
  ): void;

  addModifier<S>(manager: ModifierManager<S>, state: S): void;
}
