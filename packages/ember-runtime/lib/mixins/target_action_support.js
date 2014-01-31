/**
@module ember
@submodule ember-runtime
*/

var get = Ember.get, set = Ember.set, isNone = Ember.isNone,
    a_slice = Array.prototype.slice;

/**
`Ember.TargetActionSupport` is a mixin that can be included in a class
to add a `triggerAction` method with semantics similar to the Handlebars
`{{action}}` helper. In normal Ember usage, the `{{action}}` helper is
usually the best choice. This mixin is most often useful when you are
doing more complex event handling in View objects.

See also `Ember.ViewTargetActionSupport`, which has
view-aware defaults for target and actionContext.

@class TargetActionSupport
@namespace Ember
@extends Ember.Mixin
*/
Ember.TargetActionSupport = Ember.Mixin.create({
  target: null,
  action: null,
  actionContext: null,

  targetObject: Ember.computed(function() {
    var target = get(this, 'target');

    if (Ember.typeOf(target) === "string") {
      var value = get(this, target);
      if (value === undefined) { value = get(Ember.lookup, target); }
      return value;
    } else {
      return target;
    }
  }).property('target'),

  actionContextObject: Ember.computed(function() {
    var actionContext = get(this, 'actionContext');

    if (Ember.typeOf(actionContext) === "string") {
      var value = get(this, actionContext);
      if (value === undefined) { value = get(Ember.lookup, actionContext); }
      return value;
    } else {
      return actionContext;
    }
  }).property('actionContext'),

  /**
  Send an `action` with an `actionContext` to a `target`. The action, actionContext
  and target will be retrieved from properties of the object. For example:

  ```javascript
  App.SaveButtonView = Ember.View.extend(Ember.TargetActionSupport, {
    target: Ember.computed.alias('controller'),
    action: 'save',
    actionContext: Ember.computed.alias('context'),
    click: function() {
      this.triggerAction(); // Sends the `save` action, along with the current context
                            // to the current controller
    }
  });
  ```

  The `target`, `action`, and `actionContext` can be provided as properties of
  an optional object argument to `triggerAction` as well.

  ```javascript
  App.SaveButtonView = Ember.View.extend(Ember.TargetActionSupport, {
    click: function() {
      this.triggerAction({
        action: 'save',
        target: this.get('controller'),
        actionContext: this.get('context'),
      }); // Sends the `save` action, along with the current context
          // to the current controller
    }
  });
  ```

  The `actionContext` defaults to the object you mixing `TargetActionSupport` into.
  But `target` and `action` must be specified either as properties or with the argument
  to `triggerAction`, or a combination:

  ```javascript
  App.SaveButtonView = Ember.View.extend(Ember.TargetActionSupport, {
    target: Ember.computed.alias('controller'),
    click: function() {
      this.triggerAction({
        action: 'save'
      }); // Sends the `save` action, along with a reference to `this`,
          // to the current controller
    }
  });
  ```

  @method triggerAction
  @param opts {Hash} (optional, with the optional keys action, target and/or actionContext)
  @return {Boolean} true if the action was sent successfully and did not return false
  */
  triggerAction: function(opts) {
    opts = opts || {};
    var action = opts.action || get(this, 'action'),
        target = opts.target || get(this, 'targetObject'),
        actionContext = opts.actionContext;

    function args(options, actionName) {
      var ret = [];
      if (actionName) { ret.push(actionName); }

      return ret.concat(options);
    }

    if (typeof actionContext === 'undefined') {
      actionContext = get(this, 'actionContextObject') || this;
    }

    if (target && action) {
      var ret;

      if (target.send) {
        ret = target.send.apply(target, args(actionContext, action));
      } else {
        Ember.assert("The action '" + action + "' did not exist on " + target, typeof target[action] === 'function');
        ret = target[action].apply(target, args(actionContext));
      }

      if (ret !== false) ret = true;

      return ret;
    } else {
      return false;
    }
  },

  /**
    Triggers a named action on the controller context where the component is used if
    this controller has registered for notifications of the action.

    For example a component for playing or pausing music may translate click events
    into action notifications of "play" or "stop" depending on some internal state
    of the component:


    ```javascript
    App.PlayButtonComponent = Ember.Component.extend({
      click: function(){
        if (this.get('isPlaying')) {
          this.sendAction('play');
        } else {
          this.sendAction('stop');
        }
      }
    });
    ```

    When used inside a template these component actions are configured to
    trigger actions in the outer application context:

    ```handlebars
    {{! application.hbs }}
    {{play-button play="musicStarted" stop="musicStopped"}}
    ```

    When the component receives a browser `click` event it translate this
    interaction into application-specific semantics ("play" or "stop") and
    triggers the specified action name on the controller for the template
    where the component is used: 


    ```javascript
    App.ApplicationController = Ember.Controller.extend({
      actions: {
        musicStarted: function(){
          // called when the play button is clicked
          // and the music started playing
        },
        musicStopped: function(){
          // called when the play button is clicked
          // and the music stopped playing
        }
      }
    });
    ```

    If no action name is passed to `sendAction` a default name of "action"
    is assumed.

    ```javascript
    App.NextButtonComponent = Ember.Component.extend({
      click: function(){
        this.sendAction();
      }
    });
    ```

    ```handlebars
    {{! application.hbs }}
    {{next-button action="playNextSongInAlbum"}}
    ```

    ```javascript
    App.ApplicationController = Ember.Controller.extend({
      actions: {
        playNextSongInAlbum: function(){
          ...
        }
      }
    });
    ```

    @method sendAction
    @param [action] {String} the action to trigger
    @param [context] {*} a context to send with the action
  */
  sendAction: function(action) {
    var actionName,
        contexts = a_slice.call(arguments, 1);

    // Send the default action
    if (action === undefined) {
      actionName = get(this, 'action');
      Ember.assert("The default action was triggered on the component " + this.toString() +
                   ", but the action name (" + actionName + ") was not a string.",
                   isNone(actionName) || typeof actionName === 'string');
    } else {
      actionName = get(this, action);
      Ember.assert("The " + action + " action was triggered on the component " +
                   this.toString() + ", but the action name (" + actionName +
                   ") was not a string.",
                   isNone(actionName) || typeof actionName === 'string');
    }

    // If no action name for that action could be found, just abort.
    if (actionName === undefined) { return; }

    this.triggerAction({
      action: actionName,
      actionContext: contexts
    });
  }
});
