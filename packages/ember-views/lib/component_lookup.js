import EmberObject from "ember-runtime/system/object";

export default EmberObject.extend({
  lookupFactory(name, container) {

    container = container || this.container;

    var fullName = 'component:' + name;
    var templateFullName = 'template:components/' + name;
    var templateRegistered = container && container._registry.has(templateFullName);

    if (templateRegistered) {
      container._registry.injection(fullName, 'layout', templateFullName);
    }

    var Component = container.lookupFactory(fullName);

    // Only treat as a component if either the component
    // or a template has been registered.
    if (templateRegistered || Component) {
      if (!Component) {
        container._registry.register(fullName, Ember.Component);
        Component = container.lookupFactory(fullName);
      }
      return Component;
    }
  },

  isComponent: function(name, container) {
    return container._registry.has('component:' + name) ||
           container._registry.has('template:components/' + name);
  },

  componentFor: function(name, container) {
    var fullName = 'component:' + name;
    return container.lookupFactory(fullName);
  },

  layoutFor: function(name, container) {
    var templateFullName = 'template:components/' + name;
    return container.lookup(templateFullName);
  }
});
