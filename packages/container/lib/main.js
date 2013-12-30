/**
Public api for the container is still in flux.
The public api, specified on the application namespace should be considered the stable api.
// @module container
  @private
*/

/*
 Flag to enable/disable model factory injections (disabled by default)
 If model factory injections are enabled, models should not be
 accessed globally (only through `container.lookupFactory('model:modelName'))`);
*/
Ember.MODEL_FACTORY_INJECTIONS = false || !!Ember.ENV.MODEL_FACTORY_INJECTIONS;

define("container",
  [],
  function() {
    "use strict";

    // A safe and simple inheriting object.
    function InheritingDict(parent) {
      this.parent = parent;
      this.dict = {};
    }

    InheritingDict.prototype = {

      /**
        @property parent
        @type InheritingDict
        @default null
      */

      parent: null,

      /**
        Object used to store the current nodes data.

        @property dict
        @type Object
        @default Object
      */
      dict: null,

      /**
        Retrieve the value given a key, if the value is present at the current
        level use it, otherwise walk up the parent hierarchy and try again. If
        no matching key is found, return undefined.

        @method get
        @param {String} key
        @return {any}
      */
      get: function(key) {
        var dict = this.dict;

        if (dict.hasOwnProperty(key)) {
          return dict[key];
        }

        if (this.parent) {
          return this.parent.get(key);
        }
      },

      /**
        Set the given value for the given key, at the current level.

        @method set
        @param {String} key
        @param {Any} value
      */
      set: function(key, value) {
        this.dict[key] = value;
      },

      /**
        Delete the given key

        @method remove
        @param {String} key
      */
      remove: function(key) {
        delete this.dict[key];
      },

      /**
        Check for the existence of given a key, if the key is present at the current
        level return true, otherwise walk up the parent hierarchy and try again. If
        no matching key is found, return false.

        @method has
        @param {String} key
        @return {Boolean}
      */
      has: function(key) {
        var dict = this.dict;

        if (dict.hasOwnProperty(key)) {
          return true;
        }

        if (this.parent) {
          return this.parent.has(key);
        }

        return false;
      },

      /**
        Iterate and invoke a callback for each local key-value pair.

        @method eachLocal
        @param {Function} callback
        @param {Object} binding
      */
      eachLocal: function(callback, binding) {
        var dict = this.dict;

        for (var prop in dict) {
          if (dict.hasOwnProperty(prop)) {
            callback.call(binding, prop, dict[prop]);
          }
        }
      }
    };


    // A lightweight container that helps to assemble and decouple components.
    // Public api for the container is still in flux.
    // The public api, specified on the application namespace should be considered the stable api.
    function Container(parent) {
      this.parent = parent;
      this.children = [];

      this.resolver = parent && parent.resolver || function() {};

      this.registry = new InheritingDict(parent && parent.registry);
      this.cache = new InheritingDict(parent && parent.cache);
      this.factoryCache = new InheritingDict(parent && parent.factoryCache);
      this.resolveCache = new InheritingDict(parent && parent.resolveCache);
      this.typeInjections = new InheritingDict(parent && parent.typeInjections);
      this.injections = {};

      this.factoryTypeInjections = new InheritingDict(parent && parent.factoryTypeInjections);
      this.factoryInjections = {};

      this._options = new InheritingDict(parent && parent._options);
      this._typeOptions = new InheritingDict(parent && parent._typeOptions);
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
        Sets a key-value pair on the current container. If a parent container,
        has the same key, once set on a child, the parent and child will diverge
        as expected.

        @method set
        @param {Object} object
        @param {String} key
        @param {any} value
      */
      set: function(object, key, value) {
        object[key] = value;
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
        validateFullName(fullName);

        if (factory === undefined) {
          throw new TypeError('Attempting to register an unknown factory: `' + fullName + '`');
        }

        var normalizedName = this.normalize(fullName);

        if (this.cache.has(normalizedName)) {
          throw new Error('Cannot re-register: `' + fullName +'`, as it has already been looked up.');
        }

        this.registry.set(normalizedName, factory);
        this._options.set(normalizedName, options || {});
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
        validateFullName(fullName);

        var normalizedName = this.normalize(fullName);

        this.registry.remove(normalizedName);
        this.cache.remove(normalizedName);
        this.factoryCache.remove(normalizedName);
        this.resolveCache.remove(normalizedName);
        this._options.remove(normalizedName);
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
        the oppertunity to resolve the fullName, otherwise it will fallback
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
        validateFullName(fullName);

        var normalizedName = this.normalize(fullName);
        var cached = this.resolveCache.get(normalizedName);

        if (cached) { return cached; }

        var resolved = this.resolver(normalizedName) || this.registry.get(normalizedName);

        this.resolveCache.set(normalizedName, resolved);

        return resolved;
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

        @method normalize
        @param {String} fullName
        @return {string} normalized fullName
      */
      normalize: function(fullName) {
        return fullName;
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
        twitter instanceof Twitter; // => true

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
        validateFullName(fullName);
        return lookup(this, this.normalize(fullName), options);
      },

      /**
        Given a fullName return the corresponding factory.

        @method lookupFactory
        @param {String} fullName
        @return {any}
      */
      lookupFactory: function(fullName) {
        validateFullName(fullName);
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
        validateFullName(fullName);
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

        this._typeOptions.set(type, options);
      },

      /**
        @method options
        @param {String} type
        @param {Object} options
      */
      options: function(type, options) {
        this.optionsForType(type, options);
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
        validateFullName(fullName);
        if (this.parent) { illegalChildOperation('typeInjection'); }

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

        validateFullName(fullName);
        var normalizedName = this.normalize(fullName);

        addInjection(this.injections, normalizedName, property, normalizedInjectionName);
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

        validateFullName(fullName);

        addInjection(this.factoryInjections, normalizedName, property, normalizedInjectionName);
      },

      /**
        A depth first traversal, destroying the container, its descendant containers and all
        their managed objects.

        @method destroy
      */
      destroy: function() {
        for (var i=0, l=this.children.length; i<l; i++) {
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
        for (var i=0, l=this.children.length; i<l; i++) {
          resetCache(this.children[i]);
        }
        resetCache(this);
      }
    };

    function has(container, fullName){
      if (container.cache.has(fullName)) {
        return true;
      }

      return !!container.resolve(fullName);
    }

    function lookup(container, fullName, options) {
      options = options || {};

      if (container.cache.has(fullName) && options.singleton !== false) {
        return container.cache.get(fullName);
      }

      var value = instantiate(container, fullName);

      if (value === undefined) { return; }

      if (isSingleton(container, fullName) && options.singleton !== false) {
        container.cache.set(fullName, value);
      }

      return value;
    }

    function illegalChildOperation(operation) {
      throw new Error(operation + " is not currently supported on child containers");
    }

    function isSingleton(container, fullName) {
      var singleton = option(container, fullName, 'singleton');

      return singleton !== false;
    }

    function buildInjections(container, injections) {
      var hash = {};

      if (!injections) { return hash; }

      var injection, injectable;

      for (var i=0, l=injections.length; i<l; i++) {
        injection = injections[i];
        injectable = lookup(container, injection.fullName);

        if (injectable !== undefined) {
          hash[injection.property] = injectable;
        } else {
          throw new Error('Attempting to inject an unknown injection: `' + injection.fullName + '`');
        }
      }

      return hash;
    }

    function option(container, fullName, optionName) {
      var options = container._options.get(fullName);

      if (options && options[optionName] !== undefined) {
        return options[optionName];
      }

      var type = fullName.split(":")[0];
      options = container._typeOptions.get(type);

      if (options) {
        return options[optionName];
      }
    }

    function factoryFor(container, fullName) {
      var name = fullName;
      var factory = container.resolve(name);
      var injectedFactory;
      var cache = container.factoryCache;
      var type = fullName.split(":")[0];

      if (factory === undefined) { return; }

      if (cache.has(fullName)) {
        return cache.get(fullName);
      }

      if (!factory || typeof factory.extend !== 'function' || (!Ember.MODEL_FACTORY_INJECTIONS && type === 'model')) {
        // TODO: think about a 'safe' merge style extension
        // for now just fallback to create time injection
        return factory;
      } else {

        var injections        = injectionsFor(container, fullName);
        var factoryInjections = factoryInjectionsFor(container, fullName);

        factoryInjections._toString = container.makeToString(factory, fullName);

        injectedFactory = factory.extend(injections);
        injectedFactory.reopenClass(factoryInjections);

        cache.set(fullName, injectedFactory);

        return injectedFactory;
      }
    }

    function injectionsFor(container ,fullName) {
      var splitName = fullName.split(":"),
        type = splitName[0],
        injections = [];

      injections = injections.concat(container.typeInjections.get(type) || []);
      injections = injections.concat(container.injections[fullName] || []);

      injections = buildInjections(container, injections);
      injections._debugContainerKey = fullName;
      injections.container = container;

      return injections;
    }

    function factoryInjectionsFor(container, fullName) {
      var splitName = fullName.split(":"),
        type = splitName[0],
        factoryInjections = [];

      factoryInjections = factoryInjections.concat(container.factoryTypeInjections.get(type) || []);
      factoryInjections = factoryInjections.concat(container.factoryInjections[fullName] || []);

      factoryInjections = buildInjections(container, factoryInjections);
      factoryInjections._debugContainerKey = fullName;

      return factoryInjections;
    }

    function instantiate(container, fullName) {
      var factory = factoryFor(container, fullName);

      if (option(container, fullName, 'instantiate') === false) {
        return factory;
      }

      if (factory) {
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
      container.cache.eachLocal(function(key, value) {
        if (option(container, key, 'instantiate') === false) { return; }
        callback(value);
      });
    }

    function resetCache(container) {
      container.cache.eachLocal(function(key, value) {
        if (option(container, key, 'instantiate') === false) { return; }
        value.destroy();
      });
      container.cache.dict = {};
    }

    function addTypeInjection(rules, type, property, fullName) {
      var injections = rules.get(type);

      if (!injections) {
        injections = [];
        rules.set(type, injections);
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
    }

    function addInjection(rules, factoryName, property, injectionName) {
      var injections = rules[factoryName] = rules[factoryName] || [];
      injections.push({ property: property, fullName: injectionName });
    }

    return Container;
});
