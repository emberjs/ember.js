import Ember from 'ember-metal/core';
import { assert, deprecate } from 'ember-metal/debug';
import dictionary from 'ember-metal/dictionary';
import isEnabled from 'ember-metal/features';
import { setOwner, OWNER } from './owner';
import { buildFakeContainerWithDeprecations } from 'ember-runtime/mixins/container_proxy';
import symbol from 'ember-metal/symbol';

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
function Container(registry, options) {
  this.registry        = registry;
  this.owner           = options && options.owner ? options.owner : null;
  this.cache           = dictionary(options && options.cache ? options.cache : null);
  this.factoryCache    = dictionary(options && options.factoryCache ? options.factoryCache : null);
  this.validationCache = dictionary(options && options.validationCache ? options.validationCache : null);
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
   var registry = new Registry();
   var container = registry.container();

   registry.register('api:twitter', Twitter);

   var twitter = container.lookup('api:twitter');

   twitter instanceof Twitter; // => true

   // by default the container will return singletons
   var twitter2 = container.lookup('api:twitter');
   twitter2 instanceof Twitter; // => true

   twitter === twitter2; //=> true
   ```

   If singletons are not wanted, an optional flag can be provided at lookup.

   ```javascript
   var registry = new Registry();
   var container = registry.container();

   registry.register('api:twitter', Twitter);

   var twitter = container.lookup('api:twitter', { singleton: false });
   var twitter2 = container.lookup('api:twitter', { singleton: false });

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
    return factoryFor(this, this.registry.normalize(fullName), options);
  },

  /**
   A depth first traversal, destroying the container, its descendant containers and all
   their managed objects.

   @private
   @method destroy
   */
  destroy() {
    eachDestroyable(this, function(item) {
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
  }
};

function isSingleton(container, fullName) {
  return container.registry.getOption(fullName, 'singleton') !== false;
}

function lookup(container, fullName, options = {}) {
  if (isEnabled('ember-htmlbars-local-lookup')) {
    if (options.source) {
      fullName = container.registry.expandLocalLookup(fullName, options);

      // if expandLocalLookup returns falsey, we do not support local lookup
      if (!fullName) { return; }
    }
  }

  if (container.cache[fullName] !== undefined && options.singleton !== false) {
    return container.cache[fullName];
  }

  var value = instantiate(container, fullName);

  if (value === undefined) { return; }

  if (isSingleton(container, fullName) && options.singleton !== false) {
    container.cache[fullName] = value;
  }

  return value;
}

function markInjectionsAsDynamic(injections) {
  injections._dynamic = true;
}

function areInjectionsDynamic(injections) {
  return !!injections._dynamic;
}

function buildInjections(/* container, ...injections */) {
  var hash = {};

  if (arguments.length > 1) {
    var container = arguments[0];
    var injections = [];
    var injection;

    for (var i = 1, l = arguments.length; i < l; i++) {
      if (arguments[i]) {
        injections = injections.concat(arguments[i]);
      }
    }

    container.registry.validateInjections(injections);

    for (i = 0, l = injections.length; i < l; i++) {
      injection = injections[i];
      hash[injection.property] = lookup(container, injection.fullName);
      if (!isSingleton(container, injection.fullName)) {
        markInjectionsAsDynamic(hash);
      }
    }
  }

  return hash;
}

function factoryFor(container, fullName, options = {}) {
  let registry = container.registry;

  if (isEnabled('ember-htmlbars-local-lookup')) {
    if (options.source) {
      fullName = registry.expandLocalLookup(fullName, options);

      // if expandLocalLookup returns falsey, we do not support local lookup
      if (!fullName) { return; }
    }
  }

  var cache = container.factoryCache;
  if (cache[fullName]) {
    return cache[fullName];
  }
  var factory = registry.resolve(fullName);
  if (factory === undefined) { return; }

  var type = fullName.split(':')[0];
  if (!factory || typeof factory.extend !== 'function' || (!Ember.MODEL_FACTORY_INJECTIONS && type === 'model')) {
    if (factory && typeof factory._onLookup === 'function') {
      factory._onLookup(fullName);
    }

    // TODO: think about a 'safe' merge style extension
    // for now just fallback to create time injection
    cache[fullName] = factory;
    return factory;
  } else {
    var injections = injectionsFor(container, fullName);
    var factoryInjections = factoryInjectionsFor(container, fullName);
    var cacheable = !areInjectionsDynamic(injections) && !areInjectionsDynamic(factoryInjections);

    factoryInjections._toString = registry.makeToString(factory, fullName);

    var injectedFactory = factory.extend(injections);

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
  var registry = container.registry;
  var splitName = fullName.split(':');
  var type = splitName[0];

  var injections = buildInjections(container,
                                   registry.getTypeInjections(type),
                                   registry.getInjections(fullName));
  injections._debugContainerKey = fullName;

  setOwner(injections, container.owner);

  return injections;
}

function factoryInjectionsFor(container, fullName) {
  var registry = container.registry;
  var splitName = fullName.split(':');
  var type = splitName[0];

  var factoryInjections = buildInjections(container,
                                          registry.getFactoryTypeInjections(type),
                                          registry.getFactoryInjections(fullName));
  factoryInjections._debugContainerKey = fullName;

  return factoryInjections;
}

function instantiate(container, fullName) {
  var factory = factoryFor(container, fullName);
  var lazyInjections, validationCache;

  if (container.registry.getOption(fullName, 'instantiate') === false) {
    return factory;
  }

  if (factory) {
    if (typeof factory.create !== 'function') {
      throw new Error('Failed to create an instance of \'' + fullName + '\'. ' +
      'Most likely an improperly defined class or an invalid module export.');
    }

    validationCache = container.validationCache;

    // Ensure that all lazy injections are valid at instantiation time
    if (!validationCache[fullName] && typeof factory._lazyInjections === 'function') {
      lazyInjections = factory._lazyInjections();
      lazyInjections = container.registry.normalizeInjectionsHash(lazyInjections);

      container.registry.validateInjections(lazyInjections);
    }

    validationCache[fullName] = true;

    let obj;

    if (typeof factory.extend === 'function') {
      // assume the factory was extendable and is already injected
      obj = factory.create();
    } else {
      // assume the factory was extendable
      // to create time injections
      // TODO: support new'ing for instantiation and merge injections for pure JS Functions
      let injections = injectionsFor(container, fullName);

      obj = factory.create(injections);
    }

    return obj;
  }
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
  var cache = container.cache;
  var keys = Object.keys(cache);
  var key, value;

  for (var i = 0, l = keys.length; i < l; i++) {
    key = keys[i];
    value = cache[key];

    if (container.registry.getOption(key, 'instantiate') !== false) {
      callback(value);
    }
  }
}

function resetCache(container) {
  eachDestroyable(container, function(value) {
    if (value.destroy) {
      value.destroy();
    }
  });

  container.cache.dict = dictionary(null);
}

function resetMember(container, fullName) {
  var member = container.cache[fullName];

  delete container.factoryCache[fullName];

  if (member) {
    delete container.cache[fullName];

    if (member.destroy) {
      member.destroy();
    }
  }
}

export default Container;
