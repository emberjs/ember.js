/**
@module ember
@submodule ember-handlebars
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

  attributeBindings: ['placeholder', 'disabled', 'maxlength', 'tabindex', 'readonly',
                      'autofocus', 'form', 'selectionDirection', 'spellcheck', 'required',
                      'title', 'autocapitalize', 'autocorrect'],
  placeholder: null,
  disabled: false,
  maxlength: null,

  init: function() {
    this._super();
    this.on("focusOut", this, this._elementValueDidChange);
    this.on("change", this, this._elementValueDidChange);
    this.on("paste", this, this._elementValueDidChange);
    this.on("cut", this, this._elementValueDidChange);
    this.on("input", this, this._elementValueDidChange);
    this.on("keyUp", this, this.interpretKeyEvents);
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
    Whether they `keyUp` event that triggers an `action` to be sent continues
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
    The action to be sent when the user inserts a new line.

    Called by the `Ember.TextSupport` mixin on keyUp if keycode matches 13.
    Uses sendAction to send the `enter` action to the controller.

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
    Uses sendAction to send the `escape-press` action to the controller.

    @method cancel
    @param {Event} event
  */
  cancel: function(event) {
    sendAction('escape-press', this, event);
  },

  /**
    Called when the text area is focused.

    @method focusIn
    @param {Event} event
  */
  focusIn: function(event) {
    sendAction('focus-in', this, event);
  },

  /**
    Called when the text area is blurred.

    @method focusOut
    @param {Event} event
  */
  focusOut: function(event) {
    sendAction('focus-out', this, event);
  },

  /**
    The action to be sent when the user presses a key. Enabled by setting
    the `onEvent` property to `keyPress`.

    Uses sendAction to send the `keyPress` action to the controller.

    @method keyPress
    @param {Event} event
  */
  keyPress: function(event) {
    sendAction('key-press', this, event);
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
  var action = get(view, eventName),
      on = get(view, 'onEvent'),
      value = get(view, 'value');

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
