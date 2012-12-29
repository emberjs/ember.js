define("container",
  [],
  function() {
    function Container() {
      this.registry = {};
      this.cache = {};
      this.typeInjections = {};
      this.injections = {};
      this.options = {};
      this.typeOptions = {};
    }

    Container.prototype = {
      set: function(object, key, value) {
        object[key] = value;
      },

      register: function(type, name, factory, options) {
        this.registry[type + ":" + name] = factory;
        this.options[type + ":" + name] = options || {};
      },

      resolve: function(fullName) {
        if (this.registry.hasOwnProperty(fullName)) {
          return this.registry[fullName];
        }
      },

      lookup: function(fullName) {
        if (this.cache.hasOwnProperty(fullName)) {
          return this.cache[fullName];
        }

        var value = instantiate(this, fullName);

        if (!value) { return; }

        if (isSingleton(this, fullName)) {
          this.cache[fullName] = value;
        }

        return value;
      },

      optionsForType: function(type, options) {
        this.typeOptions[type] = options;
      },

      typeInjection: function(type, property, fullName) {
        var injections = this.typeInjections[type] = this.typeInjections[type] || [];
        injections.push({ property: property, fullName: fullName });
      },

      injection: function(factoryName, property, injectionName) {
        var injections = this.injections[factoryName] = this.injections[factoryName] || [];
        injections.push({ property: property, fullName: injectionName });
      },

      destroy: function() {
        eachDestroyable(this, function(item) {
          item.isDestroying = true;
        });

        eachDestroyable(this, function(item) {
          item.destroy();
        });

        this.isDestroyed = true;
      }
    };

    function isSingleton(container, fullName) {
      var singleton = option(container, fullName, 'singleton');

      return singleton !== false;
    }

    function applyInjections(container, value, injections) {
      if (!injections) { return; }

      var injection, lookup;

      for (var i=0, l=injections.length; i<l; i++) {
        injection = injections[i];
        lookup = container.lookup(injection.fullName);
        container.set(value, injection.property, lookup);
      }
    }

    function option(container, fullName, optionName) {
      var options = container.options[fullName];

      if (options && options[optionName] !== undefined) {
        return options[optionName];
      }

      var type = fullName.split(":")[0];
      options = container.typeOptions[type];

      if (options) {
        return options[optionName];
      }
    }

    function instantiate(container, fullName) {
      var splitName = fullName.split(":"),
          type = splitName[0], name = splitName[1],
          value;

      var factory = container.resolve(fullName);

      if (option(container, fullName, 'instantiate') === false) {
        return factory;
      }

      if (factory) {
        value = factory.create({ container: container });

        var injections = [];
        injections = injections.concat(container.typeInjections[type] || []);
        injections = injections.concat(container.injections[fullName] || []);

        applyInjections(container, value, injections);

        return value;
      }
    }

    function eachDestroyable(container, callback) {
      var cache = container.cache;

      for (var prop in cache) {
        if (!cache.hasOwnProperty(prop)) { continue; }
        if (option(container, prop, 'instantiate') === false) { continue; }
        callback(cache[prop]);
      }
    }

    return Container;
});
