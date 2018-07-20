import { assert, deprecate } from '@ember/debug';
import EmberObject from './system/object';
import Copyable from './mixins/copyable';

/**
 @module @ember/object
*/
function _copy(obj, deep, seen, copies) {
  // primitive data types are immutable, just return them.
  if (typeof obj !== 'object' || obj === null) {
    return obj;
  }

  let ret, loc;

  // avoid cyclical loops
  if (deep && (loc = seen.indexOf(obj)) >= 0) {
    return copies[loc];
  }

  // IMPORTANT: this specific test will detect a native array only. Any other
  // object will need to implement Copyable.
  if (Array.isArray(obj)) {
    ret = obj.slice();

    if (deep) {
      loc = ret.length;

      while (--loc >= 0) {
        ret[loc] = _copy(ret[loc], deep, seen, copies);
      }
    }
  } else if (Copyable.detect(obj)) {
    ret = obj.copy(deep, seen, copies);
  } else if (obj instanceof Date) {
    ret = new Date(obj.getTime());
  } else {
    assert(
      'Cannot clone an EmberObject that does not implement Copyable',
      !(obj instanceof EmberObject) || Copyable.detect(obj)
    );

    ret = {};
    let key;
    for (key in obj) {
      // support Null prototype
      if (!Object.prototype.hasOwnProperty.call(obj, key)) {
        continue;
      }

      // Prevents browsers that don't respect non-enumerability from
      // copying internal Ember properties
      if (key.substring(0, 2) === '__') {
        continue;
      }

      ret[key] = deep ? _copy(obj[key], deep, seen, copies) : obj[key];
    }
  }

  if (deep) {
    seen.push(obj);
    copies.push(ret);
  }

  return ret;
}

/**
  Creates a shallow copy of the passed object. A deep copy of the object is
  returned if the optional `deep` argument is `true`.

  If the passed object implements the `Copyable` interface, then this
  function will delegate to the object's `copy()` method and return the
  result. See `Copyable` for further details.

  For primitive values (which are immutable in JavaScript), the passed object
  is simply returned.

  @method copy
  @deprecated Use 'ember-copy' addon instead
  @static
  @for @ember/object/internals
  @param {Object} obj The object to clone
  @param {Boolean} [deep=false] If true, a deep copy of the object is made.
  @return {Object} The copied object
  @public
*/
export default function copy(obj, deep) {
  deprecate('Use ember-copy addon instead of copy method and Copyable mixin.', false, {
    id: 'ember-runtime.deprecate-copy-copyable',
    until: '4.0.0',
    url: 'https://emberjs.com/deprecations/v3.x/#toc_ember-runtime-deprecate-copy-copyable',
  });

  // fast paths
  if ('object' !== typeof obj || obj === null) {
    return obj; // can't copy primitives
  }

  if (!Array.isArray(obj) && Copyable.detect(obj)) {
    return obj.copy(deep);
  }

  return _copy(obj, deep, deep ? [] : null, deep ? [] : null);
}
