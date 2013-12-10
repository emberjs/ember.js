require('ember-metal/core');
require('ember-metal/property_get');
require('ember-metal/computed');
require('ember-metal/properties');
require('ember-metal/expand_properties');
require('ember-metal/observer');
require('ember-metal/utils');
require('ember-metal/array');
require('ember-metal/binding');

/**
@module ember
@submodule ember-metal
*/

var Mixin, REQUIRED, Alias,
    a_map = Ember.ArrayPolyfills.map,
    a_indexOf = Ember.ArrayPolyfills.indexOf,
    a_forEach = Ember.ArrayPolyfills.forEach,
    a_slice = [].slice,
    o_create = Ember.create,
    defineProperty = Ember.defineProperty,
    guidFor = Ember.guidFor;

if (Ember.FEATURES.isEnabled('propertyBraceExpansion')) {
  var expandProperties = Ember.expandProperties;
}

function mixinsMeta(obj) {
  var m = Ember.meta(obj, true), ret = m.mixins;
  if (!ret) {
    ret = m.mixins = {};
  } else if (!m.hasOwnProperty('mixins')) {
    ret = m.mixins = o_create(ret);
  }
  return ret;
}

function initMixin(mixin, args) {
  if (args && args.length > 0) {
    mixin.mixins = a_map.call(args, function(x) {
      if (x instanceof Mixin) { return x; }

      // Note: Manually setup a primitive mixin here. This is the only
      // way to actually get a primitive mixin. This way normal creation
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

var CONTINUE = {};

function mixinProperties(mixinsMeta, mixin) {
  var guid;

  if (mixin instanceof Mixin) {
    guid = guidFor(mixin);
    if (mixinsMeta[guid]) { return CONTINUE; }
    mixinsMeta[guid] = mixin;
    return mixin.properties;
  } else {
    return mixin; // apply anonymous mixin properties
  }
}

function concatenatedMixinProperties(concatProp, props, values, base) {
  var concats;

  // reset before adding each new mixin to pickup concats from previous
  concats = values[concatProp] || base[concatProp];
  if (props[concatProp]) {
    concats = concats ? concats.concat(props[concatProp]) : props[concatProp];
  }

  return concats;
}

function giveDescriptorSuper(meta, key, property, values, descs) {
  var superProperty;

  // Computed properties override methods, and do not call super to them
  if (values[key] === undefined) {
    // Find the original descriptor in a parent mixin
    superProperty = descs[key];
  }

  // If we didn't find the original descriptor in a parent mixin, find
  // it on the original object.
  superProperty = superProperty || meta.descs[key];

  if (!superProperty || !(superProperty instanceof Ember.ComputedProperty)) {
    return property;
  }

  // Since multiple mixins may inherit from the same parent, we need
  // to clone the computed property so that other mixins do not receive
  // the wrapped version.
  property = o_create(property);
  property.func = Ember.wrap(property.func, superProperty.func);

  return property;
}

function giveMethodSuper(obj, key, method, values, descs) {
  var superMethod;

  // Methods overwrite computed properties, and do not call super to them.
  if (descs[key] === undefined) {
    // Find the original method in a parent mixin
    superMethod = values[key];
  }

  // If we didn't find the original value in a parent mixin, find it in
  // the original object
  superMethod = superMethod || obj[key];

  // Only wrap the new method if the original method was a function
  if ('function' !== typeof superMethod) {
    return method;
  }

  return Ember.wrap(method, superMethod);
}

function applyConcatenatedProperties(obj, key, value, values) {
  var baseValue = values[key] || obj[key];

  if (baseValue) {
    if ('function' === typeof baseValue.concat) {
      return baseValue.concat(value);
    } else {
      return Ember.makeArray(baseValue).concat(value);
    }
  } else {
    return Ember.makeArray(value);
  }
}

function applyMergedProperties(obj, key, value, values) {
  var baseValue = values[key] || obj[key];

  if (!baseValue) { return value; }

  var newBase = Ember.merge({}, baseValue);
  for (var prop in value) {
    if (!value.hasOwnProperty(prop)) { continue; }

    var propValue = value[prop];
    if (isMethod(propValue)) {
      // TODO: support for Computed Properties, etc?
      newBase[prop] = giveMethodSuper(obj, prop, propValue, baseValue, {});
    } else {
      newBase[prop] = propValue;
    }
  }

  return newBase;
}

function addNormalizedProperty(base, key, value, meta, descs, values, concats, mergings) {
  if (value instanceof Ember.Descriptor) {
    if (value === REQUIRED && descs[key]) { return CONTINUE; }

    // Wrap descriptor function to implement
    // _super() if needed
    if (value.func) {
      value = giveDescriptorSuper(meta, key, value, values, descs);
    }

    descs[key]  = value;
    values[key] = undefined;
  } else {
    if ((concats && a_indexOf.call(concats, key) >= 0) ||
                key === 'concatenatedProperties' ||
                key === 'mergedProperties') {
      value = applyConcatenatedProperties(base, key, value, values);
    } else if ((mergings && a_indexOf.call(mergings, key) >= 0)) {
      value = applyMergedProperties(base, key, value, values);
    } else if (isMethod(value)) {
      value = giveMethodSuper(base, key, value, values, descs);
    }

    descs[key] = undefined;
    values[key] = value;
  }
}

function mergeMixins(mixins, m, descs, values, base, keys) {
  var mixin, props, key, concats, mergings, meta;

  function removeKeys(keyName) {
    delete descs[keyName];
    delete values[keyName];
  }

  for(var i=0, l=mixins.length; i<l; i++) {
    mixin = mixins[i];
    Ember.assert('Expected hash or Mixin instance, got ' + Object.prototype.toString.call(mixin), typeof mixin === 'object' && mixin !== null && Object.prototype.toString.call(mixin) !== '[object Array]');

    props = mixinProperties(m, mixin);
    if (props === CONTINUE) { continue; }

    if (props) {
      meta = Ember.meta(base);
      if (mixin.willMergeMixin) { mixin.willMergeMixin(props, base); }
      concats = concatenatedMixinProperties('concatenatedProperties', props, values, base);
      mergings = concatenatedMixinProperties('mergedProperties', props, values, base);

      for (key in props) {
        if (!props.hasOwnProperty(key)) { continue; }
        keys.push(key);
        addNormalizedProperty(base, key, props[key], meta, descs, values, concats, mergings);
      }

      // manually copy toString() because some JS engines do not enumerate it
      if (props.hasOwnProperty('toString')) { base.toString = props.toString; }
    } else if (mixin.mixins) {
      mergeMixins(mixin.mixins, m, descs, values, base, keys);
      if (mixin._without) { a_forEach.call(mixin._without, removeKeys); }
    }
  }
}

var IS_BINDING = Ember.IS_BINDING = /^.+Binding$/;

function detectBinding(obj, key, value, m) {
  if (IS_BINDING.test(key)) {
    var bindings = m.bindings;
    if (!bindings) {
      bindings = m.bindings = {};
    } else if (!m.hasOwnProperty('bindings')) {
      bindings = m.bindings = o_create(m.bindings);
    }
    bindings[key] = value;
  }
}

function connectBindings(obj, m) {
  // TODO Mixin.apply(instance) should disconnect binding if exists
  var bindings = m.bindings, key, binding, to;
  if (bindings) {
    for (key in bindings) {
      binding = bindings[key];
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
    m.bindings = {};
  }
}

function finishPartial(obj, m) {
  connectBindings(obj, m || Ember.meta(obj));
  return obj;
}

function followAlias(obj, desc, m, descs, values) {
  var altKey = desc.methodName, value;
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

  return { desc: desc, value: value };
}

function updateObserversAndListeners(obj, key, observerOrListener, pathsKey, updateMethod) {
  var paths = observerOrListener[pathsKey];

  if (paths) {
    for (var i=0, l=paths.length; i<l; i++) {
      Ember[updateMethod](obj, paths[i], null, key);
    }
  }
}

function replaceObserversAndListeners(obj, key, observerOrListener) {
  var prev = obj[key];

  if ('function' === typeof prev) {
    updateObserversAndListeners(obj, key, prev, '__ember_observesBefore__', 'removeBeforeObserver');
    updateObserversAndListeners(obj, key, prev, '__ember_observes__', 'removeObserver');
    updateObserversAndListeners(obj, key, prev, '__ember_listens__', 'removeListener');
  }

  if ('function' === typeof observerOrListener) {
    updateObserversAndListeners(obj, key, observerOrListener, '__ember_observesBefore__', 'addBeforeObserver');
    updateObserversAndListeners(obj, key, observerOrListener, '__ember_observes__', 'addObserver');
    updateObserversAndListeners(obj, key, observerOrListener, '__ember_listens__', 'addListener');
  }
}

function applyMixin(obj, mixins, partial) {
  var descs = {}, values = {}, m = Ember.meta(obj),
      key, value, desc, keys = [];

  // Go through all mixins and hashes passed in, and:
  //
  // * Handle concatenated properties
  // * Handle merged properties
  // * Set up _super wrapping if necessary
  // * Set up computed property descriptors
  // * Copying `toString` in broken browsers
  mergeMixins(mixins, mixinsMeta(obj), descs, values, obj, keys);

  for(var i = 0, l = keys.length; i < l; i++) {
    key = keys[i];
    if (key === 'constructor' || !values.hasOwnProperty(key)) { continue; }

    desc = descs[key];
    value = values[key];

    if (desc === REQUIRED) { continue; }

    while (desc && desc instanceof Alias) {
      var followed = followAlias(obj, desc, m, descs, values);
      desc = followed.desc;
      value = followed.value;
    }

    if (desc === undefined && value === undefined) { continue; }

    replaceObserversAndListeners(obj, key, value);
    detectBinding(obj, key, value, m);
    defineProperty(obj, key, desc, value, m);
  }

  if (!partial) { // don't apply to prototype
    finishPartial(obj, m);
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

  ```javascript
  App.Editable = Ember.Mixin.create({
    edit: function() {
      console.log('starting to edit');
      this.set('isEditing', true);
    },
    isEditing: false
  });

  // Mix mixins into classes by passing them as the first arguments to
  // .extend.
  App.CommentView = Ember.View.extend(App.Editable, {
    template: Ember.Handlebars.compile('{{#if view.isEditing}}...{{else}}...{{/if}}')
  });

  commentView = App.CommentView.create();
  commentView.edit(); // outputs 'starting to edit'
  ```

  Note that Mixins are created with `Ember.Mixin.create`, not
  `Ember.Mixin.extend`.

  Note that mixins extend a constructor's prototype so arrays and object literals
  defined as properties will be shared amongst objects that implement the mixin.
  If you want to define an property in a mixin that is not shared, you can define
  it either as a computed property or have it be created on initialization of the object.

  ```javascript
  //filters array will be shared amongst any object implementing mixin
  App.Filterable = Ember.Mixin.create({
    filters: Ember.A()
  });

  //filters will be a separate  array for every object implementing the mixin
  App.Filterable = Ember.Mixin.create({
    filters: Ember.computed(function(){return Ember.A();})
  });

  //filters will be created as a separate array during the object's initialization
  App.Filterable = Ember.Mixin.create({
    init: function() {
      this._super();
      this.set("filters", Ember.A());
    }
  });
  ```

  @class Mixin
  @namespace Ember
*/
Ember.Mixin = function() { return initMixin(this, arguments); };

Mixin = Ember.Mixin;

Mixin.prototype = {
  properties: null,
  mixins: null,
  ownerConstructor: null
};

Mixin._apply = applyMixin;

Mixin.applyPartial = function(obj) {
  var args = a_slice.call(arguments, 1);
  return applyMixin(obj, args, true);
};

Mixin.finishPartial = finishPartial;

Ember.anyUnprocessedMixins = false;

/**
  @method create
  @static
  @param arguments*
*/
Mixin.create = function() {
  Ember.anyUnprocessedMixins = true;
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

// returns the mixins currently applied to the specified object
// TODO: Make Ember.mixin
Mixin.mixins = function(obj) {
  var mixins = Ember.meta(obj, false).mixins, ret = [];

  if (!mixins) { return ret; }

  for (var key in mixins) {
    var mixin = mixins[key];

    // skip primitive mixins since these are always anonymous
    if (!mixin.properties) { ret.push(mixin); }
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
  Makes a method available via an additional name.

  ```javascript
  App.Person = Ember.Object.extend({
    name: function() {
      return 'Tomhuda Katzdale';
    },
    moniker: Ember.aliasMethod('name')
  });

  var goodGuy = App.Person.create()
  ```

  @method aliasMethod
  @for Ember
  @param {String} methodName name of the method to alias
  @return {Ember.Descriptor}
*/
Ember.aliasMethod = function(methodName) {
  return new Alias(methodName);
};

// ..........................................................
// OBSERVER HELPER
//

/**
  Specify a method that observes property changes.

  ```javascript
  Ember.Object.extend({
    valueObserver: Ember.observer('value', function() {
      // Executes whenever the "value" property changes
    })
  });
  ```

  In the future this method may become asynchronous. If you want to ensure
  synchronous behavior, use `immediateObserver`.

  Also available as `Function.prototype.observes` if prototype extensions are
  enabled.

  @method observer
  @for Ember
  @param {String} propertyNames*
  @param {Function} func
  @return func
*/
Ember.observer = function() {
  var func  = a_slice.call(arguments, -1)[0];
  var paths;

  if (Ember.FEATURES.isEnabled('propertyBraceExpansion')) {
    var addWatchedProperty = function (path) { paths.push(path); };
    var _paths = a_slice.call(arguments, 0, -1);

    if (typeof func !== "function") {
      // revert to old, soft-deprecated argument ordering

      func  = arguments[0];
      _paths = a_slice.call(arguments, 1);
    }

    paths = [];

    for (var i=0; i<_paths.length; ++i) {
      expandProperties(_paths[i], addWatchedProperty);
    }
  } else {
    paths = a_slice.call(arguments, 0, -1);

    if (typeof func !== "function") {
      // revert to old, soft-deprecated argument ordering

      func  = arguments[0];
      paths = a_slice.call(arguments, 1);
    }
  }

  if (typeof func !== "function") {
    throw new Ember.Error("Ember.observer called without a function");
  }

  func.__ember_observes__ = paths;
  return func;
};

/**
  Specify a method that observes property changes.

  ```javascript
  Ember.Object.extend({
    valueObserver: Ember.immediateObserver('value', function() {
      // Executes whenever the "value" property changes
    })
  });
  ```

  In the future, `Ember.observer` may become asynchronous. In this event,
  `Ember.immediateObserver` will maintain the synchronous behavior.

  Also available as `Function.prototype.observesImmediately` if prototype extensions are
  enabled.

  @method immediateObserver
  @for Ember
  @param {String} propertyNames*
  @param {Function} func
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
  When observers fire, they are called with the arguments `obj`, `keyName`.

  Note, `@each.property` observer is called per each add or replace of an element
  and it's not called with a specific enumeration item.

  A `beforeObserver` fires before a property changes.

  A `beforeObserver` is an alternative form of `.observesBefore()`.

  ```javascript
  App.PersonView = Ember.View.extend({

    friends: [{ name: 'Tom' }, { name: 'Stefan' }, { name: 'Kris' }],

    valueWillChange: Ember.beforeObserver('content.value', function(obj, keyName) {
      this.changingFrom = obj.get(keyName);
    }),

    valueDidChange: Ember.observer('content.value', function(obj, keyName) {
        // only run if updating a value already in the DOM
        if (this.get('state') === 'inDOM') {
          var color = obj.get(keyName) > this.changingFrom ? 'green' : 'red';
          // logic
        }
    }),

    friendsDidChange: Ember.observer('friends.@each.name', function(obj, keyName) {
      // some logic
      // obj.get(keyName) returns friends array
    })
  });
  ```

  Also available as `Function.prototype.observesBefore` if prototype extensions are
  enabled.

  @method beforeObserver
  @for Ember
  @param {String} propertyNames*
  @param {Function} func
  @return func
*/
Ember.beforeObserver = function() {
  var func  = a_slice.call(arguments, -1)[0];
  var paths;

  if (Ember.FEATURES.isEnabled('propertyBraceExpansion')) {
    var addWatchedProperty = function(path) { paths.push(path); };

    var _paths = a_slice.call(arguments, 0, -1);

    if (typeof func !== "function") {
      // revert to old, soft-deprecated argument ordering

      func  = arguments[0];
      _paths = a_slice.call(arguments, 1);
    }

    paths = [];

    for (var i=0; i<_paths.length; ++i) {
      expandProperties(_paths[i], addWatchedProperty);
    }
  } else {
    paths = a_slice.call(arguments, 0, -1);

    if (typeof func !== "function") {
      // revert to old, soft-deprecated argument ordering

      func  = arguments[0];
      paths = a_slice.call(arguments, 1);
    }
  }

  if (typeof func !== "function") {
    throw new Ember.Error("Ember.beforeObserver called without a function");
  }

  func.__ember_observesBefore__ = paths;
  return func;
};
