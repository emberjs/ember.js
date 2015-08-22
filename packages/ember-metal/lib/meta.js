'no use strict';
// Remove "use strict"; from transpiled module until
// https://bugs.webkit.org/show_bug.cgi?id=138038 is fixed

import { protoMethods as listenerMethods } from 'ember-metal/meta_listeners';
import EmptyObject from 'ember-metal/empty_object';

/**
@module ember-metal
*/

/*
 This declares several meta-programmed members on the Meta class. Such
 meta!

 In general, the `readable` variants will give you an object (if it
 already exists) that you can read but should not modify. The
 `writable` variants will give you a mutable object, and they will
 create it if it didn't already exist.

 The following methods will get generated metaprogrammatically, and
 I'm including them here for greppability:

 writableCache, readableCache, writeWatching,
 peekWatching, clearWatching, writeMixins,
 peekMixins, clearMixins, writeBindings,
 peekBindings, clearBindings, writeValues,
 peekValues, clearValues, writeDeps, forEachInDeps
 writableChainWatchers, readableChainWatchers, writableChains,
 readableChains

*/
let members = {
  cache: ownMap,
  watching: inheritedMap,
  mixins: inheritedMap,
  bindings: inheritedMap,
  values: inheritedMap,
  deps: inheritedMapOfMaps,
  chainWatchers: ownCustomObject,
  chains: inheritedCustomObject
};

let memberNames = Object.keys(members);

function Meta(obj, parentMeta) {
  this._cache = undefined;
  this._watching = undefined;
  this._mixins = undefined;
  this._bindings = undefined;
  this._values = undefined;
  this._deps = undefined;
  this._chainWatchers = undefined;
  this._chains = undefined;
  // used only internally
  this.source = obj;

  // when meta(obj).proto === obj, the object is intended to be only a
  // prototype and doesn't need to actually be observable itself
  this.proto = undefined;

  // The next meta in our inheritance chain. We (will) track this
  // explicitly instead of using prototypical inheritance because we
  // have detailed knowledge of how each property should really be
  // inherited, and we can optimize it much better than JS runtimes.
  this.parent = parentMeta;

  this._initializeListeners();
}

for (let name in listenerMethods) {
  Meta.prototype[name] = listenerMethods[name];
}
memberNames.forEach(name => members[name](name, Meta));

// Implements a member that is a lazily created, non-inheritable
// POJO.
function ownMap(name, Meta) {
  let key = memberProperty(name);
  let capitalized = capitalize(name);
  Meta.prototype['writable' + capitalized] = function() {
    return this._getOrCreateOwnMap(key);
  };
  Meta.prototype['readable' + capitalized] = function() { return this[key]; };
}

Meta.prototype._getOrCreateOwnMap = function(key) {
  let ret = this[key];
  if (!ret) {
    ret = this[key] = new EmptyObject();
  }
  return ret;
};

// Implements a member that is a lazily created POJO with inheritable
// values.
function inheritedMap(name, Meta) {
  let key = memberProperty(name);
  let capitalized = capitalize(name);

  Meta.prototype['write' + capitalized] = function(subkey, value) {
    let map = this._getOrCreateOwnMap(key);
    map[subkey] = value;
  };

  Meta.prototype['peek' + capitalized] = function(subkey) {
    return this._findInherited(key, subkey);
  };

  Meta.prototype['forEach' + capitalized] = function(fn) {
    let pointer = this;
    let seen = new EmptyObject();
    while (pointer !== undefined) {
      let map = pointer[key];
      if (map) {
        for (let key in map) {
          if (!seen[key]) {
            seen[key] = true;
            fn(key, map[key]);
          }
        }
      }
      pointer = pointer.parent;
    }
  };

  Meta.prototype['clear' + capitalized] = function() {
    this[key] = new EmptyObject();
  };

  Meta.prototype['deleteFrom' + capitalized] = function(subkey) {
    delete this._getOrCreateOwnMap(key)[subkey];
  };

  Meta.prototype['hasIn' + capitalized] = function(subkey) {
    return this._findInherited(key, subkey) !== undefined;
  };
}

