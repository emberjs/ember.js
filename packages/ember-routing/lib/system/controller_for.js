
Ember.controllerFor = function(container, controllerName, context) {
  var controller = container.lookup('controller:' + controllerName);

  if (!controller) {
    if (context && Ember.isArray(context)) {
      controller = Ember.ArrayController.extend({content: context});
    } else if (context) {
      controller = Ember.ObjectController.extend({content: context});
    } else {
      controller = Ember.Controller.extend();
    }

    container.register('controller', controllerName, controller);
    controller = container.lookup('controller:' + controllerName);
  }

  return controller;
};
