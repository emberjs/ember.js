/**
@module ember
@submodule ember-views
*/
import { computed } from 'ember-metal/computed';
import environment from 'ember-metal/environment';
import Component from 'ember-views/views/component';
import TextSupport from 'ember-views/mixins/text_support';

var inputTypeTestElement;
var inputTypes = Object.create(null);
function canSetTypeOfInput(type) {
  if (type in inputTypes) {
    return inputTypes[type];
  }

  // if running in outside of a browser always return the
  // original type
  if (!environment.hasDOM) {
    inputTypes[type] = type;

    return type;
  }

  if (!inputTypeTestElement) {
    inputTypeTestElement = document.createElement('input');
  }

  try {
    inputTypeTestElement.type = type;
  } catch(e) { }

  return inputTypes[type] = inputTypeTestElement.type === type;
}

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
  @public
*/
export default Component.extend(TextSupport, {
  instrumentDisplay: '{{input type="text"}}',

  classNames: ['ember-text-field'],
  tagName: 'input',
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
    @public
  */
  value: '',

  /**
    The `type` attribute of the input element.

    @property type
    @type String
    @default "text"
    @public
  */
  type: computed({
    get() {
      return 'text';
    },

    set(key, value) {
      var type = 'text';

      if (canSetTypeOfInput(value)) {
        type = value;
      }

      return type;
    }
  }),

  /**
    The `size` of the text field in characters.

    @property size
    @type String
    @default null
    @public
  */
  size: null,

  /**
    The `pattern` attribute of input element.

    @property pattern
    @type String
    @default null
    @public
  */
  pattern: null,

  /**
    The `min` attribute of input element used with `type="number"` or `type="range"`.

    @property min
    @type String
    @default null
    @since 1.4.0
    @public
  */
  min: null,

  /**
    The `max` attribute of input element used with `type="number"` or `type="range"`.

    @property max
    @type String
    @default null
    @since 1.4.0
    @public
  */
  max: null
});
