/**
@module @ember/object
*/
import { DEBUG } from '@glimmer/env';
import { assert, deprecate } from '@ember/debug';
import { HAS_NATIVE_PROXY, symbol, toString } from 'ember-utils';
import { EMBER_METAL_TRACKED_PROPERTIES } from '@ember/canary-features';
import { isPath } from './path_cache';
import { descriptorFor, isDescriptor, meta } from 'ember-meta';
import { getCurrentTracker } from './tracked';
import { tagForProperty } from './tags';

const ALLOWABLE_TYPES = {
  object: true,
  function: true,
  string: true,
};

export const PROXY_CONTENT = symbol('PROXY_CONTENT');

export let getPossibleMandatoryProxyValue;

if (DEBUG && HAS_NATIVE_PROXY) {
  getPossibleMandatoryProxyValue = function getPossibleMandatoryProxyValue(obj, keyName) {
    let content = obj[PROXY_CONTENT];
    if (content === undefined) {
      return obj[keyName];
    } else {
      /* global Reflect */
      return Reflect.get(content, keyName, obj);
    }
  };
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
export function get(obj, keyName) {
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
  assert('Cannot call `get` with an empty string', keyName !== '');

  let type = typeof obj;

  let isObject = type === 'object';
  let isFunction = type === 'function';
  let isObjectLike = isObject || isFunction;

  let descriptor;
  let value;

  if (isObjectLike) {
    if (EMBER_METAL_TRACKED_PROPERTIES) {
      let tracker = getCurrentTracker();
      if (tracker) tracker.add(tagForProperty(obj, keyName));
    }

    descriptor = descriptorFor(obj, keyName);
    if (descriptor !== undefined) {
      return descriptor.get(obj, keyName);
    }

    if (DEBUG && HAS_NATIVE_PROXY) {
      value = getPossibleMandatoryProxyValue(obj, keyName);
    } else {
      value = obj[keyName];
    }

    // TODO turn if block into a sveltable deprecated block
    if (isDescriptor(value)) {
      deprecate(
        `[DEPRECATED] computed property '${keyName}' was not set on object '${toString(
          obj
        )}' via 'defineProperty'`,
        false,
        {
          id: 'ember-meta.descriptor-on-object',
          until: '3.5.0',
          url:
            'https://emberjs.com/deprecations/v3.x#toc_use-defineProperty-to-define-computed-properties',
        }
      );

      Object.defineProperty(obj, keyName, {
        configurable: true,
        enumerable: value.enumerable === false,
        get() {
          return value.get(this, keyName);
        },
      });

      meta(obj).writeDescriptors(keyName, value);

      if (typeof value.setup === 'function') {
        value.setup(obj, keyName);
      }

      return value.get(obj, keyName);
    }
  } else {
    value = obj[keyName];
  }

  if (value === undefined) {
    if (isPath(keyName)) {
      return _getPath(obj, keyName);
    }
    if (isObject && !(keyName in obj) && typeof obj.unknownProperty === 'function') {
      return obj.unknownProperty(keyName);
    }
  }
  return value;
}

export function _getPath(root, path) {
  let obj = root;
  let parts = path.split('.');

  for (let i = 0; i < parts.length; i++) {
    if (!isGettable(obj)) {
      return undefined;
    }

    obj = get(obj, parts[i]);

    if (obj && obj.isDestroyed) {
      return undefined;
    }
  }

  return obj;
}

function isGettable(obj) {
  return obj !== undefined && obj !== null && ALLOWABLE_TYPES[typeof obj];
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
export function getWithDefault(root, key, defaultValue) {
  let value = get(root, key);

  if (value === undefined) {
    return defaultValue;
  }
  return value;
}

export default get;
