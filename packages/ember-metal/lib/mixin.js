'no use strict';
// Remove "use strict"; from transpiled module until
// https://bugs.webkit.org/show_bug.cgi?id=138038 is fixed

/**
@module ember
@submodule ember-metal
*/
import EmberError from 'ember-metal/error';
import { debugSeal, assert, deprecate, runInDebug } from 'ember-metal/debug';
import assign from 'ember-metal/assign';
import {
  guidFor,
  GUID_KEY,
  wrap,
  makeArray
} from 'ember-metal/utils';
import { meta as metaFor, peekMeta } from 'ember-metal/meta';
import expandProperties from 'ember-metal/expand_properties';
import {
  Descriptor,
  defineProperty
} from 'ember-metal/properties';
import { ComputedProperty } from 'ember-metal/computed';
import { Binding } from 'ember-metal/binding';
import {
  addObserver,
  removeObserver,
  _addBeforeObserver,
  _removeBeforeObserver
} from 'ember-metal/observer';
import {
  addListener,
  removeListener
} from 'ember-metal/events';

function ROOT() {}
ROOT.__hasSuper = false;

var REQUIRED;
var a_slice = [].slice;

function isMethod(obj) {
  return 'function' === typeof obj &&
         obj.isMethod !== false &&
         obj !== Boolean &&
         obj !== Object &&
         obj !== Number &&
         obj !== Array &&
         obj !== Date &&
         obj !== String;
}

var CONTINUE = {};

