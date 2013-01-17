/**
@module ember
@submodule ember-routing
*/

Ember.controllerFor = function(container, controllerName, context) {
  return container.lookup('controller:' + controllerName) ||
         Ember.generateController(container, controllerName, context);
};

Ember.generateController = function(container, controllerName, context) {
  var controller;

  if (context && Ember.isArray(context)) {
    controller = Ember.ArrayController.extend({
      content: context
    });
  } else if (context) {
    controller = Ember.ObjectController.extend({
      content: context
    });
  } else {
    controller = Ember.Controller.extend();
  }

  controller.toString = function() {
    return "(generated " + controllerName + " controller)";
  };

  container.register('controller', controllerName, controller);
  return container.lookup('controller:' + controllerName);
};
