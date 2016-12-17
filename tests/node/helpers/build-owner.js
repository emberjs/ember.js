module.exports = function buildOwner(Ember, resolver) {
  var FACTORY_FOR = Ember.Container.__FACTORY_FOR__;
  var LOOKUP_FACTORY = Ember.Container.__LOOKUP_FACTORY__;
  var Owner = Ember.Object.extend(Ember._RegistryProxyMixin, Ember._ContainerProxyMixin, {
    [FACTORY_FOR]() {
      return this.__container__[FACTORY_FOR](...arguments);
    },
    [LOOKUP_FACTORY]() {
      return this.__container__[LOOKUP_FACTORY](...arguments);
    }
  });

  var namespace = Ember.Object.create({
    Resolver: { create: function() { return resolver; } }
  });

  var fallbackRegistry = Ember.Application.buildRegistry(namespace);
  var registry = new Ember.Registry({
    fallback: fallbackRegistry
  });

  Ember.ApplicationInstance.setupRegistry(registry);

  var owner = Owner.create({
    __registry__: registry,
    __container__: null
  });

  container = registry.container({ owner: owner });
  owner.__container__ = container;

  return owner;
};
