import { enhancedDevmode, inDevmode, stringifyDebugLabel, devmode, setDescription, toValidatableDescription, UserException, devmodeOr, unwrapResult, isDict, stringifyChildLabel, getDescription, Ok, mapDevmode, isObject, isIndexable, Err, EMPTY_ARRAY } from '@glimmer/util';
import { CONSTANT_TAG, createTag, dirtyTag, consumeTag, track, valueForTag, validateTag, INITIAL, tagFor, dirtyTagFor } from '@glimmer/validator';
import { DEBUG } from '@glimmer/env';
import { getProperty, setProperty, toIterator, getPath } from '@glimmer/global-context';

function getChildLabel(parent, child) {
  if (DEBUG) {
    return stringifyChildLabel(...inDevmode(parent.description).label, child);
  } else {
    return String(child);
  }
}
const describeReactive = enhancedDevmode(() => {
  return '{reactive value}';
}, reactive => {
  const description = inDevmode(reactive.description);
  const types = inDevmode(TYPE_NAMES);
  const desc = description.type in types ? types[description.type] : 'reference';
  return description.label ? `${desc} (\`${stringifyDebugLabel(reactive)}\`)` : desc;
});
const TYPE_NAMES = devmode(() => ({
  ReadonlyCell: 'readonly cell',
  MutableCell: 'mutable cell',
  DeeplyReadonlyCell: 'deeply readonly cell',
  InfallibleFormula: 'infallible formula',
  FallibleFormula: 'fallible formula',
  Accessor: 'accessor',
  GetProperty: 'property reference',
  ConstantError: 'constant error'
}));

function getValidResult(ref) {
  return ref.error ? Err(ref.error) : Ok(ref.lastValue);
}
function readInternalReactive(reactive) {
  const {
    tag,
    compute
  } = reactive;
  if (validateInternalReactive(reactive)) {
    consumeTag(reactive.tag);
    return getValidResult(reactive);
  }

  // a data cell
  if (compute === null) {
    if (tag) consumeTag(tag);
    return getValidResult(reactive);
  }

  // a formula
  const newTag = track(compute, getDescription(reactive));
  reactive.tag = newTag;
  reactive.lastRevision = valueForTag(newTag);
  consumeTag(newTag);
  return getValidResult(reactive);
}

/**
 * @internal
 */

function validateInternalReactive(reactive) {
  const {
    tag,
    lastRevision
  } = reactive;

  // not yet computed
  if (tag === null) return false;
  return validateTag(tag, lastRevision);
}
function updateInternalReactive(reactive, value) {
  if (reactive.update) {
    reactive.update(value);
  } else if (DEBUG) {
    throw Error(`cannot update ${describeReactive(reactive)}`);
  }
  return Ok(undefined);
}

const REFERENCE$1 = Symbol('REFERENCE');
const MUTABLE_CELL = 0;
const READONLY_CELL = 1;
const DEEPLY_CONSTANT = 2;
const FALLIBLE_FORMULA = 3;
const COMPUTED_CELL = 4;
const ACCESSOR = 5;
const MUTABLE_REF = 6;
const CONSTANT_ERROR = 7;

//////////

class InternalReactive {
  [REFERENCE$1];
  tag = null;

  /**
   * The revision of the reactive the last time it was updated (if it was a cell) or computed (if it
   * was a formula).
   */
  lastRevision = INITIAL;

  /**
   * A reactive is in an error state if its `compute` function produced an error.
   */
  error = null;

  /**
   * In a data cell, lastValue is the value of the cell, and `lastValue` or `error` is always set.
   * In a formula cell, lastValue is the cached result of the formula. If lastValue is null and
   * error is null, the formula is uninitialized.
   */
  lastValue;

  /**
   * In a data cell, compute is always null.
   */
  compute = null;

  /**
   * In an accessor, `update` is the mutator function. Otherwise, `update` is always null.
   */
  update = null;

  /**
   * In any kind of reference, `properties` is a map from property keys to their references.
   */
  properties = null;
  constructor(type) {
    this[REFERENCE$1] = type;
  }
}

