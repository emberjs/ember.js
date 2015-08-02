// Remove "use strict"; from transpiled module until
// https://bugs.webkit.org/show_bug.cgi?id=138038 is fixed
//
'REMOVE_USE_STRICT: true';

import isEnabled from 'ember-metal/features';

/**
@module ember-metal
*/

let members = {
  cache: ownMap,
  watching: inheritedMap,
  mixins: inheritedMap,
  bindings: inheritedMap,
  values: inheritedMap
};

let memberNames = Object.keys(members);

function Meta(obj, parentMeta) {
  // preallocate a slot for each member
  for (let i = 0; i < memberNames.length; i++) {
    this[memberProperty(memberNames[i])] = undefined;
  }

  // used only internally by meta() to distinguish meta-from-prototype
  // from instance's own meta
  this.source = obj;

  // map of maps, with two-level prototypical inheritance, cloned on access
  this.deps = undefined;

  // map from keys to lists. Has own __source__ property that's used
  // to distinguish whether it is being inherited or not. Each list
  // also has a __source__property. Both levels are inherited on
  // demand with o_create.
  this.listeners = undefined;

  // instance of ChainNode, inherited on demand via ChainNode.copy
  this.chains = undefined;

  // instanceof ChainWatchers. Created on demand with a fresh new
  // ChainWatchers at each level in prototype chain, by testing
  // m.chainWatchers.obj.
  this.chainWatchers = undefined;

  // when meta(obj).proto === obj, the object is intended to be only a
  // prototype and doesn't need to actually be observable itself
  this.proto = undefined;

  // The next meta in our inheritance chain. We (will) track this
  // explicitly instead of using prototypical inheritance because we
  // have detailed knowledge of how each property should really be
  // inherited, and we can optimize it much better than JS runtimes.
  this.parent = parentMeta;
}

(function setupMembers() {
  for (let i = 0; i < memberNames.length; i++) {
    let name = memberNames[i];
    let implementation = members[name];
    implementation(name, Meta);
  }
})();


// Implements a member that is a lazily created, non-inheritable
// POJO. For member `thing` you get methods `getThing` and
// `getOrCreateThing`.
function ownMap(name, Meta) {
  let key = memberProperty(name);
  let capitalized = capitalize(name);
  Meta.prototype['getOrCreate' + capitalized] = function() {
    return getOrCreateOwnMap.call(this, key);
  };
  Meta.prototype['get' + capitalized] = function() { return this[key]; };
}

function getOrCreateOwnMap(key) {
  let ret = this[key];
  if (!ret) {
    ret = this[key] = Object.create(null);
  }
  return ret;
}

// Implements a member that is a lazily created POJO with inheritable
// values. For member `thing` you get methods `getThing`,
// `getOrCreateThing`, and `peekThing`.
function inheritedMap(name, Meta) {
  let key = memberProperty(name);
  let capitalized = capitalize(name);

  Meta.prototype['getOrCreate' + capitalized] = function() {
    return getOrCreateInheritedMap.call(this, key);
  };

  Meta.prototype['get' + capitalized] = function() {
    return getInheritedMap.call(this, key);
  };

  Meta.prototype['peek' + capitalized] = function(subkey) {
    let map = getInheritedMap.call(this, key);
    if (map) {
      return map[subkey];
    }
  };

  Meta.prototype['clear' + capitalized] = function() {
    this[key] = Object.create(null);
  };
}

function getOrCreateInheritedMap(key) {
  let ret = this[key];
  if (!ret) {
    if (this.parent) {
      ret = this[key] = Object.create(getOrCreateInheritedMap.call(this.parent, key));
    } else {
      ret = this[key] = Object.create(null);
    }
  }
  return ret;
}

function getInheritedMap(key) {
  let pointer = this;
  while (pointer) {
    if (pointer[key]) {
      return pointer[key];
    }
    pointer = pointer.parent;
  }
}

function memberProperty(name) {
  return '_' + name;
}

// there's a more general-purpose capitalize in ember-runtime, but we
// don't want to make ember-metal depend on ember-runtime.
function capitalize(name) {
  return name.replace(/^\w/, m => m.toUpperCase());
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
  EMPTY_META.getOrCreateValues();
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
      ret.getOrCreateValues();
    }
  } else if (ret.source !== obj) {
    // temporary dance until I can eliminate remaining uses of
    // prototype chain
    let newRet = Object.create(ret);
    newRet.parent = ret;
    for (let i = 0; i < memberNames.length; i++) {
      newRet[memberProperty(memberNames[i])] = undefined;
    }
    ret = newRet;
    // end temporary dance

    ret.source    = obj;
  }
  obj.__ember_meta__ = ret;
  return ret;
}
