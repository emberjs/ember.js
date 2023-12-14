import { dictionary, intern } from '@ember/-internals/utils';
import { assert } from '@ember/debug';
import { DEBUG } from '@glimmer/env';
import { setOwner } from '@ember/-internals/owner';

let leakTracking;
let containers;
if (DEBUG) {
  // requires v8
  // chrome --js-flags="--allow-natives-syntax --expose-gc"
  // node --allow-natives-syntax --expose-gc
  try {
    if (typeof gc === 'function') {
      leakTracking = (() => {
        // avoid syntax errors when --allow-natives-syntax not present
        let GetWeakSetValues = new Function('weakSet', 'return %GetWeakSetValues(weakSet, 0)');
        containers = new WeakSet();
        return {
          hasContainers() {
            gc();
            return GetWeakSetValues(containers).length > 0;
          },
          reset() {
            let values = GetWeakSetValues(containers);
            for (let i = 0; i < values.length; i++) {
              containers.delete(values[i]);
            }
          }
        };
      })();
    }
  } catch (e) {
    // ignore
  }
}
/**
 A container used to instantiate and cache objects.

 Every `Container` must be associated with a `Registry`, which is referenced
 to determine the factory and options that should be used to instantiate
 objects.

 The public API for `Container` is still in flux and should not be considered
 stable.

 @private
 @class Container
 */
class Container {
  constructor(registry, options = {}) {
    this.registry = registry;
    this.owner = options.owner || null;
    this.cache = dictionary(options.cache || null);
    this.factoryManagerCache = dictionary(options.factoryManagerCache || null);
    this.isDestroyed = false;
    this.isDestroying = false;
    if (DEBUG) {
      this.validationCache = dictionary(options.validationCache || null);
      if (containers !== undefined) {
        containers.add(this);
      }
    }
  }
  /**
   @private
   @property registry
   @type Registry
   @since 1.11.0
   */
  /**
   @private
   @property cache
   @type InheritingDict
   */
  /**
   @private
   @property validationCache
   @type InheritingDict
   */
  /**
   Given a fullName return a corresponding instance.
    The default behavior is for lookup to return a singleton instance.
   The singleton is scoped to the container, allowing multiple containers
   to all have their own locally scoped singletons.
    ```javascript
   let registry = new Registry();
   let container = registry.container();
    registry.register('api:twitter', Twitter);
    let twitter = container.lookup('api:twitter');
    twitter instanceof Twitter; // => true
    // by default the container will return singletons
   let twitter2 = container.lookup('api:twitter');
   twitter2 instanceof Twitter; // => true
    twitter === twitter2; //=> true
   ```
    If singletons are not wanted, an optional flag can be provided at lookup.
    ```javascript
   let registry = new Registry();
   let container = registry.container();
    registry.register('api:twitter', Twitter);
    let twitter = container.lookup('api:twitter', { singleton: false });
   let twitter2 = container.lookup('api:twitter', { singleton: false });
    twitter === twitter2; //=> false
   ```
    @private
   @method lookup
   @param {String} fullName
   @param {RegisterOptions} [options]
   @return {any}
   */
  lookup(fullName, options) {
    if (this.isDestroyed) {
      throw new Error(`Cannot call \`.lookup('${fullName}')\` after the owner has been destroyed`);
    }
    assert('fullName must be a proper full name', this.registry.isValidFullName(fullName));
    return lookup(this, this.registry.normalize(fullName), options);
  }
  /**
   A depth first traversal, destroying the container, its descendant containers and all
   their managed objects.
    @private
   @method destroy
   */
  destroy() {
    this.isDestroying = true;
    destroyDestroyables(this);
  }
  finalizeDestroy() {
    resetCache(this);
    this.isDestroyed = true;
  }
  /**
   Clear either the entire cache or just the cache for a particular key.
      @private
   @method reset
   @param {String} fullName optional key to reset; if missing, resets everything
  */
  reset(fullName) {
    if (this.isDestroyed) return;
    if (fullName === undefined) {
      destroyDestroyables(this);
      resetCache(this);
    } else {
      resetMember(this, this.registry.normalize(fullName));
    }
  }
  /**
   Returns an object that can be used to provide an owner to a
   manually created instance.
    @private
   @method ownerInjection
   @returns { Object }
  */
  ownerInjection() {
    let injection = {};
    setOwner(injection, this.owner);
    return injection;
  }
  /**
   Given a fullName, return the corresponding factory. The consumer of the factory
   is responsible for the destruction of any factory instances, as there is no
   way for the container to ensure instances are destroyed when it itself is
   destroyed.
    @public
   @method factoryFor
   @param {String} fullName
   @return {any}
   */
  factoryFor(fullName) {
    if (this.isDestroyed) {
      throw new Error(`Cannot call \`.factoryFor('${fullName}')\` after the owner has been destroyed`);
    }
    let normalizedName = this.registry.normalize(fullName);
    assert('fullName must be a proper full name', this.registry.isValidFullName(normalizedName));
    return factoryFor(this, normalizedName, fullName);
  }
}
if (DEBUG) {
  Container._leakTracking = leakTracking;
}
/*
 * Wrap a factory manager in a proxy which will not permit properties to be
 * set on the manager.
 */
