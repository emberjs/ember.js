var adapter, App, get = Ember.get,
    set = Ember.set, Model = Ember.Object.extend();


function boot() {
  Ember.run(App, 'advanceReadiness');
}

module("Container Debug Adapter", {
  setup:function() {
    Ember.run(function() {
      App = Ember.Application.create();
      App.toString = function() { return 'App'; };
      App.deferReadiness();

    });
    boot();
    Ember.run(function() {
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
  equal(controllerClasses[0], 'post', "found the right class");
});
