/**
@module ember
*/

import { get, set, Mixin } from '@ember/-internals/metal';
import { EMBER_MODERNIZED_BUILT_IN_COMPONENTS } from '@ember/canary-features';
import { deprecate } from '@ember/debug';
import { SEND_ACTION } from '@ember/deprecated-features';
import { MUTABLE_CELL } from '@ember/-internals/views';
import { DEBUG } from '@glimmer/env';

if (DEBUG && EMBER_MODERNIZED_BUILT_IN_COMPONENTS) {
  Mixin._disableDebugSeal = true;
}

const KEY_EVENTS = {
  Enter: 'insertNewline',
  Escape: 'cancel',
};

/**
  `TextSupport` is a shared mixin used by both `TextField` and
  `TextArea`. `TextSupport` adds a number of methods that allow you to
  specify a controller action to invoke when a certain event is fired on your
  text field or textarea. The specified controller action would get the current
  value of the field passed in as the only argument unless the value of
  the field is empty. In that case, the instance of the field itself is passed
  in as the only argument.

  Let's use the pressing of the escape key as an example. If you wanted to
  invoke a controller action when a user presses the escape key while on your
  field, you would use the `escape-press` attribute on your field like so:

  ```handlebars
    {{! application.hbs}}

    {{input escape-press='alertUser'}}
  ```

  ```javascript
      import Application from '@ember/application';
      import Controller from '@ember/controller';
      App = Application.create();

      App.ApplicationController = Controller.extend({
        actions: {
          alertUser: function ( currentValue ) {
            alert( 'escape pressed, current value: ' + currentValue );
          }
        }
      });
  ```

  The following chart is a visual representation of what takes place when the
  escape key is pressed in this scenario:

  ```
  The Template
  +---------------------------+
  |                           |
  | escape-press='alertUser'  |
  |                           |          TextSupport Mixin
  +----+----------------------+          +-------------------------------+
       |                                 | cancel method                 |
       |      escape button pressed      |                               |
       +-------------------------------> | checks for the `escape-press` |
                                         | attribute and pulls out the   |
       +-------------------------------+ | `alertUser` value             |
       |     action name 'alertUser'     +-------------------------------+
       |     sent to controller
       v
  Controller
  +------------------------------------------ +
  |                                           |
  |  actions: {                               |
  |     alertUser: function( currentValue ){  |
  |       alert( 'the esc key was pressed!' ) |
  |     }                                     |
  |  }                                        |
  |                                           |
  +-------------------------------------------+
  ```

  Here are the events that we currently support along with the name of the
  attribute you would need to use on your field. To reiterate, you would use the
  attribute name like so:

  ```handlebars
    {{input attribute-name='controllerAction'}}
  ```

  ```
  +--------------------+----------------+
  |                    |                |
  | event              | attribute name |
  +--------------------+----------------+
  | new line inserted  | insert-newline |
  |                    |                |
  | enter key pressed  | enter          |
  |                    |                |
  | cancel key pressed | escape-press   |
  |                    |                |
  | focusin            | focus-in       |
  |                    |                |
  | focusout           | focus-out      |
  |                    |                |
  | keypress           | key-press      |
  |                    |                |
  | keyup              | key-up         |
  |                    |                |
  | keydown            | key-down       |
  +--------------------+----------------+
  ```

  @class TextSupport
  @namespace Ember
  @uses Ember.TargetActionSupport
  @extends Mixin
  @private
*/
const TextSupport = Mixin.create({
  value: '',

  attributeBindings: [
    'autocapitalize',
    'autocorrect',
    'autofocus',
    'disabled',
    'form',
    'maxlength',
    'minlength',
    'placeholder',
    'readonly',
    'required',
    'selectionDirection',
    'spellcheck',
    'tabindex',
    'title',
  ],
  placeholder: null,
  disabled: false,
  maxlength: null,

  /**
    Whether the `keyUp` event that triggers an `action` to be sent continues
    propagating to other views.

    By default, when the user presses the return key on their keyboard and
    the text field has an `action` set, the action will be sent to the view's
    controller and the key event will stop propagating.

    If you would like parent views to receive the `keyUp` event even after an
    action has been dispatched, set `bubbles` to true.

    @property bubbles
    @type Boolean
    @default false
    @private
  */
  bubbles: false,

  interpretKeyEvents(event) {
    let method = KEY_EVENTS[event.key];

    this._elementValueDidChange();
    if (method) {
      return this[method](event);
    }
  },

  _elementValueDidChange() {
    set(this, 'value', this.element.value);
  },

  change(event) {
    this._elementValueDidChange(event);
  },

  paste(event) {
    this._elementValueDidChange(event);
  },

  cut(event) {
    this._elementValueDidChange(event);
  },

  input(event) {
    this._elementValueDidChange(event);
  },

  /**
    Allows you to specify a controller action to invoke when either the `enter`
    key is pressed or, in the case of the field being a textarea, when a newline
    is inserted. To use this method, give your field an `insert-newline`
    attribute. The value of that attribute should be the name of the action
    in your controller that you wish to invoke.

    For an example on how to use the `insert-newline` attribute, please
    reference the example near the top of this file.

    @method insertNewline
    @param {Event} event
    @private
  */
  insertNewline(event) {
    sendAction('enter', this, event);
    sendAction('insert-newline', this, event);
  },

  /**
    Allows you to specify a controller action to invoke when the escape button
    is pressed. To use this method, give your field an `escape-press`
    attribute. The value of that attribute should be the name of the action
    in your controller that you wish to invoke.

    For an example on how to use the `escape-press` attribute, please reference
    the example near the top of this file.

    @method cancel
    @param {Event} event
    @private
  */
  cancel(event) {
    sendAction('escape-press', this, event);
  },

  /**
    Allows you to specify a controller action to invoke when a field receives
    focus. To use this method, give your field a `focus-in` attribute. The value
    of that attribute should be the name of the action in your controller
    that you wish to invoke.

    For an example on how to use the `focus-in` attribute, please reference the
    example near the top of this file.

    @method focusIn
    @param {Event} event
    @private
  */
  focusIn(event) {
    sendAction('focus-in', this, event);
  },

  /**
    Allows you to specify a controller action to invoke when a field loses
    focus. To use this method, give your field a `focus-out` attribute. The value
    of that attribute should be the name of the action in your controller
    that you wish to invoke.

    For an example on how to use the `focus-out` attribute, please reference the
    example near the top of this file.

    @method focusOut
    @param {Event} event
    @private
  */
  focusOut(event) {
    this._elementValueDidChange(event);
    sendAction('focus-out', this, event);
  },

  /**
    Allows you to specify a controller action to invoke when a key is pressed.
    To use this method, give your field a `key-press` attribute. The value of
    that attribute should be the name of the action in your controller you
    that wish to invoke.

    For an example on how to use the `key-press` attribute, please reference the
    example near the top of this file.

    @method keyPress
    @param {Event} event
    @private
  */
  keyPress(event) {
    sendAction('key-press', this, event);
  },

  /**
    Allows you to specify a controller action to invoke when a key-up event is
    fired. To use this method, give your field a `key-up` attribute. The value
    of that attribute should be the name of the action in your controller
    that you wish to invoke.

    For an example on how to use the `key-up` attribute, please reference the
    example near the top of this file.

    @method keyUp
    @param {Event} event
    @private
  */
  keyUp(event) {
    this.interpretKeyEvents(event);
    sendAction('key-up', this, event);
  },

  /**
    Allows you to specify a controller action to invoke when a key-down event is
    fired. To use this method, give your field a `key-down` attribute. The value
    of that attribute should be the name of the action in your controller that
    you wish to invoke.

    For an example on how to use the `key-down` attribute, please reference the
    example near the top of this file.

    @method keyDown
    @param {Event} event
    @private
  */
  keyDown(event) {
    sendAction('key-down', this, event);
  },
});

