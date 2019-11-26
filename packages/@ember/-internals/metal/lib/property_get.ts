/**
@module @ember/object
*/
import { HAS_NATIVE_PROXY, isEmberArray, isProxy, symbol } from '@ember/-internals/utils';
import { assert } from '@ember/debug';
import { DEBUG } from '@glimmer/env';
import { isPath } from './path_cache';
import { tagFor, tagForProperty } from './tags';
import { consume, deprecateMutationsInAutotrackingTransaction, isTracking } from './tracked';

export const PROXY_CONTENT = symbol('PROXY_CONTENT');

export let getPossibleMandatoryProxyValue: (obj: object, keyName: string) => any;

if (DEBUG && HAS_NATIVE_PROXY) {
  getPossibleMandatoryProxyValue = function getPossibleMandatoryProxyValue(obj, keyName): any {
    let content = obj[PROXY_CONTENT];
    if (content === undefined) {
      return obj[keyName];
    } else {
      /* global Reflect */
      return Reflect.get(content, keyName, obj);
    }
  };
}

interface MaybeHasUnknownProperty {
  unknownProperty?: (keyName: string) => any;
}

interface MaybeHasIsDestroyed {
  isDestroyed?: boolean;
}

// ..........................................................
// GET AND SET
//
// If we are on a platform that supports accessors we can use those.
// Otherwise simulate accessors by looking up the property directly on the
// object.

/**
  Gets the value of a property on an object. If the property is computed,
  the function will be invoked. If the property is not defined but the
  object implements the `unknownProperty` method then that will be invoked.

  ```javascript
  import { get } from '@ember/object';
  get(obj, "name");
  ```

  If you plan to run on IE8 and older browsers then you should use this
  method anytime you want to retrieve a property on an object that you don't
  know for sure is private. (Properties beginning with an underscore '_'
  are considered private.)

  On all newer browsers, you only need to use this method to retrieve
  properties if the property might not be defined on the object and you want
  to respect the `unknownProperty` handler. Otherwise you can ignore this
  method.

  Note that if the object itself is `undefined`, this method will throw
  an error.

  @method get
  @for @ember/object
  @static
  @param {Object} obj The object to retrieve from.
  @param {String} keyName The property key to retrieve
  @return {Object} the property value or `null`.
  @public
*/
export function get(obj: object, keyName: string): any {
  assert(
    `Get must be called with two arguments; an object and a property key`,
    arguments.length === 2
  );
  assert(
    `Cannot call get with '${keyName}' on an undefined object.`,
    obj !== undefined && obj !== null
  );
  assert(
    `The key provided to get must be a string or number, you passed ${keyName}`,
    typeof keyName === 'string' || (typeof keyName === 'number' && !isNaN(keyName))
  );
  assert(
    `'this' in paths is not supported`,
    typeof keyName !== 'string' || keyName.lastIndexOf('this.', 0) !== 0
  );

  let type = typeof obj;

  let isObject = type === 'object';
  let isFunction = type === 'function';
  let isObjectLike = isObject || isFunction;

  if (isPath(keyName)) {
    return isObjectLike ? _getPath(obj, keyName) : undefined;
  }

  let value: any;

  if (isObjectLike) {
    let tracking = isTracking();

    if (tracking) {
      consume(tagForProperty(obj, keyName));
    }

    if (DEBUG && HAS_NATIVE_PROXY) {
      value = getPossibleMandatoryProxyValue(obj, keyName);
    } else {
      value = obj[keyName];
    }

    if (tracking) {
      // Add the tag of the returned value if it is an array, since arrays
      // should always cause updates if they are consumed and then changed
      if (Array.isArray(value) || isEmberArray(value)) {
        consume(tagForProperty(value, '[]'));
      }

      // Add the value of the content if the value is a proxy. This is because
      // content changes the truthiness/falsiness of the proxy.
      if (isProxy(value)) {
        consume(tagForProperty(value, 'content'));
      }
    }
  } else {
    value = obj[keyName];
  }

  if (value === undefined) {
    if (
      isObject &&
      !(keyName in obj) &&
      typeof (obj as MaybeHasUnknownProperty).unknownProperty === 'function'
    ) {
      if (DEBUG) {
        let ret;

        deprecateMutationsInAutotrackingTransaction!(() => {
          ret = (obj as MaybeHasUnknownProperty).unknownProperty!(keyName);
        });

        return ret;
      } else {
        return (obj as MaybeHasUnknownProperty).unknownProperty!(keyName);
      }
    }
  }
  return value;
}

export function _getPath<T extends object>(root: T, path: string | string[]): any {
  let obj: any = root;
  let parts = typeof path === 'string' ? path.split('.') : path;

  for (let i = 0; i < parts.length; i++) {
    if (obj === undefined || obj === null || (obj as MaybeHasIsDestroyed).isDestroyed) {
      return undefined;
    }

    obj = get(obj, parts[i]);
  }

  return obj;
}

/**
  Retrieves the value of a property from an Object, or a default value in the
  case that the property returns `undefined`.

  ```javascript
  import { getWithDefault } from '@ember/object';
  getWithDefault(person, 'lastName', 'Doe');
  ```

  @method getWithDefault
  @for @ember/object
  @static
  @param {Object} obj The object to retrieve from.
  @param {String} keyName The name of the property to retrieve
  @param {Object} defaultValue The value to return if the property value is undefined
  @return {Object} The property value or the defaultValue.
  @public
*/
export function getWithDefault<T extends object, K extends Extract<keyof T, string>>(
  root: T,
  key: K,
  defaultValue: T[K]
): T[K] {
  let value = get(root, key);

  if (value === undefined) {
    return defaultValue;
  }
  return value;
}

export default get;
