import type { Nullable } from '../core.js';
import type { Reference } from '../references.js';

/**
 * Applies an attribute whose value is a reference. Passed along with the
 * reference so only code that sets dynamic attributes carries it.
 */
export type DynamicAttributeApplier = (
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  vm: any,
  name: string,
  value: Reference,
  namespace: Nullable<string>,
  trusting: boolean
) => void;

export interface ElementOperations {
  setAttribute(
    name: string,
    value: Reference,
    trusting: boolean,
    namespace: Nullable<string>,
    apply?: DynamicAttributeApplier
  ): void;

  setStaticAttribute(name: string, value: string, namespace: Nullable<string>): void;
}
