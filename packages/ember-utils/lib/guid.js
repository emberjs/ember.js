import intern from './intern';
import { isObject } from './spec';

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
const OBJECT_GUIDS = new WeakMap();
const NON_OBJECT_GUIDS = new Map();
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
export const GUID_KEY = intern(`__ember${+new Date()}`);

/**
  Generates a new guid, optionally saving the guid to the object that you
  pass in. You will rarely need to use this method. Instead you should
  call `guidFor(obj)`, which return an existing guid if available.

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
  let guid = prefix + uuid();

  if (isObject(obj)) {
    OBJECT_GUIDS.set(obj, guid);
  }

  return guid;
}

/**
  Returns a unique id for the object. If the object does not yet have a guid,
  one will be assigned to it. You can call this on any object,
  `EmberObject`-based or not.

  You can also use this method on DOM Element objects.

  @public
  @static
  @method guidFor
  @for @ember/object/internals
  @param {Object} obj any object, string, number, Element, or primitive
  @return {String} the unique guid for this instance.
*/
export function guidFor(value) {
  let guid;

  if (isObject(value)) {
    guid = OBJECT_GUIDS.get(value);

    if (guid === undefined) {
      guid = GUID_PREFIX + uuid();
      OBJECT_GUIDS.set(value, guid);
    }
  } else {
    guid = NON_OBJECT_GUIDS.get(value);

    if (guid === undefined) {
      let type = typeof value;

      if (type === 'string') {
        guid = 'st' + uuid();
      } else if (type === 'number') {
        guid = 'nu' + uuid();
      } else if (type === 'symbol') {
        guid = 'sy' + uuid();
      } else {
        guid = '(' + value + ')';
      }

      NON_OBJECT_GUIDS.set(value, guid);
    }
  }

  return guid;
}
