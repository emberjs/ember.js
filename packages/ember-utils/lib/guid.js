import intern from './intern';
/**
 @module @ember/object
*/

/**
 Previously we used `Ember.$.uuid`, however `$.uuid` has been removed from
 jQuery master. We'll just bootstrap our own uuid now.

 @private
 @return {Number} the uuid
 */
let _uuid = 0;

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

/**
 Prefix used for guids through out Ember.
 @private
 @property GUID_PREFIX
 @for Ember
 @type String
 @final
 */
const GUID_PREFIX = 'ember';

// Used for guid generation...
const numberCache  = [];
const stringCache  = {};

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

/**
  Generates a new guid, optionally saving the guid to the object that you
  pass in. You will rarely need to use this method. Instead you should
  call `Ember.guidFor(obj)`, which return an existing guid if available.

  @private
  @method generateGuid
  @static
  @for @ember/object/internals
  @param {Object} [obj] Object the guid will be used for. If passed in, the guid will
    be saved on the object and reused whenever you pass the same object
    again.

    If no object is passed, just generate a new guid.
  @param {String} [prefix] Prefix to place in front of the guid. Useful when you want to
    separate the guid into separate namespaces.
  @return {String} the guid
*/
export function generateGuid(obj, prefix = GUID_PREFIX) {
  let ret = prefix + uuid();
  if (obj !== undefined && obj !== null) {
    if (obj[GUID_KEY] === null) {
      obj[GUID_KEY] = ret;
    } else {
      GUID_DESC.value = ret;
      if (obj.__defineNonEnumerable) {
        obj.__defineNonEnumerable(GUID_KEY_PROPERTY);
      } else {
        Object.defineProperty(obj, GUID_KEY, GUID_DESC);
      }
    }
  }
  return ret;
}

/**
  Returns a unique id for the object. If the object does not yet have a guid,
  one will be assigned to it. You can call this on any object,
  `Ember.Object`-based or not, but be aware that it will add a `_guid`
  property.

  You can also use this method on DOM Element objects.

  @public
  @static
  @method guidFor
  @for @ember/object/internals
  @param {Object} obj any object, string, number, Element, or primitive
  @return {String} the unique guid for this instance.
*/
export function guidFor(obj) {
  // special cases where we don't want to add a key to object
  if (obj === undefined) {
    return '(undefined)';
  }

  if (obj === null) {
    return '(null)';
  }

  let type = typeof obj;
  if ((type === 'object' || type === 'function') && obj[GUID_KEY]) {
    return obj[GUID_KEY];
  }

  let ret;
  // Don't allow prototype changes to String etc. to change the guidFor
  switch (type) {
    case 'number':
      ret = numberCache[obj];

      if (!ret) {
        ret = numberCache[obj] = `nu${obj}`;
      }

      return ret;

    case 'string':
      ret = stringCache[obj];

      if (!ret) {
        ret = stringCache[obj] = `st${uuid()}`;
      }

      return ret;

    case 'boolean':
      return obj ? '(true)' : '(false)';

    default:
      if (obj === Object) {
        return '(Object)';
      }

      if (obj === Array) {
        return '(Array)';
      }

      return generateGuid(obj);
  }
}
