import Ember from "ember-metal/core"; // Ember.assert, Ember.deprecate
import { get } from "ember-metal/property_get";
import EmberObject from "ember-runtime/system/object";
import { Mixin } from "ember-metal/mixin";
import { computed } from "ember-metal/computed";
import ActionHandler from "ember-runtime/mixins/action_handler";
import ControllerContentModelAliasDeprecation from "ember-runtime/mixins/controller_content_model_alias_deprecation";

/**
  `Ember.ControllerMixin` provides a standard interface for all classes that
  compose Ember's controller layer: `Ember.Controller`,
  `Ember.ArrayController`, and `Ember.ObjectController`.

  @class ControllerMixin
  @namespace Ember
  @uses Ember.ActionHandler
*/
export default Mixin.create(ActionHandler, ControllerContentModelAliasDeprecation, {
  /* ducktype as a controller */
  isController: true,

  /**
    The object to which actions from the view should be sent.

    For example, when a Handlebars template uses the `{{action}}` helper,
    it will attempt to send the action to the view's controller's `target`.

    By default, the value of the target property is set to the router, and
    is injected when a controller is instantiated. This injection is defined
    in Ember.Application#buildContainer, and is applied as part of the
    applications initialization process. It can also be set after a controller
    has been instantiated, for instance when using the render helper in a
    template, or when a controller is used as an `itemController`. In most
    cases the `target` property will automatically be set to the logical
    consumer of actions for the controller.

    @property target
    @default null
  */
  target: null,

  container: null,

  parentController: null,

  store: null,

  model: null,
  content: computed.alias('model'),

  deprecatedSendHandles: function(actionName) {
    return !!this[actionName];
  },

  deprecatedSend: function(actionName) {
    var args = [].slice.call(arguments, 1);
    Ember.assert('' + this + " has the action " + actionName + " but it is not a function", typeof this[actionName] === 'function');
    Ember.deprecate('Action handlers implemented directly on controllers are deprecated in favor of action handlers on an `actions` object ( action: `' + actionName + '` on ' + this + ')', false);
    this[actionName].apply(this, args);
    return;
  }
});


