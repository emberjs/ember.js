/**
@module @ember/object
*/
import ProxyMixin from '@ember/-internals/runtime/lib/mixins/-proxy';
import { isEmberArray, setProxy, symbol } from '@ember/-internals/utils';
import { assert } from '@ember/debug';
import { DEBUG } from '@glimmer/env';
import { consumeTag, isTracking, tagFor, track } from '@glimmer/validator';
import { isPath } from './path_cache';

export const PROXY_CONTENT = symbol('PROXY_CONTENT');

export let getPossibleMandatoryProxyValue: (obj: object, keyName: string) => any;

if (DEBUG) {
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

export interface MaybeHasUnknownProperty {
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
export function get<T extends object, K extends keyof T>(obj: T, keyName: K): T[K];
export function get(obj: unknown, keyName: string): unknown;
export function get(obj: unknown, keyName: string): unknown {
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

  return isPath(keyName) ? _getPath(obj, keyName) : _getProp(obj, keyName);
}

export function _getProp(obj: unknown, keyName: string) {
  if (obj == null) {
    return;
  }

  let value: unknown;

  if (typeof obj === 'object' || typeof obj === 'function') {
    if (DEBUG) {
      value = getPossibleMandatoryProxyValue(obj, keyName);
    } else {
      value = obj[keyName];
    }

    if (
      value === undefined &&
      typeof obj === 'object' &&
      !(keyName in obj) &&
      typeof (obj as MaybeHasUnknownProperty).unknownProperty === 'function'
    ) {
      value = (obj as MaybeHasUnknownProperty).unknownProperty!(keyName);
    }

    if (isTracking()) {
      consumeTag(tagFor(obj, keyName));

      if (Array.isArray(value) || isEmberArray(value)) {
        // Add the tag of the returned value if it is an array, since arrays
        // should always cause updates if they are consumed and then changed
        consumeTag(tagFor(value, '[]'));
      }
    }
  } else {
    // SAFETY: It should be ok to access properties on any non-nullish value
    value = (obj as object)[keyName];
  }

  return value;
}

export function _getPath(obj: unknown, path: string | string[]): any {
  let parts = typeof path === 'string' ? path.split('.') : path;

  for (let part of parts) {
    if (obj === undefined || obj === null || (obj as MaybeHasIsDestroyed).isDestroyed) {
      return undefined;
    }

    obj = _getProp(obj, part);
  }

  return obj;
}

export default get;

// Warm it up
_getProp('foo' as any, 'a');
_getProp('foo' as any, 1 as any);
_getProp({}, 'a');
_getProp({}, 1 as any);
_getProp({ unknownProperty() {} }, 'a');
_getProp({ unknownProperty() {} }, 1 as any);

get({}, 'foo');
get({}, 'foo.bar');

let fakeProxy = {} as ProxyMixin<unknown>;
setProxy(fakeProxy);

track(() => _getProp({}, 'a'));
track(() => _getProp({}, 1 as any));
track(() => _getProp({ a: [] }, 'a'));
track(() => _getProp({ a: fakeProxy }, 'a'));
