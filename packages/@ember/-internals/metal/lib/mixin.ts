/**
@module @ember/object
*/
import { ENV } from '@ember/-internals/environment';
import { Meta, meta as metaFor, peekMeta } from '@ember/-internals/meta';
import {
  guidFor,
  makeArray,
  observerListenerMetaFor,
  ROOT,
  setObservers,
  wrap,
} from '@ember/-internals/utils';
import { assert, deprecate } from '@ember/debug';
import { ALIAS_METHOD } from '@ember/deprecated-features';
import { assign } from '@ember/polyfills';
import { DEBUG } from '@glimmer/env';
import { _WeakSet } from '@glimmer/util';
import {
  ComputedDecorator,
  ComputedProperty,
  ComputedPropertyGetter,
  ComputedPropertySetter,
} from './computed';
import {
  ComputedDescriptor,
  descriptorForDecorator,
  descriptorForProperty,
  makeComputedDecorator,
  nativeDescDecorator,
} from './decorator';
import { addListener, removeListener } from './events';
import expandProperties from './expand_properties';
import { classToString, setUnprocessedMixins } from './namespace_search';
import { addObserver, removeObserver, revalidateObservers } from './observer';
import { defineDecorator, defineValue } from './properties';

const a_concat = Array.prototype.concat;
const { isArray } = Array;