function wrapManagerInDeprecationProxy(manager) {
  let validator = {
    set(_obj, prop) {
      throw new Error(`You attempted to set "${String(prop)}" on a factory manager created by container#factoryFor. A factory manager is a read-only construct.`);
    }
  };
  // Note:
  // We have to proxy access to the manager here so that private property
  // access doesn't cause the above errors to occur.
  let m = manager;
  let proxiedManager = {
    class: m.class,
    create(props) {
      return m.create(props);
    }
  };
  return new Proxy(proxiedManager, validator);
}
function isSingleton(container, fullName) {
  return container.registry.getOption(fullName, 'singleton') !== false;
}
function isInstantiatable(container, fullName) {
  return container.registry.getOption(fullName, 'instantiate') !== false;
}
function lookup(container, fullName, options = {}) {
  let normalizedName = fullName;
  if (options.singleton === true || options.singleton === undefined && isSingleton(container, fullName)) {
    let cached = container.cache[normalizedName];
    if (cached !== undefined) {
      return cached;
    }
  }
  return instantiateFactory(container, normalizedName, fullName, options);
}
function factoryFor(container, normalizedName, fullName) {
  let cached = container.factoryManagerCache[normalizedName];
  if (cached !== undefined) {
    return cached;
  }
  let factory = container.registry.resolve(normalizedName);
  if (factory === undefined) {
    return;
  }
  if (DEBUG && factory && typeof factory._onLookup === 'function') {
    factory._onLookup(fullName);
  }
  let manager = new InternalFactoryManager(container, factory, fullName, normalizedName);
  if (DEBUG) {
    manager = wrapManagerInDeprecationProxy(manager);
  }
  container.factoryManagerCache[normalizedName] = manager;
  return manager;
}
function isSingletonClass(container, fullName, {
  instantiate,
  singleton
}) {
  return singleton !== false && !instantiate && isSingleton(container, fullName) && !isInstantiatable(container, fullName);
}
function isSingletonInstance(container, fullName, {
  instantiate,
  singleton
}) {
  return singleton !== false && instantiate !== false && (singleton === true || isSingleton(container, fullName)) && isInstantiatable(container, fullName);
}
function isFactoryClass(container, fullname, {
  instantiate,
  singleton
}) {
  return instantiate === false && (singleton === false || !isSingleton(container, fullname)) && !isInstantiatable(container, fullname);
}
function isFactoryInstance(container, fullName, {
  instantiate,
  singleton
}) {
  return instantiate !== false && (singleton === false || !isSingleton(container, fullName)) && isInstantiatable(container, fullName);
}
function instantiateFactory(container, normalizedName, fullName, options) {
  let factoryManager = factoryFor(container, normalizedName, fullName);
  if (factoryManager === undefined) {
    return;
  }
  // SomeClass { singleton: true, instantiate: true } | { singleton: true } | { instantiate: true } | {}
  // By default majority of objects fall into this case
  if (isSingletonInstance(container, fullName, options)) {
    let instance = container.cache[normalizedName] = factoryManager.create();
    // if this lookup happened _during_ destruction (emits a deprecation, but
    // is still possible) ensure that it gets destroyed
    if (container.isDestroying) {
      if (typeof instance.destroy === 'function') {
        instance.destroy();
      }
    }
    return instance;
  }
  // SomeClass { singleton: false, instantiate: true }
  if (isFactoryInstance(container, fullName, options)) {
    return factoryManager.create();
  }
  // SomeClass { singleton: true, instantiate: false } | { instantiate: false } | { singleton: false, instantiation: false }
  if (isSingletonClass(container, fullName, options) || isFactoryClass(container, fullName, options)) {
    return factoryManager.class;
  }
  throw new Error('Could not create factory');
}
function destroyDestroyables(container) {
  let cache = container.cache;
  let keys = Object.keys(cache);
  for (let key of keys) {
    let value = cache[key];
    assert('has cached value', value);
    if (value.destroy) {
      value.destroy();
    }
  }
}
function resetCache(container) {
  container.cache = dictionary(null);
  container.factoryManagerCache = dictionary(null);
}
function resetMember(container, fullName) {
  let member = container.cache[fullName];
  delete container.factoryManagerCache[fullName];
  if (member) {
    delete container.cache[fullName];
    if (member.destroy) {
      member.destroy();
    }
  }
}
const INIT_FACTORY = Symbol('INIT_FACTORY');
function getFactoryFor(obj) {
  // SAFETY: since we know `obj` is an `object`, we also know we can safely ask
  // whether a key is set on it.
  return obj[INIT_FACTORY];
}
function setFactoryFor(obj, factory) {
  // SAFETY: since we know `obj` is an `object`, we also know we can safely set
  // a key it safely at this location. (The only way this could be blocked is if
  // someone has gone out of their way to use `Object.defineProperty()` with our
  // internal-only symbol and made it `writable: false`.)
  obj[INIT_FACTORY] = factory;
}
class InternalFactoryManager {
  constructor(container, factory, fullName, normalizedName) {
    this.container = container;
    this.owner = container.owner;
    this.class = factory;
    this.fullName = fullName;
    this.normalizedName = normalizedName;
    this.madeToString = undefined;
    this.injections = undefined;
  }
  toString() {
    if (this.madeToString === undefined) {
      this.madeToString = this.container.registry.makeToString(this.class, this.fullName);
    }
    return this.madeToString;
  }
  create(options) {
    let {
      container
    } = this;
    if (container.isDestroyed) {
      throw new Error(`Cannot create new instances after the owner has been destroyed (you attempted to create ${this.fullName})`);
    }
    let props = options ? {
      ...options
    } : {};
    setOwner(props, container.owner);
    setFactoryFor(props, this);
    if (DEBUG) {
      let lazyInjections;
      let validationCache = this.container.validationCache;
      // Ensure that all lazy injections are valid at instantiation time
      if (!validationCache[this.fullName] && this.class && typeof this.class._lazyInjections === 'function') {
        lazyInjections = this.class._lazyInjections();
        lazyInjections = this.container.registry.normalizeInjectionsHash(lazyInjections);
        this.container.registry.validateInjections(lazyInjections);
      }
      validationCache[this.fullName] = true;
      assert(`Failed to create an instance of '${this.normalizedName}'. Most likely an improperly defined class or an invalid module export.`, typeof this.class.create === 'function');
    }
    return this.class.create(props);
  }
}

