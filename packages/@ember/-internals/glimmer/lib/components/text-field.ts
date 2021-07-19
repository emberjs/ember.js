/**
@module @ember/component
*/
import { hasDOM } from '@ember/-internals/browser-environment';
import { computed } from '@ember/-internals/metal';
import { TextSupport } from '@ember/-internals/views';
import Component from '../component';
import layout from '../templates/empty';

const inputTypes = hasDOM ? Object.create(null) : null;
function canSetTypeOfInput(type: string): boolean {
  // if running in outside of a browser always return
  // the original type
  if (!hasDOM) {
    return Boolean(type);
  }

  if (type in inputTypes) {
    return inputTypes[type];
  }

  let inputTypeTestElement = document.createElement('input');

  try {
    inputTypeTestElement.type = type;
  } catch (e) {
    // ignored
  }

  return (inputTypes[type] = inputTypeTestElement.type === type);
}

/**
  The internal class used to create text inputs when the `Input` component is used with `type` of `text`.

  See [Ember.Templates.components.Input](/ember/release/classes/Ember.Templates.components/methods/Input?anchor=Input) for usage details.

  ## Layout and LayoutName properties

  Because HTML `input` elements are self closing `layout` and `layoutName`
  properties will not be applied.

  @class TextField
  @extends Component
  @uses Ember.TextSupport
  @public
*/
const TextField = Component.extend(TextSupport, {
  layout,

  /**
    By default, this component will add the `ember-text-field` class to the component's element.

    @property classNames
    @type Array | String
    @default ['ember-text-field']
    @public
   */
  classNames: ['ember-text-field'],
  tagName: 'input',

  /**
    By default this component will forward a number of arguments to attributes on the the
    component's element:

    * accept
    * autocomplete
    * autosave
    * dir
    * formaction
    * formenctype
    * formmethod
    * formnovalidate
    * formtarget
    * height
    * inputmode
    * lang
    * list
    * type
    * max
    * min
    * multiple
    * name
    * pattern
    * size
    * step
    * value
    * width

    When invoked with `{{input type="text"}}`, you can only customize these attributes. When invoked
    with `<Input @type="text" />`, you can just use HTML attributes directly.

    @property attributeBindings
    @type Array | String
    @default ['accept', 'autocomplete', 'autosave', 'dir', 'formaction', 'formenctype', 'formmethod', 'formnovalidate', 'formtarget', 'height', 'inputmode', 'lang', 'list', 'type', 'max', 'min', 'multiple', 'name', 'pattern', 'size', 'step', 'value', 'width']
    @public
  */
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
    'type', // needs to be before min and max. See #15675
    'max',
    'min',
    'multiple',
    'name',
    'pattern',
    'size',
    'step',
    'value',
    'width',
  ],

  /**
    As the user inputs text, this property is updated to reflect the `value` property of the HTML
    element.

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
    get(): string {
      return 'text';
    },

    set(_key: string, value: string) {
      let type = 'text';

      if (canSetTypeOfInput(value)) {
        type = value;
      }

      return type;
    },
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
  max: null,
});

TextField.toString = () => '@ember/component/text-field';

export default TextField;
