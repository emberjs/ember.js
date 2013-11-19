require("ember-views/views/view");
require("ember-handlebars/ext");

/**
@module ember
@submodule ember-handlebars
*/

var set = Ember.set, get = Ember.get;

/**
  The internal class used to create text inputs when the `{{input}}`
  helper is used with `type` of `checkbox`.

  See [handlebars.helpers.input](/api/classes/Ember.Handlebars.helpers.html#method_input)  for usage details.

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
  @extends Ember.View
*/
Ember.Checkbox = Ember.View.extend({
  classNames: ['ember-checkbox'],

  tagName: 'input',

  attributeBindings: ['type', 'checked', 'indeterminate', 'disabled', 'tabindex', 'name'],

  type: "checkbox",
  checked: false,
  disabled: false,
  indeterminate: false,

  init: function() {
    this._super();
    this.on("change", this, this._updateElementValue);
  },

  didInsertElement: function() {
    this._super();
    this.get('element').indeterminate = !!this.get('indeterminate');
  },

  _updateElementValue: function() {
    set(this, 'checked', this.$().prop('checked'));
  }
});
