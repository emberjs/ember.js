require("ember-handlebars/ext");
require("ember-views/views/view");
require("ember-handlebars/controls/text_support");

/**
@module ember
@submodule ember-handlebars
*/

var get = Ember.get, set = Ember.set;

/**

  The internal class used to create text inputs when the `{{input}}`
  helper is used with `type` of `text`.

  See Handlebars.helpers.input for usage details.

  ## Layout and LayoutName properties

  Because HTML `input` elements are self closing `layout` and `layoutName`
  properties will not be applied. See [Ember.View](/api/classes/Ember.View.html)'s
  layout section for more information.

  @class TextField
  @namespace Ember
  @extends Ember.View
  @uses Ember.TextSupport
*/
Ember.TextField = Ember.Component.extend(Ember.TextSupport,
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
  bubbles: false
});

// In principle, this shouldn't be necessary, but the legacy
// sectionAction semantics for TextField are different from
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
