import { VersionedReference } from '@glimmer/reference';
import { Option } from '../core';

export interface ElementOperations {
  setAttribute(
    name: string,
    value: VersionedReference,
    trusting: boolean,
    namespace: Option<string>
  ): void;
}
