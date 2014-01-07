require('ember-runtime/system/object');
require('ember-runtime/system/string');

var get = Ember.get;

/**
@module ember
@submodule ember-runtime
*/

/**
  `Ember.ControllerMixin` provides a standard interface for all classes that
  compose Ember's controller layer: `Ember.Controller`,
  `Ember.ArrayController`, and `Ember.ObjectController`.

  @class ControllerMixin
  @namespace Ember
  @uses Ember.ActionHandler
*/
Ember.ControllerMixin = Ember.Mixin.create(Ember.ActionHandler, {
  /* ducktype as a controller */
  isController: true,

  /**
    The object to which actions from the view should be sent.

    For example, when a Handlebars template uses the `{{action}}` helper,
    it will attempt to send the action to the view's controller's `target`.

    By default, a controller's `target` is set to the router after it is
    instantiated by `Ember.Application#initialize`.

    @property target
    @default null
  */
  target: null,

  container: null,

  parentController: null,

  store: null,

  model: Ember.computed.alias('content'),

  deprecatedSendHandles: function(actionName) {
    return !!this[actionName];
  },

  deprecatedSend: function(actionName) {
    var args = [].slice.call(arguments, 1);
    Ember.assert('' + this + " has the action " + actionName + " but it is not a function", typeof this[actionName] === 'function');
    Ember.deprecate('Action handlers implemented directly on controllers are deprecated in favor of action handlers on an `actions` object (' + actionName + ' on ' + this + ')', false);
    this[actionName].apply(this, args);
    return;
  }
});

/**
  @class Controller
  @namespace Ember
  @extends Ember.Object
  @uses Ember.ControllerMixin
*/
Ember.Controller = Ember.Object.extend(Ember.ControllerMixin);