function extractAccessors(properties: { [key: string]: any } | undefined) {
  if (properties !== undefined) {
    let keys = Object.keys(properties);

    for (let i = 0; i < keys.length; i++) {
      let key = keys[i];
      let desc = Object.getOwnPropertyDescriptor(properties, key)!;

      if (desc.get !== undefined || desc.set !== undefined) {
        Object.defineProperty(properties, key, { value: nativeDescDecorator(desc) });
      }
    }
  }

  return properties;
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

function giveDecoratorSuper(
  key: string,
  decorator: ComputedDecorator,
  property: ComputedProperty | true,
  descs: { [key: string]: any }
): ComputedDecorator {
  if (property === true) {
    return decorator;
  }

  let originalGetter = property._getter;

  if (originalGetter === undefined) {
    return decorator;
  }

  let superDesc = descs[key];

  // Check to see if the super property is a decorator first, if so load its descriptor
  let superProperty: ComputedProperty | true | undefined =
    typeof superDesc === 'function' ? descriptorForDecorator(superDesc) : superDesc;

  if (superProperty === undefined || superProperty === true) {
    return decorator;
  }

  let superGetter = superProperty._getter;

  if (superGetter === undefined) {
    return decorator;
  }

  let get = wrap(originalGetter, superGetter) as ComputedPropertyGetter;
  let set;
  let originalSetter = property._setter;
  let superSetter = superProperty._setter;

  if (superSetter !== undefined) {
    if (originalSetter !== undefined) {
      set = wrap(originalSetter, superSetter) as ComputedPropertySetter;
    } else {
      // If the super property has a setter, we default to using it no matter what.
      // This is clearly very broken and weird, but it's what was here so we have
      // to keep it until the next major at least.
      //
      // TODO: Add a deprecation here.
      set = superSetter;
    }
  } else {
    set = originalSetter;
  }

  // only create a new CP if we must
  if (get !== originalGetter || set !== originalSetter) {
    // Since multiple mixins may inherit from the same parent, we need
    // to clone the computed property so that other mixins do not receive
    // the wrapped version.
    let dependentKeys = property._dependentKeys || [];
    let newProperty = new ComputedProperty([
      ...dependentKeys,
      {
        get,
        set,
      },
    ]);

    newProperty._readOnly = property._readOnly;
    newProperty._volatile = property._volatile;
    newProperty._meta = property._meta;
    newProperty.enumerable = property.enumerable;

    return makeComputedDecorator(newProperty, ComputedProperty) as ComputedDecorator;
  }

  return decorator;
}

function giveMethodSuper(
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

  // Only wrap the new method if the original method was a function
  if (typeof superMethod === 'function') {
    return wrap(method, superMethod);
  }

  return method;
}

function applyConcatenatedProperties(key: string, value: any, values: { [key: string]: any }) {
  let baseValue = values[key];
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
  key: string,
  value: { [key: string]: any },
  values: { [key: string]: any }
): { [key: string]: any } {
  let baseValue = values[key];

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

  let props = Object.keys(value);

  for (let i = 0; i < props.length; i++) {
    let prop = props[i];
    let propValue = value[prop];

    if (typeof propValue === 'function') {
      hasFunction = true;
      newBase[prop] = giveMethodSuper(prop, propValue, baseValue, {});
    } else {
      newBase[prop] = propValue;
    }
  }

  if (hasFunction) {
    newBase._super = ROOT;
  }

  return newBase;
}

function mergeMixins(
  mixins: MixinLike[],
  meta: Meta,
  descs: { [key: string]: object },
  values: { [key: string]: object },
  base: { [key: string]: object },
  keys: string[],
  keysWithSuper: string[]
): void {
  let currentMixin;

  for (let i = 0; i < mixins.length; i++) {
    currentMixin = mixins[i];
    assert(
      `Expected hash or Mixin instance, got ${Object.prototype.toString.call(currentMixin)}`,
      typeof currentMixin === 'object' &&
        currentMixin !== null &&
        Object.prototype.toString.call(currentMixin) !== '[object Array]'
    );

    if (MIXINS.has(currentMixin)) {
      if (meta.hasMixin(currentMixin)) {
        continue;
      }
      meta.addMixin(currentMixin);

      let { properties, mixins } = currentMixin;

      if (properties !== undefined) {
        mergeProps(meta, properties, descs, values, base, keys, keysWithSuper);
      } else if (mixins !== undefined) {
        mergeMixins(mixins, meta, descs, values, base, keys, keysWithSuper);

        if (currentMixin._without !== undefined) {
          currentMixin._without.forEach((keyName: string) => {
            // deleting the key means we won't process the value
            let index = keys.indexOf(keyName);

            if (index !== -1) {
              keys.splice(index, 1);
            }
          });
        }
      }
    } else {
      mergeProps(meta, currentMixin, descs, values, base, keys, keysWithSuper);
    }
  }
}

function mergeProps(
  meta: Meta,
  props: { [key: string]: unknown },
  descs: { [key: string]: unknown },
  values: { [key: string]: unknown },
  base: { [key: string]: unknown },
  keys: string[],
  keysWithSuper: string[]
) {
  let concats = concatenatedMixinProperties('concatenatedProperties', props, values, base);
  let mergings = concatenatedMixinProperties('mergedProperties', props, values, base);

  let propKeys = Object.keys(props);

  for (let i = 0; i < propKeys.length; i++) {
    let key = propKeys[i];
    let value = props[key];

    if (value === undefined) continue;

    if (keys.indexOf(key) === -1) {
      keys.push(key);

      let desc = meta.peekDescriptors(key);

      if (desc === undefined) {
        // The superclass did not have a CP, which means it may have
        // observers or listeners on that property.
        let prev = (values[key] = base[key]);

        if (typeof prev === 'function') {
          updateObserversAndListeners(base, key, prev, false);
        }
      } else {
        descs[key] = desc;

        // The super desc will be overwritten on descs, so save off the fact that
        // there was a super so we know to Object.defineProperty when writing
        // the value
        keysWithSuper.push(key);

        desc.teardown(base, key, meta);
      }
    }

    let isFunction = typeof value === 'function';

    if (isFunction) {
      let desc: ComputedDescriptor | undefined | true = descriptorForDecorator(value as Function);

      if (desc !== undefined) {
        // Wrap descriptor function to implement _super() if needed
        descs[key] = giveDecoratorSuper(
          key,
          value as ComputedDecorator,
          desc as ComputedProperty,
          descs
        );
        values[key] = undefined;

        continue;
      }
    }

    if (
      (concats && concats.indexOf(key) >= 0) ||
      key === 'concatenatedProperties' ||
      key === 'mergedProperties'
    ) {
      value = applyConcatenatedProperties(key, value, values);
    } else if (mergings && mergings.indexOf(key) > -1) {
      value = applyMergedProperties(key, value as object, values);
    } else if (isFunction) {
      value = giveMethodSuper(key, value as Function, values, descs);
    }

    values[key] = value;
    descs[key] = undefined;
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
    } else if ((possibleDesc = descriptorForProperty(obj, altKey)) !== undefined) {
      desc = possibleDesc;
      value = undefined;
    } else {
      desc = undefined;
      value = obj[altKey];
    }

    return { desc, value };
  };
}

function updateObserversAndListeners(obj: object, key: string, fn: Function, add: boolean) {
  let meta = observerListenerMetaFor(fn);

  if (meta === undefined) return;

  let { observers, listeners } = meta;

  if (observers !== undefined) {
    let updateObserver = add ? addObserver : removeObserver;

    for (let i = 0; i < observers.paths.length; i++) {
      updateObserver(obj, observers.paths[i], null, key, observers.sync);
    }
  }

  if (listeners !== undefined) {
    let updateListener = add ? addListener : removeListener;

    for (let i = 0; i < listeners.length; i++) {
      updateListener(obj, listeners[i], null, key);
    }
  }
}