function mixinProperties(mixinsMeta, mixin) {
  var guid;

  if (mixin instanceof Mixin) {
    guid = guidFor(mixin);
    if (mixinsMeta.peekMixins(guid)) { return CONTINUE; }
    mixinsMeta.writeMixins(guid, mixin);
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

function giveDescriptorSuper(meta, key, property, values, descs, base) {
  var superProperty;

  // Computed properties override methods, and do not call super to them
  if (values[key] === undefined) {
    // Find the original descriptor in a parent mixin
    superProperty = descs[key];
  }

  // If we didn't find the original descriptor in a parent mixin, find
  // it on the original object.
  if (!superProperty) {
    var possibleDesc = base[key];
    var superDesc = (possibleDesc !== null && typeof possibleDesc === 'object' && possibleDesc.isDescriptor) ? possibleDesc : undefined;

    superProperty = superDesc;
  }

  if (superProperty === undefined || !(superProperty instanceof ComputedProperty)) {
    return property;
  }

  // Since multiple mixins may inherit from the same parent, we need
  // to clone the computed property so that other mixins do not receive
  // the wrapped version.
  property = Object.create(property);
  property._getter = wrap(property._getter, superProperty._getter);
  if (superProperty._setter) {
    if (property._setter) {
      property._setter = wrap(property._setter, superProperty._setter);
    } else {
      property._setter = superProperty._setter;
    }
  }

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
  if (superMethod === undefined || 'function' !== typeof superMethod) {
    return method;
  }

  return wrap(method, superMethod);
}

function applyConcatenatedProperties(obj, key, value, values) {
  var baseValue = values[key] || obj[key];

  if (baseValue) {
    if ('function' === typeof baseValue.concat) {
      if (value === null || value === undefined) {
        return baseValue;
      } else {
        return baseValue.concat(value);
      }
    } else {
      return makeArray(baseValue).concat(value);
    }
  } else {
    return makeArray(value);
  }
}

function applyMergedProperties(obj, key, value, values) {
  var baseValue = values[key] || obj[key];

  runInDebug(function() {
    if (Array.isArray(value)) { // use conditional to avoid stringifying every time
      assert(`You passed in \`${JSON.stringify(value)}\` as the value for \`${key}\` but \`${key}\` cannot be an Array`, false);
    }
  });

  if (!baseValue) { return value; }

  var newBase = assign({}, baseValue);
  var hasFunction = false;

  for (var prop in value) {
    if (!value.hasOwnProperty(prop)) { continue; }

    var propValue = value[prop];
    if (isMethod(propValue)) {
      // TODO: support for Computed Properties, etc?
      hasFunction = true;
      newBase[prop] = giveMethodSuper(obj, prop, propValue, baseValue, {});
    } else {
      newBase[prop] = propValue;
    }
  }

  if (hasFunction) {
    newBase._super = ROOT;
  }

  return newBase;
}

function addNormalizedProperty(base, key, value, meta, descs, values, concats, mergings) {
  if (value instanceof Descriptor) {
    if (value === REQUIRED && descs[key]) { return CONTINUE; }

    // Wrap descriptor function to implement
    // _super() if needed
    if (value._getter) {
      value = giveDescriptorSuper(meta, key, value, values, descs, base);
    }

    descs[key]  = value;
    values[key] = undefined;
  } else {
    if ((concats && concats.indexOf(key) >= 0) ||
                key === 'concatenatedProperties' ||
                key === 'mergedProperties') {
      value = applyConcatenatedProperties(base, key, value, values);
    } else if ((mergings && mergings.indexOf(key) >= 0)) {
      value = applyMergedProperties(base, key, value, values);
    } else if (isMethod(value)) {
      value = giveMethodSuper(base, key, value, values, descs);
    }

    descs[key] = undefined;
    values[key] = value;
  }
}

function mergeMixins(mixins, m, descs, values, base, keys) {
  var currentMixin, props, key, concats, mergings, meta;

  function removeKeys(keyName) {
    delete descs[keyName];
    delete values[keyName];
  }

  for (var i = 0; i < mixins.length; i++) {
    currentMixin = mixins[i];
    assert(
      `Expected hash or Mixin instance, got ${Object.prototype.toString.call(currentMixin)}`,
      typeof currentMixin === 'object' && currentMixin !== null && Object.prototype.toString.call(currentMixin) !== '[object Array]'
    );

    props = mixinProperties(m, currentMixin);
    if (props === CONTINUE) { continue; }

    if (props) {
      meta = metaFor(base);
      if (base.willMergeMixin) { base.willMergeMixin(props); }
      concats = concatenatedMixinProperties('concatenatedProperties', props, values, base);
      mergings = concatenatedMixinProperties('mergedProperties', props, values, base);

      for (key in props) {
        if (!props.hasOwnProperty(key)) { continue; }
        keys.push(key);
        addNormalizedProperty(base, key, props[key], meta, descs, values, concats, mergings);
      }

      // manually copy toString() because some JS engines do not enumerate it
      if (props.hasOwnProperty('toString')) { base.toString = props.toString; }
    } else if (currentMixin.mixins) {
      mergeMixins(currentMixin.mixins, m, descs, values, base, keys);
      if (currentMixin._without) { currentMixin._without.forEach(removeKeys); }
    }
  }
}

var IS_BINDING = /^.+Binding$/;

function detectBinding(obj, key, value, m) {
  if (IS_BINDING.test(key)) {
    m.writeBindings(key, value);
  }
}

function connectBindings(obj, m) {
  // TODO Mixin.apply(instance) should disconnect binding if exists
  m.forEachBindings((key, binding) => {
    if (binding) {
      let to = key.slice(0, -7); // strip Binding off end
      if (binding instanceof Binding) {
        binding = binding.copy(); // copy prototypes' instance
        binding.to(to);
      } else { // binding is string path
        binding = new Binding(to, binding);
      }
      binding.connect(obj);
      obj[key] = binding;
    }
  });
  // mark as applied
  m.clearBindings();
}

function finishPartial(obj, m) {
  connectBindings(obj, m || metaFor(obj));
  return obj;
}

function followAlias(obj, desc, m, descs, values) {
  var altKey = desc.methodName;
  var value;
  var possibleDesc;
  if (descs[altKey] || values[altKey]) {
    value = values[altKey];
    desc  = descs[altKey];
  } else if ((possibleDesc = obj[altKey]) && possibleDesc !== null && typeof possibleDesc === 'object' && possibleDesc.isDescriptor) {
    desc  = possibleDesc;
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
    for (var i = 0; i < paths.length; i++) {
      updateMethod(obj, paths[i], null, key);
    }
  }
}

function replaceObserversAndListeners(obj, key, observerOrListener) {
  var prev = obj[key];

  if ('function' === typeof prev) {
    updateObserversAndListeners(obj, key, prev, '__ember_observesBefore__', _removeBeforeObserver);
    updateObserversAndListeners(obj, key, prev, '__ember_observes__', removeObserver);
    updateObserversAndListeners(obj, key, prev, '__ember_listens__', removeListener);
  }

  if ('function' === typeof observerOrListener) {
    updateObserversAndListeners(obj, key, observerOrListener, '__ember_observesBefore__', _addBeforeObserver);
    updateObserversAndListeners(obj, key, observerOrListener, '__ember_observes__', addObserver);
    updateObserversAndListeners(obj, key, observerOrListener, '__ember_listens__', addListener);
  }
}

function applyMixin(obj, mixins, partial) {
  var descs = {};
  var values = {};
  var m = metaFor(obj);
  var keys = [];
  var key, value, desc;

  obj._super = ROOT;

  // Go through all mixins and hashes passed in, and:
  //
  // * Handle concatenated properties
  // * Handle merged properties
  // * Set up _super wrapping if necessary
  // * Set up computed property descriptors
  // * Copying `toString` in broken browsers
  mergeMixins(mixins, m, descs, values, obj, keys);

  for (var i = 0; i < keys.length; i++) {
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
  @private
*/
export function mixin(obj, ...args) {
  applyMixin(obj, args, false);
  return obj;
}

export const NAME_KEY = GUID_KEY + '_name';

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
  If you want to define a property in a mixin that is not shared, you can define
  it either as a computed property or have it be created on initialization of the object.

  ```javascript
  //filters array will be shared amongst any object implementing mixin
  App.Filterable = Ember.Mixin.create({
    filters: Ember.A()
  });

  //filters will be a separate  array for every object implementing the mixin
  App.Filterable = Ember.Mixin.create({
    filters: Ember.computed(function() {return Ember.A();})
  });

  //filters will be created as a separate array during the object's initialization
  App.Filterable = Ember.Mixin.create({
    init: function() {
      this._super(...arguments);
      this.set("filters", Ember.A());
    }
  });
  ```

  @class Mixin
  @namespace Ember
  @public
*/
export default function Mixin(args, properties) {
  this.properties = properties;

  var length = args && args.length;

  if (length > 0) {
    var m = new Array(length);

    for (var i = 0; i < length; i++) {
      var x = args[i];
      if (x instanceof Mixin) {
        m[i] = x;
      } else {
        m[i] = new Mixin(undefined, x);
      }
    }

    this.mixins = m;
  } else {
    this.mixins = undefined;
  }
  this.ownerConstructor = undefined;
  this._without = undefined;
  this[GUID_KEY] = null;
  this[NAME_KEY] = null;
  debugSeal(this);
}

Mixin._apply = applyMixin;

Mixin.applyPartial = function(obj) {
  var args = a_slice.call(arguments, 1);
  return applyMixin(obj, args, true);
};

Mixin.finishPartial = finishPartial;

let unprocessedFlag = false;

export function hasUnprocessedMixins() {
  return unprocessedFlag;
}

export function clearUnprocessedMixins() {
  unprocessedFlag = false;
}

/**
  @method create
  @static
  @param arguments*
  @public
*/
Mixin.create = function(...args) {
  // ES6TODO: this relies on a global state?
  unprocessedFlag = true;
  var M = this;
  return new M(args, undefined);
};

var MixinPrototype = Mixin.prototype;


/**
  @method reopen
  @param arguments*
  @private
*/
MixinPrototype.reopen = function() {
  var currentMixin;

  if (this.properties) {
    currentMixin = new Mixin(undefined, this.properties);
    this.properties = undefined;
    this.mixins = [currentMixin];
  } else if (!this.mixins) {
    this.mixins = [];
  }

  var mixins = this.mixins;
  var idx;

  for (idx = 0; idx < arguments.length; idx++) {
    currentMixin = arguments[idx];
    assert(
      `Expected hash or Mixin instance, got ${Object.prototype.toString.call(currentMixin)}`,
      typeof currentMixin === 'object' && currentMixin !== null &&
        Object.prototype.toString.call(currentMixin) !== '[object Array]'
    );

    if (currentMixin instanceof Mixin) {
      mixins.push(currentMixin);
    } else {
      mixins.push(new Mixin(undefined, currentMixin));
    }
  }

  return this;
};

/**
  @method apply
  @param obj
  @return applied object
  @private
*/
MixinPrototype.apply = function(obj) {
  return applyMixin(obj, [this], false);
};

MixinPrototype.applyPartial = function(obj) {
  return applyMixin(obj, [this], true);
};

MixinPrototype.toString = Object.toString;

function _detect(curMixin, targetMixin, seen) {
  var guid = guidFor(curMixin);

  if (seen[guid]) { return false; }
  seen[guid] = true;

  if (curMixin === targetMixin) { return true; }
  var mixins = curMixin.mixins;
  var loc = mixins ? mixins.length : 0;
  while (--loc >= 0) {
    if (_detect(mixins[loc], targetMixin, seen)) { return true; }
  }
  return false;
}

/**
  @method detect
  @param obj
  @return {Boolean}
  @private
*/
MixinPrototype.detect = function(obj) {
  if (!obj) { return false; }
  if (obj instanceof Mixin) { return _detect(obj, this, {}); }
  var m = peekMeta(obj);
  if (!m) { return false; }
  return !!m.peekMixins(guidFor(this));
};

MixinPrototype.without = function(...args) {
  var ret = new Mixin([this]);
  ret._without = args;
  return ret;
};

function _keys(ret, mixin, seen) {
  if (seen[guidFor(mixin)]) { return; }
  seen[guidFor(mixin)] = true;

  if (mixin.properties) {
    var props = Object.keys(mixin.properties);
    for (var i = 0; i < props.length; i++) {
      var key = props[i];
      ret[key] = true;
    }
  } else if (mixin.mixins) {
    mixin.mixins.forEach((x) => _keys(ret, x, seen));
  }
}

MixinPrototype.keys = function() {
  var keys = {};
  var seen = {};

  _keys(keys, this, seen);
  var ret = Object.keys(keys);
  return ret;
};

debugSeal(MixinPrototype);

// returns the mixins currently applied to the specified object
// TODO: Make Ember.mixin
Mixin.mixins = function(obj) {
  var m = peekMeta(obj);
  var ret = [];
  if (!m) { return ret; }

  m.forEachMixins((key, currentMixin) => {
    // skip primitive mixins since these are always anonymous
    if (!currentMixin.properties) { ret.push(currentMixin); }
  });

  return ret;
};

REQUIRED = new Descriptor();
REQUIRED.toString = function() { return '(Required Property)'; };

/**
  Denotes a required property for a mixin

  @method required
  @for Ember
  @private
*/
export function required() {
  deprecate(
    'Ember.required is deprecated as its behavior is inconsistent and unreliable.',
    false,
    { id: 'ember-metal.required', until: '3.0.0' }
  );
  return REQUIRED;
}

function Alias(methodName) {
  this.isDescriptor = true;
  this.methodName = methodName;
}

Alias.prototype = new Descriptor();

/**
  Makes a method available via an additional name.

  ```javascript
  App.Person = Ember.Object.extend({
    name: function() {
      return 'Tomhuda Katzdale';
    },
    moniker: Ember.aliasMethod('name')
  });

  var goodGuy = App.Person.create();

  goodGuy.name();    // 'Tomhuda Katzdale'
  goodGuy.moniker(); // 'Tomhuda Katzdale'
  ```

  @method aliasMethod
  @for Ember
  @param {String} methodName name of the method to alias
  @public
*/
export function aliasMethod(methodName) {
  return new Alias(methodName);
}

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

  Also available as `Function.prototype.observes` if prototype extensions are
  enabled.

  @method observer
  @for Ember
  @param {String} propertyNames*
  @param {Function} func
  @return func
  @public
*/
export function observer(...args) {
  var func  = args.slice(-1)[0];
  var paths;

  var addWatchedProperty = function(path) {
    paths.push(path);
  };
  var _paths = args.slice(0, -1);

  if (typeof func !== 'function') {
    // revert to old, soft-deprecated argument ordering
    deprecate('Passing the dependentKeys after the callback function in Ember.observer is deprecated. Ensure the callback function is the last argument.', false, { id: 'ember-metal.observer-argument-order', until: '3.0.0' });

    func  = args[0];
    _paths = args.slice(1);
  }

  paths = [];

  for (var i = 0; i < _paths.length; ++i) {
    expandProperties(_paths[i], addWatchedProperty);
  }

  if (typeof func !== 'function') {
    throw new EmberError('Ember.observer called without a function');
  }

  func.__ember_observes__ = paths;
  return func;
}

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

  @method _immediateObserver
  @for Ember
  @param {String} propertyNames*
  @param {Function} func
  @deprecated Use `Ember.observer` instead.
  @return func
  @private
*/
export function _immediateObserver() {
  deprecate('Usage of `Ember.immediateObserver` is deprecated, use `Ember.observer` instead.', false, { id: 'ember-metal.immediate-observer', until: '3.0.0' });

  for (var i = 0; i < arguments.length; i++) {
    var arg = arguments[i];
    assert(
      'Immediate observers must observe internal properties only, not properties on other objects.',
      typeof arg !== 'string' || arg.indexOf('.') === -1
    );
  }

  return observer.apply(this, arguments);
}

/**
  When observers fire, they are called with the arguments `obj`, `keyName`.

  Note, `@each.property` observer is called per each add or replace of an element
  and it's not called with a specific enumeration item.

  A `_beforeObserver` fires before a property changes.

  A `_beforeObserver` is an alternative form of `.observesBefore()`.

  ```javascript
  App.PersonView = Ember.View.extend({
    friends: [{ name: 'Tom' }, { name: 'Stefan' }, { name: 'Kris' }],

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
  @deprecated
  @private
*/
export function _beforeObserver(...args) {
  var func  = args.slice(-1)[0];
  var paths;

  var addWatchedProperty = function(path) { paths.push(path); };

  var _paths = args.slice(0, -1);

  if (typeof func !== 'function') {
    // revert to old, soft-deprecated argument ordering

    func  = args[0];
    _paths = args.slice(1);
  }

  paths = [];

  for (var i = 0; i < _paths.length; ++i) {
    expandProperties(_paths[i], addWatchedProperty);
  }

  if (typeof func !== 'function') {
    throw new EmberError('Ember.beforeObserver called without a function');
  }

  func.__ember_observesBefore__ = paths;
  return func;
}

export {
  IS_BINDING,
  Mixin,
  required,
  REQUIRED
};
