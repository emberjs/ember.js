import Ember from 'ember-metal/core'; // Ember.assert
import emberKeys from "ember-metal/keys";
import dictionary from 'ember-metal/dictionary';

// TODO - Temporary workaround for v0.4.0 of the ES6 transpiler, which lacks support for circular dependencies.
// See the below usage of requireModule. Instead, it should be possible to simply `import Registry from './registry';`
var Registry;

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
  this._registry = registry || (function() {
    Ember.deprecate("A container should only be created for an already instantiated registry. For backward compatibility, an isolated registry will be instantiated just for this container.");

    // TODO - See note above about transpiler import workaround.
    if (!Registry) { Registry = requireModule('container/registry')['default']; }

    return new Registry();
  }());

  this.cache        = dictionary(options && options.cache ? options.cache : null);
  this.factoryCache = dictionary(options && options.factoryCache ? options.factoryCache : null);
  this.validationCache = dictionary(options && options.validationCache ? options.validationCache : null);
}

Container.prototype = {
  /**
   @private

   @property _registry
   @type Registry
   @since 1.11.0
   */
  _registry: null,

  /**
   @property cache
   @type InheritingDict
   */
  cache: null,

  /**
   @property factoryCache
   @type InheritingDict
   */
  factoryCache: null,

  /**
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

   If singletons are not wanted an optional flag can be provided at lookup.

   ```javascript
   var registry = new Registry();
   var container = registry.container();

   registry.register('api:twitter', Twitter);

   var twitter = container.lookup('api:twitter', { singleton: false });
   var twitter2 = container.lookup('api:twitter', { singleton: false });

   twitter === twitter2; //=> false
   ```

   @method lookup
   @param {String} fullName
   @param {Object} options
   @return {any}
   */
  lookup(fullName, options) {
    Ember.assert('fullName must be a proper full name', this._registry.validateFullName(fullName));
    return lookup(this, this._registry.normalize(fullName), options);
  },

  /**
   Given a fullName return the corresponding factory.

   @method lookupFactory
   @param {String} fullName
   @return {any}
   */
  lookupFactory(fullName) {
    Ember.assert('fullName must be a proper full name', this._registry.validateFullName(fullName));
    return factoryFor(this, this._registry.normalize(fullName));
  },

  /**
   A depth first traversal, destroying the container, its descendant containers and all
   their managed objects.

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

   @method reset
   @param {String} fullName optional key to reset; if missing, resets everything
   */
  reset(fullName) {
    if (arguments.length > 0) {
      resetMember(this, this._registry.normalize(fullName));
    } else {
      resetCache(this);
    }
  }
};

(function exposeRegistryMethods() {
  var methods = [
    'register',
    'unregister',
    'resolve',
    'normalize',
    'typeInjection',
    'injection',
    'factoryInjection',
    'factoryTypeInjection',
    'has',
    'options',
    'optionsForType'
  ];

  function exposeRegistryMethod(method) {
    Container.prototype[method] = function() {
      Ember.deprecate(method + ' should be called on the registry instead of the container');
      return this._registry[method].apply(this._registry, arguments);
    };
  }

  for (var i = 0, l = methods.length; i < l; i++) {
    exposeRegistryMethod(methods[i]);
  }
})();

function lookup(container, fullName, options) {
  options = options || {};

  if (container.cache[fullName] && options.singleton !== false) {
    return container.cache[fullName];
  }

  var value = instantiate(container, fullName);

  if (value === undefined) { return; }

  if (container._registry.getOption(fullName, 'singleton') !== false && options.singleton !== false) {
    container.cache[fullName] = value;
  }

  return value;
}

function buildInjections(container) {
  var hash = {};

  if (arguments.length > 1) {
    var injectionArgs = Array.prototype.slice.call(arguments, 1);
    var injections = [];
    var injection;

    for (var i = 0, l = injectionArgs.length; i < l; i++) {
      if (injectionArgs[i]) {
        injections = injections.concat(injectionArgs[i]);
      }
    }

    container._registry.validateInjections(injections);

    for (i = 0, l = injections.length; i < l; i++) {
      injection = injections[i];
      hash[injection.property] = lookup(container, injection.fullName);
    }
  }

  return hash;
}

function factoryFor(container, fullName) {
  var cache = container.factoryCache;
  if (cache[fullName]) {
    return cache[fullName];
  }
  var registry = container._registry;
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

    factoryInjections._toString = registry.makeToString(factory, fullName);

    var injectedFactory = factory.extend(injections);
    injectedFactory.reopenClass(factoryInjections);

    if (factory && typeof factory._onLookup === 'function') {
      factory._onLookup(fullName);
    }

    cache[fullName] = injectedFactory;

    return injectedFactory;
  }
}

function injectionsFor(container, fullName) {
  var registry = container._registry;
  var splitName = fullName.split(':');
  var type = splitName[0];

  var injections = buildInjections(container,
                                   registry.getTypeInjections(type),
                                   registry.getInjections(fullName));
  injections._debugContainerKey = fullName;
  injections.container = container;

  return injections;
}

function factoryInjectionsFor(container, fullName) {
  var registry = container._registry;
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

  if (container._registry.getOption(fullName, 'instantiate') === false) {
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
      lazyInjections = container._registry.normalizeInjectionsHash(lazyInjections);

      container._registry.validateInjections(lazyInjections);
    }

    validationCache[fullName] = true;

    if (typeof factory.extend === 'function') {
      // assume the factory was extendable and is already injected
      return factory.create();
    } else {
      // assume the factory was extendable
      // to create time injections
      // TODO: support new'ing for instantiation and merge injections for pure JS Functions
      return factory.create(injectionsFor(container, fullName));
    }
  }
}

function eachDestroyable(container, callback) {
  var cache = container.cache;
  var keys = emberKeys(cache);
  var key, value;

  for (var i = 0, l = keys.length; i < l; i++) {
    key = keys[i];
    value = cache[key];

    if (container._registry.getOption(key, 'instantiate') !== false) {
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
