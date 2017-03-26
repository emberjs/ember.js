export interface Destroyable {
  destroy(): void;
}

export { getAttrNamespace } from './lib/namespaces';
export * from './lib/platform-utils';
export { default as assert } from './lib/assert';

export { assign, fillNulls } from './lib/object-utils';
export { ensureGuid, initializeGuid, HasGuid } from './lib/guid';

export { Stack, Dict, Set, DictSet, dict } from './lib/collections';
export { EMPTY_SLICE, LinkedList, LinkedListNode, ListNode, CloneableListNode, ListSlice, Slice } from './lib/list-utils';
export { default as A, EMPTY_ARRAY } from './lib/array-utils';
export { HAS_NATIVE_WEAKMAP } from './lib/weakmap';

export type TSISSUE<T, S extends string> = T;
export type FIXME<T, S extends string> = T;
export type TRUST<T, S extends string> = any;