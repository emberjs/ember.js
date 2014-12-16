import Ember from 'ember-metal/core'; // Ember.assert
import emberKeys from "ember-metal/keys";
import dictionary from 'ember-metal/dictionary';
import Registry from 'container/registry';

/*
 TODO: Questions to resolve due to Registry / Container split:

 * When registry.unregister is called, is it important for containers to clear their caches of that item?
 * Do we need the restriction on re-registering a factory for a key that's already been looked up?
 */

// A lightweight container that helps to assemble and decouple components.
// Public api for the container is still in flux.
// The public api, specified on the application namespace should be considered the stable api.
function Container(options) {
  options = options || {};

  this.registry       = options.registry || new Registry();
  this.cache          = dictionary(options.cache || null);
  this.factoryCache   = dictionary(options.factoryCache || null);

  if (Ember.FEATURES.isEnabled('ember-metal-injected-properties')) {
    this.validationCache = dictionary(options.validationCache || null);
  }
}

Container.prototype = {
  /**
   @property registry
   @type Registry
   */
  registry: null,

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
   var container = new Container({registry: registry});

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
   var container = new Container({registry: registry});

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
  lookup: function(fullName, options) {
    Ember.assert('fullName must be a proper full name', this.registry.validateFullName(fullName));
    return lookup(this, this.registry.normalize(fullName), options);
  },

  /**
   Given a fullName return the corresponding factory.

   @method lookupFactory
   @param {String} fullName
   @return {any}
   */
  lookupFactory: function(fullName) {
    Ember.assert('fullName must be a proper full name', this.registry.validateFullName(fullName));
    return factoryFor(this, this.registry.normalize(fullName));
  },

  /**
   A depth first traversal, destroying the container, its descendant containers and all
   their managed objects.

   @method destroy
   */
  destroy: function() {
    eachDestroyable(this, function(item) {
      if (item.destroy) {
        item.destroy();
      }
    });

    this.isDestroyed = true;
  },

  /**
   @method reset
   */
  reset: function(fullName) {
    if (fullName) {
      resetMember(this, this.registry.normalize(fullName));
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
      return this.registry[method].apply(this.registry, arguments);
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

  if (container.registry.getOption(fullName, 'singleton') !== false && options.singleton !== false) {
    container.cache[fullName] = value;
  }

  return value;
}

function buildInjections(container, injections) {
  var hash = {};

  if (!injections) { return hash; }

  container.registry.validateInjections(injections);

  var injection;

  for (var i = 0, length = injections.length; i < length; i++) {
    injection = injections[i];
    hash[injection.property] = lookup(container, injection.fullName);
  }

  return hash;
}

function factoryFor(container, fullName) {
  var cache = container.factoryCache;
  if (cache[fullName]) {
    return cache[fullName];
  }
  var registry = container.registry;
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
  var registry = container.registry;
  var splitName = fullName.split(':');
  var type = splitName[0];
  var injections = [];

  injections = injections.concat(registry.typeInjections[type] || []);
  injections = injections.concat(registry.injections[fullName] || []);

  injections = buildInjections(container, injections);
  injections._debugContainerKey = fullName;
  injections.container = container;

  return injections;
}

function factoryInjectionsFor(container, fullName) {
  var registry = container.registry;
  var splitName = fullName.split(':');
  var type = splitName[0];
  var factoryInjections = [];

  factoryInjections = factoryInjections.concat(registry.factoryTypeInjections[type] || []);
  factoryInjections = factoryInjections.concat(registry.factoryInjections[fullName] || []);

  factoryInjections = buildInjections(container, factoryInjections);
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

    if (Ember.FEATURES.isEnabled('ember-metal-injected-properties')) {
      validationCache = container.validationCache;

      // Ensure that all lazy injections are valid at instantiation time
      if (!validationCache[fullName] && typeof factory._lazyInjections === 'function') {
        lazyInjections = factory._lazyInjections();
        lazyInjections = container.registry.normalizeInjectionsHash(lazyInjections);

        container.registry.validateInjections(lazyInjections);
      }

      validationCache[fullName] = true;
    }

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
  if (member) {
    if (member.destroy) {
      member.destroy();
    }
    delete container.cache[fullName];
  }
  delete container.factoryCache[fullName];
}

export default Container;
