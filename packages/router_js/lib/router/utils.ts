import { QueryParams } from 'route-recognizer';
import { Promise } from 'rsvp';
import { Dict } from './core';
import Router from './router';

export const slice = Array.prototype.slice;
const hasOwnProperty = Object.prototype.hasOwnProperty;

/**
  Determines if an object is Promise by checking if it is "thenable".
**/
export function isPromise<T>(p: any): p is Promise<T> {
  return p !== null && typeof p === 'object' && typeof p.then === 'function';
}

export function merge(hash: Dict<unknown>, other?: Dict<unknown>) {
  for (let prop in other) {
    if (hasOwnProperty.call(other, prop)) {
      hash[prop] = other[prop];
    }
  }
}

export type ModelsAndQueryParams<T> = T[] | [...T[], QueryParamsContainer];

/**
  @private

  Extracts query params from the end of an array
**/
export function extractQueryParams<T>(array: ModelsAndQueryParams<T>): [T[], QueryParams | null] {
  let len = array && array.length,
    head,
    queryParams;

  if (len && len > 0) {
    let obj = array[len - 1];
    if (isQueryParamsContainer(obj)) {
      queryParams = obj.queryParams;
      head = slice.call(array, 0, len - 1);
      return [head, queryParams];
    }
  }

  // SAFETY: We confirmed that the last item isn't a QP container
  return [array as T[], null];
}

export type QueryParamsContainer = { queryParams: QueryParams };

// TODO: Actually check that Dict is QueryParams
function isQueryParamsContainer(obj: unknown): obj is QueryParamsContainer {
  if (obj && typeof obj === 'object') {
    let cast = obj as QueryParamsContainer;
    return (
      'queryParams' in cast && Object.keys(cast.queryParams).every((k) => typeof k === 'string')
    );
  }
  return false;
}

/**
  @private

  Coerces query param properties and array elements into strings.
**/
export function coerceQueryParamsToString(queryParams: Dict<unknown>) {
  for (let key in queryParams) {
    let val = queryParams[key];
    if (typeof val === 'number') {
      queryParams[key] = '' + val;
    } else if (Array.isArray(val)) {
      for (let i = 0, l = val.length; i < l; i++) {
        val[i] = '' + val[i];
      }
    }
  }
}
/**
  @private
 */
export function log(router: Router<any>, ...args: (string | number)[]): void {
  if (!router.log) {
    return;
  }

  if (args.length === 2) {
    let [sequence, msg] = args;
    router.log('Transition #' + sequence + ': ' + msg);
  } else {
    let [msg] = args;
    router.log(msg as string);
  }
}

export function isParam(object: any): object is string | number {
  return (
    typeof object === 'string' ||
    object instanceof String ||
    typeof object === 'number' ||
    object instanceof Number
  );
}

export function forEach<T>(array: T[], callback: (item: T) => boolean) {
  for (let i = 0, l = array.length; i < l && callback(array[i]) !== false; i++) {
    // empty intentionally
  }
}

export interface ChangeList {
  all: Dict<unknown>;
  changed: Dict<unknown>;
  removed: Dict<unknown>;
}

export function getChangelist(
  oldObject: Dict<unknown>,
  newObject: Dict<unknown>
): ChangeList | undefined {
  let key;
  let results: ChangeList = {
    all: {},
    changed: {},
    removed: {},
  };

  merge(results.all, newObject);

  let didChange = false;
  coerceQueryParamsToString(oldObject);
  coerceQueryParamsToString(newObject);

  // Calculate removals
  for (key in oldObject) {
    if (hasOwnProperty.call(oldObject, key)) {
      if (!hasOwnProperty.call(newObject, key)) {
        didChange = true;
        results.removed[key] = oldObject[key];
      }
    }
  }

  // Calculate changes
  for (key in newObject) {
    if (hasOwnProperty.call(newObject, key)) {
      let oldElement = oldObject[key];
      let newElement = newObject[key];
      if (isArray(oldElement) && isArray(newElement)) {
        if (oldElement.length !== newElement.length) {
          results.changed[key] = newObject[key];
          didChange = true;
        } else {
          for (let i = 0, l = oldElement.length; i < l; i++) {
            if (oldElement[i] !== newElement[i]) {
              results.changed[key] = newObject[key];
              didChange = true;
            }
          }
        }
      } else if (oldObject[key] !== newObject[key]) {
        results.changed[key] = newObject[key];
        didChange = true;
      }
    }
  }

  return didChange ? results : undefined;
}

function isArray(obj: unknown): obj is ArrayLike<unknown> {
  return Array.isArray(obj);
}

export function promiseLabel(label: string) {
  return 'Router: ' + label;
}
