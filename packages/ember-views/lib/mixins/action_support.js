/**
 @module ember
 @submodule ember-views
*/
import { inspect } from 'ember-utils';
import { Mixin, get, isNone } from 'ember-metal';
import { assert } from 'ember-debug';
import { MUTABLE_CELL } from '../compat/attrs';

function validateAction(component, actionName) {
  if (actionName && actionName[MUTABLE_CELL]) {
    actionName = actionName.value;
  }

  assert(
    `The default action was triggered on the component ${component.toString()}, but the action name (${actionName}) was not a string.`,
    isNone(actionName) || typeof actionName === 'string' || typeof actionName === 'function'
  );
  return actionName;
}

/**
 @class ActionSupport
 @namespace Ember
 @private
*/
export default Mixin.create({
  /**
    Calls an action passed to a component.

    For example a component for playing or pausing music may translate click events
    into action notifications of "play" or "stop" depending on some internal state
    of the component:

    ```app/components/play-button.js
    import Component from '@ember/component';

    export default Component.extend({
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

    ```app/controller/application.js
    import Controller from '@ember/controller';

    export default Controller.extend({
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

    ```app/components/next-button.js
    import Component from '@ember/component';

    export default Component.extend({
      click() {
        this.sendAction();
      }
    });
    ```

    ```handlebars
    {{! app/templates/application.hbs }}
    {{next-button action=(action "playNextSongInAlbum")}}
    ```

    ```app/controllers/application.js
    import Controller from '@ember/controller';

    export default Controller.extend({
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
  sendAction(action = 'action', ...contexts) {
    let actionName;

    actionName = get(this, `attrs.${action}`) || get(this, action);
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
  },

  send(actionName, ...args) {
    let action = this.actions && this.actions[actionName];

    if (action) {
      let shouldBubble = action.apply(this, args) === true;
      if (!shouldBubble) { return; }
    }

    let target = get(this, 'target');
    if (target) {
      assert(
        `The \`target\` for ${this} (${target}) does not have a \`send\` method`,
        typeof target.send === 'function'
      );
      target.send(...arguments);
    } else {
      assert(`${inspect(this)} had no action handler for: ${actionName}`, action);
    }
  }
});
