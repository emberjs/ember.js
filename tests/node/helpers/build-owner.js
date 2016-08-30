var path = require('path');
var distPath = path.join(__dirname, '../../../dist');
var emberPath = path.join(distPath, 'ember.debug');
var Ember = require(emberPath);

const Owner = Ember.Object.extend(Ember._RegistryProxyMixin, Ember._ContainerProxyMixin);

module.exports = function buildOwner(resolver) {
  var namespace = Ember.Object.create({
    Resolver: { create: function() { return resolver; } }
  });

  var fallbackRegistry = Ember.Application.buildRegistry(namespace)
  registry = new Ember.Registry({
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