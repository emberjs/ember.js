/**
@module ember
@submodule ember-views
*/

import {
  get,
  set,
  Mixin
} from 'ember-metal';
import { TargetActionSupport } from 'ember-runtime';

const KEY_EVENTS = {
  13: 'insertNewline',
  27: 'cancel'
};

/**
  `TextSupport` is a shared mixin used by both `Ember.TextField` and
  `Ember.TextArea`. `TextSupport` adds a number of methods that allow you to
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
      App = Ember.Application.create();

      App.ApplicationController = Ember.Controller.extend({
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
  | enter key pressed  | insert-newline |
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
  @extends Ember.Mixin
  @private
*/
export default Mixin.create(TargetActionSupport, {
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
    'title'
  ],
  placeholder: null,
  disabled: false,
  maxlength: null,

  init() {
    this._super(...arguments);
    this.on('paste', this, this._elementValueDidChange);
    this.on('cut', this, this._elementValueDidChange);
    this.on('input', this, this._elementValueDidChange);
  },

  /**
    The action to be sent when the user presses the return key.

    This is similar to the `{{action}}` helper, but is fired when
    the user presses the return key when editing a text field, and sends
    the value of the field as the context.

    @property action
    @type String
    @default null
    @private
  */
  action: null,

  /**
    The event that should send the action.

    Options are:

    * `enter`: the user pressed enter
    * `keyPress`: the user pressed a key

    @property onEvent
    @type String
    @default enter
    @private
  */
  onEvent: 'enter',

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
    let map = KEY_EVENTS;
    let method = map[event.keyCode];

    this._elementValueDidChange();
    if (method) { return this[method](event); }
  },

  _elementValueDidChange() {
    set(this, 'value', this.element.value);
  },

  change(event) {
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

    this.sendAction('key-up', get(this, 'value'), event);
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
    this.sendAction('key-down', get(this, 'value'), event);
  }
});

// In principle, this shouldn't be necessary, but the legacy
// sendAction semantics for TextField are different from
// the component semantics so this method normalizes them.
function sendAction(eventName, view, event) {
  let action = get(view, `attrs.${eventName}`) || get(view, eventName);
  let on = get(view, 'onEvent');
  let value = get(view, 'value');

  // back-compat support for keyPress as an event name even though
  // it's also a method name that consumes the event (and therefore
  // incompatible with sendAction semantics).
  if (on === eventName || (on === 'keyPress' && eventName === 'key-press')) {
    view.sendAction('action', value);
  }

  view.sendAction(eventName, value);

  if (action || on === eventName) {
    if (!get(view, 'bubbles')) {
      event.stopPropagation();
    }
  }
}