export function applyMixin(obj: { [key: string]: any }, mixins: Mixin[], _hideKeys = false) {
  let descs = Object.create(null);
  let values = Object.create(null);
  let meta = metaFor(obj);
  let keys: string[] = [];
  let keysWithSuper: string[] = [];

  (obj as any)._super = ROOT;

  // Go through all mixins and hashes passed in, and:
  //
  // * Handle concatenated properties
  // * Handle merged properties
  // * Set up _super wrapping if necessary
  // * Set up computed property descriptors
  // * Copying `toString` in broken browsers
  mergeMixins(mixins, meta, descs, values, obj, keys, keysWithSuper);

  for (let i = 0; i < keys.length; i++) {
    let key = keys[i];
    let value = values[key];
    let desc = descs[key];

    if (ALIAS_METHOD) {
      while (value !== undefined && isAlias(value)) {
        let followed = followMethodAlias(obj, value, descs, values);
        desc = followed.desc;
        value = followed.value;
      }
    }

    if (value !== undefined) {
      if (typeof value === 'function') {
        updateObserversAndListeners(obj, key, value, true);
      }

      defineValue(obj, key, value, keysWithSuper.indexOf(key) !== -1, !_hideKeys);
    } else if (desc !== undefined) {
      defineDecorator(obj, key, desc, meta);
    }
  }

  if (!meta.isPrototypeMeta(obj)) {
    revalidateObservers(obj);
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

const MIXINS = new _WeakSet();

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
    MIXINS.add(this);
    this.properties = extractAccessors(properties);
    this.mixins = buildMixinsArray(mixins);
    this.ownerConstructor = undefined;
    this._without = undefined;

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

  /**
    @method create
    @for @ember/object/mixin
    @static
    @param arguments*
    @public
  */
  static create(...args: any[]): Mixin {
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
  apply(obj: object, _hideKeys = false) {
    // Ember.NativeArray is a normal Ember.Mixin that we mix into `Array.prototype` when prototype extensions are enabled
    // mutating a native object prototype like this should _not_ result in enumerable properties being added (or we have significant
    // issues with things like deep equality checks from test frameworks, or things like jQuery.extend(true, [], [])).
    //
    // _hideKeys disables enumerablity when applying the mixin. This is a hack, and we should stop mutating the array prototype by default 😫
    return applyMixin(obj, [this], _hideKeys);
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
    if (MIXINS.has(obj)) {
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

      if (MIXINS.has(x)) {
        m[i] = x as Mixin;
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

let isAlias: (alias: any) => alias is Alias;

if (ALIAS_METHOD) {
  const ALIASES = new _WeakSet();

  isAlias = (alias: any): alias is Alias => {
    return ALIASES.has(alias);
  };

  AliasImpl = class AliasImpl {
    constructor(public methodName: string) {
      ALIASES.add(this);
    }
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

type ObserverDefinition = { dependentKeys: string[]; fn: Function; sync: boolean };

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
export function observer(...args: (string | Function)[]): Function;
export function observer(definition: ObserverDefinition): Function;
export function observer(...args: (string | Function | ObserverDefinition)[]) {
  let funcOrDef = args.pop();

  assert(
    'observer must be provided a function or an observer definition',
    typeof funcOrDef === 'function' || (typeof funcOrDef === 'object' && funcOrDef !== null)
  );

  let func, dependentKeys, sync;

  if (typeof funcOrDef === 'function') {
    func = funcOrDef;
    dependentKeys = args;
    sync = !ENV._DEFAULT_ASYNC_OBSERVERS;
  } else {
    func = (funcOrDef as ObserverDefinition).fn;
    dependentKeys = (funcOrDef as ObserverDefinition).dependentKeys;
    sync = (funcOrDef as ObserverDefinition).sync;
  }

  assert('observer called without a function', typeof func === 'function');
  assert(
    'observer called without valid path',
    Array.isArray(dependentKeys) &&
      dependentKeys.length > 0 &&
      dependentKeys.every(p => typeof p === 'string' && Boolean(p.length))
  );
  assert('observer called without sync', typeof sync === 'boolean');

  let paths: string[] = [];

  for (let i = 0; i < dependentKeys.length; ++i) {
    expandProperties(dependentKeys[i] as string, (path: string) => paths.push(path));
  }

  setObservers(func as Function, {
    paths,
    sync,
  });
  return func;
}

export { Mixin };
