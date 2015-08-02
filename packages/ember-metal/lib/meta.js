// Remove "use strict"; from transpiled module until
// https://bugs.webkit.org/show_bug.cgi?id=138038 is fixed
//
'REMOVE_USE_STRICT: true';

import isEnabled from 'ember-metal/features';

/**
@module ember-metal
*/

function Meta(obj) {
  this.watching = {};
  this.cache = undefined;
  this.source = obj;
  this.deps = undefined;
  this.listeners = undefined;
  this.mixins = undefined;
  this.bindings = undefined;
  this.chains = undefined;
  this.chainWatchers = undefined;
  this.values = undefined;
  this.proto = undefined;
}

export var META_DESC = {
  writable: true,
  configurable: true,
  enumerable: false,
  value: null
};

var EMBER_META_PROPERTY = {
  name: '__ember_meta__',
  descriptor: META_DESC
};

// Placeholder for non-writable metas.
export var EMPTY_META = new Meta(null);

if (isEnabled('mandatory-setter')) {
  EMPTY_META.values = {};
}

/**
  Retrieves the meta hash for an object. If `writable` is true ensures the
  hash is writable for this object as well.

  The meta object contains information about computed property descriptors as
  well as any watched properties and other information. You generally will
  not access this information directly but instead work with higher level
  methods that manipulate this hash indirectly.

  @method meta
  @for Ember
  @private

  @param {Object} obj The object to retrieve meta for
  @param {Boolean} [writable=true] Pass `false` if you do not intend to modify
    the meta hash, allowing the method to avoid making an unnecessary copy.
  @return {Object} the meta hash for an object
*/
export function meta(obj, writable) {
  var ret = obj.__ember_meta__;
  if (writable === false) {
    return ret || EMPTY_META;
  }

  if (obj.__defineNonEnumerable) {
    obj.__defineNonEnumerable(EMBER_META_PROPERTY);
  } else {
    Object.defineProperty(obj, '__ember_meta__', META_DESC);
  }

  if (!ret) {
    ret = new Meta(obj);

    if (isEnabled('mandatory-setter')) {
      ret.values = {};
    }
  } else if (ret.source !== obj) {
    ret = Object.create(ret);
    ret.watching  = Object.create(ret.watching);
    ret.cache     = undefined;
    ret.source    = obj;

    if (isEnabled('mandatory-setter')) {
      ret.values = Object.create(ret.values);
    }
  }
  obj.__ember_meta__ = ret;
  return ret;
}
