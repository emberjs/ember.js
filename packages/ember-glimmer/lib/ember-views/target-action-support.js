import { Mixin } from 'ember-metal/mixin';
import TargetActionSupport from 'ember-runtime/mixins/target_action_support';
import alias from 'ember-metal/alias';
import { computed } from 'ember-metal/computed';
import { assert } from 'ember-metal/debug';
import { inspect } from 'ember-metal/utils';
import isNone from 'ember-metal/is_none';
import { get } from 'ember-metal/property_get';
import { ARGS } from '../component';

/**
`Ember.ComponentTargetActionSupport` is a mixin that can be included in a
component class to add a `triggerAction` method with semantics similar to
the Handlebars `{{action}}` helper. By default the action's target is the
component itself, or the controller of the component if it is an outlet.

Note: In normal Ember usage, the `{{action}}` helper is usually the best
choice. This mixin is most often useful when you are doing more complex
event handling in custom component subclasses.

For example:

```javascript
App.SaveButtonComponent = Ember.Component.extend(Ember.ComponentTargetActionSupport, {
  action: 'save',
  click: function() {
    this.triggerAction(); // Sends the `save` action, along with the current context
                          // to the current controller
  }
});
```

The `action` can be provided as properties of an optional object argument
to `triggerAction` as well.

```javascript
App.SaveButtonComponent = Ember.Component.extend(Ember.ComponentTargetActionSupport, {
  click: function() {
    this.triggerAction({
      action: 'save'
    }); // Sends the `save` action, along with the current context
        // to the current controller
  }
});
```

@class ComponentTargetActionSupport
@namespace Ember
@extends Ember.TargetActionSupport
@private
*/
export default Mixin.create(TargetActionSupport, {
  /**
   @property target
   @private
  */
  target: computed(function () {
    let outletState = get(this, 'outletState');
    return outletState ? getCurrentOutletState(outletState).render.controller : undefined;
  }),

  // @override
  send(actionName, ...args) {
    let target;
    let action = this.actions && this.actions[actionName];

    if (action) {
      var shouldBubble = action.apply(this, args) === true;
      if (!shouldBubble) { return; }
    }

    if (target = get(this, 'target')) {
      assert(
        'The `target` for ' + inspect(this) + ' (' + target +
        ') does not have a `send` method',
        typeof target.send === 'function'
      );
      target.send(...arguments);
      return;
    }
    assert(`${inspect(this)} had no action handler for: ${actionName}`, action);
  },
  /**
   TODO: This looks like it's not even used by the view layer. Deprecate and remove?
   @property actionContext
   @private
  */
  actionContext: alias('target'),
  /**
    If the component is currently inserted into the DOM of a parent component, this
    property will point to the parent's controller, if present, or the parent itself.

    @property targetObject
    @type Ember.Controller
    @default null
    @private
  */
  targetObject: computed('parentView', function(key) {
    if (this._targetObject) {  return this._targetObject; }
    let parentComponent = get(this, 'parentView');
    if (parentComponent) {
      let outletState = get(parentComponent, 'outletState');
      return outletState ? getCurrentOutletState(outletState).render.controller : parentComponent;
    }
    return null;
  }),
  /**
    Calls a action passed to a component.
    For example a component for playing or pausing music may translate click events
    into action notifications of "play" or "stop" depending on some internal state
    of the component:
    ```javascript
    // app/components/play-button.js
    export default Ember.Component.extend({
      click() {
        if (this.get('isPlaying')) {
          this.sendAction('play');
        } else {
          this.sendAction('stop');
        }
      }
    });
    ```
    The actions "play" and "stop" must be passed to this `play-button` component:
    ```handlebars
    {{! app/templates/application.hbs }}
    {{play-button play=(action "musicStarted") stop=(action "musicStopped")}}
    ```
    When the component receives a browser `click` event it translate this
    interaction into application-specific semantics ("play" or "stop") and
    calls the specified action.
    ```javascript
    // app/controller/application.js
    export default Ember.Controller.extend({
      actions: {
        musicStarted() {
          // called when the play button is clicked
          // and the music started playing
        },
        musicStopped() {
          // called when the play button is clicked
          // and the music stopped playing
        }
      }
    });
    ```
    If no action is passed to `sendAction` a default name of "action"
    is assumed.
    ```javascript
    // app/components/next-button.js
    export default Ember.Component.extend({
      click() {
        this.sendAction();
      }
    });
    ```
    ```handlebars
    {{! app/templates/application.hbs }}
    {{next-button action=(action "playNextSongInAlbum")}}
    ```
    ```javascript
    // app/controllers/application.js
    App.ApplicationController = Ember.Controller.extend({
      actions: {
        playNextSongInAlbum() {
          ...
        }
      }
    });
    ```
    @method sendAction
    @param [action] {String} the action to call
    @param [params] {*} arguments for the action
    @public
  */
  sendAction(action, ...contexts) {
    let actionName;

    // Send the default action
    if (action === undefined) {
      action = 'action';
    }
    actionName = get(this, `${ARGS}.${action}`) || get(this, action);
    actionName = validateAction(this, actionName);

    // If no action name for that action could be found, just abort.
    if (actionName === undefined) { return; }

    if (typeof actionName === 'function') {
      actionName(...contexts);
    } else {
      this.triggerAction({
        action: actionName,
        actionContext: contexts
      });
    }
  }
});

function getCurrentOutletState(outletState) {
  let { outlets, render } = outletState;
  return (Object.keys(outlets).length > 0) ? getCurrentOutletState(outlets[render.outlet]) : outletState;
}

function validateAction(component, actionName) {
  //TODO: How to check if this is a reference?
  if (actionName && typeof actionName.value === 'function') {
    return actionName.value();
  }

  assert(
    'The default action was triggered on the component ' + component.toString() +
    ', but the action name (' + actionName + ') was not a string.',
    isNone(actionName) || typeof actionName === 'string' || typeof actionName === 'function'
  );
  return actionName;
}
