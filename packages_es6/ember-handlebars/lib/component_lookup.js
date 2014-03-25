import EmberObject from 'ember-runtime/system/object';

var ComponentLookup = EmberObject.extend({
  lookupFactory: function(name, container) {

    container = container || this.container;

    Ember.assert('Components must have a `-` in their name to avoid conflicts with built-in controls that wrap HTML ' +
                 'elements. This is consistent with the same requirement in web components.', name.indexOf('-') > -1);

    var fullName = 'component:' + name,
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

export default ComponentLookup;
