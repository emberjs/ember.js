/* globals Proxy */
import {
  dictionary,
  symbol,
  setOwner,
  OWNER,
  assign,
  NAME_KEY,
  HAS_NATIVE_PROXY
} from 'ember-utils';
import { ENV } from 'ember-environment';
import {
  assert,
  deprecate,
  runInDebug,
  isFeatureEnabled
} from 'ember-metal';

const CONTAINER_OVERRIDE = symbol('CONTAINER_OVERRIDE');
export const FACTORY_FOR = symbol('FACTORY_FOR');
export const LOOKUP_FACTORY = symbol('LOOKUP_FACTORY');

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
export default function Container(registry, options) {
  this.registry        = registry;
  this.owner           = options && options.owner ? options.owner : null;
  this.cache           = dictionary(options && options.cache ? options.cache : null);
  this.factoryCache    = dictionary(options && options.factoryCache ? options.factoryCache : null);
  this.validationCache = dictionary(options && options.validationCache ? options.validationCache : null);
  this._fakeContainerToInject = buildFakeContainerWithDeprecations(this);
  this[CONTAINER_OVERRIDE] = undefined;
  this.isDestroyed = false;
}

Container.prototype = {
  /**
   @private
   @property owner
   @type Object
   */
  owner: null,

  /**
   @private
   @property registry
   @type Registry
   @since 1.11.0
   */
  registry: null,

  /**
   @private
   @property cache
   @type InheritingDict
   */
  cache: null,

  /**
   @private
   @property factoryCache
   @type InheritingDict
   */
  factoryCache: null,

  /**
   @private
   @property validationCache
   @type InheritingDict
   */
  validationCache: null,

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
   Given a fullName, return the corresponding factory.

   @private
   @method lookupFactory
   @param {String} fullName
   @param {Object} [options]
   @param {String} [options.source] The fullname of the request source (used for local lookup)
   @return {any}
   */
  lookupFactory(fullName, options) {
    assert('fullName must be a proper full name', this.registry.validateFullName(fullName));

    deprecate(
      'Using "_lookupFactory" is deprecated. Please use container.factoryFor instead.',
      !isFeatureEnabled('ember-factory-for'),
      { id: 'container-lookupFactory', until: '2.13.0', url: 'TODO' }
    );

    return deprecatedFactoryFor(this, this.registry.normalize(fullName), options);
  },

  [LOOKUP_FACTORY](fullName, options) {
    assert('fullName must be a proper full name', this.registry.validateFullName(fullName));
    return deprecatedFactoryFor(this, this.registry.normalize(fullName), options);
  },

  /*
   * This internal version of factoryFor swaps between the public API for
   * factoryFor (class is the registered class) and a transition implementation
   * (class is the double-extended class). It is *not* the public API version
   * of factoryFor, which always returns the registered class.
   */
  [FACTORY_FOR](fullName, options = {}) {
    if (isFeatureEnabled('ember-no-double-extend')) {
      if (isFeatureEnabled('ember-factory-for')) {
        return this.factoryFor(fullName, options);
      } else {
        /* This throws in case of a poorly designed build */
        throw new Error('If ember-no-double-extend is enabled, ember-factory-for must also be enabled');
      }
    }
    let factory = this[LOOKUP_FACTORY](fullName, options);
    if (factory === undefined) { return; }
    let manager = new DeprecatedFactoryManager(this, factory, fullName);

    runInDebug(() => {
      manager = wrapManagerInDeprecationProxy(manager);
    });

    return manager;
  },

  /**
   A depth first traversal, destroying the container, its descendant containers and all
   their managed objects.

   @private
   @method destroy
   */
  destroy() {
    eachDestroyable(this, item => {
      if (item.destroy) {
        item.destroy();
      }
    });

    this.isDestroyed = true;
  },

  /**
   Clear either the entire cache or just the cache for a particular key.

   @private
   @method reset
   @param {String} fullName optional key to reset; if missing, resets everything
   */
  reset(fullName) {
    if (fullName) {
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

if (isFeatureEnabled('ember-factory-for')) {
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
  Container.prototype.factoryFor = function _factoryFor(fullName, options = {}) {
    let normalizedName = this.registry.normalize(fullName);
    assert('fullName must be a proper full name', this.registry.validateFullName(normalizedName));

    if (options.source) {
      normalizedName = this.registry.expandLocalLookup(fullName, options);
      // if expandLocalLookup returns falsey, we do not support local lookup
      if (!normalizedName) { return; }
    }

    let factory = this.registry.resolve(normalizedName);

    if (factory === undefined) { return; }

    let manager = new FactoryManager(this, factory, fullName, normalizedName);

    runInDebug(() => {
      manager = wrapManagerInDeprecationProxy(manager);
    });

    return manager;
  };
}

function isSingleton(container, fullName) {
  return container.registry.getOption(fullName, 'singleton') !== false;
}

function shouldInstantiate(container, fullName) {
  return container.registry.getOption(fullName, 'instantiate') !== false;
}

function lookup(container, fullName, options = {}) {
  if (options.source) {
    fullName = container.registry.expandLocalLookup(fullName, options);

    // if expandLocalLookup returns falsey, we do not support local lookup
    if (!fullName) { return; }
  }

  if (container.cache[fullName] !== undefined && options.singleton !== false) {
    return container.cache[fullName];
  }

  if (isFeatureEnabled('ember-factory-for')) {
    return instantiateFactory(container, fullName, options);
  } else {
    let factory = deprecatedFactoryFor(container, fullName);
    let value = instantiate(factory, {}, container, fullName);

    if (value === undefined) { return; }

    if (isSingleton(container, fullName) && options.singleton !== false) {
      container.cache[fullName] = value;
    }

    return value;
  }
}

function isSingletonClass(container, fullName, { instantiate, singleton }) {
  return (singleton !== false && isSingleton(container, fullName)) &&
         (instantiate === false && !shouldInstantiate(container, fullName));
}

function isSingletonInstance(container, fullName, { instantiate, singleton }) {
  return (singleton !== false && isSingleton(container, fullName)) &&
         (instantiate !== false && shouldInstantiate(container, fullName));
}

function isFactoryClass(container, fullname, { instantiate, singleton }) {
  return (singleton === false || !isSingleton(container, fullname)) &&
         (instantiate === false && !shouldInstantiate(container, fullname));
}

function isFactoryInstance(container, fullName, { instantiate, singleton }) {
  return (singleton !== false || isSingleton(container, fullName)) &&
         (instantiate !== false && shouldInstantiate(container, fullName));
}

function instantiateFactory(container, fullName, options) {
  let factoryManager = container[FACTORY_FOR](fullName);

  if (factoryManager === undefined) { return; }

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

function areInjectionsDynamic(injections) {
  return !!injections._dynamic;
}

function buildInjections(/* container, ...injections */) {
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

    runInDebug(() => {
      container.registry.validateInjections(injections);
    });

    for (let i = 0; i < injections.length; i++) {
      injection = injections[i];
      hash[injection.property] = lookup(container, injection.fullName);
      if (!isSingleton(container, injection.fullName)) {
        markInjectionsAsDynamic(hash);
      }
    }
  }

  return hash;
}

function deprecatedFactoryFor(container, fullName, options = {}) {
  let registry = container.registry;

  if (options.source) {
    fullName = registry.expandLocalLookup(fullName, options);
    // if expandLocalLookup returns falsey, we do not support local lookup
    if (!fullName) { return; }
  }

  let cache = container.factoryCache;
  if (cache[fullName]) {
    return cache[fullName];
  }
  let factory = registry.resolve(fullName);
  if (factory === undefined) { return; }

  let type = fullName.split(':')[0];
  if (!factory || typeof factory.extend !== 'function' || (!ENV.MODEL_FACTORY_INJECTIONS && type === 'model')) {
    if (factory && typeof factory._onLookup === 'function') {
      factory._onLookup(fullName);
    }

    // TODO: think about a 'safe' merge style extension
    // for now just fallback to create time injection
    cache[fullName] = factory;
    return factory;
  } else {
    let injections = injectionsFor(container, fullName);
    let factoryInjections = factoryInjectionsFor(container, fullName);
    let cacheable = !areInjectionsDynamic(injections) && !areInjectionsDynamic(factoryInjections);

    factoryInjections[NAME_KEY] = registry.makeToString(factory, fullName);

    let injectedFactory = factory.extend(injections);

    // TODO - remove all `container` injections when Ember reaches v3.0.0
    injectDeprecatedContainer(injectedFactory.prototype, container);
    injectedFactory.reopenClass(factoryInjections);

    if (factory && typeof factory._onLookup === 'function') {
      factory._onLookup(fullName);
    }

    if (cacheable) {
      cache[fullName] = injectedFactory;
    }

    return injectedFactory;
  }
}

function injectionsFor(container, fullName) {
  let registry = container.registry;
  let splitName = fullName.split(':');
  let type = splitName[0];

  let injections = buildInjections(container,
                                   registry.getTypeInjections(type),
                                   registry.getInjections(fullName));
  injections._debugContainerKey = fullName;

  setOwner(injections, container.owner);

  return injections;
}

function instantiate(factory, props = {}, container, fullName) {
  let lazyInjections, validationCache;

  if (container.registry.getOption(fullName, 'instantiate') === false) {
    return factory;
  }

  if (factory) {
    if (typeof factory.create !== 'function') {
      throw new Error(`Failed to create an instance of '${fullName}'. Most likely an improperly defined class or` +
                      ` an invalid module export.`);
    }

    validationCache = container.validationCache;

    runInDebug(() => {
      // Ensure that all lazy injections are valid at instantiation time
      if (!validationCache[fullName] && typeof factory._lazyInjections === 'function') {
        lazyInjections = factory._lazyInjections();
        lazyInjections = container.registry.normalizeInjectionsHash(lazyInjections);

        container.registry.validateInjections(lazyInjections);
      }
    });

    validationCache[fullName] = true;

    let obj;

    if (typeof factory.extend === 'function') {
      // assume the factory was extendable and is already injected
      obj = factory.create(props);
    } else {
      // assume the factory was extendable
      // to create time injections
      // TODO: support new'ing for instantiation and merge injections for pure JS Functions
      let injections = injectionsFor(container, fullName);

      // Ensure that a container is available to an object during instantiation.
      // TODO - remove when Ember reaches v3.0.0
      // This "fake" container will be replaced after instantiation with a
      // property that raises deprecations every time it is accessed.
      injections.container = container._fakeContainerToInject;
      obj = factory.create(assign({}, injections, props));

      // TODO - remove when Ember reaches v3.0.0
      if (!Object.isFrozen(obj) && 'container' in obj) {
        injectDeprecatedContainer(obj, container);
      }
    }

    return obj;
  }
}

function factoryInjectionsFor(container, fullName) {
  let registry = container.registry;
  let splitName = fullName.split(':');
  let type = splitName[0];

  let factoryInjections = buildInjections(container,
                                          registry.getFactoryTypeInjections(type),
                                          registry.getFactoryInjections(fullName));
  factoryInjections._debugContainerKey = fullName;

  return factoryInjections;
}

// TODO - remove when Ember reaches v3.0.0
function injectDeprecatedContainer(object, container) {
  Object.defineProperty(object, 'container', {
    configurable: true,
    enumerable: false,
    get() {
      deprecate('Using the injected `container` is deprecated. Please use the `getOwner` helper instead to access the owner of this object.',
                false,
                { id: 'ember-application.injected-container', until: '3.0.0', url: 'http://emberjs.com/deprecations/v2.x#toc_injected-container-access' });
      return this[CONTAINER_OVERRIDE] || container;
    },

    set(value) {
      deprecate(
        `Providing the \`container\` property to ${this} is deprecated. Please use \`Ember.setOwner\` or \`owner.ownerInjection()\` instead to provide an owner to the instance being created.`,
        false,
        { id: 'ember-application.injected-container', until: '3.0.0', url: 'http://emberjs.com/deprecations/v2.x#toc_injected-container-access' }
      );

      this[CONTAINER_OVERRIDE] = value;

      return value;
    }
  });
}

function eachDestroyable(container, callback) {
  let cache = container.cache;
  let keys = Object.keys(cache);

  for (let i = 0; i < keys.length; i++) {
    let key = keys[i];
    let value = cache[key];

    if (container.registry.getOption(key, 'instantiate') !== false) {
      callback(value);
    }
  }
}

function resetCache(container) {
  eachDestroyable(container, (value) => {
    if (value.destroy) {
      value.destroy();
    }
  });

  container.cache.dict = dictionary(null);
}

function resetMember(container, fullName) {
  let member = container.cache[fullName];

  delete container.factoryCache[fullName];

  if (member) {
    delete container.cache[fullName];

    if (member.destroy) {
      member.destroy();
    }
  }
}

export function buildFakeContainerWithDeprecations(container) {
  let fakeContainer = {};
  let propertyMappings = {
    lookup: 'lookup',
    lookupFactory: '_lookupFactory'
  };

  for (let containerProperty in propertyMappings) {
    fakeContainer[containerProperty] = buildFakeContainerFunction(container, containerProperty, propertyMappings[containerProperty]);
  }

  return fakeContainer;
}

function buildFakeContainerFunction(container, containerProperty, ownerProperty) {
  return function() {
    deprecate(
      `Using the injected \`container\` is deprecated. Please use the \`getOwner\` helper to access the owner of this object and then call \`${ownerProperty}\` instead.`,
      false,
      {
        id: 'ember-application.injected-container',
        until: '3.0.0',
        url: 'http://emberjs.com/deprecations/v2.x#toc_injected-container-access'
      }
    );
    return container[containerProperty](...arguments);
  };
}

class DeprecatedFactoryManager {
  constructor(container, factory, fullName) {
    this.container = container;
    this.class = factory;
    this.fullName = fullName;
  }

  create(props = {}) {
    return instantiate(this.class, props, this.container, this.fullName);
  }
}

class FactoryManager {
  constructor(container, factory, fullName, normalizedName) {
    this.container = container;
    this.class = factory;
    this.fullName = fullName;
    this.normalizedName = normalizedName;
  }

  create(options = {}) {
    let injections = injectionsFor(this.container, this.normalizedName);
    let props = assign({}, injections, options);

    props[NAME_KEY] = this.container.registry.makeToString(this.class, this.fullName);

    runInDebug(() => {
      let lazyInjections;
      let validationCache = this.container.validationCache;
      // Ensure that all lazy injections are valid at instantiation time
      if (!validationCache[this.fullName] && this.class && typeof this.class._lazyInjections === 'function') {
        lazyInjections = this.class._lazyInjections();
        lazyInjections = this.container.registry.normalizeInjectionsHash(lazyInjections);

        this.container.registry.validateInjections(lazyInjections);
      }

      validationCache[this.fullName] = true;
    });

    if (!this.class.create) {
      throw new Error(`Failed to create an instance of '${this.normalizedName}'. Most likely an improperly defined class or` +
                  ` an invalid module export.`);
    }

    if (this.class.prototype) {
      injectDeprecatedContainer(this.class.prototype, this.container);
    }

    return this.class.create(props);
  }
}