function setLastValue(reactive, value) {
  reactive.lastValue = value;
  reactive.error = null;
  return value;
}
function setError(reactive, error) {
  reactive.lastValue = null;
  reactive.error = error;

  // since the setter threw, we want the reference to be invalid so that its consumers will see the
  // invalidation and handle the error.
  reactive.tag = null;
}
function setResult(internal, result) {
  switch (result.type) {
    case 'ok':
      return setLastValue(internal, result.value);
    case 'err':
      setError(internal, result.value);
  }
}
function setFromFallibleCompute(internal, compute) {
  try {
    return setLastValue(internal, compute());
  } catch (e) {
    setError(internal, UserException.from(e, `An error occured while computing ${devmodeOr(() => stringifyDebugLabel(internal), 'a formula')}`));
  }
}
function internalHasError(reactive) {
  return !!reactive.error;
}
function Poison(error, debugLabel) {
  const ref = new InternalReactive(CONSTANT_ERROR);
  ref.tag = CONSTANT_TAG;
  ref.error = error;
  setDescription(ref, devmode(() => ({
    readonly: true,
    fallible: true,
    label: [debugLabel || `(Poison)`],
    kind: 'poisoned'
  })));
  return ref;
}

const RESULT_ACCESSOR_DEFAULTS = devmode(() => ({
  type: 'ResultAccessor',
  read: 'fallible',
  write: 'fallible',
  label: [`(ResultAccessor)`]
}));
function ResultAccessor(options, description) {
  return InternalResultAccessor(options, description);
}
function InternalResultAccessor(options, description, type = ACCESSOR) {
  const {
    get,
    set
  } = options;
  const internal = new InternalReactive(type);
  internal.compute = () => setResult(internal, get());
  internal.update = value => {
    const setResult = set(value);
    if (setResult.type === 'ok') {
      internal.lastValue = value;
    } else {
      setError(internal, setResult.value);
    }
  };
  setDescription(internal, devmode(() => toValidatableDescription(description, RESULT_ACCESSOR_DEFAULTS)));
  return internal;
}
const ACCESSOR_DEFAULTS = devmode(() => ({
  type: 'Accessor',
  read: 'fallible',
  write: 'fallible',
  label: [`(Accessor)`]
}));
function Accessor(options, description) {
  const {
    get,
    set
  } = options;
  const internal = new InternalReactive(ACCESSOR);
  internal.compute = () => setFromFallibleCompute(internal, get);
  internal.update = value => {
    try {
      set(value);
      return value;
    } catch (e) {
      setError(internal, UserException.from(e, `An error occured setting ${devmodeOr(() => stringifyDebugLabel(internal), `an accessor`)}`));
    }
  };
  setDescription(internal, devmode(() => toValidatableDescription(description, ACCESSOR_DEFAULTS)));
  return internal;
}

/**
 * This is generally not what you want, as it rethrows errors. It's useful in testing and console
 * situations, and as a transitional mechanism away from valueForRef.
 */
function unwrapReactive(reactive) {
  return unwrapResult(readInternalReactive(reactive));
}
function updateReactive(reactive, value) {
  updateInternalReactive(reactive, value);
}
function readReactive(reactive) {
  return readInternalReactive(reactive);
}

/**
 * Read the current value of a cell. Since a cell cannot be in an error state, this always
 * (infallibly) produces the value of the cell.
 */
function readCell(cell) {
  // this is safe because cells are infallible
  return unwrapReactive(cell);
}

/**
 * Write a value to a *mutable* cell. This operation is infallible.
 */
function writeCell(cell, value) {
  updateReactive(cell, value);
}
const MUTABLE_CELL_DEFAULTS = devmode(() => ({
  type: 'MutableCell',
  read: 'infallible',
  write: 'infallible',
  label: ['{cell}']
}));

/**
 * Create a mutable cell.
 *
 * A mutable cell is a place to store a single value.
 *
 * Reads and writes are infallible.
 */
