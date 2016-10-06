import { intern } from 'ember-utils';
import { meta as metaFor } from './meta';

export const GUID_KEY = intern('__ember' + (+ new Date()));

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

// Used for guid generation...
const NUMBER_CACHE = [];
const STRING_CACHE = {};

const TRUE_UUID = uuid();
const FALSE_UUID = uuid();
const OBJECT_UUID = uuid();
const ARRAY_UUID = uuid();
const NULL_UUID = uuid();
const UNDEFINED_UUID = uuid();

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
  if (obj) {
    let meta = metaFor(obj);

    if (prefix) {
      // TODO: this is kinda weird, we should deprecate and remove
      meta._guid = prefix + meta._guid;
    }

    return meta.sourceGuid();
  }

  let ret;
  if (prefix) {
    ret = prefix + uuid();
  } else {
    ret = uuid();
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
  @method guidFor
  @for Ember
  @param {Object} obj any object, string, number, Element, or primitive
  @return {String} the unique guid for this instance.
*/
export function guidFor(obj) {
  let type = typeof obj;
  let isObject = type === 'object' && obj !== null;
  let isFunction = type === 'function';

  if ((isObject || isFunction)) {
    return metaFor(obj).sourceGuid();
  } else {
    return buildGuidFor(obj);
  }
}
