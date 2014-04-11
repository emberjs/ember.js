/**
@module ember
@submodule ember-handlebars
*/

import {get} from "ember-metal/property_get";
import {set} from "ember-metal/property_set";
import Component from "ember-views/views/component";
import TextSupport from "ember-handlebars/controls/text_support";

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

  classNames: ['ember-text-field'],
  tagName: "input",
  attributeBindings: ['type', 'value', 'size', 'pattern', 'name', 'min', 'max',
                      'accept', 'autocomplete', 'autosave', 'formaction',
                      'formenctype', 'formmethod', 'formnovalidate', 'formtarget',
                      'height', 'inputmode', 'list', 'multiple', 'pattern', 'step',
                      'width'],

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

export default TextField;
