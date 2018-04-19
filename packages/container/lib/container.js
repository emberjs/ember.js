/* globals Proxy */
import { assert } from '@ember/debug';
import { EMBER_MODULE_UNIFICATION } from '@ember/canary-features';
import { DEBUG } from '@glimmer/env';
import { OWNER, setOwner } from 'ember-owner';
import { assign } from '@ember/polyfills';
import { dictionary, HAS_NATIVE_PROXY } from 'ember-utils';

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
export default class Container {
  constructor(registry, options = {}) {
    this.registry = registry;
    this.owner = options.owner || null;
    this.cache = dictionary(options.cache || null);
    this.factoryManagerCache = dictionary(options.factoryManagerCache || null);
    this.isDestroyed = false;

    if (DEBUG) {
      this.validationCache = dictionary(options.validationCache || null);
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
   @param {Object} [options]
   @param {String} [options.source] The fullname of the request source (used for local lookup)
   @return {any}
   */
  lookup(fullName, options) {
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
    destroyDestroyables(this);
    this.isDestroyed = true;
  }

  /**
   Clear either the entire cache or just the cache for a particular key.

   @private
   @method reset
   @param {String} fullName optional key to reset; if missing, resets everything
  */
  reset(fullName) {
    if (fullName === undefined) {
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
    return { [OWNER]: this.owner };
  }

  /**
   Given a fullName, return the corresponding factory. The consumer of the factory
   is responsible for the destruction of any factory instances, as there is no
   way for the container to ensure instances are destroyed when it itself is
   destroyed.
    @public
   @method factoryFor
   @param {String} fullName
   @param {Object} [options]
   @param {String} [options.source] The fullname of the request source (used for local lookup)
   @return {any}
   */
  factoryFor(fullName, options = {}) {
    let normalizedName = this.registry.normalize(fullName);

    assert('fullName must be a proper full name', this.registry.isValidFullName(normalizedName));
    assert(
      'EMBER_MODULE_UNIFICATION must be enabled to pass a namespace option to factoryFor',
      EMBER_MODULE_UNIFICATION || !options.namespace
    );

    if (options.source || options.namespace) {
      normalizedName = this.registry.expandLocalLookup(fullName, options);
      if (!normalizedName) {
        return;
      }
    }

    return factoryFor(this, normalizedName, fullName);
  }
}
/*
 * Wrap a factory manager in a proxy which will not permit properties to be
 * set on the manager.
 */
function wrapManagerInDeprecationProxy(manager) {
  if (HAS_NATIVE_PROXY) {
    let validator = {
      set(obj, prop) {
        throw new Error(
          `You attempted to set "${prop}" on a factory manager created by container#factoryFor. A factory manager is a read-only construct.`
        );
      },
    };

    // Note:
    // We have to proxy access to the manager here so that private property
    // access doesn't cause the above errors to occur.
    let m = manager;
    let proxiedManager = {
      class: m.class,
      create(props) {
        return m.create(props);
      },
    };

    let proxy = new Proxy(proxiedManager, validator);
    FACTORY_FOR.set(proxy, manager);
  }

  return manager;
}

function isSingleton(container, fullName) {
  return container.registry.getOption(fullName, 'singleton') !== false;
}

function isInstantiatable(container, fullName) {
  return container.registry.getOption(fullName, 'instantiate') !== false;
}

function lookup(container, fullName, options = {}) {
  assert(
    'EMBER_MODULE_UNIFICATION must be enabled to pass a namespace option to lookup',
    EMBER_MODULE_UNIFICATION || !options.namespace
  );

  let normalizedName = fullName;

  if (options.source || options.namespace) {
    normalizedName = container.registry.expandLocalLookup(fullName, options);
    if (!normalizedName) {
      return;
    }
  }

  if (options.singleton !== false) {
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

  let manager = new FactoryManager(container, factory, fullName, normalizedName);

  if (DEBUG) {
    manager = wrapManagerInDeprecationProxy(manager);
  }

  container.factoryManagerCache[normalizedName] = manager;
  return manager;
}

function isSingletonClass(container, fullName, { instantiate, singleton }) {
  return (
    singleton !== false &&
    !instantiate &&
    isSingleton(container, fullName) &&
    !isInstantiatable(container, fullName)
  );
}

function isSingletonInstance(container, fullName, { instantiate, singleton }) {
  return (
    singleton !== false &&
    instantiate !== false &&
    isSingleton(container, fullName) &&
    isInstantiatable(container, fullName)
  );
}

function isFactoryClass(container, fullname, { instantiate, singleton }) {
  return (
    instantiate === false &&
    (singleton === false || !isSingleton(container, fullname)) &&
    !isInstantiatable(container, fullname)
  );
}

function isFactoryInstance(container, fullName, { instantiate, singleton }) {
  return (
    instantiate !== false &&
    (singleton !== false || isSingleton(container, fullName)) &&
    isInstantiatable(container, fullName)
  );
}

function instantiateFactory(container, normalizedName, fullName, options) {
  let factoryManager = factoryFor(container, normalizedName, fullName);

  if (factoryManager === undefined) {
    return;
  }

  // SomeClass { singleton: true, instantiate: true } | { singleton: true } | { instantiate: true } | {}
  // By default majority of objects fall into this case
  if (isSingletonInstance(container, fullName, options)) {
    return (container.cache[normalizedName] = factoryManager.create());
  }

  // SomeClass { singleton: false, instantiate: true }
  if (isFactoryInstance(container, fullName, options)) {
    return factoryManager.create();
  }

  // SomeClass { singleton: true, instantiate: false } | { instantiate: false } | { singleton: false, instantiation: false }
  if (
    isSingletonClass(container, fullName, options) ||
    isFactoryClass(container, fullName, options)
  ) {
    return factoryManager.class;
  }

  throw new Error('Could not create factory');
}

function processInjections(container, injections, result) {
  if (DEBUG) {
    container.registry.validateInjections(injections);
  }

  let hash = result.injections;
  if (hash === undefined) {
    hash = result.injections = {};
  }

  for (let i = 0; i < injections.length; i++) {
    let { property, specifier, source } = injections[i];

    if (source) {
      hash[property] = lookup(container, specifier, { source });
    } else {
      hash[property] = lookup(container, specifier);
    }

    if (!result.isDynamic) {
      result.isDynamic = !isSingleton(container, specifier);
    }
  }
}

function buildInjections(container, typeInjections, injections) {
  let result = {
    injections: undefined,
    isDyanmic: false,
  };

  if (typeInjections !== undefined) {
    processInjections(container, typeInjections, result);
  }

  if (injections !== undefined) {
    processInjections(container, injections, result);
  }

  return result;
}

function injectionsFor(container, fullName) {
  let registry = container.registry;
  let [type] = fullName.split(':');

  let typeInjections = registry.getTypeInjections(type);
  let injections = registry.getInjections(fullName);

  return buildInjections(container, typeInjections, injections);
}

function destroyDestroyables(container) {
  let cache = container.cache;
  let keys = Object.keys(cache);

  for (let i = 0; i < keys.length; i++) {
    let key = keys[i];
    let value = cache[key];

    if (value.destroy) {
      value.destroy();
    }
  }
}

function resetCache(container) {
  destroyDestroyables(container);
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

export const FACTORY_FOR = new WeakMap();
class FactoryManager {
  constructor(container, factory, fullName, normalizedName) {
    this.container = container;
    this.owner = container.owner;
    this.class = factory;
    this.fullName = fullName;
    this.normalizedName = normalizedName;
    this.madeToString = undefined;
    this.injections = undefined;
    FACTORY_FOR.set(this, this);
  }

  toString() {
    if (this.madeToString === undefined) {
      this.madeToString = this.container.registry.makeToString(this.class, this.fullName);
    }

    return this.madeToString;
  }

  create(options) {
    let injectionsCache = this.injections;
    if (injectionsCache === undefined) {
      let { injections, isDynamic } = injectionsFor(this.container, this.normalizedName);
      injectionsCache = injections;
      if (!isDynamic) {
        this.injections = injections;
      }
    }

    let props = injectionsCache;
    if (options !== undefined) {
      props = assign({}, injectionsCache, options);
    }

    if (DEBUG) {
      let lazyInjections;
      let validationCache = this.container.validationCache;
      // Ensure that all lazy injections are valid at instantiation time
      if (
        !validationCache[this.fullName] &&
        this.class &&
        typeof this.class._lazyInjections === 'function'
      ) {
        lazyInjections = this.class._lazyInjections();
        lazyInjections = this.container.registry.normalizeInjectionsHash(lazyInjections);

        this.container.registry.validateInjections(lazyInjections);
      }

      validationCache[this.fullName] = true;
    }

    if (!this.class.create) {
      throw new Error(
        `Failed to create an instance of '${
          this.normalizedName
        }'. Most likely an improperly defined class or` + ` an invalid module export.`
      );
    }

    // required to allow access to things like
    // the customized toString, _debugContainerKey,
    // owner, etc. without a double extend and without
    // modifying the objects properties
    if (typeof this.class._initFactory === 'function') {
      this.class._initFactory(this);
    } else {
      // in the non-EmberObject case we need to still setOwner
      // this is required for supporting glimmer environment and
      // template instantiation which rely heavily on
      // `options[OWNER]` being passed into `create`
      // TODO: clean this up, and remove in future versions
      if (options === undefined || props === undefined) {
        // avoid mutating `props` here since they are the cached injections
        props = assign({}, props);
      }
      setOwner(props, this.owner);
    }

    let instance = this.class.create(props);
    FACTORY_FOR.set(instance, this);

    return instance;
  }
}
