import { cell } from '@lifeart/gxt';
import { reference } from '@lifeart/gxt/glimmer-compatibility';

export const {
  createComputeRef,
  createConstRef,
  createUnboundRef,
  createPrimitiveRef,
  childRefFor,
  valueForRef,
} = reference;

export function isConstRef(ref) {
  console.log('isConstRef', ...arguments);
  if ('fn' in ref) {
    return true;
  }
  return false;
}

export function isUpdatableRef(ref) {
  console.log('isUpdatableRef', ...arguments);
  if ('fn' in ref) {
    return false;
  }
  return true;

}

export function updateRef() {
  console.log('updateRef', ...arguments);

}
export function childRefFromParts() {
  console.log('childRefFromParts', ...arguments);
}
export function isInvokableRef() {
  console.log('isInvokableRef', ...arguments);
}
export function createInvokableRef() {
  console.log('createInvokableRef', ...arguments);
}
export function createReadOnlyRef() {
  console.log('createReadOnlyRef', ...arguments);
}
export function createDebugAliasRef() {
  console.log('createDebugAliasRef' , ...arguments);
}
export function createIteratorRef() {
  console.log('createIteratorRef', ...arguments);
}
export function createIteratorItemRef() {
  console.log('createIteratorItemRef', ...arguments);
}
export const REFERENCE = Symbol("REFERENCE");
export const FALSE_REFERENCE = cell(false, 'FALSE_REFERENCE');
export const UNDEFINED_REFERENCE = cell(undefined, 'UNDEFINED_REFERENCE');
export const NULL_REFERENCE = cell(null, 'NULL_REFERENCE');
export const TRUE_REFERENCE = cell(true, 'TRUE_REFERENCE');
