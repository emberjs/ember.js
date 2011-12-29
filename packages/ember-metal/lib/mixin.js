// ==========================================================================
// Project:  Ember Runtime
// Copyright: ©2011 Strobe Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

require('ember-metal/core');
require('ember-metal/accessors');
require('ember-metal/computed');
require('ember-metal/properties');
require('ember-metal/observer');
require('ember-metal/utils');
require('ember-metal/array');

var Mixin, MixinDelegate, REQUIRED, Alias;
var classToString, superClassString;

var a_map = Array.prototype.map;
var a_slice = Array.prototype.slice;
var EMPTY_META = {}; // dummy for non-writable meta
var META_SKIP = { __emberproto__: true, __ember_count__: true };

var o_create = Ember.platform.create;

function meta(obj, writable) {
  var m = Ember.meta(obj, writable!==false), ret = m.mixins;
  if (writable===false) return ret || EMPTY_META;

  if (!ret) {
    ret = m.mixins = { __emberproto__: obj };
  } else if (ret.__emberproto__ !== obj) {
    ret = m.mixins = o_create(ret);
    ret.__emberproto__ = obj;
  }
  return ret;
}

function initMixin(mixin, args) {
  if (args && args.length > 0) {
    mixin.mixins = a_map.call(args, function(x) {
      if (x instanceof Mixin) return x;

      // Note: Manually setup a primitive mixin here.  This is the only
      // way to actually get a primitive mixin.  This way normal creation
      // of mixins will give you combined mixins...
      var mixin = new Mixin();
      mixin.properties = x;
      return mixin;
    });
  }
  return mixin;
}

var NATIVES = [Boolean, Object, Number, Array, Date, String];
function isMethod(obj) {
  if ('function' !== typeof obj || obj.isMethod===false) return false;
  return NATIVES.indexOf(obj)<0;
}

function mergeMixins(mixins, m, descs, values, base) {
  var len = mixins.length, idx, mixin, guid, props, value, key, ovalue, concats;

  function removeKeys(keyName) {
    delete descs[keyName];
    delete values[keyName];
  }

  for(idx=0;idx<len;idx++) {

    mixin = mixins[idx];
    if (!mixin) throw new Error('Null value found in Ember.mixin()');

    if (mixin instanceof Mixin) {
      guid = Ember.guidFor(mixin);
      if (m[guid]) continue;
      m[guid] = mixin;
      props = mixin.properties;
    } else {
      props = mixin; // apply anonymous mixin properties
    }

    if (props) {

      // reset before adding each new mixin to pickup concats from previous
      concats = values.concatenatedProperties || base.concatenatedProperties;
      if (props.concatenatedProperties) {
        concats = concats ? concats.concat(props.concatenatedProperties) : props.concatenatedProperties;
      }

      for (key in props) {
        if (!props.hasOwnProperty(key)) continue;
        value = props[key];
        if (value instanceof Ember.Descriptor) {
          if (value === REQUIRED && descs[key]) { continue; }

          descs[key]  = value;
          values[key] = undefined;
        } else {

          // impl super if needed...
          if (isMethod(value)) {
            ovalue = (descs[key] === Ember.SIMPLE_PROPERTY) && values[key];
            if (!ovalue) ovalue = base[key];
            if ('function' !== typeof ovalue) ovalue = null;
            if (ovalue) {
              var o = value.__ember_observes__, ob = value.__ember_observesBefore__;
              value = Ember.wrap(value, ovalue);
              value.__ember_observes__ = o;
              value.__ember_observesBefore__ = ob;
            }
          } else if ((concats && concats.indexOf(key)>=0) || key === 'concatenatedProperties') {
            var baseValue = values[key] || base[key];
            value = baseValue ? baseValue.concat(value) : Ember.makeArray(value);
          }

          descs[key]  = Ember.SIMPLE_PROPERTY;
          values[key] = value;
        }
      }

      // manually copy toString() because some JS engines do not enumerate it
      if (props.hasOwnProperty('toString')) {
        base.toString = props.toString;
      }

    } else if (mixin.mixins) {
      mergeMixins(mixin.mixins, m, descs, values, base);
      if (mixin._without) mixin._without.forEach(removeKeys);
    }
  }
}

var defineProperty = Ember.defineProperty;

function writableReq(obj) {
  var m = Ember.meta(obj), req = m.required;
  if (!req || (req.__emberproto__ !== obj)) {
    req = m.required = req ? o_create(req) : { __ember_count__: 0 };
    req.__emberproto__ = obj;
  }
  return req;
}

function getObserverPaths(value) {
  return ('function' === typeof value) && value.__ember_observes__;
}

function getBeforeObserverPaths(value) {
  return ('function' === typeof value) && value.__ember_observesBefore__;
}

Ember._mixinBindings = function(obj, key, value, m) {
  return value;
};

