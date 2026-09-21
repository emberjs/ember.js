import { INIT_FACTORY } from '@ember/-internals/container/lib/container';
import type { Meta } from '@ember/-internals/meta/lib/meta';
import { meta as metaFor, peekMeta } from '@ember/-internals/meta/lib/meta';
import { observerListenerMetaFor, ROOT, wrap } from '@ember/-internals/utils/lib/super';
import { assert } from '@ember/debug';
import { DEBUG } from '@glimmer/env';
import type {
  ComputedDecorator,
  ComputedPropertyGetter,
  ComputedPropertyObj,
  ComputedPropertySetter,
} from '@ember/-internals/metal/lib/computed';
import { type ComputedDescriptor, isClassicDecorator } from '@ember/-internals/metal/lib/decorator';
import { ComputedProperty } from '@ember/-internals/metal/lib/computed';
import {
  descriptorForDecorator,
  makeComputedDecorator,
  nativeDescDecorator,
} from '@ember/-internals/metal/lib/decorator';
import { setUnprocessedMixins } from '@ember/-internals/metal/lib/namespace_search';
import {
  addObserver,
  removeObserver,
  revalidateObservers,
} from '@ember/-internals/metal/lib/observer';
import { defineDecorator, defineValue } from '@ember/-internals/metal/lib/properties';
import { addListener, removeListener } from '@ember/-internals/metal/lib/events';

const a_concat = Array.prototype.concat;
const { isArray } = Array;

function extractAccessors(properties: { [key: string]: any } | undefined) {
  if (properties !== undefined) {
    for (let key of Object.keys(properties)) {
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
      } as ComputedPropertyObj,
    ]);

    newProperty._readOnly = property._readOnly;
    newProperty._meta = property._meta;
    newProperty.enumerable = property.enumerable;

    // SAFETY: We passed in the impl for this class
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

function simpleMakeArray(value: unknown) {
  if (!value) {
    return [];
  } else if (!Array.isArray(value)) {
    return [value];
  } else {
    return value;
  }
}