function MutableCell(value, description) {
  const ref = new InternalReactive(MUTABLE_CELL);
  const tag = ref.tag = createTag(toValidatableDescription(description, MUTABLE_CELL_DEFAULTS));
  ref.lastValue = value;
  ref.update = value => {
    ref.lastValue = value;
    dirtyTag(tag);
  };
  setDescription(ref, devmode(() => toValidatableDescription(description, MUTABLE_CELL_DEFAULTS)));
  return ref;
}
const READONLY_CELL_DEFAULTS = devmode(() => ({
  type: 'ReadonlyCell',
  read: 'infallible',
  write: 'none',
  label: ['{readonly cell}']
}));

/**
 * Create a readonly cell.
 *
 * A readonly cell is a place to store a single value that cannot change.
 *
 * Reads are infallible. Properties are not readonly.
 *
 * @see {DeeplyReadonlyCell}
 */
function ReadonlyCell(value, description) {
  const ref = new InternalReactive(READONLY_CELL);
  ref.tag = CONSTANT_TAG;
  ref.lastValue = value;
  setDescription(ref, devmode(() => toValidatableDescription(description, READONLY_CELL_DEFAULTS)));
  return ref;
}

/**
 * Create a deeply constant cell.
 *
 * A deeply constant cell behaves like a readonly cell, but properties of a deeply constant cell are
 * also deeply constant.
 *
 * Reads are infallible. Properties are readonly.
 *
 * @see {ReadonlyCell}
 *
 * @remarks
 *
 * The concept of a "deeply readonly cell" was previously referred to as an "unbound reference".
 */
function DeeplyReadonlyCell(value, debugLabel) {
  const ref = new InternalReactive(DEEPLY_CONSTANT);
  ref.tag = CONSTANT_TAG;
  ref.lastValue = value;
  if (DEBUG) {
    ref.description = devmode(() => ({
      type: 'DeeplyReadonlyCell',
      read: 'fallible',
      write: 'none',
      label: [debugLabel || `{deeply readonly cell}`]
    }));
  }
  return ref;
}
/**
 * Create an external marker.
 *
 * An external marker is an object that allows you to reflect external state into the reactivity
 * system. It is used to create custom reactive objects that don't use tracked fields to store their
 * state.
 *
 * For example, you could use a marker to implement a reactive wrapper around local storage.
 *
 * ```js
 * class ReactiveLocalStorage {
 *   #markers: Record<string, Marker>;
 *
 *   get(key) {
 *     this.#initialized(key).consumed();
 *     return localStorage[key]
 *   }
 *
 *   set(key, value) {
 *     localStorage[key] = value;
 *     this.#initialized(key).updated();
 *   }
 *
 *   #initialized(key) {
 *     return (this.#marker[key] ??= ExternalMarker());
 *   }
 * }
 * ```
 *
 * You could use the same technique to implement tracked builtins or other custom reactive objects.
 * In general, this approach is most useful when you have a source of truth in external data and
 * want to avoid duplicating it.
 */
function ExternalMarker(debugLabel) {
  const description = toValidatableDescription(debugLabel, devmode(() => ({
    label: ['{external marker}']
  })));
  const tag = createTag(description);
  const marker = {
    mark: () => dirtyTag(tag),
    consume: () => consumeTag(tag)
  };
  setDescription(marker, description);
  return marker;
}

/**
 * @internal
 */
function validateReactive(reactive) {
  return validateInternalReactive(reactive);
}

/**
 * @internal
 */
function hasError(reactive) {
  return internalHasError(reactive);
}

/** @category compat */
const updateRef = updateReactive;

/**
 * @category compat
 * @deprecated Use {@link INTERNAL_REFERENCE}
 */
const REFERENCE = REFERENCE$1;

const FALLIBLE_FORMULA_DEFAULTS = devmode(() => ({
  type: 'FallibleFormula',
  read: 'fallible',
  write: 'none',
  label: ['(FallibleFormula)']
}));

/**
 * A fallible formula invokes user code. If the user code throws an exception, the formula returns
 * an error {@linkcode Result}. Otherwise, it returns an ok {@linkcode Result}.
 */
