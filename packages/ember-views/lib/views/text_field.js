/**
@module ember
@submodule ember-views
*/
import Component from "ember-views/views/component";
import TextSupport from "ember-views/mixins/text_support";

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
var TextField = Component.extend(TextSupport, {
  instrumentDisplay: '{{input type="text"}}',

  classNames: ['ember-text-field'],
  tagName: "input",
  attributeBindings: [
    'accept',
    'autocomplete',
    'autosave',
    'dir',
    'formaction',
    'formenctype',
    'formmethod',
    'formnovalidate',
    'formtarget',
    'height',
    'inputmode',
    'lang',
    'list',
    'max',
    'min',
    'multiple',
    'name',
    'pattern',
    'size',
    'step',
    'type',
    'value',
    'width'
  ],

  defaultLayout: null,

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
    @since 1.4.0
  */
  min: null,

  /**
    The `max` attribute of input element used with `type="number"` or `type="range"`.

    @property max
    @type String
    @default null
    @since 1.4.0
  */
  max: null
});

TextField.reopenClass({
  create: function(attributes) {
    attributes = attributes || {};

    Ember.assert('You can either pass `on` or `onEvent` to TextField, not both', !(attributes.on && attributes.onEvent));

    if (!attributes.onEvent) {
      attributes.onEvent = attributes.on || 'enter';
      delete attributes.on;
    }

    return this._super.apply(this, arguments);
  }
});

export default TextField;
