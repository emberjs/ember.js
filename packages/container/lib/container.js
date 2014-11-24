import Ember from 'ember-metal/core'; // Ember.assert
import emberKeys from "ember-metal/keys";
import dictionary from 'ember-metal/dictionary';

// A lightweight container that helps to assemble and decouple components.
// Public api for the container is still in flux.
// The public api, specified on the application namespace should be considered the stable api.
function Container(parent) {
  this.parent = parent;
  this.children = [];

  this.resolver = parent && parent.resolver || function() {};

  this.registry       = dictionary(parent ? parent.registry : null);
  this.cache          = dictionary(parent ? parent.cache : null);
  this.factoryCache   = dictionary(parent ? parent.factoryCache : null);
  this.resolveCache   = dictionary(parent ? parent.resolveCache : null);
  this.typeInjections = dictionary(parent ? parent.typeInjections : null);
  this.injections     = dictionary(null);
  this.normalizeCache = dictionary(null);

  this.factoryTypeInjections = dictionary(parent ? parent.factoryTypeInjections : null);
  this.factoryInjections     = dictionary(null);

  this._options     = dictionary(parent ? parent._options : null);
  this._typeOptions = dictionary(parent ? parent._typeOptions : null);
}

Container.prototype = {

  /**
    @property parent
    @type Container
    @default null
  */
  parent: null,

  /**
    @property children
    @type Array
    @default []
  */
  children: null,

  /**
    @property resolver
    @type function
  */
  resolver: null,

  /**
    @property registry
    @type InheritingDict
  */
  registry: null,

  /**
    @property cache
    @type InheritingDict
  */
  cache: null,

  /**
    @property typeInjections
    @type InheritingDict
  */
  typeInjections: null,

  /**
    @property injections
    @type Object
    @default {}
  */
  injections: null,

  /**
    @private

    @property _options
    @type InheritingDict
    @default null
  */
  _options: null,

  /**
    @private

    @property _typeOptions
    @type InheritingDict
  */
  _typeOptions: null,

  /**
    Returns a new child of the current container. These children are configured
    to correctly inherit from the current container.

    @method child
    @return {Container}
  */
  child: function() {
    var container = new Container(this);
    this.children.push(container);
    return container;
  },

  /**
    Registers a factory for later injection.

    Example:

    ```javascript
    var container = new Container();

    container.register('model:user', Person, {singleton: false });
    container.register('fruit:favorite', Orange);
    container.register('communication:main', Email, {singleton: false});
    ```

    @method register
    @param {String} fullName
    @param {Function} factory
    @param {Object} options
  */
  register: function(fullName, factory, options) {
    Ember.assert('fullName must be a proper full name', validateFullName(fullName));

    if (factory === undefined) {
      throw new TypeError('Attempting to register an unknown factory: `' + fullName + '`');
    }

    var normalizedName = this.normalize(fullName);

    if (normalizedName in this.cache) {
      throw new Error('Cannot re-register: `' + fullName +'`, as it has already been looked up.');
    }

    this.registry[normalizedName] = factory;
    this._options[normalizedName] = (options || {});
  },

  /**
    Unregister a fullName

    ```javascript
    var container = new Container();
    container.register('model:user', User);

    container.lookup('model:user') instanceof User //=> true

    container.unregister('model:user')
    container.lookup('model:user') === undefined //=> true
    ```

    @method unregister
    @param {String} fullName
   */
  unregister: function(fullName) {
    Ember.assert('fullName must be a proper full name', validateFullName(fullName));

    var normalizedName = this.normalize(fullName);

    delete this.registry[normalizedName];
    delete this.cache[normalizedName];
    delete this.factoryCache[normalizedName];
    delete this.resolveCache[normalizedName];
    delete this._options[normalizedName];
  },

  /**
    Given a fullName return the corresponding factory.

    By default `resolve` will retrieve the factory from
    its container's registry.

    ```javascript
    var container = new Container();
    container.register('api:twitter', Twitter);

    container.resolve('api:twitter') // => Twitter
    ```

    Optionally the container can be provided with a custom resolver.
    If provided, `resolve` will first provide the custom resolver
    the opportunity to resolve the fullName, otherwise it will fallback
    to the registry.

    ```javascript
    var container = new Container();
    container.resolver = function(fullName) {
      // lookup via the module system of choice
    };

    // the twitter factory is added to the module system
    container.resolve('api:twitter') // => Twitter
    ```

    @method resolve
    @param {String} fullName
    @return {Function} fullName's factory
  */
  resolve: function(fullName) {
    Ember.assert('fullName must be a proper full name', validateFullName(fullName));
    return resolve(this, this.normalize(fullName));
  },

  /**
    A hook that can be used to describe how the resolver will
    attempt to find the factory.

    For example, the default Ember `.describe` returns the full
    class name (including namespace) where Ember's resolver expects
    to find the `fullName`.

    @method describe
    @param {String} fullName
    @return {string} described fullName
  */
  describe: function(fullName) {
    return fullName;
  },

  /**
    A hook to enable custom fullName normalization behaviour

    @method normalizeFullName
    @param {String} fullName
    @return {string} normalized fullName
  */
  normalizeFullName: function(fullName) {
    return fullName;
  },

  /**
    normalize a fullName based on the applications conventions

    @method normalize
    @param {String} fullName
    @return {string} normalized fullName
  */
  normalize: function(fullName) {
    return this.normalizeCache[fullName] || (
      this.normalizeCache[fullName] = this.normalizeFullName(fullName)
    );
  },

  /**
    @method makeToString

    @param {any} factory
    @param {string} fullName
    @return {function} toString function
  */
  makeToString: function(factory, fullName) {
    return factory.toString();
  },

  /**
    Given a fullName return a corresponding instance.

    The default behaviour is for lookup to return a singleton instance.
    The singleton is scoped to the container, allowing multiple containers
    to all have their own locally scoped singletons.

    ```javascript
    var container = new Container();
    container.register('api:twitter', Twitter);

    var twitter = container.lookup('api:twitter');

    twitter instanceof Twitter; // => true

    // by default the container will return singletons
    var twitter2 = container.lookup('api:twitter');
    twitter2 instanceof Twitter; // => true

    twitter === twitter2; //=> true
    ```

    If singletons are not wanted an optional flag can be provided at lookup.

    ```javascript
    var container = new Container();
    container.register('api:twitter', Twitter);

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
    Ember.assert('fullName must be a proper full name', validateFullName(fullName));
    return lookup(this, this.normalize(fullName), options);
  },

  /**
    Given a fullName return the corresponding factory.

    @method lookupFactory
    @param {String} fullName
    @return {any}
  */
  lookupFactory: function(fullName) {
    Ember.assert('fullName must be a proper full name', validateFullName(fullName));
    return factoryFor(this, this.normalize(fullName));
  },

  /**
    Given a fullName check if the container is aware of its factory
    or singleton instance.

    @method has
    @param {String} fullName
    @return {Boolean}
  */
  has: function(fullName) {
    Ember.assert('fullName must be a proper full name', validateFullName(fullName));
    return has(this, this.normalize(fullName));
  },

  /**
    Allow registering options for all factories of a type.

    ```javascript
    var container = new Container();

    // if all of type `connection` must not be singletons
    container.optionsForType('connection', { singleton: false });

    container.register('connection:twitter', TwitterConnection);
    container.register('connection:facebook', FacebookConnection);

    var twitter = container.lookup('connection:twitter');
    var twitter2 = container.lookup('connection:twitter');

    twitter === twitter2; // => false

    var facebook = container.lookup('connection:facebook');
    var facebook2 = container.lookup('connection:facebook');

    facebook === facebook2; // => false
    ```

    @method optionsForType
    @param {String} type
    @param {Object} options
  */
  optionsForType: function(type, options) {
    if (this.parent) { illegalChildOperation('optionsForType'); }

    this._typeOptions[type] = options;
  },

  /**
    @method options
    @param {String} fullName
    @param {Object} options
  */
  options: function(fullName, options) {
    options = options || {};
    var normalizedName = this.normalize(fullName);
    this._options[normalizedName] = options;
  },

  /**
    Used only via `injection`.

    Provides a specialized form of injection, specifically enabling
    all objects of one type to be injected with a reference to another
    object.

    For example, provided each object of type `controller` needed a `router`.
    one would do the following:

    ```javascript
    var container = new Container();

    container.register('router:main', Router);
    container.register('controller:user', UserController);
    container.register('controller:post', PostController);

    container.typeInjection('controller', 'router', 'router:main');

    var user = container.lookup('controller:user');
    var post = container.lookup('controller:post');

    user.router instanceof Router; //=> true
    post.router instanceof Router; //=> true

    // both controllers share the same router
    user.router === post.router; //=> true
    ```

    @private
    @method typeInjection
    @param {String} type
    @param {String} property
    @param {String} fullName
  */
  typeInjection: function(type, property, fullName) {
    Ember.assert('fullName must be a proper full name', validateFullName(fullName));

    if (this.parent) { illegalChildOperation('typeInjection'); }

    var fullNameType = fullName.split(':')[0];
    if (fullNameType === type) {
      throw new Error('Cannot inject a `' + fullName +
                      '` on other ' + type +
                      '(s). Register the `' + fullName +
                      '` as a different type and perform the typeInjection.');
    }

    addTypeInjection(this.typeInjections, type, property, fullName);
  },

  /**
    Defines injection rules.

    These rules are used to inject dependencies onto objects when they
    are instantiated.

    Two forms of injections are possible:

    * Injecting one fullName on another fullName
    * Injecting one fullName on a type

    Example:

    ```javascript
    var container = new Container();

    container.register('source:main', Source);
    container.register('model:user', User);
    container.register('model:post', Post);

    // injecting one fullName on another fullName
    // eg. each user model gets a post model
    container.injection('model:user', 'post', 'model:post');

    // injecting one fullName on another type
    container.injection('model', 'source', 'source:main');

    var user = container.lookup('model:user');
    var post = container.lookup('model:post');

    user.source instanceof Source; //=> true
    post.source instanceof Source; //=> true

    user.post instanceof Post; //=> true

    // and both models share the same source
    user.source === post.source; //=> true
    ```

    @method injection
    @param {String} factoryName
    @param {String} property
    @param {String} injectionName
  */
  injection: function(fullName, property, injectionName) {
    if (this.parent) { illegalChildOperation('injection'); }

    validateFullName(injectionName);
    var normalizedInjectionName = this.normalize(injectionName);

    if (fullName.indexOf(':') === -1) {
      return this.typeInjection(fullName, property, normalizedInjectionName);
    }

    Ember.assert('fullName must be a proper full name', validateFullName(fullName));
    var normalizedName = this.normalize(fullName);

    if (this.cache[normalizedName]) {
      throw new Error("Attempted to register an injection for a type that has already been looked up. ('" +
                      normalizedName + "', '" +
                      property + "', '" +
                      injectionName + "')");
    }

    addInjection(initRules(this.injections, normalizedName), property, normalizedInjectionName);
  },


  /**
    Used only via `factoryInjection`.

    Provides a specialized form of injection, specifically enabling
    all factory of one type to be injected with a reference to another
    object.

    For example, provided each factory of type `model` needed a `store`.
    one would do the following:

    ```javascript
    var container = new Container();

    container.register('store:main', SomeStore);

    container.factoryTypeInjection('model', 'store', 'store:main');

    var store = container.lookup('store:main');
    var UserFactory = container.lookupFactory('model:user');

    UserFactory.store instanceof SomeStore; //=> true
    ```

    @private
    @method factoryTypeInjection
    @param {String} type
    @param {String} property
    @param {String} fullName
  */
  factoryTypeInjection: function(type, property, fullName) {
    if (this.parent) { illegalChildOperation('factoryTypeInjection'); }

    addTypeInjection(this.factoryTypeInjections, type, property, this.normalize(fullName));
  },

  /**
    Defines factory injection rules.

    Similar to regular injection rules, but are run against factories, via
    `Container#lookupFactory`.

    These rules are used to inject objects onto factories when they
    are looked up.

    Two forms of injections are possible:

  * Injecting one fullName on another fullName
  * Injecting one fullName on a type

    Example:

    ```javascript
    var container = new Container();

    container.register('store:main', Store);
    container.register('store:secondary', OtherStore);
    container.register('model:user', User);
    container.register('model:post', Post);

    // injecting one fullName on another type
    container.factoryInjection('model', 'store', 'store:main');

    // injecting one fullName on another fullName
    container.factoryInjection('model:post', 'secondaryStore', 'store:secondary');

    var UserFactory = container.lookupFactory('model:user');
    var PostFactory = container.lookupFactory('model:post');
    var store = container.lookup('store:main');

    UserFactory.store instanceof Store; //=> true
    UserFactory.secondaryStore instanceof OtherStore; //=> false

    PostFactory.store instanceof Store; //=> true
    PostFactory.secondaryStore instanceof OtherStore; //=> true

    // and both models share the same source instance
    UserFactory.store === PostFactory.store; //=> true
    ```

    @method factoryInjection
    @param {String} factoryName
    @param {String} property
    @param {String} injectionName
  */
  factoryInjection: function(fullName, property, injectionName) {
    if (this.parent) { illegalChildOperation('injection'); }

    var normalizedName = this.normalize(fullName);
    var normalizedInjectionName = this.normalize(injectionName);

    validateFullName(injectionName);

    if (fullName.indexOf(':') === -1) {
      return this.factoryTypeInjection(normalizedName, property, normalizedInjectionName);
    }

    Ember.assert('fullName must be a proper full name', validateFullName(fullName));

    if (this.factoryCache[normalizedName]) {
      throw new Error('Attempted to register a factoryInjection for a type that has already ' +
        'been looked up. (\'' + normalizedName + '\', \'' + property + '\', \'' + injectionName + '\')');
    }

    addInjection(initRules(this.factoryInjections, normalizedName), property, normalizedInjectionName);
  },

  /**
    A depth first traversal, destroying the container, its descendant containers and all
    their managed objects.

    @method destroy
  */
  destroy: function() {
    for (var i = 0, length = this.children.length; i < length; i++) {
      this.children[i].destroy();
    }

    this.children = [];

    eachDestroyable(this, function(item) {
      item.destroy();
    });

    this.parent = undefined;
    this.isDestroyed = true;
  },

  /**
    @method reset
  */
  reset: function() {
    for (var i = 0, length = this.children.length; i < length; i++) {
      resetCache(this.children[i]);
    }

    resetCache(this);
  }
};

