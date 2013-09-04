Ember.ComponentLookup = Ember.Object.extend({
  lookupFactory: function(name) {
    var container = this.container,
        fullName = 'component:' + name,
        templateFullName = 'template:components/' + name,
        templateRegistered = container && container.has(templateFullName);

    if (templateRegistered) {
      container.injection(fullName, 'layout', templateFullName);
    }

    var Component = container.lookupFactory(fullName);

    // Only treat as a component if either the component
    // or a template has been registered.
    if (templateRegistered || Component) {
      if (!Component) {
        container.register(fullName, Ember.Component);
        Component = container.lookupFactory(fullName);
      }
      return Component;
    }
  }
});
