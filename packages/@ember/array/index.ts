/**
@module @ember/array
*/
import { DEBUG } from '@glimmer/env';
import { PROXY_CONTENT } from '@ember/-internals/metal';
import { replace } from '@ember/-internals/metal';
import { get } from '@ember/object';
import { assert } from '@ember/debug';
import { typeOf } from '@ember/utils';

export { default as makeArray } from './make';

const EMPTY_ARRAY = Object.freeze([] as const);

const identityFunction = <T>(item: T) => item;

export function uniqBy<T>(
  array: T[],
  keyOrFunc: string | ((item: T) => unknown) = identityFunction
): T[] {
  assert(`first argument passed to \`uniqBy\` should be array`, isArray(array));

  let ret: T[] = [];
  let seen = new Set();
  let getter = typeof keyOrFunc === 'function' ? keyOrFunc : (item: T) => get(item, keyOrFunc);

  array.forEach((item) => {
    let val = getter(item);
    if (!seen.has(val)) {
      seen.add(val);
      ret.push(item);
    }
  });

  return ret;
}

export function removeAt<T, A extends T[]>(array: A, index: number, len?: number): A {
  assert(`\`removeAt\` index provided is out of range`, index > -1 && index < array.length);
  replace(array, index, len ?? 1, EMPTY_ARRAY);
  return array;
}

/**
  Returns true if the passed object is an array or Array-like.

  Objects are considered Array-like if any of the following are true:

    - the object is a native Array
    - the object has an objectAt property
    - the object is an Object, and has a length property

  Unlike `typeOf` this method returns true even if the passed object is
  not formally an array but appears to be array-like (i.e. implements `Array`)

  ```javascript
  import { isArray } from '@ember/array';

  isArray();                                      // false
  isArray([]);                                    // true
  ```

  @method isArray
  @static
  @for @ember/array
  @param {Object} obj The object to test
  @return {Boolean} true if the passed object is an array or Array-like
  @public
*/
export function isArray(obj: unknown): obj is ArrayLike<unknown> {
  if (DEBUG && typeof obj === 'object' && obj !== null) {
    // SAFETY: Property read checks are safe if it's an object
    let possibleProxyContent = (obj as any)[PROXY_CONTENT];
    if (possibleProxyContent !== undefined) {
      obj = possibleProxyContent;
    }
  }

  // SAFETY: Property read checks are safe if it's an object
  if (!obj || (obj as any).setInterval) {
    return false;
  }

  if (Array.isArray(obj)) {
    return true;
  }

  let type = typeOf(obj);
  if ('array' === type) {
    return true;
  }

  // SAFETY: Property read checks are safe if it's an object
  let length = (obj as any).length;
  if (typeof length === 'number' && length === length && 'object' === type) {
    return true;
  }

  return false;
}
