/**
@module @ember/object
*/
import { EMBER_METAL_ES5_GETTERS } from 'ember/features';
import {
  assign,
  guidFor,
  NAME_KEY,
  ROOT,
  wrap,
  makeArray
} from 'ember-utils';
import {
  assert,
  deprecate
} from 'ember-debug';
import { DEBUG } from 'ember-env-flags';
import { ENV } from 'ember-environment';
import { descriptorFor, meta as metaFor, peekMeta } from './meta';
import expandProperties from './expand_properties';
import {
  Descriptor,
  defineProperty
} from './properties';
import { ComputedProperty } from './computed';
import {
  addObserver,
  removeObserver
} from './observer';
import {
  addListener,
  removeListener
} from './events';

const a_concat = Array.prototype.concat;
const { isArray } = Array;

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

const CONTINUE = {};

function mixinProperties(mixinsMeta, mixin) {
  if (mixin instanceof Mixin) {
    let guid = guidFor(mixin);
    if (mixinsMeta.peekMixins(guid)) { return CONTINUE; }
    mixinsMeta.writeMixins(guid, mixin);
    return mixin.properties;
  } else {
    return mixin; // apply anonymous mixin properties
  }
}

function concatenatedMixinProperties(concatProp, props, values, base) {
  // reset before adding each new mixin to pickup concats from previous
  let concats = values[concatProp] || base[concatProp];
  if (props[concatProp]) {
    concats = concats ? a_concat.call(concats, props[concatProp]) : props[concatProp];
  }
  return concats;
}

function giveDescriptorSuper(meta, key, property, values, descs, base) {
  let superProperty;

  // Computed properties override methods, and do not call super to them
  if (values[key] === undefined) {
    // Find the original descriptor in a parent mixin
    superProperty = descs[key];
  }

  // If we didn't find the original descriptor in a parent mixin, find
  // it on the original object.
  if (!superProperty) {
    superProperty = descriptorFor(base, key, meta);
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
  // Methods overwrite computed properties, and do not call super to them.
  if (descs[key] !== undefined) {
    return method;
  }

  // Find the original method in a parent mixin
  let superMethod = values[key];

  // If we didn't find the original value in a parent mixin, find it in
  // the original object
  if (superMethod === undefined && (!EMBER_METAL_ES5_GETTERS || descriptorFor(obj, key) === undefined)) {
    superMethod = obj[key];
  }

  // Only wrap the new method if the original method was a function
  if (typeof superMethod === 'function') {
    return wrap(method, superMethod);
  }

  return method;
}

function applyConcatenatedProperties(obj, key, value, values) {
  let baseValue = values[key] || obj[key];
  let ret = makeArray(baseValue).concat(makeArray(value));

  if (DEBUG) {
    // it is possible to use concatenatedProperties with strings (which cannot be frozen)
    // only freeze objects...
    if (typeof ret === 'object' && ret !== null) {
      // prevent mutating `concatenatedProperties` array after it is applied
      Object.freeze(ret);
    }
  }

  return ret;
}

function applyMergedProperties(obj, key, value, values) {
  let baseValue = values[key] || obj[key];

  assert(`You passed in \`${JSON.stringify(value)}\` as the value for \`${key}\` but \`${key}\` cannot be an Array`, !isArray(value));

  if (!baseValue) { return value; }

  let newBase = assign({}, baseValue);
  let hasFunction = false;

  for (let prop in value) {
    if (!value.hasOwnProperty(prop)) { continue; }

    let propValue = value[prop];
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
    if (ENV._ENABLE_PROPERTY_REQUIRED_SUPPORT && value === REQUIRED && descs[key]) { return CONTINUE; }

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
    } else if (mergings && mergings.indexOf(key) > -1) {
      value = applyMergedProperties(base, key, value, values);
    } else if (isMethod(value)) {
      value = giveMethodSuper(base, key, value, values, descs);
    }

    descs[key] = undefined;
    values[key] = value;
  }
}

