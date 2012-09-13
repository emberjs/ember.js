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

  ``` handlebars
  {{view Ember.TextField valueBinding="firstName"}}
  ```

  ## Layout and LayoutName properties
  Because HTML `input` elements are self closing `layout` and `layoutName` properties will
  not be applied. See `Ember.View`'s layout section for more information.

  @class TextField
  @namespace Ember
  @extends Ember.View
  @uses Ember.TextSupport
*/
Ember.TextField = Ember.View.extend(Ember.TextSupport,
  /** @scope Ember.TextField.prototype */ {

  classNames: ['ember-text-field'],
  tagName: "input",
  attributeBindings: ['type', 'value', 'size'],

  /**
    The value attribute of the input element. As the user inputs text, this
    property is updated live.

    @property value
    @type String
    @default ""
  */
  value: "",

  /**
    The type attribute of the input element.

    @property type
    @type String
    @default "text"
  */
  type: "text",

  /**
    The size of the text field in characters.

    @property size
    @type String
    @default null
  */
  size: null
});
