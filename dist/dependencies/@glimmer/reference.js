import { DEBUG } from '@glimmer/env';
import { setProp, getProp, toIterator, getPath } from '@glimmer/global-context';
import { expect, isDict, EMPTY_ARRAY, isObject } from '@glimmer/util';
import { CONSTANT_TAG, validateTag, track, valueForTag, consumeTag, createTag, dirtyTag, INITIAL } from '@glimmer/validator';

const REFERENCE = Symbol('REFERENCE');
const CONSTANT = 0;
const COMPUTE = 1;
const UNBOUND = 2;
const INVOKABLE = 3;

//////////

class ReferenceImpl {
  [REFERENCE];
  tag = null;
  lastRevision = INITIAL;
  lastValue;
  children = null;
  compute = null;
  update = null;
  debugLabel;
  constructor(type) {
    this[REFERENCE] = type;
  }
}
function createPrimitiveRef(value) {
  const ref = new ReferenceImpl(UNBOUND);
  ref.tag = CONSTANT_TAG;
  ref.lastValue = value;
  if (DEBUG) {
    ref.debugLabel = String(value);
  }
  return ref;
}
const UNDEFINED_REFERENCE = createPrimitiveRef(undefined);
const NULL_REFERENCE = createPrimitiveRef(null);
const TRUE_REFERENCE = createPrimitiveRef(true);
const FALSE_REFERENCE = createPrimitiveRef(false);
function createConstRef(value, debugLabel) {
  const ref = new ReferenceImpl(CONSTANT);
  ref.lastValue = value;
  ref.tag = CONSTANT_TAG;
  if (DEBUG) {
    ref.debugLabel = debugLabel;
  }
  return ref;
}
function createUnboundRef(value, debugLabel) {
  const ref = new ReferenceImpl(UNBOUND);
  ref.lastValue = value;
  ref.tag = CONSTANT_TAG;
  if (DEBUG) {
    ref.debugLabel = debugLabel;
  }
  return ref;
}
function createComputeRef(compute, update = null, debugLabel = 'unknown') {
  const ref = new ReferenceImpl(COMPUTE);
  ref.compute = compute;
  ref.update = update;
  if (DEBUG) {
    ref.debugLabel = `(result of a \`${debugLabel}\` helper)`;
  }
  return ref;
}
function createReadOnlyRef(ref) {
  if (!isUpdatableRef(ref)) return ref;
  return createComputeRef(() => valueForRef(ref), null, ref.debugLabel);
}
function isInvokableRef(ref) {
  return ref[REFERENCE] === INVOKABLE;
}
function createInvokableRef(inner) {
  const ref = createComputeRef(() => valueForRef(inner), value => updateRef(inner, value));
  ref.debugLabel = inner.debugLabel;
  ref[REFERENCE] = INVOKABLE;
  return ref;
}
function isConstRef(_ref) {
  const ref = _ref;
  return ref.tag === CONSTANT_TAG;
}
function isUpdatableRef(_ref) {
  const ref = _ref;
  return ref.update !== null;
}
function valueForRef(_ref) {
  const ref = _ref;
  let {
    tag
  } = ref;
  if (tag === CONSTANT_TAG) {
    return ref.lastValue;
  }
  const {
    lastRevision
  } = ref;
  let lastValue;
  if (tag === null || !validateTag(tag, lastRevision)) {
    const {
      compute
    } = ref;
    const newTag = track(() => {
      lastValue = ref.lastValue = compute();
    }, DEBUG && ref.debugLabel);
    tag = ref.tag = newTag;
    ref.lastRevision = valueForTag(newTag);
  } else {
    lastValue = ref.lastValue;
  }
  consumeTag(tag);
  return lastValue;
}
function updateRef(_ref, value) {
  const ref = _ref;
  const update = expect(ref.update, 'called update on a non-updatable reference');
  update(value);
}
function childRefFor(_parentRef, path) {
  const parentRef = _parentRef;
  const type = parentRef[REFERENCE];
  let children = parentRef.children;
  let child;
  if (children === null) {
    children = parentRef.children = new Map();
  } else {
    child = children.get(path);
    if (child !== undefined) {
      return child;
    }
  }
  if (type === UNBOUND) {
    const parent = valueForRef(parentRef);
    if (isDict(parent)) {
      child = createUnboundRef(parent[path], DEBUG && `${parentRef.debugLabel}.${path}`);
    } else {
      child = UNDEFINED_REFERENCE;
    }
  } else {
    child = createComputeRef(() => {
      const parent = valueForRef(parentRef);
      if (isDict(parent)) {
        return getProp(parent, path);
      }
    }, val => {
      const parent = valueForRef(parentRef);
      if (isDict(parent)) {
        return setProp(parent, path, val);
      }
    });
    if (DEBUG) {
      child.debugLabel = `${parentRef.debugLabel}.${path}`;
    }
  }
  children.set(path, child);
  return child;
}
function childRefFromParts(root, parts) {
  let reference = root;
  for (const part of parts) {
    reference = childRefFor(reference, part);
  }
  return reference;
}
let createDebugAliasRef;
if (DEBUG) {
  createDebugAliasRef = (debugLabel, inner) => {
    const update = isUpdatableRef(inner) ? value => updateRef(inner, value) : null;
    const ref = createComputeRef(() => valueForRef(inner), update);
    ref[REFERENCE] = inner[REFERENCE];
    ref.debugLabel = debugLabel;
    return ref;
  };
}