function resolve(container, normalizedName) {
  var cached = container.resolveCache[normalizedName];
  if (cached) { return cached; }

  var resolved = container.resolver(normalizedName) || container.registry[normalizedName];
  container.resolveCache[normalizedName] = resolved;

  return resolved;
}

function has(container, fullName){
  if (container.cache[fullName]) {
    return true;
  }

  return container.resolve(fullName) !== undefined;
}

function lookup(container, fullName, options) {
  options = options || {};

  if (container.cache[fullName] && options.singleton !== false) {
    return container.cache[fullName];
  }

  var value = instantiate(container, fullName);

  if (value === undefined) { return; }

  if (isSingleton(container, fullName) && options.singleton !== false) {
    container.cache[fullName] = value;
  }

  return value;
}

function illegalChildOperation(operation) {
  throw new Error(operation + ' is not currently supported on child containers');
}

function isSingleton(container, fullName) {
  var singleton = option(container, fullName, 'singleton');

  return singleton !== false;
}

function buildInjections(container, injections) {
  var hash = {};

  if (!injections) { return hash; }

  validateInjections(container, injections);

  var injection;

  for (var i = 0, length = injections.length; i < length; i++) {
    injection = injections[i];
    hash[injection.property] = lookup(container, injection.fullName);
  }

  return hash;
}