function applyMixin(obj, mixins, partial) {
  var descs = {}, values = {}, m = Ember.meta(obj), req = m.required;
  var key, willApply, didApply, value, desc;

  var mixinBindings = Ember._mixinBindings;

  mergeMixins(mixins, meta(obj), descs, values, obj);

  if (MixinDelegate.detect(obj)) {
    willApply = values.willApplyProperty || obj.willApplyProperty;
    didApply  = values.didApplyProperty || obj.didApplyProperty;
  }

  for(key in descs) {
    if (!descs.hasOwnProperty(key)) continue;

    desc = descs[key];
    value = values[key];

    if (desc === REQUIRED) {
      if (!(key in obj)) {
        if (!partial) throw new Error('Required property not defined: '+key);

        // for partial applies add to hash of required keys
        req = writableReq(obj);
        req.__ember_count__++;
        req[key] = true;
      }

    } else {

      while (desc instanceof Alias) {

        var altKey = desc.methodName;
        if (descs[altKey]) {
          value = values[altKey];
          desc  = descs[altKey];
        } else if (m.descs[altKey]) {
          desc  = m.descs[altKey];
          value = desc.val(obj, altKey);
        } else {
          value = obj[altKey];
          desc  = Ember.SIMPLE_PROPERTY;
        }
      }

      if (willApply) willApply.call(obj, key);

      var observerPaths = getObserverPaths(value),
          curObserverPaths = observerPaths && getObserverPaths(obj[key]),
          beforeObserverPaths = getBeforeObserverPaths(value),
          curBeforeObserverPaths = beforeObserverPaths && getBeforeObserverPaths(obj[key]),
          len, idx;

      if (curObserverPaths) {
        len = curObserverPaths.length;
        for(idx=0;idx<len;idx++) {
          Ember.removeObserver(obj, curObserverPaths[idx], null, key);
        }
      }

      if (curBeforeObserverPaths) {
        len = curBeforeObserverPaths.length;
        for(idx=0;idx<len;idx++) {
          Ember.removeBeforeObserver(obj, curBeforeObserverPaths[idx], null,key);
        }
      }

      // TODO: less hacky way for ember-runtime to add bindings.
      value = mixinBindings(obj, key, value, m);

      defineProperty(obj, key, desc, value);

      if (observerPaths) {
        len = observerPaths.length;
        for(idx=0;idx<len;idx++) {
          Ember.addObserver(obj, observerPaths[idx], null, key);
        }
      }

      if (beforeObserverPaths) {
        len = beforeObserverPaths.length;
        for(idx=0;idx<len;idx++) {
          Ember.addBeforeObserver(obj, beforeObserverPaths[idx], null, key);
        }
      }

      if (req && req[key]) {
        req = writableReq(obj);
        req.__ember_count__--;
        req[key] = false;
      }

      if (didApply) didApply.call(obj, key);

    }
  }

  // Make sure no required attrs remain
  if (!partial && req && req.__ember_count__>0) {
    var keys = [];
    for(key in req) {
      if (META_SKIP[key]) continue;
      keys.push(key);
    }
    throw new Error('Required properties not defined: '+keys.join(','));
  }
  return obj;
}

Ember.mixin = function(obj) {
  var args = a_slice.call(arguments, 1);
  return applyMixin(obj, args, false);
};


/**
  @constructor
  @name Ember.Mixin
*/
Mixin = function() { return initMixin(this, arguments); };

Mixin._apply = applyMixin;

Mixin.applyPartial = function(obj) {
  var args = a_slice.call(arguments, 1);
  return applyMixin(obj, args, true);
};

Mixin.create = function() {
  classToString.processed = false;
  var M = this;
  return initMixin(new M(), arguments);
};

Mixin.prototype.reopen = function() {

  var mixin, tmp;

  if (this.properties) {
    mixin = Mixin.create();
    mixin.properties = this.properties;
    delete this.properties;
    this.mixins = [mixin];
  }

  var len = arguments.length, mixins = this.mixins, idx;

  for(idx=0;idx<len;idx++) {
    mixin = arguments[idx];
    if (mixin instanceof Mixin) {
      mixins.push(mixin);
    } else {
      tmp = Mixin.create();
      tmp.properties = mixin;
      mixins.push(tmp);
    }
  }

  return this;
};

var TMP_ARRAY = [];
Mixin.prototype.apply = function(obj) {
  TMP_ARRAY[0] = this;
  var ret = applyMixin(obj, TMP_ARRAY, false);
  TMP_ARRAY.length=0;
  return ret;
};

Mixin.prototype.applyPartial = function(obj) {
  TMP_ARRAY[0] = this;
  var ret = applyMixin(obj, TMP_ARRAY, true);
  TMP_ARRAY.length=0;
  return ret;
};

function _detect(curMixin, targetMixin, seen) {
  var guid = Ember.guidFor(curMixin);

  if (seen[guid]) return false;
  seen[guid] = true;

  if (curMixin === targetMixin) return true;
  var mixins = curMixin.mixins, loc = mixins ? mixins.length : 0;
  while(--loc >= 0) {
    if (_detect(mixins[loc], targetMixin, seen)) return true;
  }
  return false;
}