function mergeMixins(mixins, meta, descs, values, base, keys) {
  let currentMixin, props, key, concats, mergings;

  function removeKeys(keyName) {
    delete descs[keyName];
    delete values[keyName];
  }

  for (let i = 0; i < mixins.length; i++) {
    currentMixin = mixins[i];
    assert(
      `Expected hash or Mixin instance, got ${Object.prototype.toString.call(currentMixin)}`,
      typeof currentMixin === 'object' && currentMixin !== null && Object.prototype.toString.call(currentMixin) !== '[object Array]'
    );

    props = mixinProperties(meta, currentMixin);
    if (props === CONTINUE) { continue; }

    if (props) {
      // remove willMergeMixin after 3.4 as it was used for _actions
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
      mergeMixins(currentMixin.mixins, meta, descs, values, base, keys);
      if (currentMixin._without) { currentMixin._without.forEach(removeKeys); }
    }
  }
}

function followAlias(obj, desc, descs, values) {
  let altKey = desc.methodName;
  let value;
  let possibleDesc;
  if (descs[altKey] || values[altKey]) {
    value = values[altKey];
    desc  = descs[altKey];
  } else if ((possibleDesc = descriptorFor(obj, altKey)) !== undefined) {
    desc  = possibleDesc;
    value = undefined;
  } else {
    desc = undefined;
    value = obj[altKey];
  }

  return { desc, value };
}

function updateObserversAndListeners(obj, key, paths, updateMethod) {
  if (paths) {
    for (let i = 0; i < paths.length; i++) {
      updateMethod(obj, paths[i], null, key);
    }
  }
}

function replaceObserversAndListeners(obj, key, prev, next) {
  if (typeof prev === 'function') {
    updateObserversAndListeners(obj, key, prev.__ember_observes__, removeObserver);
    updateObserversAndListeners(obj, key, prev.__ember_listens__, removeListener);
  }

  if (typeof next === 'function') {
    updateObserversAndListeners(obj, key, next.__ember_observes__, addObserver);
    updateObserversAndListeners(obj, key, next.__ember_listens__, addListener);
  }
}

function applyMixin(obj, mixins, partial) {
  let descs = {};
  let values = {};
  let meta = metaFor(obj);
  let keys = [];
  let key, value, desc;

  obj._super = ROOT;

  // Go through all mixins and hashes passed in, and:
  //
  // * Handle concatenated properties
  // * Handle merged properties
  // * Set up _super wrapping if necessary
  // * Set up computed property descriptors
  // * Copying `toString` in broken browsers
  mergeMixins(mixins, meta, descs, values, obj, keys);

  for (let i = 0; i < keys.length; i++) {
    key = keys[i];
    if (key === 'constructor' || !values.hasOwnProperty(key)) { continue; }

    desc = descs[key];
    value = values[key];

    if (ENV._ENABLE_PROPERTY_REQUIRED_SUPPORT && desc === REQUIRED) { continue; }

    while (desc && desc instanceof Alias) {
      let followed = followAlias(obj, desc, descs, values);
      desc = followed.desc;
      value = followed.value;
    }

    if (desc === undefined && value === undefined) { continue; }

    if (EMBER_METAL_ES5_GETTERS && descriptorFor(obj, key) !== undefined) {
      replaceObserversAndListeners(obj, key, null, value);
    } else {
      replaceObserversAndListeners(obj, key, obj[key], value);
    }

    if (ENV._ENABLE_BINDING_SUPPORT && typeof Mixin.detectBinding === 'function' && Mixin.detectBinding(key)) {
      meta.writeBindings(key, value);
    }

    defineProperty(obj, key, desc, value, meta);
  }

  if (ENV._ENABLE_BINDING_SUPPORT && !partial && typeof Mixin.finishProtype === 'function') {
    Mixin.finishPartial(obj, meta);
  }

  return obj;
}

/**
  @method mixin
  @param obj
  @param mixins*
  @return obj
  @private
*/
export function mixin(obj, ...args) {
  applyMixin(obj, args, false);
  return obj;
}