function validateInjections(container, injections) {
  if (!injections) { return; }

  var fullName;

  for (var i = 0, length = injections.length; i < length; i++) {
    fullName = injections[i].fullName;

    if (!container.has(fullName)) {
      throw new Error('Attempting to inject an unknown injection: `' + fullName + '`');
    }
  }
}

function option(container, fullName, optionName) {
  var options = container._options[fullName];

  if (options && options[optionName] !== undefined) {
    return options[optionName];
  }

  var type = fullName.split(':')[0];
  options = container._typeOptions[type];

  if (options) {
    return options[optionName];
  }
}

function factoryFor(container, fullName) {
  var cache = container.factoryCache;
  if (cache[fullName]) {
    return cache[fullName];
  }
  var factory = container.resolve(fullName);
  if (factory === undefined) { return; }

  var type = fullName.split(':')[0];
  if (!factory || typeof factory.extend !== 'function' || (!Ember.MODEL_FACTORY_INJECTIONS && type === 'model')) {
    // TODO: think about a 'safe' merge style extension
    // for now just fallback to create time injection
    cache[fullName] = factory;
    return factory;
  } else {
    var injections = injectionsFor(container, fullName);
    var factoryInjections = factoryInjectionsFor(container, fullName);

    factoryInjections._toString = container.makeToString(factory, fullName);

    var injectedFactory = factory.extend(injections);
    injectedFactory.reopenClass(factoryInjections);

    cache[fullName] = injectedFactory;

    return injectedFactory;
  }
}

