/* globals Proxy */
import { assert } from 'ember-debug';
import { DEBUG } from 'ember-env-flags';
import {
  dictionary,
  symbol,
  setOwner,
  getOwner,
  OWNER,
  assign,
  NAME_KEY,
  HAS_NATIVE_PROXY
} from 'ember-utils';
import { ENV } from 'ember-environment';

const CONTAINER_OVERRIDE = symbol('CONTAINER_OVERRIDE');

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
export default function Container(registry, options = {}) {
  this.registry        = registry;
  this.owner           = options.owner || null;
  this.cache           = dictionary(options.cache || null);
  this.validationCache = dictionary(options.validationCache || null);
  this.factoryManagerCache = dictionary(options.factoryManagerCache || null);
  this[CONTAINER_OVERRIDE] = undefined;
  this.isDestroyed = false;
}

Container.prototype = {
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
    The default behaviour is for lookup to return a singleton instance.
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
    assert('fullName must be a proper full name', this.registry.validateFullName(fullName));
    return lookup(this, this.registry.normalize(fullName), options);
  },

  /**
   A depth first traversal, destroying the container, its descendant containers and all
   their managed objects.
    @private
   @method destroy
   */
  destroy() {
    destroyDestroyables(this);
    this.isDestroyed = true;
  },

  /**
   Clear either the entire cache or just the cache for a particular key.
    @private
   @method reset
   @param {String} fullName optional key to reset; if missing, resets everything
   */
  reset(fullName) {
    if (arguments.length > 0) {
      resetMember(this, this.registry.normalize(fullName));
    } else {
      resetCache(this);
    }
  },

  /**
   Returns an object that can be used to provide an owner to a
   manually created instance.
    @private
   @method ownerInjection
   @returns { Object }
  */
  ownerInjection() {
    return { [OWNER]: this.owner };
  },

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

    assert('fullName must be a proper full name', this.registry.validateFullName(normalizedName));

    if (options.source) {
      normalizedName = this.registry.expandLocalLookup(fullName, options);
      // if expandLocalLookup returns falsey, we do not support local lookup
      if (!normalizedName) {
        return;
      }
    }

    let cached = this.factoryManagerCache[normalizedName];

    if (cached !== undefined) { return cached; }

    let factory = this.registry.resolve(normalizedName);

    if (factory === undefined) {
      return;
    }

    if (DEBUG && factory && typeof factory._onLookup === 'function') {
      factory._onLookup(fullName);
    }

    let manager = new FactoryManager(this, factory, fullName, normalizedName);

    if (DEBUG) {
      manager = wrapManagerInDeprecationProxy(manager);
    }

    this.factoryManagerCache[normalizedName] = manager;
    return manager;
  }
};

/*
 * Wrap a factory manager in a proxy which will not permit properties to be
 * set on the manager.
 */
