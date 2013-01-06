require('ember-runtime');

var get = Ember.get, set = Ember.set;

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

  has: function(fullName) {
    if (this.cache.hasOwnProperty(fullName)) {
      return true;
    }

    return !!factoryFor(this, fullName);
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

function buildInjections(container, injections) {
  var hash = {};

  if (!injections) { return hash; }

  var injection, lookup;

  for (var i=0, l=injections.length; i<l; i++) {
    injection = injections[i];
    lookup = container.lookup(injection.fullName);
    hash[injection.property] = lookup;
  }

  return hash;
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

function factoryFor(container, fullName) {
  return container.resolve(fullName);
}

function instantiate(container, fullName) {
  var factory = factoryFor(container, fullName);

  var splitName = fullName.split(":"),
      type = splitName[0], name = splitName[1],
      value;

  if (option(container, fullName, 'instantiate') === false) {
    return factory;
  }

  if (factory) {
    var injections = [];
    injections = injections.concat(container.typeInjections[type] || []);
    injections = injections.concat(container.injections[fullName] || []);

    var hash = buildInjections(container, injections);
    hash.container = container;

    value = factory.create(hash);

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

Ember.Container = Container;