function injectionsFor(container, fullName) {
  var splitName = fullName.split(':');
  var type = splitName[0];
  var injections = [];

  injections = injections.concat(container.typeInjections[type] || []);
  injections = injections.concat(container.injections[fullName] || []);

  injections = buildInjections(container, injections);
  injections._debugContainerKey = fullName;
  injections.container = container;

  return injections;
}

function factoryInjectionsFor(container, fullName) {
  var splitName = fullName.split(':');
  var type = splitName[0];
  var factoryInjections = [];

  factoryInjections = factoryInjections.concat(container.factoryTypeInjections[type] || []);
  factoryInjections = factoryInjections.concat(container.factoryInjections[fullName] || []);

  factoryInjections = buildInjections(container, factoryInjections);
  factoryInjections._debugContainerKey = fullName;

  return factoryInjections;
}

function normalizeInjectionsHash(hash) {
  var injections = [];

  for (var key in hash) {
    if (hash.hasOwnProperty(key)) {
      Ember.assert("Expected a proper full name, given '" + hash[key] + "'", validateFullName(hash[key]));

      addInjection(injections, key, hash[key]);
    }
  }

  return injections;
}

function instantiate(container, fullName) {
  var factory = factoryFor(container, fullName);
  var lazyInjections;

  if (option(container, fullName, 'instantiate') === false) {
    return factory;
  }

  if (factory) {
    if (typeof factory.create !== 'function') {
      throw new Error('Failed to create an instance of \'' + fullName + '\'. ' +
        'Most likely an improperly defined class or an invalid module export.');
    }

    if (Ember.FEATURES.isEnabled('ember-metal-injected-properties')) {
      // Ensure that all lazy injections are valid at instantiation time
      if (typeof factory.lazyInjections === 'function') {
        lazyInjections = factory.lazyInjections();

        validateInjections(container, normalizeInjectionsHash(lazyInjections));
      }
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

    if (option(container, key, 'instantiate') !== false) {
      callback(value);
    }
  }
}

function resetCache(container) {
  eachDestroyable(container, function(value) {
    value.destroy();
  });

  container.cache.dict = dictionary(null);
}

function addTypeInjection(rules, type, property, fullName) {
  var injections = rules[type];

  if (!injections) {
    injections = [];
    rules[type] = injections;
  }

  injections.push({
    property: property,
    fullName: fullName
  });
}

var VALID_FULL_NAME_REGEXP = /^[^:]+.+:[^:]+$/;
function validateFullName(fullName) {
  if (!VALID_FULL_NAME_REGEXP.test(fullName)) {
    throw new TypeError('Invalid Fullname, expected: `type:name` got: ' + fullName);
  }
  return true;
}

function initRules(rules, factoryName) {
  return rules[factoryName] || (rules[factoryName] = []);
}

function addInjection(injections, property, injectionName) {
  injections.push({
    property: property,
    fullName: injectionName
  });
}

export default Container;