function Formula(compute, debugLabel) {
  const ref = new InternalReactive(FALLIBLE_FORMULA);
  ref.compute = () => setFromFallibleCompute(ref, compute);
  setDescription(ref, devmode(() => toValidatableDescription(debugLabel, FALLIBLE_FORMULA_DEFAULTS)));
  return ref;
}
const RESULT_FORMULA_DEFAULTS = devmode(() => ({
  type: 'ResultFormula',
  read: 'fallible',
  write: 'none',
  label: [`{result formula}`]
}));

/**
 * The `compute` function must be infallible and convert any errors to results.
 */
function ResultFormula(compute, description) {
  const ref = new InternalReactive(FALLIBLE_FORMULA);
  ref.compute = () => setResult(ref, compute());
  setDescription(ref, devmode(() => toValidatableDescription(description, RESULT_FORMULA_DEFAULTS)));
  return ref;
}
const COMPUTED_CELL_DEFAULTS = devmode(() => ({
  type: 'InfallibleFormula',
  read: 'infallible',
  write: 'none',
  label: [`{computed cell}`]
}));

/**
 * A computed cell does not invoke user code. If a computed cell's compute function throws an error,
 * it's a bug and there is no error recovery.
 */
function ComputedCell(compute, description) {
  const ref = new InternalReactive(COMPUTED_CELL);
  ref.compute = () => setLastValue(ref, compute());
  setDescription(ref, devmode(() => toValidatableDescription(description, COMPUTED_CELL_DEFAULTS)));
  return ref;
}

function isFallibleFormula(_ref) {
  return _ref[REFERENCE$1] === FALLIBLE_FORMULA;
}
function isAccessor(_ref) {
  return _ref[REFERENCE$1] === ACCESSOR;
}
function isMutRef(_ref) {
  return _ref[REFERENCE$1] === MUTABLE_REF;
}
function isConstantError(_ref) {
  return _ref[REFERENCE$1] === CONSTANT_ERROR;
}
function isUpdatableRef(_ref) {
  const ref = _ref;
  return (isAccessor(_ref) || isMutRef(_ref)) && ref.update !== null;
}

const createDebugAliasRef = enhancedDevmode(inner => inner, (inner, debugLabel) => {
  const update = isUpdatableRef(inner) ? value => updateReactive(inner, value) : null;
  const ref = update ? Accessor({
    get: () => unwrapReactive(inner),
    set: update
  }, debugLabel()) : Formula(() => unwrapReactive(inner), debugLabel());
  ref[REFERENCE$1] = inner[REFERENCE$1];
  const debug = inDevmode(inner.description);
  ref.description = devmode(() => ({
    type: 'DebugAlias',
    read: debug.read,
    write: debug.write,
    property: debug.property,
    reason: 'alias',
    label: [`{${inDevmode(stringifyDebugLabel(inner))} as ${debugLabel}}`]
  }));
  return ref;
});

function clearError(reactive) {
  const internal = reactive;
  internal.error = null;

  // clearing the tag will cause the reference to be invalidated.
  internal.tag = null;
  internal.lastValue = null;
}

function toReadonly(reactive) {
  if (isMutRef(reactive) || isUpdatableRef(reactive)) {
    return Formula(() => unwrapReactive(reactive));
  } else {
    return reactive;
  }
}
function toMut(maybeMut) {
  const reactive = maybeMut;
  if (isMutRef(maybeMut)) {
    return maybeMut;
  }

  // TODO probably should assert that maybeMut is updatable
  // Ember already has the same assertion

  return InternalResultAccessor({
    get: () => readInternalReactive(maybeMut),
    set: value => updateInternalReactive(reactive, value)
  }, undefined, MUTABLE_REF);
}
function isConstant(reactive) {
  switch (reactive[REFERENCE$1]) {
    case READONLY_CELL:
    case DEEPLY_CONSTANT:
      return true;
    default:
      return false;
  }
}

const UNDEFINED_REFERENCE = createPrimitiveCell(undefined);
const NULL_REFERENCE = createPrimitiveCell(null);
const TRUE_REFERENCE = createPrimitiveCell(true);
const FALSE_REFERENCE = createPrimitiveCell(false);
function createPrimitiveCell(value) {
  const ref = new InternalReactive(READONLY_CELL);
  ref.tag = CONSTANT_TAG;
  ref.lastValue = value;
  setDescription(ref, devmode(() => ({
    type: 'PrimitiveCell',
    read: 'infallible',
    write: 'none',
    property: {
      read: 'fallible',
      write: 'none'
    },
    label: [value === undefined ? 'undefined' : JSON.stringify(value)]
  })));
  return ref;
}