/**
  The `Mixin` class allows you to create mixins, whose properties can be
  added to other classes. For instance,

  ```javascript
  import Mixin from '@ember/object/mixin';

  const EditableMixin = Mixin.create({
    edit() {
      console.log('starting to edit');
      this.set('isEditing', true);
    },
    isEditing: false
  });
  ```

  ```javascript
  import EmberObject from '@ember/object';
  import EditableMixin from '../mixins/editable';

  // Mix mixins into classes by passing them as the first arguments to
  // `.extend.`
  const Comment = EmberObject.extend(EditableMixin, {
    post: null
  });

  let comment = Comment.create({
    post: somePost
  });

  comment.edit(); // outputs 'starting to edit'
  ```

  Note that Mixins are created with `Mixin.create`, not
  `Mixin.extend`.

  Note that mixins extend a constructor's prototype so arrays and object literals
  defined as properties will be shared amongst objects that implement the mixin.
  If you want to define a property in a mixin that is not shared, you can define
  it either as a computed property or have it be created on initialization of the object.

  ```javascript
  // filters array will be shared amongst any object implementing mixin
  import Mixin from '@ember/object/mixin';
  import { A } from '@ember/array';

  const FilterableMixin = Mixin.create({
    filters: A()
  });
  ```

  ```javascript
  import Mixin from '@ember/object/mixin';
  import { A } from '@ember/array';
  import { computed } from '@ember/object';

  // filters will be a separate array for every object implementing the mixin
  const FilterableMixin = Mixin.create({
    filters: computed(function() {
      return A();
    })
  });
  ```

  ```javascript
  import Mixin from '@ember/object/mixin';
  import { A } from '@ember/array';

  // filters will be created as a separate array during the object's initialization
  const Filterable = Mixin.create({
    filters: null,

    init() {
      this._super(...arguments);
      this.set("filters", A());
    }
  });
  ```

  @class Mixin
  @public
*/
export default class Mixin {
  constructor(mixins, properties) {
    this.properties = properties;

    let length = mixins && mixins.length;

    if (length > 0) {
      let m = new Array(length);

      for (let i = 0; i < length; i++) {
        let x = mixins[i];
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
    this[NAME_KEY] = null;

    if (DEBUG) {
      /*
        In debug builds, we seal mixins to help avoid performance pitfalls.

        In IE11 there is a quirk that prevents sealed objects from being added
        to a WeakMap. Unfortunately, the mixin system currently relies on
        weak maps in `guidFor`, so we need to prime the guid cache weak map.
      */
      guidFor(this);
      Object.seal(this);
    }
  }

  static applyPartial(obj, ...args) {
    return applyMixin(obj, args, true);
  }

  /**
    @method create
    @for @ember/object/mixin
    @static
    @param arguments*
    @public
  */
  static create(...args) {
    // ES6TODO: this relies on a global state?
    unprocessedFlag = true;
    let M = this;
    return new M(args, undefined);
  }

  // returns the mixins currently applied to the specified object
  // TODO: Make `mixin`
  static mixins(obj) {
    let meta = peekMeta(obj);
    let ret = [];
    if (meta === undefined) { return ret; }

    meta.forEachMixins((key, currentMixin) => {
      // skip primitive mixins since these are always anonymous
      if (!currentMixin.properties) { ret.push(currentMixin); }
    });

    return ret;
  }

  /**
    @method reopen
    @param arguments*
    @private
  */
  reopen() {
    let currentMixin;

    if (this.properties) {
      currentMixin = new Mixin(undefined, this.properties);
      this.properties = undefined;
      this.mixins = [currentMixin];
    } else if (!this.mixins) {
      this.mixins = [];
    }

    let mixins = this.mixins;
    let idx;

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
  }

  /**
    @method apply
    @param obj
    @return applied object
    @private
  */
  apply(obj) {
    return applyMixin(obj, [this], false);
  }

  applyPartial(obj) {
    return applyMixin(obj, [this], true);
  }

  /**
    @method detect
    @param obj
    @return {Boolean}
    @private
  */
  detect(obj) {
    if (typeof obj !== 'object' || obj === null) { return false; }
    if (obj instanceof Mixin) { return _detect(obj, this, {}); }
    let meta = peekMeta(obj);
    if (meta === undefined) { return false; }
    return !!meta.peekMixins(guidFor(this));
  }

  without(...args) {
    let ret = new Mixin([this]);
    ret._without = args;
    return ret;
  }

  keys() {
    let keys = {};
    let seen = {};

    _keys(keys, this, seen);
    let ret = Object.keys(keys);
    return ret;
  }

}

Mixin._apply = applyMixin;
if (ENV._ENABLE_BINDING_SUPPORT) {
  // slotting this so that the legacy addon can add the function here
  // without triggering an error due to the Object.seal done below
  Mixin.finishPartial = null;
  Mixin.detectBinding = null;
}

let MixinPrototype = Mixin.prototype;
MixinPrototype.toString = Object.toString;

if (DEBUG) {
  Object.seal(MixinPrototype);
}

let unprocessedFlag = false;

export function hasUnprocessedMixins() {
  return unprocessedFlag;
}

export function clearUnprocessedMixins() {
  unprocessedFlag = false;
}

function _detect(curMixin, targetMixin, seen) {
  let guid = guidFor(curMixin);

  if (seen[guid]) { return false; }
  seen[guid] = true;

  if (curMixin === targetMixin) { return true; }
  let mixins = curMixin.mixins;
  let loc = mixins ? mixins.length : 0;
  while (--loc >= 0) {
    if (_detect(mixins[loc], targetMixin, seen)) { return true; }
  }
  return false;
}

function _keys(ret, mixin, seen) {
  if (seen[guidFor(mixin)]) { return; }
  seen[guidFor(mixin)] = true;

  if (mixin.properties) {
    let props = Object.keys(mixin.properties);
    for (let i = 0; i < props.length; i++) {
      let key = props[i];
      ret[key] = true;
    }
  } else if (mixin.mixins) {
    mixin.mixins.forEach((x) => _keys(ret, x, seen));
  }
}

const REQUIRED = new Descriptor();
REQUIRED.toString = () => '(Required Property)';

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

class Alias extends Descriptor {
  constructor(methodName) {
    super();
    this.methodName = methodName;
  }
}

/**
  Makes a method available via an additional name.

  ```app/utils/person.js
  import EmberObject, {
    aliasMethod
  } from '@ember/object';

  export default EmberObject.extend({
    name() {
      return 'Tomhuda Katzdale';
    },
    moniker: aliasMethod('name')
  });
  ```

  ```javascript
  let goodGuy = Person.create();

  goodGuy.name();    // 'Tomhuda Katzdale'
  goodGuy.moniker(); // 'Tomhuda Katzdale'
  ```

  @method aliasMethod
  @static
  @for @ember/object
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
  import EmberObject from '@ember/object';
  import { observer } from '@ember/object';

  export default EmberObject.extend({
    valueObserver: observer('value', function() {
      // Executes whenever the "value" property changes
    })
  });
  ```

  Also available as `Function.prototype.observes` if prototype extensions are
  enabled.

  @method observer
  @for @ember/object
  @param {String} propertyNames*
  @param {Function} func
  @return func
  @public
  @static
*/
export function observer(...args) {
  let func = args.pop();
  let _paths = args;

  assert('observer called without a function', typeof func === 'function');
  assert('observer called without valid path', _paths.length > 0 && _paths.every((p)=> typeof p === 'string' && p.length));

  let paths = [];
  let addWatchedProperty = path => paths.push(path);

  for (let i = 0; i < _paths.length; ++i) {
    expandProperties(_paths[i], addWatchedProperty);
  }

  func.__ember_observes__ = paths;
  return func;
}

export {
  Mixin,
  REQUIRED
};
