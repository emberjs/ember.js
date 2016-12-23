export interface Destroyable {
  destroy(): void;
}

export { getAttrNamespace } from './lib/namespaces';
export * from './lib/platform-utils';
export { default as assert } from './lib/assert';
export { default as LOGGER, Logger, LogLevel } from './lib/logger';

export { assign, fillNulls } from './lib/object-utils';
export { ensureGuid, initializeGuid, HasGuid } from './lib/guid';

export { Stack, Dict, Set, DictSet, dict } from './lib/collections';
export { EMPTY_SLICE, LinkedList, LinkedListNode, ListNode, CloneableListNode, ListSlice, Slice } from './lib/list-utils';

export type TSISSUE<T, S extends string> = T;
export type FIXME<T, S extends string> = T;
export type TRUST<T, S extends string> = any;