require('ember-metal/core');
require('ember-metal/accessors');
require('ember-metal/computed');
require('ember-metal/properties');
require('ember-metal/observer');
require('ember-metal/utils');
require('ember-metal/array');
require('ember-metal/binding');

/**
@module ember-metal
*/

var Mixin, REQUIRED, Alias,
    classToString, superClassString,
    a_map = Ember.ArrayPolyfills.map,
    a_indexOf = Ember.ArrayPolyfills.indexOf,
    a_forEach = Ember.ArrayPolyfills.forEach,
    a_slice = [].slice,
    EMPTY_META = {}, // dummy for non-writable meta
    META_SKIP = { __emberproto__: true, __ember_count__: true },
    o_create = Ember.create,
    defineProperty = Ember.defineProperty,
    guidFor = Ember.guidFor;

function mixinsMeta(obj) {
  var m = Ember.meta(obj, true), ret = m.mixins;
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
      if (x instanceof Mixin) { return x; }

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

function isMethod(obj) {
  return 'function' === typeof obj &&
         obj.isMethod !== false &&
         obj !== Boolean && obj !== Object && obj !== Number && obj !== Array && obj !== Date && obj !== String;
}

function mergeMixins(mixins, m, descs, values, base) {
  var len = mixins.length, idx, mixin, guid, props, value, key, ovalue, concats, meta;

  function removeKeys(keyName) {
    delete descs[keyName];
    delete values[keyName];
  }

  function cloneDescriptor(desc) {
    var newDesc = new Ember.ComputedProperty();
    newDesc._cacheable = desc._cacheable;
    newDesc._dependentKeys = desc._dependentKeys;
    newDesc.func = desc.func;

    return newDesc;
  }

  for(idx=0; idx < len; idx++) {
    mixin = mixins[idx];
    Ember.assert('Expected hash or Mixin instance, got ' + Object.prototype.toString.call(mixin), typeof mixin === 'object' && mixin !== null && Object.prototype.toString.call(mixin) !== '[object Array]');

    if (mixin instanceof Mixin) {
      guid = guidFor(mixin);
      if (m[guid]) { continue; }
      m[guid] = mixin;
      props = mixin.properties;
    } else {
      props = mixin; // apply anonymous mixin properties
    }

    if (props) {
      meta = Ember.meta(base);

      // reset before adding each new mixin to pickup concats from previous
      concats = values.concatenatedProperties || base.concatenatedProperties;
      if (props.concatenatedProperties) {
        concats = concats ? concats.concat(props.concatenatedProperties) : props.concatenatedProperties;
      }

      for (key in props) {
        if (!props.hasOwnProperty(key)) { continue; }
        value = props[key];
        if (value instanceof Ember.Descriptor) {
          if (value === REQUIRED && descs[key]) { continue; }

          // Wrap descriptor function to implement
          // _super() if needed
          if (value.func) {
            ovalue = values[key] === undefined && descs[key];
            if (!ovalue) { ovalue = meta.descs[key]; }
            if (ovalue && ovalue.func) {
              // Since multiple mixins may inherit from the
              // same parent, we need to clone the computed
              // property so that other mixins do not receive
              // the wrapped version.
              value = cloneDescriptor(value);
              value.func = Ember.wrap(value.func, ovalue.func);
            }
          }

          descs[key]  = value;
          values[key] = undefined;
        } else {
          // impl super if needed...
          if (isMethod(value)) {
            ovalue = descs[key] === undefined && values[key];
            if (!ovalue) { ovalue = base[key]; }
            if ('function' !== typeof ovalue) { ovalue = null; }
            if (ovalue) {
              var o = value.__ember_observes__, ob = value.__ember_observesBefore__;
              value = Ember.wrap(value, ovalue);
              value.__ember_observes__ = o;
              value.__ember_observesBefore__ = ob;
            }
          } else if ((concats && a_indexOf.call(concats, key) >= 0) || key === 'concatenatedProperties') {
            var baseValue = values[key] || base[key];
            value = baseValue ? baseValue.concat(value) : Ember.makeArray(value);
          }

          descs[key] = undefined;
          values[key] = value;
        }
      }

      // manually copy toString() because some JS engines do not enumerate it
      if (props.hasOwnProperty('toString')) {
        base.toString = props.toString;
      }

    } else if (mixin.mixins) {
      mergeMixins(mixin.mixins, m, descs, values, base);
      if (mixin._without) { a_forEach.call(mixin._without, removeKeys); }
    }
  }
}

function writableReq(obj) {
  var m = Ember.meta(obj), req = m.required;
  if (!req || req.__emberproto__ !== obj) {
    req = m.required = req ? o_create(req) : { __ember_count__: 0 };
    req.__emberproto__ = obj;
  }
  return req;
}

var IS_BINDING = Ember.IS_BINDING = /^.+Binding$/;

function detectBinding(obj, key, value, m) {
  if (IS_BINDING.test(key)) {
    var bindings = m.bindings;
    if (!bindings) {
      bindings = m.bindings = { __emberproto__: obj };
    } else if (bindings.__emberproto__ !== obj) {
      bindings = m.bindings = o_create(m.bindings);
      bindings.__emberproto__ = obj;
    }
    bindings[key] = value;
  }
}

function connectBindings(obj, m) {
  // TODO Mixin.apply(instance) should disconnect binding if exists
  var bindings = m.bindings, key, binding, to;
  if (bindings) {
    for (key in bindings) {
      binding = key !== '__emberproto__' && bindings[key];
      if (binding) {
        to = key.slice(0, -7); // strip Binding off end
        if (binding instanceof Ember.Binding) {
          binding = binding.copy(); // copy prototypes' instance
          binding.to(to);
        } else { // binding is string path
          binding = new Ember.Binding(to, binding);
        }
        binding.connect(obj);
        obj[key] = binding;
      }
    }
    // mark as applied
    m.bindings = { __emberproto__: obj };
  }
}

function finishPartial(obj, m) {
  connectBindings(obj, m || Ember.meta(obj));
  return obj;
}

function applyMixin(obj, mixins, partial) {
  var descs = {}, values = {}, m = Ember.meta(obj), req = m.required,
      key, value, desc, prevValue, paths, len, idx;

  // Go through all mixins and hashes passed in, and:
  //
  // * Handle concatenated properties
  // * Set up _super wrapping if necessary
  // * Set up computed property descriptors
  // * Copying `toString` in broken browsers
  mergeMixins(mixins, mixinsMeta(obj), descs, values, obj);

  for(key in values) {
    if (key === 'contructor') { continue; }
    if (!values.hasOwnProperty(key)) { continue; }

    desc = descs[key];
    value = values[key];

    if (desc === REQUIRED) {
      if (!(key in obj)) {
        Ember.assert('Required property not defined: '+key, !!partial);

        // for partial applies add to hash of required keys
        req = writableReq(obj);
        req.__ember_count__++;
        req[key] = true;
      }
    } else {
      while (desc && desc instanceof Alias) {
        var altKey = desc.methodName;
        if (descs[altKey] || values[altKey]) {
          value = values[altKey];
          desc  = descs[altKey];
        } else if (m.descs[altKey]) {
          desc  = m.descs[altKey];
          value = undefined;
        } else {
          desc = undefined;
          value = obj[altKey];
        }
      }

      if (desc === undefined && value === undefined) { continue; }

      prevValue = obj[key];

      if ('function' === typeof prevValue) {
        if ((paths = prevValue.__ember_observesBefore__)) {
          len = paths.length;
          for (idx=0; idx < len; idx++) {
            Ember.removeBeforeObserver(obj, paths[idx], null, key);
          }
        } else if ((paths = prevValue.__ember_observes__)) {
          len = paths.length;
          for (idx=0; idx < len; idx++) {
            Ember.removeObserver(obj, paths[idx], null, key);
          }
        }
      }

      detectBinding(obj, key, value, m);

      defineProperty(obj, key, desc, value, m);

      if ('function' === typeof value) {
        if (paths = value.__ember_observesBefore__) {
          len = paths.length;
          for (idx=0; idx < len; idx++) {
            Ember.addBeforeObserver(obj, paths[idx], null, key);
          }
        } else if (paths = value.__ember_observes__) {
          len = paths.length;
          for (idx=0; idx < len; idx++) {
            Ember.addObserver(obj, paths[idx], null, key);
          }
        }
      }

      if (req && req[key]) {
        req = writableReq(obj);
        req.__ember_count__--;
        req[key] = false;
      }
    }
  }

  if (!partial) { // don't apply to prototype
    finishPartial(obj, m);
  }

  // Make sure no required attrs remain
  if (!partial && req && req.__ember_count__>0) {
    var keys = [];
    for (key in req) {
      if (META_SKIP[key]) { continue; }
      keys.push(key);
    }
    // TODO: Remove surrounding if clause from production build
    Ember.assert('Required properties not defined: '+keys.join(','));
  }
  return obj;
}

/**
  @method mixin
  @for Ember
  @param obj
  @param mixins*
  @return obj
*/
Ember.mixin = function(obj) {
  var args = a_slice.call(arguments, 1);
  applyMixin(obj, args, false);
  return obj;
};

/**
  The `Ember.Mixin` class allows you to create mixins, whose properties can be
  added to other classes. For instance,

      App.Editable = Ember.Mixin.create({
        edit: function() {
          console.log('starting to edit');
          this.set('isEditing', true);
        },
        isEditing: false
      });

      // Mix mixins into classes by passing them as the first arguments to
      // .extend or .create.
      App.CommentView = Ember.View.extend(App.Editable, {
        template: Ember.Handlebars.compile('{{#if isEditing}}...{{else}}...{{/if}}')
      });

      commentView = App.CommentView.create();
      commentView.edit(); // => outputs 'starting to edit'

  Note that Mixins are created with `Ember.Mixin.create`, not
  `Ember.Mixin.extend`.

  @class Mixin
  @namespace Ember
*/
Ember.Mixin = function() { return initMixin(this, arguments); };

Mixin = Ember.Mixin;

Mixin._apply = applyMixin;

Mixin.applyPartial = function(obj) {
  var args = a_slice.call(arguments, 1);
  return applyMixin(obj, args, true);
};

Mixin.finishPartial = finishPartial;

/**
  @method create
  @static
  @param arguments*
*/
Mixin.create = function() {
  classToString.processed = false;
  var M = this;
  return initMixin(new M(), arguments);
};

var MixinPrototype = Mixin.prototype;

/**
  @method reopen
  @param arguments*
*/
MixinPrototype.reopen = function() {
  var mixin, tmp;

  if (this.properties) {
    mixin = Mixin.create();
    mixin.properties = this.properties;
    delete this.properties;
    this.mixins = [mixin];
  } else if (!this.mixins) {
    this.mixins = [];
  }

  var len = arguments.length, mixins = this.mixins, idx;

  for(idx=0; idx < len; idx++) {
    mixin = arguments[idx];
    Ember.assert('Expected hash or Mixin instance, got ' + Object.prototype.toString.call(mixin), typeof mixin === 'object' && mixin !== null && Object.prototype.toString.call(mixin) !== '[object Array]');

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

/**
  @method apply
  @param obj
  @return applied object
*/
MixinPrototype.apply = function(obj) {
  return applyMixin(obj, [this], false);
};

MixinPrototype.applyPartial = function(obj) {
  return applyMixin(obj, [this], true);
};

function _detect(curMixin, targetMixin, seen) {
  var guid = guidFor(curMixin);

  if (seen[guid]) { return false; }
  seen[guid] = true;

  if (curMixin === targetMixin) { return true; }
  var mixins = curMixin.mixins, loc = mixins ? mixins.length : 0;
  while (--loc >= 0) {
    if (_detect(mixins[loc], targetMixin, seen)) { return true; }
  }
  return false;
}

/**
  @method detect
  @param obj
  @return {Boolean}
*/
MixinPrototype.detect = function(obj) {
  if (!obj) { return false; }
  if (obj instanceof Mixin) { return _detect(obj, this, {}); }
  var mixins = Ember.meta(obj, false).mixins;
  if (mixins) {
    return !!mixins[guidFor(this)];
  }
  return false;
};

MixinPrototype.without = function() {
  var ret = new Mixin(this);
  ret._without = a_slice.call(arguments);
  return ret;
};

function _keys(ret, mixin, seen) {
  if (seen[guidFor(mixin)]) { return; }
  seen[guidFor(mixin)] = true;

  if (mixin.properties) {
    var props = mixin.properties;
    for (var key in props) {
      if (props.hasOwnProperty(key)) { ret[key] = true; }
    }
  } else if (mixin.mixins) {
    a_forEach.call(mixin.mixins, function(x) { _keys(ret, x, seen); });
  }
}

MixinPrototype.keys = function() {
  var keys = {}, seen = {}, ret = [];
  _keys(keys, this, seen);
  for(var key in keys) {
    if (keys.hasOwnProperty(key)) { ret.push(key); }
  }
  return ret;
};

/* make Mixins have nice displayNames */

var NAME_KEY = Ember.GUID_KEY+'_name';
var get = Ember.get;

function processNames(paths, root, seen) {
  var idx = paths.length;
  for(var key in root) {
    if (!root.hasOwnProperty || !root.hasOwnProperty(key)) { continue; }
    var obj = root[key];
    paths[idx] = key;

    if (obj && obj.toString === classToString) {
      obj[NAME_KEY] = paths.join('.');
    } else if (obj && get(obj, 'isNamespace')) {
      if (seen[guidFor(obj)]) { continue; }
      seen[guidFor(obj)] = true;
      processNames(paths, obj, seen);
    }
  }
  paths.length = idx; // cut out last item
}

function findNamespaces() {
  var Namespace = Ember.Namespace, obj, isNamespace;

  if (Namespace.PROCESSED) { return; }

  for (var prop in window) {
    //  get(window.globalStorage, 'isNamespace') would try to read the storage for domain isNamespace and cause exception in Firefox.
    // globalStorage is a storage obsoleted by the WhatWG storage specification. See https://developer.mozilla.org/en/DOM/Storage#globalStorage
    if (prop === "globalStorage" && window.StorageList && window.globalStorage instanceof window.StorageList) { continue; }
    // Unfortunately, some versions of IE don't support window.hasOwnProperty
    if (window.hasOwnProperty && !window.hasOwnProperty(prop)) { continue; }

    // At times we are not allowed to access certain properties for security reasons.
    // There are also times where even if we can access them, we are not allowed to access their properties.
    try {
      obj = window[prop];
      isNamespace = obj && get(obj, 'isNamespace');
    } catch (e) {
      continue;
    }

    if (isNamespace) {
      Ember.deprecate("Namespaces should not begin with lowercase.", /^[A-Z]/.test(prop));
      obj[NAME_KEY] = prop;
    }
  }
}

/**
  @private
  @method identifyNamespaces
  @for Ember
*/
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

MixinPrototype.toString = classToString;

// returns the mixins currently applied to the specified object
// TODO: Make Ember.mixin
Mixin.mixins = function(obj) {
  var ret = [], mixins = Ember.meta(obj, false).mixins, key, mixin;
  if (mixins) {
    for(key in mixins) {
      if (META_SKIP[key]) { continue; }
      mixin = mixins[key];

      // skip primitive mixins since these are always anonymous
      if (!mixin.properties) { ret.push(mixins[key]); }
    }
  }
  return ret;
};

REQUIRED = new Ember.Descriptor();
REQUIRED.toString = function() { return '(Required Property)'; };

/**
  Denotes a required property for a mixin

  @method required
  @for Ember
*/
Ember.required = function() {
  return REQUIRED;
};

Alias = function(methodName) {
  this.methodName = methodName;
};
Alias.prototype = new Ember.Descriptor();

/**
  Makes a property or method available via an additional name.

      App.PaintSample = Ember.Object.extend({
        color: 'red',
        colour: Ember.alias('color'),
        name: function(){
          return "Zed";
        },
        moniker: Ember.alias("name")
      });
      var paintSample = App.PaintSample.create()
      paintSample.get('colour'); //=> 'red'
      paintSample.moniker(); //=> 'Zed'

  @method alias
  @for Ember
  @param {String} methodName name of the method or property to alias
  @return {Ember.Descriptor}
*/
Ember.alias = function(methodName) {
  return new Alias(methodName);
};

// ..........................................................
// OBSERVER HELPER
//

/**
  @method observer
  @for Ember
  @param {Function} func
  @param {String} propertyNames*
  @return func
*/
Ember.observer = function(func) {
  var paths = a_slice.call(arguments, 1);
  func.__ember_observes__ = paths;
  return func;
};

// If observers ever become asynchronous, Ember.immediateObserver
// must remain synchronous.
/**
  @method immediateObserver
  @for Ember
  @param {Function} func
  @param {String} propertyNames*
  @return func
*/
Ember.immediateObserver = function() {
  for (var i=0, l=arguments.length; i<l; i++) {
    var arg = arguments[i];
    Ember.assert("Immediate observers must observe internal properties only, not properties on other objects.", typeof arg !== "string" || arg.indexOf('.') === -1);
  }

  return Ember.observer.apply(this, arguments);
};

/**
  @method beforeObserver
  @for Ember
  @param {Function} func
  @param {String} propertyNames*
  @return func
*/
Ember.beforeObserver = function(func) {
  var paths = a_slice.call(arguments, 1);
  func.__ember_observesBefore__ = paths;
  return func;
};
