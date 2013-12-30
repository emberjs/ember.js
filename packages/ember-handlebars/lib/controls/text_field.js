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

  See [Handlebars.helpers.input](/api/classes/Ember.Handlebars.helpers.html#method_input)  for usage details.

  ## Layout and LayoutName properties

  Because HTML `input` elements are self closing `layout` and `layoutName`
  properties will not be applied. See [Ember.View](/api/classes/Ember.View.html)'s
  layout section for more information.

  @class TextField
  @namespace Ember
  @extends Ember.Component
  @uses Ember.TextSupport
*/
Ember.TextField = Ember.Component.extend(Ember.TextSupport,
  /* @scope Ember.TextField.prototype */ {

  classNames: ['ember-text-field'],
  tagName: "input",
  attributeBindings: ['type', 'value', 'size', 'pattern', 'name', 'min', 'max'],

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
    The `pattern` attribute of input element.

    @property pattern
    @type String
    @default null
  */
  pattern: null,

  /**
    The `min` attribute of input element used with `type="number"` or `type="range"`.

    @property min 
    @type String
    @default null
  */
  min: null,

  /**
    The `max` attribute of input element used with `type="number"` or `type="range"`.

    @property max 
    @type String
    @default null
  */
  max: null
});
