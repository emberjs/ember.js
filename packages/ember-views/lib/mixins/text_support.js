/**
@module ember
@submodule ember-views
*/

import { get } from "ember-metal/property_get";
import { set } from "ember-metal/property_set";
import { Mixin } from "ember-metal/mixin";
import TargetActionSupport from "ember-runtime/mixins/target_action_support";

/**
  Shared mixin used by `Ember.TextField` and `Ember.TextArea`.

  @class TextSupport
  @namespace Ember
  @uses Ember.TargetActionSupport
  @extends Ember.Mixin
  @private
*/
var TextSupport = Mixin.create(TargetActionSupport, {
  value: "",

  attributeBindings: [
    'autocapitalize',
    'autocorrect',
    'autofocus',
    'disabled',
    'form',
    'maxlength',
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

  init: function() {
    this._super();
    this.on("paste", this, this._elementValueDidChange);
    this.on("cut", this, this._elementValueDidChange);
    this.on("input", this, this._elementValueDidChange);
  },

  /**
    The action to be sent when the user presses the return key.

    This is similar to the `{{action}}` helper, but is fired when
    the user presses the return key when editing a text field, and sends
    the value of the field as the context.

    @property action
    @type String
    @default null
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
  */
  bubbles: false,

  interpretKeyEvents: function(event) {
    var map = TextSupport.KEY_EVENTS;
    var method = map[event.keyCode];

    this._elementValueDidChange();
    if (method) { return this[method](event); }
  },

  _elementValueDidChange: function() {
    set(this, 'value', this.$().val());
  },

  /**
    Called when the user inserts a new line.

    Called by the `Ember.TextSupport` mixin on keyUp if keycode matches 13.
    Uses sendAction to send the `enter` action.

    @method insertNewline
    @param {Event} event
  */
  insertNewline: function(event) {
    sendAction('enter', this, event);
    sendAction('insert-newline', this, event);
  },

  /**
    Called when the user hits escape.

    Called by the `Ember.TextSupport` mixin on keyUp if keycode matches 27.
    Uses sendAction to send the `escape-press` action.

    @method cancel
    @param {Event} event
  */
  cancel: function(event) {
    sendAction('escape-press', this, event);
  },

  change: function(event) {
    this._elementValueDidChange(event);
  },

  /**
    Called when the text area is focused.

    Uses sendAction to send the `focus-in` action.

    @method focusIn
    @param {Event} event
  */
  focusIn: function(event) {
    sendAction('focus-in', this, event);
  },

  /**
    Called when the text area is blurred.

    Uses sendAction to send the `focus-out` action.

    @method focusOut
    @param {Event} event
  */
  focusOut: function(event) {
    this._elementValueDidChange(event);
    sendAction('focus-out', this, event);
  },

  /**
    Called when the user presses a key. Enabled by setting
    the `onEvent` property to `keyPress`.

    Uses sendAction to send the `key-press` action.

    @method keyPress
    @param {Event} event
  */
  keyPress: function(event) {
    sendAction('key-press', this, event);
  },

  /**
    Called when the browser triggers a `keyup` event on the element.

    Uses sendAction to send the `key-up` action passing the current value
    and event as parameters.

    @method keyUp
    @param {Event} event
  */
  keyUp: function(event) {
    this.interpretKeyEvents(event);

    this.sendAction('key-up', get(this, 'value'), event);
  },

  /**
    Called when the browser triggers a `keydown` event on the element.

    Uses sendAction to send the `key-down` action passing the current value
    and event as parameters. Note that generally in key-down the value is unchanged
    (as the key pressing has not completed yet).

    @method keyDown
    @param {Event} event
  */
  keyDown: function(event) {
    this.sendAction('key-down', get(this, 'value'), event);
  }
});

TextSupport.KEY_EVENTS = {
  13: 'insertNewline',
  27: 'cancel'
};

// In principle, this shouldn't be necessary, but the legacy
// sendAction semantics for TextField are different from
// the component semantics so this method normalizes them.
function sendAction(eventName, view, event) {
  var action = get(view, eventName);
  var on = get(view, 'onEvent');
  var value = get(view, 'value');

  // back-compat support for keyPress as an event name even though
  // it's also a method name that consumes the event (and therefore
  // incompatible with sendAction semantics).
  if (on === eventName || (on === 'keyPress' && eventName === 'key-press')) {
    view.sendAction('action', value);
  }

  view.sendAction(eventName, value);

  if (action || on === eventName) {
    if(!get(view, 'bubbles')) {
      event.stopPropagation();
    }
  }
}

export default TextSupport;
