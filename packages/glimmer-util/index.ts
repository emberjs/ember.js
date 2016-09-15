/*globals console*/

export interface Destroyable {
  destroy();
}

export { getAttrNamespace } from './lib/namespaces';
export { Option, Maybe, Opaque, opaque, unwrap } from './lib/platform-utils';
export { default as assert } from './lib/assert';
export { forEach, map, isArray, indexOfArray } from './lib/array-utils';
export { default as voidMap } from './lib/void-tag-names';
export { default as LOGGER, Logger, LogLevel } from './lib/logger';

export { merge, assign } from './lib/object-utils';
export { ensureGuid, initializeGuid, HasGuid } from './lib/guid';

export { Stack, Dict, Set, DictSet, dict } from './lib/collections';
export { EMPTY_SLICE, LinkedList, LinkedListNode, ListNode, CloneableListNode, ListSlice, Slice } from './lib/list-utils';

export type FIXME<T, string> = T;
