/*globals console*/

export interface Destroyable {
  destroy();
}

export { getAttrNamespace } from './lib/namespaces';
export { LITERAL, InternedString, Opaque, opaque, symbol, intern, numberKey } from './lib/platform-utils';
export { default as assert } from './lib/assert';
export { forEach, map, isArray, indexOfArray } from './lib/array-utils';
export { default as voidMap } from './lib/void-tag-names';
export { default as LOGGER, Logger, LogLevel } from './lib/logger';

/* tslint:disable:no-unused-variable */
import * as types from './lib/object-utils';
/* tslint:enable:no-unused-variable */
export { merge, assign } from './lib/object-utils';
export { ensureGuid, initializeGuid, HasGuid } from './lib/guid';

export { types };
export { Stack, Dict, DictWithNumberKeys, Set, DictSet, dict } from './lib/collections';
export { EMPTY_SLICE, LinkedList, LinkedListNode, ListNode, CloneableListNode, ListSlice, Slice } from './lib/list-utils';

export type FIXME<T> = any;