// In principle, this shouldn't be necessary, but the legacy
// sendAction semantics for TextField are different from
// the component semantics so this method normalizes them.
function sendAction(eventName, view, event) {
  let action = get(view, `attrs.${eventName}`);
  if (action !== null && typeof action === 'object' && action[MUTABLE_CELL] === true) {
    action = action.value;
  }

  if (action === undefined) {
    action = get(view, eventName);
  }

  let value = get(view, 'value');

  if (SEND_ACTION && typeof action === 'string') {
    let message = `Passing actions to components as strings (like \`<Input @${eventName}="${action}" />\`) is deprecated. Please use closure actions instead (\`<Input @${eventName}={{action "${action}"}} />\`).`;

    deprecate(message, false, {
      id: 'ember-component.send-action',
      until: '4.0.0',
      url: 'https://deprecations.emberjs.com/v3.x#toc_ember-component-send-action',
      for: 'ember-source',
      since: {
        enabled: '3.4.0',
      },
    });

    view.triggerAction({
      action: action,
      actionContext: [value, event],
    });
  } else if (typeof action === 'function') {
    action(value, event);
  }

  if (action && !get(view, 'bubbles')) {
    event.stopPropagation();
  }
}

if (EMBER_MODERNIZED_BUILT_IN_COMPONENTS) {
  Object.defineProperty(TextSupport, '_wasReopened', {
    configurable: true,
    enumerable: false,
    writable: true,
    value: false,
  });

  if (DEBUG) {
    Object.seal(TextSupport);
    Mixin._disableDebugSeal = false;
  }
}

export default TextSupport;