Mixin.prototype.detect = function(obj) {
  if (!obj) return false;
  if (obj instanceof Mixin) return _detect(obj, this, {});
  return !!meta(obj, false)[Ember.guidFor(this)];
};

Mixin.prototype.without = function() {
  var ret = new Mixin(this);
  ret._without = a_slice.call(arguments);
  return ret;
};

function _keys(ret, mixin, seen) {
  if (seen[Ember.guidFor(mixin)]) return;
  seen[Ember.guidFor(mixin)] = true;

  if (mixin.properties) {
    var props = mixin.properties;
    for(var key in props) {
      if (props.hasOwnProperty(key)) ret[key] = true;
    }
  } else if (mixin.mixins) {
    mixin.mixins.forEach(function(x) { _keys(ret, x, seen); });
  }
}

Mixin.prototype.keys = function() {
  var keys = {}, seen = {}, ret = [];
  _keys(keys, this, seen);
  for(var key in keys) {
    if (keys.hasOwnProperty(key)) ret.push(key);
  }
  return ret;
};

/** @private - make Mixin's have nice displayNames */

var NAME_KEY = Ember.GUID_KEY+'_name';
var get = Ember.get;

function processNames(paths, root, seen) {
  var idx = paths.length;
  for(var key in root) {
    if (!root.hasOwnProperty || !root.hasOwnProperty(key)) continue;
    var obj = root[key];
    paths[idx] = key;

    if (obj && obj.toString === classToString) {
      obj[NAME_KEY] = paths.join('.');
    } else if (obj && get(obj, 'isNamespace')) {
      if (seen[Ember.guidFor(obj)]) continue;
      seen[Ember.guidFor(obj)] = true;
      processNames(paths, obj, seen);
    }

  }
  paths.length = idx; // cut out last item
}

function findNamespaces() {
  var Namespace = Ember.Namespace, obj;

  if (Namespace.PROCESSED) { return; }

  for (var prop in window) {
    // Unfortunately, some versions of IE don't support window.hasOwnProperty
    if (window.hasOwnProperty && !window.hasOwnProperty(prop)) { continue; }

    obj = window[prop];

    if (obj && get(obj, 'isNamespace')) {
      obj[NAME_KEY] = prop;
    }
  }
}

Ember.identifyNamespaces = findNamespaces;

superClassString = function(mixin) {
  var superclass = mixin.superclass;
  if (superclass) {
    if (superclass[NAME_KEY]) { return superclass[NAME_KEY]; }
    else { return superClassString(superclass); }
  } else {
    return;
  }
};

classToString = function() {
  var Namespace = Ember.Namespace, namespace;

  // TODO: Namespace should really be in Metal
  if (Namespace) {
    if (!this[NAME_KEY] && !classToString.processed) {
      if (!Namespace.PROCESSED) {
        findNamespaces();
        Namespace.PROCESSED = true;
      }

      classToString.processed = true;

      var namespaces = Namespace.NAMESPACES;
      for (var i=0, l=namespaces.length; i<l; i++) {
        namespace = namespaces[i];
        processNames([namespace.toString()], namespace, {});
      }
    }
  }

  if (this[NAME_KEY]) {
    return this[NAME_KEY];
  } else {
    var str = superClassString(this);
    if (str) {
      return "(subclass of " + str + ")";
    } else {
      return "(unknown mixin)";
    }
  }
};

Mixin.prototype.toString = classToString;

// returns the mixins currently applied to the specified object
// TODO: Make Ember.mixin
Mixin.mixins = function(obj) {
  var ret = [], mixins = meta(obj, false), key, mixin;
  for(key in mixins) {
    if (META_SKIP[key]) continue;
    mixin = mixins[key];

    // skip primitive mixins since these are always anonymous
    if (!mixin.properties) ret.push(mixins[key]);
  }
  return ret;
};

REQUIRED = new Ember.Descriptor();
REQUIRED.toString = function() { return '(Required Property)'; };

Ember.required = function() {
  return REQUIRED;
};

Alias = function(methodName) {
  this.methodName = methodName;
};
Alias.prototype = new Ember.Descriptor();

Ember.alias = function(methodName) {
  return new Alias(methodName);
};

Ember.Mixin = Mixin;

MixinDelegate = Mixin.create({

  willApplyProperty: Ember.required(),
  didApplyProperty:  Ember.required()

});

Ember.MixinDelegate = MixinDelegate;


// ..........................................................
// OBSERVER HELPER
//

Ember.observer = function(func) {
  var paths = a_slice.call(arguments, 1);
  func.__ember_observes__ = paths;
  return func;
};

Ember.beforeObserver = function(func) {
  var paths = a_slice.call(arguments, 1);
  func.__ember_observesBefore__ = paths;
  return func;
};






