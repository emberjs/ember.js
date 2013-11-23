/**
@module ember
@submodule ember-runtime
*/

var get = Ember.get, typeOf = Ember.typeOf;

/**
  The `Ember.ActionHandler` mixin implements support for moving an `actions`
  property to an `_actions` property at extend time, and adding `_actions`
  to the object's mergedProperties list.

  `Ember.ActionHandler` is used internally by Ember in  `Ember.View`,
  `Ember.Controller`, and `Ember.Route`.

  @class ActionHandler
  @namespace Ember
*/
Ember.ActionHandler = Ember.Mixin.create({
  mergedProperties: ['_actions'],

  /**
    @private

    Moves `actions` to `_actions` at extend time. Note that this currently
    modifies the mixin themselves, which is technically dubious but
    is practically of little consequence. This may change in the future.

    @method willMergeMixin
  */
  willMergeMixin: function(props) {
    var hashName;

    if (!props._actions) {
      if (typeOf(props.actions) === 'object') {
        hashName = 'actions';
      } else if (typeOf(props.events) === 'object') {
        Ember.deprecate('Action handlers contained in an `events` object are deprecated in favor of putting them in an `actions` object', false);
        hashName = 'events';
      }

      if (hashName) {
        props._actions = Ember.merge(props._actions || {}, props[hashName]);
      }

      delete props[hashName];
    }
  },

  send: function(actionName) {
    var args = [].slice.call(arguments, 1), target;

    if (this._actions && this._actions[actionName]) {
      if (this._actions[actionName].apply(this, args) === true) {
        // handler returned true, so this action will bubble
      } else {
        return;
      }
    } else if (this.deprecatedSend && this.deprecatedSendHandles && this.deprecatedSendHandles(actionName)) {
      if (this.deprecatedSend.apply(this, [].slice.call(arguments)) === true) {
        // handler return true, so this action will bubble
      } else {
        return;
      }
    }

    if (target = get(this, 'target')) {
      Ember.assert("The `target` for " + this + " (" + target + ") does not have a `send` method", typeof target.send === 'function');
      target.send.apply(target, arguments);
    }
  }

});
