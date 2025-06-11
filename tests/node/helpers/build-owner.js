module.exports = function buildOwner(Ember, resolver) {
  // NOTE: This doesn't actually implement all Owner methods, just enough for tests to pass
  let Owner = class extends Ember.Object {
    register(...args) {
      return this.__registry__.register(...args);
    }

    lookup(fullName, options) {
      return this.__container__.lookup(fullName, options);
    }

    factoryFor(fullName) {
      return this.__container__.factoryFor(fullName);
    }
  };

  let namespace = Ember.Object.create({
    Resolver: {
      create: function () {
        return resolver;
      },
    },
  });

  let fallbackRegistry = Ember.Application.buildRegistry(namespace);
  let registry = new Ember.Registry({
    fallback: fallbackRegistry,
  });

  Ember.ApplicationInstance.setupRegistry(registry);

  let owner = Owner.create({
    __registry__: registry,
    __container__: null,
  });

  let container = registry.container({ owner: owner });
  owner.__container__ = container;

  return owner;
};
