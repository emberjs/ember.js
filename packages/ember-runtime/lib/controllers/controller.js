require('ember-runtime/system/object');
require('ember-runtime/system/string');

/**
  @class
  
  Ember.ControllerMixin provides a standard interface for all classes
  that compose Ember's controller layer: Ember.Controller, Ember.ArrayController,
  and Ember.ObjectController.
  
  Within an Ember.Router-managed application single shared instaces of every
  Controller object in your application's namespace will be added to the
  application's Ember.Router instance. See `Ember.Application#initialize`
  for additional information.
  
  ## Views
  By default a controller instance will be the rendering context
  for its associated Ember.View. This connection is made during calls to
  `Ember.ControllerMixin#connectOutlet`.
  
  Within the view's template, the Ember.View instance can be accessed
  through the controller with `{{view}}`.
  
  ## Target Forwarding
  By default a controller will target your application's Ember.Router instance.
  Calls to `{{action}}` within the template of a controller's view are forwarded
  to the router. See `Ember.Handlebars.helpers.action` for additional information.
  
  @extends Ember.Mixin
*/
Ember.ControllerMixin = Ember.Mixin.create({
  /**
    The object to which events from the view should be sent.

    For example, when a Handlebars template uses the `{{action}}` helper,
    it will attempt to send the event to the view's controller's `target`.

    By default, a controller's `target` is set to the router after it is
    instantiated by `Ember.Application#initialize`.
  */
  target: null,
  store: null
});

Ember.Controller = Ember.Object.extend(Ember.ControllerMixin);