function getReactivePath(reactive, path) {
  let current = reactive;
  for (const part of path) {
    current = getReactiveProperty(current, part);
  }
  return current;
}
function getReactiveProperty(parentReactive, property) {
  const type = parentReactive[REFERENCE$1];
  const children = initializeChildren(parentReactive);
  {
    const child = children.get(property);
    if (child !== undefined) {
      return child;
    }
  }
  const initialize = child => {
    children.set(property, child);
    setDescription(child, mapDevmode(() => parentReactive.description, desc => {
      return {
        type: 'GetProperty',
        read: 'fallible',
        write: 'fallible',
        label: [...desc.label, property]
      };
    }));
    return child;
  };
  if (type === DEEPLY_CONSTANT) {
    // We need an extra try/catch here because any reactive value can be turned into a deeply
    // constant value.
    try {
      const parent = readInternalReactive(parentReactive);
      if (parent.type === 'err') {
        return initialize(Poison(parent.value));
      } else {
        if (isDict(parent.value)) {
          return initialize(DeeplyReadonlyCell(parent.value[property]));
        }
      }
    } catch (e) {
      return initialize(Poison(UserException.from(e, `An error occured when getting a property from a deeply constant reactive (${getChildLabel(parentReactive, property)})`)));
    }
  }
  const child = Accessor({
    get: () => {
      const parent = unwrapReactive(parentReactive);
      if (isDict(parent)) {
        if (isObject(parent)) consumeTag(tagFor(parent, property));
        return getProperty(parent, property);
      }
    },
    set: value => {
      const parentResult = readInternalReactive(parentReactive);
      if (parentResult.type === 'err') {
        return parentResult;
      } else {
        const parent = parentResult.value;
        if (isIndexable(parent)) {
          try {
            setProperty(parent, property, value);
            if (isObject(parentResult.value)) dirtyTagFor(parentResult.value, property);
          } catch (e) {
            return Err(UserException.from(e, `An error occured when setting a property on a deeply constant reactive (${getChildLabel(parentReactive, property)})`));
          }
        }
        return Ok(undefined);
      }
    }
  });
  return initialize(child);
}
function initializeChildren(parent) {
  let children = parent.properties;
  if (children === null) {
    children = parent.properties = new Map();
  }
  return children;
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
  if (DEBUG) {
    if (path[0] === '@') {
      throw new Error(`invalid keypath: '${path}', valid keys: @index, @identity, or a path`);
    } else if (typeof path !== 'string') {
      throw new Error(`invalid non-string keypath: valid keys: @index, @identity, or a path`);
    }
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
  return Formula(() => {
    let iterable = unwrapReactive(listRef);
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
  let tag = createTag(devmode(() => ({
    reason: 'formula',
    label: ['(iterator)']
  })));
  return Accessor({
    get: () => {
      consumeTag(tag);
      return value;
    },
    set: newValue => {
      if (value !== newValue) {
        value = newValue;
        dirtyTag(tag);
      }
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

export { Accessor, ComputedCell, DeeplyReadonlyCell, ExternalMarker, FALSE_REFERENCE, Formula, REFERENCE$1 as INTERNAL_REFERENCE, InternalResultAccessor, MutableCell, NULL_REFERENCE, REFERENCE, ReadonlyCell, ResultAccessor, ResultFormula, TRUE_REFERENCE, UNDEFINED_REFERENCE, clearError, createDebugAliasRef, createIteratorItemRef, createIteratorRef, createPrimitiveCell, getReactivePath, getReactiveProperty, hasError, initializeChildren, isAccessor, isConstant, isConstantError, isFallibleFormula, isMutRef, isUpdatableRef, readCell, readReactive, toMut, toReadonly, unwrapReactive, updateReactive, updateRef, validateReactive, writeCell };
