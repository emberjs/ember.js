import { cell, formula } from '@lifeart/gxt';
import { reference } from '@lifeart/gxt/glimmer-compatibility';

export const {
  createComputeRef,
  createConstRef,
  createUnboundRef,
  createPrimitiveRef,
  childRefFor,
  valueForRef,
} = reference;

// Symbol to identify reference objects
export const REFERENCE = Symbol('REFERENCE');

// Constant reference values
export const FALSE_REFERENCE = cell(false, 'FALSE_REFERENCE');
export const UNDEFINED_REFERENCE = cell(undefined, 'UNDEFINED_REFERENCE');
export const NULL_REFERENCE = cell(null, 'NULL_REFERENCE');
export const TRUE_REFERENCE = cell(true, 'TRUE_REFERENCE');

// Check if a reference is constant (never changes)
export function isConstRef(ref: any): boolean {
  if (!ref) return false;
  // A const ref has no setter and is not computed
  if (ref === FALSE_REFERENCE || ref === TRUE_REFERENCE ||
      ref === NULL_REFERENCE || ref === UNDEFINED_REFERENCE) {
    return true;
  }
  // Check for isConst flag
  if (ref.isConst === true) return true;
  // Formula-based refs with no dependencies are constant
  if ('fn' in ref && ref.deps && ref.deps.length === 0) {
    return true;
  }
  return false;
}

// Check if a reference can be updated
export function isUpdatableRef(ref: any): boolean {
  if (!ref) return false;
  // Cell-based refs are updatable
  if ('value' in ref && typeof ref.update === 'function') {
    return true;
  }
  // Refs with an update method are updatable
  if (typeof ref.update === 'function') {
    return true;
  }
  // Computed refs are not directly updatable
  if ('fn' in ref) {
    return false;
  }
  return false;
}

// Update the value of an updatable reference
export function updateRef(ref: any, value: any): void {
  if (!ref) return;
  if (typeof ref.update === 'function') {
    ref.update(value);
  } else if ('value' in ref) {
    ref.value = value;
  }
}

// Create a reference from a path on an object
export function childRefFromParts(parentRef: any, parts: string[]) {
  let current = parentRef;
  for (const part of parts) {
    current = childRefFor(current, part);
  }
  return current;
}

// Check if a reference is invokable (can be called as a function)
export function isInvokableRef(ref: any): boolean {
  if (!ref) return false;
  return typeof ref.invoke === 'function' || ref.isInvokable === true;
}

// Create an invokable reference (wraps a function)
export function createInvokableRef(fn: Function, debugLabel?: string) {
  const ref = formula(() => fn, debugLabel || 'invokableRef');
  (ref as any).isInvokable = true;
  (ref as any).invoke = (...args: any[]) => fn(...args);
  return ref;
}

// Create a read-only wrapper around a reference
export function createReadOnlyRef(ref: any, debugLabel?: string) {
  return formula(() => valueForRef(ref), debugLabel || 'readOnlyRef');
}

// Create a debug alias reference (for development tools)
export function createDebugAliasRef(inner: any, debugLabel: string) {
  const ref = formula(() => valueForRef(inner), debugLabel);
  (ref as any).debugLabel = debugLabel;
  (ref as any).inner = inner;
  return ref;
}

// Create a reference for iterating over a collection
export function createIteratorRef(iterable: any, debugLabel?: string) {
  return formula(() => {
    const value = valueForRef(iterable);
    if (value == null) return [];
    if (Array.isArray(value)) return value;
    if (typeof value[Symbol.iterator] === 'function') {
      return Array.from(value);
    }
    return Object.entries(value);
  }, debugLabel || 'iteratorRef');
}

// Create a reference for an item in an iteration
export function createIteratorItemRef(
  item: any,
  index: number,
  debugLabel?: string
) {
  const itemRef = cell(item, debugLabel || `item[${index}]`);
  (itemRef as any).index = index;
  return itemRef;
}
