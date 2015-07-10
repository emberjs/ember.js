import { get } from 'ember-metal/property_get';
import { set } from 'ember-metal/property_set';
import EmberComponent from 'ember-views/components/component';

/**
@module ember
@submodule ember-views
*/

/**
  The internal class used to create text inputs when the `{{input}}`
  helper is used with `type` of `checkbox`.

  See [Ember.Templates.helpers.input](/api/classes/Ember.Templates.helpers.html#method_input)  for usage details.

  ## Direct manipulation of `checked`

  The `checked` attribute of an `Ember.Checkbox` object should always be set
  through the Ember object or by interacting with its rendered element
  representation via the mouse, keyboard, or touch. Updating the value of the
  checkbox via jQuery will result in the checked value of the object and its
  element losing synchronization.

  ## Layout and LayoutName properties

  Because HTML `input` elements are self closing `layout` and `layoutName`
  properties will not be applied. See [Ember.View](/api/classes/Ember.View.html)'s
  layout section for more information.

  @class Checkbox
  @namespace Ember
  @extends Ember.Component
  @public
*/
export default EmberComponent.extend({
  instrumentDisplay: '{{input type="checkbox"}}',

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
  checked: false,
  disabled: false,
  indeterminate: false,

  init() {
    this._super(...arguments);
    this.on('change', this, this._updateElementValue);
  },

  didInsertElement() {
    this._super(...arguments);
    get(this, 'element').indeterminate = !!get(this, 'indeterminate');
  },

  _updateElementValue() {
    set(this, 'checked', this.$().prop('checked'));
  }
});