const VALID_FULL_NAME_REGEXP = /^[^:]+:[^:]+$/;
/**
 A registry used to store factory and option information keyed
 by type.

 A `Registry` stores the factory and option information needed by a
 `Container` to instantiate and cache objects.

 The API for `Registry` is still in flux and should not be considered stable.

 @private
 @class Registry
 @since 1.11.0
*/
class Registry {
  constructor(options = {}) {
    this.fallback = options.fallback || null;
    this.resolver = options.resolver || null;
    this.registrations = dictionary(options.registrations || null);
    this._normalizeCache = dictionary(null);
    this._resolveCache = dictionary(null);
    this._failSet = new Set();
    this._options = dictionary(null);
    this._typeOptions = dictionary(null);
  }
  /**
   A backup registry for resolving registrations when no matches can be found.
      @private
   @property fallback
   @type Registry
   */
  /**
   An object that has a `resolve` method that resolves a name.
      @private
   @property resolver
   @type Resolver
   */
  /**
   @private
   @property registrations
   @type InheritingDict
   */
  /**
   @private
      @property _normalizeCache
   @type InheritingDict
   */
  /**
   @private
      @property _resolveCache
   @type InheritingDict
   */
  /**
   @private
      @property _options
   @type InheritingDict
   */
  /**
   @private
      @property _typeOptions
   @type InheritingDict
   */
  /**
   Creates a container based on this registry.
      @private
   @method container
   @param {Object} options
   @return {Container} created container
   */
  container(options) {
    return new Container(this, options);
  }
  register(fullName, factory, options = {}) {
    assert('fullName must be a proper full name', this.isValidFullName(fullName));
    assert(`Attempting to register an unknown factory: '${fullName}'`, factory !== undefined);
    let normalizedName = this.normalize(fullName);
    assert(`Cannot re-register: '${fullName}', as it has already been resolved.`, !this._resolveCache[normalizedName]);
    this._failSet.delete(normalizedName);
    this.registrations[normalizedName] = factory;
    this._options[normalizedName] = options;
  }
  /**
   Unregister a fullName
      ```javascript
   let registry = new Registry();
   registry.register('model:user', User);
      registry.resolve('model:user').create() instanceof User //=> true
      registry.unregister('model:user')
   registry.resolve('model:user') === undefined //=> true
   ```
      @private
   @method unregister
   @param {String} fullName
   */
  unregister(fullName) {
    assert('fullName must be a proper full name', this.isValidFullName(fullName));
    let normalizedName = this.normalize(fullName);
    delete this.registrations[normalizedName];
    delete this._resolveCache[normalizedName];
    delete this._options[normalizedName];
    this._failSet.delete(normalizedName);
  }
  /**
   Given a fullName return the corresponding factory.
      By default `resolve` will retrieve the factory from
   the registry.
      ```javascript
   let registry = new Registry();
   registry.register('api:twitter', Twitter);
      registry.resolve('api:twitter') // => Twitter
   ```
      Optionally the registry can be provided with a custom resolver.
   If provided, `resolve` will first provide the custom resolver
   the opportunity to resolve the fullName, otherwise it will fallback
   to the registry.
      ```javascript
   let registry = new Registry();
   registry.resolver = function(fullName) {
      // lookup via the module system of choice
    };
      // the twitter factory is added to the module system
   registry.resolve('api:twitter') // => Twitter
   ```
      @private
   @method resolve
   @param {String} fullName
   @return {Function} fullName's factory
   */
  resolve(fullName) {
    let factory = resolve(this, this.normalize(fullName));
    if (factory === undefined && this.fallback !== null) {
      factory = this.fallback.resolve(fullName);
    }
    return factory;
  }
  /**
   A hook that can be used to describe how the resolver will
   attempt to find the factory.
      For example, the default Ember `.describe` returns the full
   class name (including namespace) where Ember's resolver expects
   to find the `fullName`.
      @private
   @method describe
   @param {String} fullName
   @return {string} described fullName
   */
  describe(fullName) {
    if (this.resolver !== null && this.resolver.lookupDescription) {
      return this.resolver.lookupDescription(fullName);
    } else if (this.fallback !== null) {
      return this.fallback.describe(fullName);
    } else {
      return fullName;
    }
  }
  /**
   A hook to enable custom fullName normalization behavior
      @private
   @method normalizeFullName
   @param {String} fullName
   @return {string} normalized fullName
   */
  normalizeFullName(fullName) {
    if (this.resolver !== null && this.resolver.normalize) {
      return this.resolver.normalize(fullName);
    } else if (this.fallback !== null) {
      return this.fallback.normalizeFullName(fullName);
    } else {
      return fullName;
    }
  }
  /**
   Normalize a fullName based on the application's conventions
      @private
   @method normalize
   @param {String} fullName
   @return {string} normalized fullName
   */
  normalize(fullName) {
    return this._normalizeCache[fullName] || (this._normalizeCache[fullName] = this.normalizeFullName(fullName));
  }
  /**
   @method makeToString
      @private
   @param {any} factory
   @param {string} fullName
   @return {function} toString function
   */
  makeToString(factory, fullName) {
    if (this.resolver !== null && this.resolver.makeToString) {
      return this.resolver.makeToString(factory, fullName);
    } else if (this.fallback !== null) {
      return this.fallback.makeToString(factory, fullName);
    } else {
      return typeof factory === 'string' ? factory : factory.name ?? '(unknown class)';
    }
  }
  /**
   Given a fullName check if the container is aware of its factory
   or singleton instance.
      @private
   @method has
   @param {String} fullName
   @param {Object} [options]
   @param {String} [options.source] the fullname of the request source (used for local lookups)
   @return {Boolean}
   */
  has(fullName) {
    if (!this.isValidFullName(fullName)) {
      return false;
    }
    return has(this, this.normalize(fullName));
  }
  /**
   Allow registering options for all factories of a type.
      ```javascript
   let registry = new Registry();
   let container = registry.container();
      // if all of type `connection` must not be singletons
   registry.optionsForType('connection', { singleton: false });
      registry.register('connection:twitter', TwitterConnection);
   registry.register('connection:facebook', FacebookConnection);
      let twitter = container.lookup('connection:twitter');
   let twitter2 = container.lookup('connection:twitter');
      twitter === twitter2; // => false
      let facebook = container.lookup('connection:facebook');
   let facebook2 = container.lookup('connection:facebook');
      facebook === facebook2; // => false
   ```
      @private
   @method optionsForType
   @param {String} type
   @param {Object} options
   */
  optionsForType(type, options) {
    this._typeOptions[type] = options;
  }
  getOptionsForType(type) {
    let optionsForType = this._typeOptions[type];
    if (optionsForType === undefined && this.fallback !== null) {
      optionsForType = this.fallback.getOptionsForType(type);
    }
    return optionsForType;
  }
  /**
   @private
   @method options
   @param {String} fullName
   @param {Object} options
   */
  options(fullName, options) {
    let normalizedName = this.normalize(fullName);
    this._options[normalizedName] = options;
  }
  getOptions(fullName) {
    let normalizedName = this.normalize(fullName);
    let options = this._options[normalizedName];
    if (options === undefined && this.fallback !== null) {
      options = this.fallback.getOptions(fullName);
    }
    return options;
  }
  getOption(fullName, optionName) {
    let options = this._options[fullName];
    if (options !== undefined && options[optionName] !== undefined) {
      return options[optionName];
    }
    let type = fullName.split(':')[0];
    assert('has type', type); // split always will have at least one value
    options = this._typeOptions[type];
    if (options && options[optionName] !== undefined) {
      return options[optionName];
    } else if (this.fallback !== null) {
      return this.fallback.getOption(fullName, optionName);
    }
    return undefined;
  }
  /**
   @private
   @method knownForType
   @param {String} type the type to iterate over
  */
  knownForType(type) {
    let localKnown = dictionary(null);
    let registeredNames = Object.keys(this.registrations);
    for (let fullName of registeredNames) {
      let itemType = fullName.split(':')[0];
      if (itemType === type) {
        localKnown[fullName] = true;
      }
    }
    let fallbackKnown, resolverKnown;
    if (this.fallback !== null) {
      fallbackKnown = this.fallback.knownForType(type);
    }
    if (this.resolver !== null && this.resolver.knownForType) {
      resolverKnown = this.resolver.knownForType(type);
    }
    return Object.assign({}, fallbackKnown, localKnown, resolverKnown);
  }
  isValidFullName(fullName) {
    return VALID_FULL_NAME_REGEXP.test(fullName);
  }
}
if (DEBUG) {
  const proto = Registry.prototype;
  proto.normalizeInjectionsHash = function (hash) {
    let injections = [];
    for (let key in hash) {
      if (Object.prototype.hasOwnProperty.call(hash, key)) {
        let value = hash[key];
        assert('has value', value);
        let {
          specifier
        } = value;
        assert(`Expected a proper full name, given '${specifier}'`, this.isValidFullName(specifier));
        injections.push({
          property: key,
          specifier
        });
      }
    }
    return injections;
  };
  proto.validateInjections = function (injections) {
    if (!injections) {
      return;
    }
    for (let injection of injections) {
      let {
        specifier
      } = injection;
      assert(`Attempting to inject an unknown injection: '${specifier}'`, this.has(specifier));
    }
  };
}
function resolve(registry, _normalizedName) {
  let normalizedName = _normalizedName;
  let cached = registry._resolveCache[normalizedName];
  if (cached !== undefined) {
    return cached;
  }
  if (registry._failSet.has(normalizedName)) {
    return;
  }
  let resolved;
  if (registry.resolver) {
    resolved = registry.resolver.resolve(normalizedName);
  }
  if (resolved === undefined) {
    resolved = registry.registrations[normalizedName];
  }
  if (resolved === undefined) {
    registry._failSet.add(normalizedName);
  } else {
    registry._resolveCache[normalizedName] = resolved;
  }
  return resolved;
}
function has(registry, fullName) {
  return registry.resolve(fullName) !== undefined;
}
const privateNames = dictionary(null);
const privateSuffix = `${Math.random()}${Date.now()}`.replace('.', '');
function privatize([fullName]) {
  assert('has a single string argument', arguments.length === 1 && fullName);
  let name = privateNames[fullName];
  if (name) {
    return name;
  }
  let [type, rawName] = fullName.split(':');
  return privateNames[fullName] = intern(`${type}:${rawName}-${privateSuffix}`);
}

export { Container, INIT_FACTORY, Registry, getFactoryFor, privatize, setFactoryFor };
