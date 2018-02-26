import { get, set } from 'ember-metal';
import EmberComponent from '../component';
import layout from '../templates/empty';

/**
@module @ember/component
*/

/**
  The internal class used to create text inputs when the `{{input}}`
  helper is used with `type` of `checkbox`.

  See [Ember.Templates.helpers.input](/api/classes/Ember.Templates.helpers.html#method_input)  for usage details.

  ## Direct manipulation of `checked`

  The `checked` attribute of an `Checkbox` object should always be set
  through the Ember object or by interacting with its rendered element
  representation via the mouse, keyboard, or touch. Updating the value of the
  checkbox via jQuery will result in the checked value of the object and its
  element losing synchronization.

  ## Layout and LayoutName properties

  Because HTML `input` elements are self closing `layout` and `layoutName`
  properties will not be applied.

  @class Checkbox
  @extends Component
  @public
*/
export default EmberComponent.extend({
  layout,
  classNames: ['ember-checkbox'],

  tagName: 'input',

  attributeBindings: [
    'type',
    'checked',
    'indeterminate',
    'disabled',
    'tabindex',
    'name',
    'autofocus',
    'required',
    'form'
  ],

  type: 'checkbox',
  disabled: false,
  indeterminate: false,

  didInsertElement() {
    this._super(...arguments);
    get(this, 'element').indeterminate = !!get(this, 'indeterminate');
  },

  change() {
   set(this, 'checked', this.$().prop('checked'));
  }
});
