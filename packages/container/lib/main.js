require('ember-runtime');

var get = Ember.get, set = Ember.set;

var objectCreate = Object.create || function(parent) {
  function F() {}
  F.prototype = parent;
  return new F();
};

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

  this.registry = new InheritingDict(parent && parent.registry);
  this.cache = new InheritingDict(parent && parent.cache);
  this.typeInjections = {};
  this.injections = {};
  this.options = {};
  this.typeOptions = {};
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
    this.registry.set(type + ":" + name, factory);
    this.options[type + ":" + name] = options || {};
  },

  resolve: function(fullName) {
    return this.registry.get(fullName);
  },

  lookup: function(fullName) {
    if (this.cache.has(fullName)) {
      return this.cache.get(fullName);
    }

    var value = instantiate(this, fullName);

    if (!value) { return; }

    if (isSingleton(this, fullName)) {
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

    this.typeOptions[type] = options;
  },

  typeInjection: function(type, property, fullName) {
    if (this.parent) { illegalChildOperation('typeInjection'); }

    var injections = this.typeInjections[type] = this.typeInjections[type] || [];
    injections.push({ property: property, fullName: fullName });
  },

  injection: function(factoryName, property, injectionName) {
    if (this.parent) { illegalChildOperation('injection'); }

    var injections = this.injections[factoryName] = this.injections[factoryName] || [];
    injections.push({ property: property, fullName: injectionName });
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
  container.cache.eachLocal(function(key, value) {
    if (option(container, key, 'instantiate') === false) { return; }
    callback(value);
  });
}

Ember.Container = Container;
