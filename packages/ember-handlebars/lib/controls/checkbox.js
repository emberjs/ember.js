require("ember-views/views/view");
require("ember-handlebars/ext");

/**
@module ember
@submodule ember-handlebars
*/

var set = Ember.set, get = Ember.get;

/**
  The `Ember.Checkbox` view class renders a checkbox
  [input](https://developer.mozilla.org/en/HTML/Element/Input) element. It
  allows for binding an Ember property (`checked`) to the status of the
  checkbox.

  Example:

  ```handlebars
  {{view Ember.Checkbox checkedBinding="receiveEmail"}}
  ```

  You can add a `label` tag yourself in the template where the `Ember.Checkbox`
  is being used.

  ```handlebars
  <label>
    {{view Ember.Checkbox classNames="applicaton-specific-checkbox"}}
    Some Title
  </label>
  ```

  The `checked` attribute of an `Ember.Checkbox` object should always be set
  through the Ember object or by interacting with its rendered element
  representation via the mouse, keyboard, or touch. Updating the value of the
  checkbox via jQuery will result in the checked value of the object and its
  element losing synchronization.

  ## Layout and LayoutName properties

  Because HTML `input` elements are self closing `layout` and `layoutName`
  properties will not be applied. See `Ember.View`'s layout section for more
  information.

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
