import type { Nullable } from '../core';
import type { Reference } from '../references';

export interface ElementOperations {
  setAttribute(
    name: string,
    value: Reference,
    trusting: boolean,
    namespace: Nullable<string>
  ): void;

  setStaticAttribute(name: string, value: string, namespace: Nullable<string>): void;
}