Meta.prototype._getInherited = function(key) {
  let pointer = this;
  while (pointer !== undefined) {
    if (pointer[key]) {
      return pointer[key];
    }
    pointer = pointer.parent;
  }
};

Meta.prototype._findInherited = function(key, subkey) {
  let pointer = this;
  while (pointer !== undefined) {
    let map = pointer[key];
    if (map) {
      let value = map[subkey];
      if (value !== undefined) {
        return value;
      }
    }
    pointer = pointer.parent;
  }
};


// Implements a member that provides a lazily created map of maps,
// with inheritance at both levels.
function inheritedMapOfMaps(name, Meta) {
  let key = memberProperty(name);
  let capitalized = capitalize(name);

  Meta.prototype['write' + capitalized] = function(subkey, itemkey, value) {
    let outerMap = this._getOrCreateOwnMap(key);
    let innerMap = outerMap[subkey];
    if (!innerMap) {
      innerMap = outerMap[subkey] = new EmptyObject();
    }
    innerMap[itemkey] = value;
  };

  Meta.prototype['peek' + capitalized] = function(subkey, itemkey) {
    let pointer = this;
    while (pointer !== undefined) {
      let map = pointer[key];
      if (map) {
        let value = map[subkey];
        if (value) {
          if (value[itemkey] !== undefined) {
            return value[itemkey];
          }
        }
      }
      pointer = pointer.parent;
    }
  };

  Meta.prototype['has' + capitalized] = function(subkey) {
    let map = this._getInherited(key);
    return map && !!map[subkey];
  };

  Meta.prototype['forEachIn' + capitalized] = function(subkey, fn) {
    return this._forEachIn(key, subkey, fn);
  };
}

Meta.prototype._forEachIn = function(key, subkey, fn) {
  let pointer = this;
  let seen = new EmptyObject();
  while (pointer !== undefined) {
    let map = pointer[key];
    if (map) {
      let innerMap = map[subkey];
      if (innerMap) {
        for (let innerKey in innerMap) {
          if (!seen[innerKey]) {
            seen[innerKey] = true;
            fn(innerKey, innerMap[innerKey]);
          }
        }
      }
    }
    pointer = pointer.parent;
  }
};

// Implements a member that provides a non-heritable, lazily-created
// object using the method you provide.
function ownCustomObject(name, Meta) {
  let key = memberProperty(name);
  let capitalized = capitalize(name);
  Meta.prototype['writable' + capitalized] = function(create) {
    let ret = this[key];
    if (!ret) {
      ret = this[key] = create(this.source);
    }
    return ret;
  };
  Meta.prototype['readable' + capitalized] = function() {
    return this[key];
  };
}

// Implements a member that provides an inheritable, lazily-created
// object using the method you provide. We will derived children from
// their parents by calling your object's `copy()` method.
function inheritedCustomObject(name, Meta) {
  let key = memberProperty(name);
  let capitalized = capitalize(name);
  Meta.prototype['writable' + capitalized] = function(create) {
    let ret = this[key];
    if (!ret) {
      if (this.parent) {
        ret = this[key] = this.parent['writable' + capitalized](create).copy(this.source);
      } else {
        ret = this[key] = create(this.source);
      }
    }
    return ret;
  };
  Meta.prototype['readable' + capitalized] = function() {
    return this._getInherited(key);
  };
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

  if (ret && ret.source === obj) {
    return ret;
  }

  if (!ret) {
    ret = new Meta(obj);
  } else {
    ret = new Meta(obj, ret);
  }

  if (obj.__defineNonEnumerable) {
    obj.__defineNonEnumerable(EMBER_META_PROPERTY);
  } else {
    Object.defineProperty(obj, '__ember_meta__', META_DESC);
  }
  obj.__ember_meta__ = ret;

  return ret;
}
