import { HAS_NATIVE_WEAKMAP, isObject } from './weak-map-utils';
import intern from './intern';

/**
 Previously we used `Ember.$.uuid`, however `$.uuid` has been removed from
 jQuery master. We'll just bootstrap our own uuid now.

 @private
 @return {Number} the uuid
 */
let _uuid = 1; // starting at 1 so all guids are "truthy"

/**
 Generates a universally unique identifier. This method
 is used internally by Ember for assisting with
 the generation of GUID's and other unique identifiers.

 @public
 @return {Number} [description]
 */
export function uuid() {
  return ++_uuid;
}

// Used for guid generation...
const NUMBER_CACHE = [];
const STRING_CACHE = {};

const TRUE_UUID = uuid();
const FALSE_UUID = uuid();
const OBJECT_UUID = uuid();
const ARRAY_UUID = uuid();
const NULL_UUID = uuid();
const UNDEFINED_UUID = uuid();

/**
  A unique key used to assign guids and other private metadata to objects.
  If you inspect an object in your browser debugger you will often see these.
  They can be safely ignored.

  On browsers that support it, these properties are added with enumeration
  disabled so they won't show up when you iterate over your properties.

  @private
  @property GUID_KEY
  @for Ember
  @type String
  @final
*/
export const GUID_KEY = intern(`__ember${+ new Date()}`);

export let GUID_DESC = {
  writable:     true,
  configurable: true,
  enumerable:   false,
  value: null
};

let nullDescriptor = {
  configurable: true,
  writable: true,
  enumerable: false,
  value: null
};

export let GUID_KEY_PROPERTY = {
  name: GUID_KEY,
  descriptor: nullDescriptor
};

export function buildGuidFor(obj) {
  let type = typeof obj;
  // special cases where we don't want to add a key to object
  if (obj === undefined) {
    return UNDEFINED_UUID;
  }

  if (obj === null) {
    return NULL_UUID;
  }

  let ret;

  // Don't allow prototype changes to String etc. to change the guidFor
  switch (type) {
  case 'number':
    ret = NUMBER_CACHE[obj];

    if (!ret) {
      ret = NUMBER_CACHE[obj] = uuid();
    }

    return ret;

  case 'string':
    ret = STRING_CACHE[obj];

    if (!ret) {
      ret = STRING_CACHE[obj] = uuid();
    }

    return ret;

  case 'boolean':
    return obj ? TRUE_UUID : FALSE_UUID;

  default:
    if (obj === Object) {
      return OBJECT_UUID;
    }

    if (obj === Array) {
      return ARRAY_UUID;
    }

    return uuid();
  }
}

let peekGuid, setGuid;
if (HAS_NATIVE_WEAKMAP) {
  let store = new WeakMap();

  setGuid = function GuidForWeakMap_set(obj, value) {
    if (isObject(obj)) {
      store.set(obj, value);
    }
  };

  peekGuid = function GuidForWeakMap_get(obj) {
    return store.get(obj);
  };
} else {
  setGuid = function GuidForFallback_set(obj, value) {
    if (isObject(obj)) {
      if (obj[GUID_KEY] === null) {
        obj[GUID_KEY] = value;
      } else {
        GUID_DESC.value = value;

        if (obj.__defineNonEnumerable) {
          obj.__defineNonEnumerable(GUID_KEY_PROPERTY);
          obj[GUID_KEY] = value;
        } else {
          Object.defineProperty(obj, GUID_KEY, GUID_DESC);
        }
      }
    }
  };

  peekGuid = function GuidForFallback_get(obj) {
    if (isObject(obj) && obj[GUID_KEY]) {
      return obj[GUID_KEY];
    }
  };
}

/**
  Generates a new guid, optionally saving the guid to the object that you
  pass in. You will rarely need to use this method. Instead you should
  call `Ember.guidFor(obj)`, which return an existing guid if available.

  @private
  @method generateGuid
  @for Ember
  @param {Object} [obj] Object the guid will be used for. If passed in, the guid will
    be saved on the object and reused whenever you pass the same object
    again.

    If no object is passed, just generate a new guid.
  @param {String} [prefix] Prefix to place in front of the guid. Useful when you want to
    separate the guid into separate namespaces.
  @return {String} the guid
*/
export function generateGuid(obj, prefix) {
  let ret;
  if (prefix) {
    ret = prefix + uuid();
  } else {
    ret = uuid();
  }

  setGuid(obj, ret);

  return ret;
}

/**
  Returns a unique id for the object. If the object does not yet have a guid,
  one will be assigned to it. You can call this on any object,
  `Ember.Object`-based or not, but be aware that it will add a `_guid`
  property.

  You can also use this method on DOM Element objects.

  @public
  @method guidFor
  @for Ember
  @param {Object} obj any object, string, number, Element, or primitive
  @return {String} the unique guid for this instance.
*/
export function guidFor(obj) {
  let ret = peekGuid(obj);
  if (ret) { return ret; }

  ret = buildGuidFor(obj);
  setGuid(obj, ret);

  return ret;
}

export { peekGuid }
