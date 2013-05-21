define("container",
  [],
  function() {

    function InheritingDict(parent) {
      this.parent = parent;
      this.dict = {};
    }

    InheritingDict.prototype = {
      get: function(key) {
        var dict = this.dict;

        if (dict.hasOwnProperty(key)) {
          return dict[key];
        }

        if (this.parent) {
          return this.parent.get(key);
        }
      },

      set: function(key, value) {
        this.dict[key] = value;
      },

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

      eachLocal: function(callback, binding) {
        var dict = this.dict;

        for (var prop in dict) {
          if (dict.hasOwnProperty(prop)) {
            callback.call(binding, prop, dict[prop]);
          }
        }
      }
    };

    function Container(parent) {
      this.parent = parent;
      this.children = [];

      this.resolver = parent && parent.resolver || function() {};
      this.registry = new InheritingDict(parent && parent.registry);
      this.cache = new InheritingDict(parent && parent.cache);
      this.typeInjections = new InheritingDict(parent && parent.typeInjections);
      this.injections = {};
      this._options = new InheritingDict(parent && parent._options);
      this._typeOptions = new InheritingDict(parent && parent._typeOptions);
    }

    Container.prototype = {
      child: function() {
        var container = new Container(this);
        this.children.push(container);
        return container;
      },

      set: function(object, key, value) {
        object[key] = value;
      },

      register: function(type, name, factory, options) {
        var fullName;

        if (type.indexOf(':') !== -1){
          options = factory;
          factory = name;
          fullName = type;
        } else {
          Ember.deprecate('register("'+type +'", "'+ name+'") is now deprecated in-favour of register("'+type+':'+name+'");', false);
          fullName = type + ":" + name;
        }

        var normalizedName = this.normalize(fullName);

        this.registry.set(normalizedName, factory);
        this._options.set(normalizedName, options || {});
      },

      resolve: function(fullName) {
        return this.resolver(fullName) || this.registry.get(fullName);
      },

      normalize: function(fullName) {
        return fullName;
      },

      lookup: function(fullName, options) {
        fullName = this.normalize(fullName);

        options = options || {};

        if (this.cache.has(fullName) && options.singleton !== false) {
          return this.cache.get(fullName);
        }

        var value = instantiate(this, fullName);

        if (!value) { return; }

        if (isSingleton(this, fullName) && options.singleton !== false) {
          this.cache.set(fullName, value);
        }

        return value;
      },

      has: function(fullName) {
        if (this.cache.has(fullName)) {
          return true;
        }

        return !!factoryFor(this, fullName);
      },

      optionsForType: function(type, options) {
        if (this.parent) { illegalChildOperation('optionsForType'); }

        this._typeOptions.set(type, options);
      },

      options: function(type, options) {
        this.optionsForType(type, options);
      },

      /**
        Registers a type injection. When an object of type `type` is instantiated by
        the container, a property with name `property` will be set on the new object
        with the value obtained by looking up `fullName` on the container.

        ```javascript
        container.typeInjection('model', 'source', 'source:main');
        ```

        An optional `options` hash allows the method of injection to be customized.
        Beyond the default, single value injection, currently only supports `array`:
        instead of injecting a single value into `property`, setting `array:true` will
        inject an array of all values registered on this `type`-`property` pair:

        ```javascript
        container.typeInjection('model', 'plugins', 'plugin:one', {array:true});
        container.typeInjection('model', 'plugins', 'plugin:two', {array:true});
        ```

        @method typeInjection
        @param {String} type the type name for which to define the injection
        @param {String} property the name of the property on the target type to set
          with the injected value
        @param {String} fullName the full container name of the object to inject
        @param {Object} options (optional) a hash of injection options
      */
      typeInjection: function(type, property, fullName, options) {
        if (this.parent) { illegalChildOperation('typeInjection'); }

        var injections = this.typeInjections.get(type);
        if (!injections) {
          injections = [];
          this.typeInjections.set(type, injections);
        }
        injections.push( merge({ property: property, fullName: fullName }, options) );
      },

      /**
        Registers an injection either on a specific `factoryName`, in the format
        `type:name`, or on an entire type of objects, in the format `type`
        (in which case this call is deferred to `typeInjection`).
        When an object registered with `factoryName` is instantiated by
        the container, a property with name `property` will be set on the new object
        with the value obtained by looking up `injectionName` on the container.

        ```javascript
        container.injection('model:user', 'email', 'model:email');
        ```

        An optional `options` hash allows the method of injection to be customized.
        Beyond the default, single value injection, currently only supports `array`:
        instead of injecting a single value into `property`, setting `array:true` will
        inject an array of all values registered on this `type`-`property` pair:

        ```javascript
        container.injection('source:main', 'plugins', 'plugin:one', {array:true});
        container.injection('source:main', 'plugins', 'plugin:two', {array:true});
        ```

        @method typeInjection
        @param {String} factoryName the full factory name of the object for which to
          define the injection
        @param {String} property the name of the property on the target object to set
          with the injected value
        @param {String} injectionName the full container name of the object to inject
        @param {Object} options (optional) a hash of injection options
      */
      injection: function(factoryName, property, injectionName, options) {
        if (this.parent) { illegalChildOperation('injection'); }

        if (factoryName.indexOf(':') === -1) {
          return this.typeInjection(factoryName, property, injectionName, options);
        }

        var injections = this.injections[factoryName] = this.injections[factoryName] || [];
        injections.push( merge({ property: property, fullName: injectionName }, options) );
      },

      destroy: function() {
        this.isDestroyed = true;

        for (var i=0, l=this.children.length; i<l; i++) {
          this.children[i].destroy();
        }

        this.children = [];

        eachDestroyable(this, function(item) {
          item.isDestroying = true;
        });

        eachDestroyable(this, function(item) {
          item.destroy();
        });

        delete this.parent;
        this.isDestroyed = true;
      },

      reset: function() {
        for (var i=0, l=this.children.length; i<l; i++) {
          resetCache(this.children[i]);
        }
        resetCache(this);
      }
    };

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

      var injection, lookup;

      for (var i=0, l=injections.length; i<l; i++) {
        injection = injections[i];
        lookup = container.lookup(injection.fullName);
        if (injection.array) {
          // Combine all injections on this property into an array
          hash[injection.property] = [].concat(hash[injection.property] || [], lookup);
        } else {
          hash[injection.property] = lookup;
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
      var name = container.normalize(fullName);
      return container.resolve(name);
    }

    function instantiate(container, fullName) {
      var factory = factoryFor(container, fullName);

      var splitName = fullName.split(":"),
          type = splitName[0],
          value;

      if (option(container, fullName, 'instantiate') === false) {
        return factory;
      }

      if (factory) {
        var injections = [];
        injections = injections.concat(container.typeInjections.get(type) || []);
        injections = injections.concat(container.injections[fullName] || []);

        var hash = buildInjections(container, injections);
        hash.container = container;
        hash._debugContainerKey = fullName;

        value = factory.create(hash);

        return value;
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

    function merge(original, updates) {
      for (var prop in updates) {
        if (!updates.hasOwnProperty(prop)) { continue; }
        original[prop] = updates[prop];
      }
      return original;
    }

    return Container;
});
