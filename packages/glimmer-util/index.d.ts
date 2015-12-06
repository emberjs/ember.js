/*globals console*/

export { default as SafeString } from './lib/safe-string';
export { getAttrNamespace } from './lib/namespaces';
export { LITERAL, InternedString, symbol, intern, numberKey } from './lib/platform-utils';
export { default as assert } from './lib/assert';
export { forEach, map, isArray, indexOfArray } from './lib/array-utils';
export { default as voidMap } from './lib/void-tag-names';

/* tslint:disable:no-unused-variable */
import * as types from './lib/object-utils';
/* tslint:enable:no-unused-variable */
export { merge, assign } from './lib/object-utils';
export { installGuid, HasGuid } from './lib/guid';

export { types };
export { Stack, Dict, Set, DictSet, dict } from './lib/collections';
export { EMPTY_SLICE, LinkedList, LinkedListNode, ListNode, ListSlice, Slice } from './lib/list-utils';