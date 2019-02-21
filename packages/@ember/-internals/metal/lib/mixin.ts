/**
@module @ember/object
*/
import { descriptorFor, Meta, meta as metaFor, peekMeta } from '@ember/-internals/meta';
import {
  getListeners,
  getObservers,
  guidFor,
  makeArray,
  NAME_KEY,
  ROOT,
  setObservers,
  wrap,
} from '@ember/-internals/utils';
import { assert, deprecate } from '@ember/debug';
import { ALIAS_METHOD } from '@ember/deprecated-features';
import { assign } from '@ember/polyfills';
import { DEBUG } from '@glimmer/env';
import { ComputedProperty, ComputedPropertyGetter, ComputedPropertySetter } from './computed';
import { addListener, removeListener } from './events';
import expandProperties from './expand_properties';
import { classToString, setUnprocessedMixins } from './namespace_search';
import { addObserver, removeObserver } from './observer';
import { defineProperty, Descriptor } from './properties';

const a_concat = Array.prototype.concat;
const { isArray } = Array;

function isMethod(obj: any): boolean {
  return (
    'function' === typeof obj &&
    obj.isMethod !== false &&
    obj !== Boolean &&
    obj !== Object &&
    obj !== Number &&
    obj !== Array &&
    obj !== Date &&
    obj !== String
  );
}

const CONTINUE: MixinLike = {};

function mixinProperties<T extends MixinLike>(mixinsMeta: Meta, mixin: T): MixinLike {
  if (mixin instanceof Mixin) {
    if (mixinsMeta.hasMixin(mixin)) {
      return CONTINUE;
    }
    mixinsMeta.addMixin(mixin);
    return mixin.properties!;
  } else {
    return mixin; // apply anonymous mixin properties
  }
}

function concatenatedMixinProperties(
  concatProp: string,
  props: { [key: string]: any },
  values: { [key: string]: any },
  base: { [key: string]: any }
) {
  // reset before adding each new mixin to pickup concats from previous
  let concats = values[concatProp] || base[concatProp];
  if (props[concatProp]) {
    concats = concats ? a_concat.call(concats, props[concatProp]) : props[concatProp];
  }
  return concats;
}

function giveDescriptorSuper(
  meta: Meta,
  key: string,
  property: ComputedProperty,
  values: { [key: string]: any },
  descs: { [key: string]: any },
  base: object
): ComputedProperty {
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
  property._getter = wrap(property._getter, superProperty._getter) as ComputedPropertyGetter;
  if (superProperty._setter) {
    if (property._setter) {
      property._setter = wrap(property._setter, superProperty._setter) as ComputedPropertySetter;
    } else {
      property._setter = superProperty._setter;
    }
  }

  return property;
}

function giveMethodSuper(
  obj: object,
  key: string,
  method: Function,
  values: { [key: string]: any },
  descs: { [key: string]: any }
) {
  // Methods overwrite computed properties, and do not call super to them.
  if (descs[key] !== undefined) {
    return method;
  }

  // Find the original method in a parent mixin
  let superMethod = values[key];

  // If we didn't find the original value in a parent mixin, find it in
  // the original object
  if (superMethod === undefined && descriptorFor(obj, key) === undefined) {
    superMethod = obj[key];
  }

  // Only wrap the new method if the original method was a function
  if (typeof superMethod === 'function') {
    return wrap(method, superMethod);
  }

  return method;
}

