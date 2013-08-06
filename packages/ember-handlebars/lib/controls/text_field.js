require("ember-handlebars/ext");
require("ember-views/views/view");
require("ember-handlebars/controls/text_support");

/**
@module ember
@submodule ember-handlebars
*/

var get = Ember.get, set = Ember.set;

/**
  The `Ember.TextField` view class renders a text
  [input](https://developer.mozilla.org/en/HTML/Element/Input) element. It
  allows for binding Ember properties to the text field contents (`value`),
  live-updating as the user inputs text.

  Example:

  ```handlebars
  {{view Ember.TextField valueBinding="firstName"}}
  ```

  ## Layout and LayoutName properties

  Because HTML `input` elements are self closing `layout` and `layoutName`
  properties will not be applied. See `Ember.View`'s layout section for more
  information.

  ## HTML Attributes

  By default `Ember.TextField` provides support for `type`, `value`, `size`,
  `pattern`, `placeholder`, `disabled`, `maxlength` and `tabindex` attributes
  on a text field. If you need to support more attributes have a look at the
  `attributeBindings` property in `Ember.View`'s HTML Attributes section.

  To globally add support for additional attributes you can reopen
  `Ember.TextField` or `Ember.TextSupport`.

  ```javascript
  Ember.TextSupport.reopen({
    attributeBindings: ["required"]
  })
  ```

  @class TextField
  @namespace Ember
  @extends Ember.View
  @uses Ember.TextSupport
*/
Ember.TextField = Ember.View.extend(Ember.TextSupport,
  /** @scope Ember.TextField.prototype */ {

  classNames: ['ember-text-field'],
  tagName: "input",
  attributeBindings: ['type', 'value', 'size', 'pattern', 'name'],

  /**
    The `value` attribute of the input element. As the user inputs text, this
    property is updated live.

    @property value
    @type String
    @default ""
  */
  value: "",

  /**
    The `type` attribute of the input element.

    @property type
    @type String
    @default "text"
  */
  type: "text",

  /**
    The `size` of the text field in characters.

    @property size
    @type String
    @default null
  */
  size: null,

  /**
    The `pattern` the pattern attribute of input element.

    @property pattern
    @type String
    @default null
  */
  pattern: null,

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
    * `keypress`: the user pressed a key

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

  /**
    The action to be sent when the user inserts a new line.

    Called by the `Ember.TextSupport` mixin on keyUp if keycode matches 13.
    Uses sendAction to send the `enter` action to the controller.

    @method insertNewLine
    @param {Event} event
  */
  insertNewline: function(event) {
    sendAction('enter', this, event);
  },

  /**
    The action to be sent when the user presses a key. Enabled by setting
    the `onEvent` property to `keyPress`.

    Uses sendAction to send the `keyPress` action to the controller.

    @method keyPress
    @param {Event} event
  */
  keyPress: function(event) {
    sendAction('keyPress', this, event);
  }
});

function sendAction(eventName, view, event) {
  var action = get(view, 'action'),
      on = get(view, 'onEvent');

  if (action && on === eventName) {
    var controller = get(view, 'controller'),
        value = get(view, 'value'),
        bubbles = get(view, 'bubbles');

    controller.send(action, value, view);

    if (!bubbles) {
      event.stopPropagation();
    }
  }
}
