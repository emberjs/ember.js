var adapter, App, get = Ember.get,
    set = Ember.set, Model = Ember.Object.extend();

module("Container Debug Adapter", {
  setup:function() {
    Ember.run(function() {
      App = Ember.Application.create();
      App.toString = function() { return 'App'; };
      App.deferReadiness();
      App.__container__.register('container-debug-adapter:main', Ember.ContainerDebugAdapter);
      adapter = App.__container__.lookup('container-debug-adapter:main');
    });
  },
  teardown: function() {
    Ember.run(function() {
      adapter.destroy();
      App.destroy();
      App = null;
    });
  }
});

test("the default ContainerDebugAdapter cannot catalog certain entries by type", function(){
  equal(adapter.canCatalogEntriesByType('model'), false, "canCatalogEntriesByType should return false for model");
  equal(adapter.canCatalogEntriesByType('template'), false, "canCatalogEntriesByType should return false for template");
});

test("the default ContainerDebugAdapter can catalog typical entries by type", function(){
  equal(adapter.canCatalogEntriesByType('controller'), true, "canCatalogEntriesByType should return true for controller");
  equal(adapter.canCatalogEntriesByType('route'), true, "canCatalogEntriesByType should return true for route");
  equal(adapter.canCatalogEntriesByType('view'), true, "canCatalogEntriesByType should return true for view");
});

test("the default ContainerDebugAdapter catalogs controller entries", function(){
  App.PostController = Ember.Controller.extend();
  var controllerClasses = adapter.catalogEntriesByType('controller');
 
  equal(controllerClasses.length, 1, "found 1 class");
  equal(controllerClasses[0], App.PostController, "found the right class");
});

/*
 [ ] Update getModelTypes to return an array of strings (model names) instead of classes
 [ ] Update ContainerDebugAdapter#catalogEntriesByType to return an array of strings (model names) instead of classes
 [ ] Update Ember Inspector to work with models as names (strings) instead of class references
 [ ] Get tests passing in Ember with new approach
 [ ] Implement the container-debug-adapter in EAK
 [ ] What's up with timing for registering the container-debug-adapter?
 [ ] Verify that no changes are necessary for ember-data models to start showing up in Ember Extension
*/