function applyConcatenatedProperties(
  obj: any,
  key: string,
  value: any,
  values: { [key: string]: any }
) {
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

function applyMergedProperties(
  obj: { [key: string]: any },
  key: string,
  value: { [key: string]: any },
  values: { [key: string]: any }
): { [key: string]: any } {
  let baseValue = values[key] || obj[key];

  assert(
    `You passed in \`${JSON.stringify(
      value
    )}\` as the value for \`${key}\` but \`${key}\` cannot be an Array`,
    !isArray(value)
  );

  if (!baseValue) {
    return value;
  }

  let newBase = assign({}, baseValue);
  let hasFunction = false;

  for (let prop in value) {
    if (!value.hasOwnProperty(prop)) {
      continue;
    }

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

function addNormalizedProperty(
  base: any,
  key: string,
  value: Descriptor | any,
  meta: Meta,
  descs: { [key: string]: any },
  values: { [key: string]: any },
  concats?: string[],
  mergings?: string[]
): void {
  if (value instanceof Descriptor) {
    // Wrap descriptor function to implement
    // _super() if needed
    if ((value as ComputedProperty)._getter) {
      value = giveDescriptorSuper(meta, key, value as ComputedProperty, values, descs, base);
    }

    descs[key] = value;
    values[key] = undefined;
  } else {
    if (
      (concats && concats.indexOf(key) >= 0) ||
      key === 'concatenatedProperties' ||
      key === 'mergedProperties'
    ) {
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

interface HasWillMergeMixin {
  willMergeMixin?: (props: MixinLike) => void;
}

function mergeMixins(
  mixins: MixinLike[],
  meta: Meta,
  descs: { [key: string]: object },
  values: { [key: string]: object },
  base: { [key: string]: object },
  keys: string[]
): void {
  let currentMixin, props, key, concats, mergings;

  function removeKeys(keyName: string) {
    delete descs[keyName];
    delete values[keyName];
  }

  for (let i = 0; i < mixins.length; i++) {
    currentMixin = mixins[i];
    assert(
      `Expected hash or Mixin instance, got ${Object.prototype.toString.call(currentMixin)}`,
      typeof currentMixin === 'object' &&
        currentMixin !== null &&
        Object.prototype.toString.call(currentMixin) !== '[object Array]'
    );

    props = mixinProperties(meta, currentMixin);
    if (props === CONTINUE) {
      continue;
    }

    if (props) {
      // remove willMergeMixin after 3.4 as it was used for _actions
      if ((base as HasWillMergeMixin).willMergeMixin) {
        (base as HasWillMergeMixin).willMergeMixin!(props);
      }
      concats = concatenatedMixinProperties('concatenatedProperties', props, values, base);
      mergings = concatenatedMixinProperties('mergedProperties', props, values, base);

      for (key in props) {
        if (!props.hasOwnProperty(key)) {
          continue;
        }
        keys.push(key);
        addNormalizedProperty(base, key, props[key], meta, descs, values, concats, mergings);
      }

      // manually copy toString() because some JS engines do not enumerate it
      if (props.hasOwnProperty('toString')) {
        base.toString = props.toString;
      }
    } else if (currentMixin.mixins) {
      mergeMixins(currentMixin.mixins, meta, descs, values, base, keys);
      if (currentMixin._without) {
        currentMixin._without.forEach(removeKeys);
      }
    }
  }
}

let followMethodAlias: (
  obj: object,
  alias: Alias,
  descs: { [key: string]: any },
  values: { [key: string]: any }
) => { desc: any; value: any };

if (ALIAS_METHOD) {
  followMethodAlias = function(
    obj: object,
    alias: Alias,
    descs: { [key: string]: any },
    values: { [key: string]: any }
  ) {
    let altKey = alias.methodName;
    let possibleDesc;
    let desc = descs[altKey];
    let value = values[altKey];

    if (desc !== undefined || value !== undefined) {
      // do nothing
    } else if ((possibleDesc = descriptorFor(obj, altKey)) !== undefined) {
      desc = possibleDesc;
      value = undefined;
    } else {
      desc = undefined;
      value = obj[altKey];
    }

    return { desc, value };
  };
}

function updateObserversAndListeners(
  obj: object,
  key: string,
  paths: string[] | undefined,
  updateMethod: (
    obj: object,
    path: string,
    target: object | Function | null,
    method: string
  ) => void
) {
  if (paths) {
    for (let i = 0; i < paths.length; i++) {
      updateMethod(obj, paths[i], null, key);
    }
  }
}

function replaceObserversAndListeners(
  obj: object,
  key: string,
  prev: Function | null,
  next: Function | null
): void {
  if (typeof prev === 'function') {
    updateObserversAndListeners(obj, key, getObservers(prev), removeObserver);
    updateObserversAndListeners(obj, key, getListeners(prev), removeListener);
  }

  if (typeof next === 'function') {
    updateObserversAndListeners(obj, key, getObservers(next), addObserver);
    updateObserversAndListeners(obj, key, getListeners(next), addListener);
  }
}

export function applyMixin(obj: { [key: string]: any }, mixins: Mixin[]) {
  let descs = {};
  let values = {};
  let meta = metaFor(obj);
  let keys: string[] = [];
  let key, value, desc;

  (obj as any)._super = ROOT;

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
    if (key === 'constructor' || !values.hasOwnProperty(key)) {
      continue;
    }

    desc = descs[key];
    value = values[key];

    if (ALIAS_METHOD) {
      while (value && value instanceof AliasImpl) {
        let followed = followMethodAlias(obj, value, descs, values);
        desc = followed.desc;
        value = followed.value;
      }
    }

    if (desc === undefined && value === undefined) {
      continue;
    }

    if (descriptorFor(obj, key) !== undefined) {
      replaceObserversAndListeners(obj, key, null, value);
    } else {
      replaceObserversAndListeners(obj, key, obj[key], value);
    }

    defineProperty(obj, key, desc, value, meta);
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
export function mixin(obj: object, ...args: any[]) {
  applyMixin(obj, args);
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
  mixins: Mixin[] | undefined;
  properties: { [key: string]: any } | undefined;
  ownerConstructor: any;
  _without: any[] | undefined;

  constructor(mixins: Mixin[] | undefined, properties?: { [key: string]: any }) {
    this.properties = properties;
    this.mixins = buildMixinsArray(mixins);
    this.ownerConstructor = undefined;
    this._without = undefined;

    if (DEBUG) {
      this[NAME_KEY] = undefined;
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

  /**
    @method create
    @for @ember/object/mixin
    @static
    @param arguments*
    @public
  */
  static create(...args: any[]): Mixin {
    // ES6TODO: this relies on a global state?
    setUnprocessedMixins();
    let M = this;
    return new M(args, undefined);
  }

  // returns the mixins currently applied to the specified object
  // TODO: Make `mixin`
  static mixins(obj: object): Mixin[] {
    let meta = peekMeta(obj);
    let ret: Mixin[] = [];
    if (meta === null) {
      return ret;
    }

    meta.forEachMixins((currentMixin: Mixin) => {
      // skip primitive mixins since these are always anonymous
      if (!currentMixin.properties) {
        ret.push(currentMixin);
      }
    });

    return ret;
  }

  /**
    @method reopen
    @param arguments*
    @private
  */
  reopen(...args: any[]) {
    if (args.length === 0) {
      return;
    }

    if (this.properties) {
      let currentMixin = new Mixin(undefined, this.properties);
      this.properties = undefined;
      this.mixins = [currentMixin];
    } else if (!this.mixins) {
      this.mixins = [];
    }

    this.mixins = this.mixins.concat(buildMixinsArray(args) as Mixin[]);
    return this;
  }

  /**
    @method apply
    @param obj
    @return applied object
    @private
  */
  apply(obj: object) {
    return applyMixin(obj, [this]);
  }

  applyPartial(obj: object) {
    return applyMixin(obj, [this]);
  }

  /**
    @method detect
    @param obj
    @return {Boolean}
    @private
  */
  detect(obj: any): boolean {
    if (typeof obj !== 'object' || obj === null) {
      return false;
    }
    if (obj instanceof Mixin) {
      return _detect(obj, this);
    }
    let meta = peekMeta(obj);
    if (meta === null) {
      return false;
    }
    return meta.hasMixin(this);
  }

  without(...args: any[]) {
    let ret = new Mixin([this]);
    ret._without = args;
    return ret;
  }

  keys() {
    return _keys(this);
  }

  toString() {
    return '(unknown mixin)';
  }
}

function buildMixinsArray(mixins: MixinLike[] | undefined): Mixin[] | undefined {
  let length = (mixins && mixins.length) || 0;
  let m: Mixin[] | undefined = undefined;

  if (length > 0) {
    m = new Array(length);
    for (let i = 0; i < length; i++) {
      let x = mixins![i];
      assert(
        `Expected hash or Mixin instance, got ${Object.prototype.toString.call(x)}`,
        typeof x === 'object' &&
          x !== null &&
          Object.prototype.toString.call(x) !== '[object Array]'
      );

      if (x instanceof Mixin) {
        m[i] = x;
      } else {
        m[i] = new Mixin(undefined, x);
      }
    }
  }

  return m;
}

type MixinLike = Mixin | { [key: string]: any };

Mixin.prototype.toString = classToString;

if (DEBUG) {
  Mixin.prototype[NAME_KEY] = undefined;
  Object.seal(Mixin.prototype);
}

function _detect(curMixin: Mixin, targetMixin: Mixin, seen = new Set()): boolean {
  if (seen.has(curMixin)) {
    return false;
  }
  seen.add(curMixin);

  if (curMixin === targetMixin) {
    return true;
  }
  let mixins = curMixin.mixins;
  if (mixins) {
    return mixins.some(mixin => _detect(mixin, targetMixin, seen));
  }

  return false;
}

function _keys(mixin: Mixin, ret = new Set(), seen = new Set()) {
  if (seen.has(mixin)) {
    return;
  }
  seen.add(mixin);

  if (mixin.properties) {
    let props = Object.keys(mixin.properties);
    for (let i = 0; i < props.length; i++) {
      ret.add(props[i]);
    }
  } else if (mixin.mixins) {
    mixin.mixins.forEach((x: any) => _keys(x, ret, seen));
  }

  return ret;
}

declare class Alias {
  public methodName: string;
  constructor(methodName: string);
}

let AliasImpl: typeof Alias;

if (ALIAS_METHOD) {
  AliasImpl = class AliasImpl {
    constructor(public methodName: string) {}
  } as typeof Alias;
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
  @deprecated Use a shared utility method instead
  @for @ember/object
  @param {String} methodName name of the method to alias
  @public
*/
export let aliasMethod: (methodName: string) => any;

if (ALIAS_METHOD) {
  aliasMethod = function aliasMethod(methodName: string): Alias {
    deprecate(
      `You attempted to alias '${methodName}, but aliasMethod has been deprecated. Consider extracting the method into a shared utility function.`,
      false,
      {
        id: 'object.alias-method',
        until: '4.0.0',
        url: 'https://emberjs.com/deprecations/v3.x#toc_object-alias-method',
      }
    );
    return new AliasImpl(methodName);
  };
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
export function observer(...args: (string | Function)[]) {
  let func = args.pop();
  let _paths = args;

  assert('observer called without a function', typeof func === 'function');
  assert(
    'observer called without valid path',
    _paths.length > 0 && _paths.every(p => typeof p === 'string' && Boolean(p.length))
  );

  let paths: string[] = [];
  let addWatchedProperty = (path: string) => paths.push(path);

  for (let i = 0; i < _paths.length; ++i) {
    expandProperties(_paths[i] as string, addWatchedProperty);
  }

  setObservers(func as Function, paths);
  return func;
}

export { Mixin };
