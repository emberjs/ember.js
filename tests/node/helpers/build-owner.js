module.exports = function buildOwner(Ember, resolver) {
  var Owner = Ember.Object.extend(Ember._RegistryProxyMixin, Ember._ContainerProxyMixin);

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
