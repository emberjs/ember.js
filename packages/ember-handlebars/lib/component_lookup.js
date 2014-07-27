import EmberObject from "ember-runtime/system/object";

var ComponentLookup = EmberObject.extend({
  lookupFactory: function(name, container) {
    Ember.deprecate('Usage of component-lookup:main is no longer needed. Please use normal container lookup/lookupFactory methods instead.');
    container = container || this.container;

    return container.lookupFactory('component:' + name);
  }
});

export default ComponentLookup;