function wrapManagerInDeprecationProxy(manager) {
  if (HAS_NATIVE_PROXY) {
    let validator = {
      get(obj, prop) {
        if (prop !== 'class' && prop !== 'create') {
          throw new Error(`You attempted to access "${prop}" on a factory manager created by container#factoryFor. "${prop}" is not a member of a factory manager."`);
        }

        return obj[prop];
      },
      set(obj, prop, value) {
        throw new Error(`You attempted to set "${prop}" on a factory manager created by container#factoryFor. A factory manager is a read-only construct.`);
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

  return manager;
}

function isSingleton(container, fullName) {
  return container.registry.getOption(fullName, 'singleton') !== false;
}

function isInstantiatable(container, fullName) {
  return container.registry.getOption(fullName, 'instantiate') !== false;
}

function lookup(container, fullName, options = {}) {
  if (options.source) {
    fullName = container.registry.expandLocalLookup(fullName, options);

    // if expandLocalLookup returns falsey, we do not support local lookup
    if (!fullName) {
      return;
    }
  }

  let cached = container.cache[fullName];
  if (cached !== undefined && options.singleton !== false) {
    return cached;
  }

  return instantiateFactory(container, fullName, options);
}

function isSingletonClass(container, fullName, { instantiate, singleton }) {
  return singleton !== false && !instantiate && isSingleton(container, fullName) && !isInstantiatable(container, fullName);
}

function isSingletonInstance(container, fullName, { instantiate, singleton }) {
  return singleton !== false && instantiate !== false && isSingleton(container, fullName) && isInstantiatable(container, fullName);
}

function isFactoryClass(container, fullname, { instantiate, singleton }) {
  return instantiate === false && (singleton === false || !isSingleton(container, fullname)) && !isInstantiatable(container, fullname);
}

function isFactoryInstance(container, fullName, { instantiate, singleton }) {
  return instantiate !== false && (singleton !== false || isSingleton(container, fullName)) && isInstantiatable(container, fullName);
}

function instantiateFactory(container, fullName, options) {
  let factoryManager = container.factoryFor(fullName);

  if (factoryManager === undefined) {
    return;
  }

  // SomeClass { singleton: true, instantiate: true } | { singleton: true } | { instantiate: true } | {}
  // By default majority of objects fall into this case
  if (isSingletonInstance(container, fullName, options)) {
    return container.cache[fullName] = factoryManager.create();
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

function markInjectionsAsDynamic(injections) {
  injections._dynamic = true;
}

function areInjectionsNotDynamic(injections) {
  return injections._dynamic !== true;
}

function buildInjections() /* container, ...injections */{
  let hash = {};

  if (arguments.length > 1) {
    let container = arguments[0];
    let injections = [];
    let injection;

    for (let i = 1; i < arguments.length; i++) {
      if (arguments[i]) {
        injections = injections.concat(arguments[i]);
      }
    }

    if (DEBUG) {
      container.registry.validateInjections(injections);
    }

    let markAsDynamic = false;
    for (let i = 0; i < injections.length; i++) {
      injection = injections[i];
      hash[injection.property] = lookup(container, injection.fullName);
      if (!markAsDynamic) {
        markAsDynamic = !isSingleton(container, injection.fullName);
      }
    }

    if (markAsDynamic) {
      markInjectionsAsDynamic(hash);
    }
  }

  return hash;
}

function injectionsFor(container, fullName) {
  let registry = container.registry;
  let splitName = fullName.split(':');
  let type = splitName[0];

  let injections = buildInjections(container, registry.getTypeInjections(type), registry.getInjections(fullName));

  return injections;
}

function destroyDestroyables(container) {
  let cache = container.cache;
  let keys = Object.keys(cache);

  for (let i = 0; i < keys.length; i++) {
    let key = keys[i];
    let value = cache[key];

    if (isInstantiatable(container, key) && value.destroy) {
      value.destroy();
    }
  }
}

function resetCache(container) {
  destroyDestroyables(container);
  container.cache.dict = dictionary(null);
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

class FactoryManager {
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
    if (!this.madeToString) {
      this.madeToString = this.container.registry.makeToString(this.class, this.fullName);
    }

    return this.madeToString;
  }

  create(options = {}) {

    let injections = this.injections;
    if (injections === undefined) {
      injections = injectionsFor(this.container, this.normalizedName);
      if (areInjectionsNotDynamic(injections)) {
        this.injections = injections;
      }
    }
    let props = assign({}, injections, options);


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
    }

    if (!this.class.create) {
      throw new Error(`Failed to create an instance of '${this.normalizedName}'. Most likely an improperly defined class or` + ` an invalid module export.`);
    }

    // required to allow access to things like
    // the customized toString, _debugContainerKey,
    // owner, etc. without a double extend and without
    // modifying the objects properties
    if (typeof this.class._initFactory === 'function') {
      this.class._initFactory(this);
    } else {
      // in the non-Ember.Object case we need to still setOwner
      // this is required for supporting glimmer environment and
      // template instantiation which rely heavily on
      // `options[OWNER]` being passed into `create`
      // TODO: clean this up, and remove in future versions
      setOwner(props, this.owner);
    }

    return this.class.create(props);
  }
}
