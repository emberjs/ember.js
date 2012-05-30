require('ember-runtime/system/object');
require('ember-runtime/system/string');

Ember.ControllerMixin = Ember.Mixin.create({
  /**
    The object to which events from the view should be sent.

    For example, when a Handlebars template uses the `{{action}}` helper,
    it will attempt to send the event to the view's controller's `target`.

    By default, a controller's `target` is set to the router after it is
    instantiated by `Ember.Application#initialize`.
  */
  target: null
});

Ember.Controller = Ember.Object.extend(Ember.ControllerMixin);