const NULL_IDENTITY = {};
const KEY = (_, index) => index;
const INDEX = (_, index) => String(index);
const IDENTITY = item => {
  if (item === null) {
    // Returning null as an identity will cause failures since the iterator
    // can't tell that it's actually supposed to be null
    return NULL_IDENTITY;
  }
  return item;
};
function keyForPath(path) {
  if (DEBUG && path[0] === '@') {
    throw new Error(`invalid keypath: '${path}', valid keys: @index, @identity, or a path`);
  }
  return uniqueKeyFor(item => getPath(item, path));
}
function makeKeyFor(key) {
  switch (key) {
    case '@key':
      return uniqueKeyFor(KEY);
    case '@index':
      return uniqueKeyFor(INDEX);
    case '@identity':
      return uniqueKeyFor(IDENTITY);
    default:
      return keyForPath(key);
  }
}
class WeakMapWithPrimitives {
  _weakMap;
  _primitiveMap;
  get weakMap() {
    if (this._weakMap === undefined) {
      this._weakMap = new WeakMap();
    }
    return this._weakMap;
  }
  get primitiveMap() {
    if (this._primitiveMap === undefined) {
      this._primitiveMap = new Map();
    }
    return this._primitiveMap;
  }
  set(key, value) {
    if (isObject(key)) {
      this.weakMap.set(key, value);
    } else {
      this.primitiveMap.set(key, value);
    }
  }
  get(key) {
    if (isObject(key)) {
      return this.weakMap.get(key);
    } else {
      return this.primitiveMap.get(key);
    }
  }
}
const IDENTITIES = new WeakMapWithPrimitives();
function identityForNthOccurence(value, count) {
  let identities = IDENTITIES.get(value);
  if (identities === undefined) {
    identities = [];
    IDENTITIES.set(value, identities);
  }
  let identity = identities[count];
  if (identity === undefined) {
    identity = {
      value,
      count
    };
    identities[count] = identity;
  }
  return identity;
}

/**
 * When iterating over a list, it's possible that an item with the same unique
 * key could be encountered twice:
 *
 * ```js
 * let arr = ['same', 'different', 'same', 'same'];
 * ```
 *
 * In general, we want to treat these items as _unique within the list_. To do
 * this, we track the occurences of every item as we iterate the list, and when
 * an item occurs more than once, we generate a new unique key just for that
 * item, and that occurence within the list. The next time we iterate the list,
 * and encounter an item for the nth time, we can get the _same_ key, and let
 * Glimmer know that it should reuse the DOM for the previous nth occurence.
 */
function uniqueKeyFor(keyFor) {
  let seen = new WeakMapWithPrimitives();
  return (value, memo) => {
    let key = keyFor(value, memo);
    let count = seen.get(key) || 0;
    seen.set(key, count + 1);
    if (count === 0) {
      return key;
    }
    return identityForNthOccurence(key, count);
  };
}
function createIteratorRef(listRef, key) {
  return createComputeRef(() => {
    let iterable = valueForRef(listRef);
    let keyFor = makeKeyFor(key);
    if (Array.isArray(iterable)) {
      return new ArrayIterator(iterable, keyFor);
    }
    let maybeIterator = toIterator(iterable);
    if (maybeIterator === null) {
      return new ArrayIterator(EMPTY_ARRAY, () => null);
    }
    return new IteratorWrapper(maybeIterator, keyFor);
  });
}
function createIteratorItemRef(_value) {
  let value = _value;
  let tag = createTag();
  return createComputeRef(() => {
    consumeTag(tag);
    return value;
  }, newValue => {
    if (value !== newValue) {
      value = newValue;
      dirtyTag(tag);
    }
  });
}
class IteratorWrapper {
  constructor(inner, keyFor) {
    this.inner = inner;
    this.keyFor = keyFor;
  }
  isEmpty() {
    return this.inner.isEmpty();
  }
  next() {
    let nextValue = this.inner.next();
    if (nextValue !== null) {
      nextValue.key = this.keyFor(nextValue.value, nextValue.memo);
    }
    return nextValue;
  }
}
class ArrayIterator {
  current;
  pos = 0;
  constructor(iterator, keyFor) {
    this.iterator = iterator;
    this.keyFor = keyFor;
    if (iterator.length === 0) {
      this.current = {
        kind: 'empty'
      };
    } else {
      this.current = {
        kind: 'first',
        value: iterator[this.pos]
      };
    }
  }
  isEmpty() {
    return this.current.kind === 'empty';
  }
  next() {
    let value;
    let current = this.current;
    if (current.kind === 'first') {
      this.current = {
        kind: 'progress'
      };
      value = current.value;
    } else if (this.pos >= this.iterator.length - 1) {
      return null;
    } else {
      value = this.iterator[++this.pos];
    }
    let {
      keyFor
    } = this;
    let key = keyFor(value, this.pos);
    let memo = this.pos;
    return {
      key,
      value,
      memo
    };
  }
}

export { FALSE_REFERENCE, NULL_REFERENCE, REFERENCE, TRUE_REFERENCE, UNDEFINED_REFERENCE, childRefFor, childRefFromParts, createComputeRef, createConstRef, createDebugAliasRef, createInvokableRef, createIteratorItemRef, createIteratorRef, createPrimitiveRef, createReadOnlyRef, createUnboundRef, isConstRef, isInvokableRef, isUpdatableRef, updateRef, valueForRef };