function applyConcatenatedProperties(key: string, value: any, values: { [key: string]: any }) {
  let baseValue = values[key];
  let ret = simpleMakeArray(baseValue).concat(simpleMakeArray(value));

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

  let newBase = Object.assign({}, baseValue);
  let hasFunction = false;

  let props = Object.keys(value);

  for (let prop of props) {
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
  let currentMixin: MixinLike | undefined;

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

        if (currentMixin instanceof InternalMixin && currentMixin._without !== undefined) {
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
      mergeProps(
        meta,
        currentMixin as Record<string, unknown>,
        descs,
        values,
        base,
        keys,
        keysWithSuper
      );
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

  for (let key of propKeys) {
    let value = props[key];

    if (value === undefined) continue;

    if (keys.indexOf(key) === -1) {
      keys.push(key);

      let desc = meta.peekDescriptors(key);

      if (desc === undefined) {
        // If the value is a classic decorator, we don't want to actually
        // access it, because that will execute the decorator while we're
        // building the class.
        if (!isClassicDecorator(value)) {
          // The superclass did not have a CP, which means it may have
          // observers or listeners on that property.
          let prev = (values[key] = base[key]);

          if (typeof prev === 'function') {
            updateObserversAndListeners(base, key, prev, false);
          }
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

function updateObserversAndListeners(obj: object, key: string, fn: Function, add: boolean) {
  let meta = observerListenerMetaFor(fn);

  if (meta === undefined) return;

  let { observers, listeners } = meta;

  if (observers !== undefined) {
    let updateObserver = add ? addObserver : removeObserver;

    for (let path of observers.paths) {
      updateObserver(obj, path, null, key, observers.sync);
    }
  }

  if (listeners !== undefined) {
    let updateListener = add ? addListener : removeListener;

    for (let listener of listeners) {
      updateListener(obj, listener, null, key);
    }
  }
}

export function applyMixin(
  obj: Record<string, any>,
  mixins: Array<InternalMixin | Record<string, unknown>>,
  _hideKeys = false
) {
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

  for (let key of keys) {
    let value = values[key];
    let desc = descs[key];

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

const MIXINS = new WeakSet();

/**
  The mixin machinery, without the deprecation that the public `Mixin` class
  emits from `create`. Ember's own internals are built on mixins, so they build
  them through this class; `Mixin` in `@ember/object/mixin` is the public,
  deprecating subclass.

  @internal
*/
export class InternalMixin {
  /** @internal */
  declare static _disableDebugSeal?: boolean;

  /** @internal */
  mixins: InternalMixin[] | undefined;

  /** @internal */
  properties: { [key: string]: any } | undefined;

  /** @internal */
  ownerConstructor: any;

  /** @internal */
  _without: any[] | undefined;

  declare [INIT_FACTORY]?: null;

  /** @internal */
  constructor(mixins: InternalMixin[] | undefined, properties?: { [key: string]: any }) {
    MIXINS.add(this);
    this.properties = extractAccessors(properties);
    this.mixins = buildMixinsArray(mixins);
    this.ownerConstructor = undefined;
    this._without = undefined;

    if (DEBUG) {
      // Eagerly add INIT_FACTORY to avoid issues in DEBUG as a result of Object.seal(mixin)
      this[INIT_FACTORY] = null;

      if (InternalMixin._disableDebugSeal !== true) {
        Object.seal(this);
      }
    }
  }

  /** @internal */
  static create<M extends typeof InternalMixin>(...args: any[]): InstanceType<M> {
    setUnprocessedMixins();
    let M = this;
    return new M(args, undefined) as InstanceType<M>;
  }

  // returns the mixins currently applied to the specified object
  // TODO: Make `mixin`
  /** @internal */
  static mixins(obj: object): InternalMixin[] {
    let meta = peekMeta(obj);
    let ret: InternalMixin[] = [];
    if (meta === null) {
      return ret;
    }

    meta.forEachMixins((currentMixin: InternalMixin) => {
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
    @internal
  */
  reopen(...args: Array<InternalMixin | Record<string, unknown>>): this {
    if (args.length === 0) {
      return this;
    }

    if (this.properties) {
      let currentMixin = new InternalMixin(undefined, this.properties);
      this.properties = undefined;
      this.mixins = [currentMixin];
    } else if (!this.mixins) {
      this.mixins = [];
    }

    this.mixins = this.mixins.concat(buildMixinsArray(args) as InternalMixin[]);
    return this;
  }

  /**
    @method apply
    @param obj
    @return applied object
    @private
    @internal
  */
  apply(obj: object, _hideKeys = false) {
    // Ember.NativeArray is a normal Ember.Mixin that we mix into `Array.prototype` when prototype extensions are enabled
    // mutating a native object prototype like this should _not_ result in enumerable properties being added (or we have significant
    // issues with things like deep equality checks from test frameworks, or things like jQuery.extend(true, [], [])).
    //
    // _hideKeys disables enumerablity when applying the mixin. This is a hack, and we should stop mutating the array prototype by default 😫
    return applyMixin(obj, [this], _hideKeys);
  }

  /** @internal */
  applyPartial(obj: object) {
    return applyMixin(obj, [this]);
  }

  /**
    @method detect
    @param obj
    @return {Boolean}
    @private
    @internal
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

  /** @internal */
  without(...args: any[]) {
    let ret = new InternalMixin([this]);
    ret._without = args;
    return ret;
  }

  /** @internal */
  keys() {
    let keys = _keys(this);
    assert('[BUG] Missing keys for mixin!', keys);
    return keys;
  }

  /** @internal */
  toString() {
    return '(unknown mixin)';
  }
}

if (DEBUG) {
  Object.defineProperty(InternalMixin, '_disableDebugSeal', {
    configurable: true,
    enumerable: false,
    writable: true,
    value: false,
  });
}

function buildMixinsArray(mixins: MixinLike[] | undefined): InternalMixin[] | undefined {
  let length = (mixins && mixins.length) || 0;
  let m: InternalMixin[] | undefined = undefined;

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
        m[i] = x as InternalMixin;
      } else {
        m[i] = new InternalMixin(undefined, x);
      }
    }
  }

  return m;
}

type MixinLike = InternalMixin | { [key: string]: any };

if (DEBUG) {
  Object.seal(InternalMixin.prototype);
}

function _detect(curMixin: InternalMixin, targetMixin: InternalMixin, seen = new Set()): boolean {
  if (seen.has(curMixin)) {
    return false;
  }
  seen.add(curMixin);

  if (curMixin === targetMixin) {
    return true;
  }
  let mixins = curMixin.mixins;
  if (mixins) {
    return mixins.some((mixin) => _detect(mixin, targetMixin, seen));
  }

  return false;
}

function _keys(mixin: InternalMixin, ret = new Set<string>(), seen = new Set()) {
  if (seen.has(mixin)) {
    return;
  }
  seen.add(mixin);

  if (mixin.properties) {
    let props = Object.keys(mixin.properties);
    for (let prop of props) {
      ret.add(prop);
    }
  } else if (mixin.mixins) {
    mixin.mixins.forEach((x: any) => _keys(x, ret, seen));
  }

  return ret;
}

/**
  The public, deprecating face of a mixin that Ember also uses internally.

  RFC #1116 deprecates applying Ember's mixins, but Ember's own internals still
  need them. Each such mixin therefore exists twice: an internal copy that
  applies silently, and a public copy -- built with this class -- that wraps the
  internal one and emits the deprecation from `init`.

  Because the two copies are distinct objects, `meta.hasMixin` would not match a
  public mixin against an object that only ever had the internal copy applied.
  `detect` is overridden here to look through to the wrapped copy, so that code
  like `EmberArray.detect(someArrayProxy)` keeps working while the deprecation
  is live.

  @internal
*/
export class DeprecatedMixin extends InternalMixin {
  detect(obj: any): boolean {
    if (super.detect(obj)) {
      return true;
    }

    // The internal copy being wrapped is always the first constituent mixin,
    // i.e. `DeprecatedMixin.create(internalCopy, { init() {} })`.
    let internalMixin = this.mixins?.[0];
    return internalMixin !== undefined && internalMixin.detect(obj);
  }
}
