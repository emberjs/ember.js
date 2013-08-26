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

  You may also use the "dynamic tag" form of the helper, rather than the
  `{{view}}` form. In fact [this is recommend](/blog/2013/04/21/ember-1-0-rc3.html#toc_new-input-and-textarea-helpers).

  ```handlebars
  {{input type="checkbox" checked=receiveEmail}}
  ```

  When using dynamic tags, you do not need to use a `Binding` suffix and
  must leave out the quotation marks around the values. Ember will interpret
  quoted strings as static strings in this context. See the
  [Ember.Handlebars.helpers](/api/classes/Ember.Handlebars.helpers.html)'s
  section for more information.

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
