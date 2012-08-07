// ==========================================================================
// Project:   Ember Handlebars Views
// Copyright: ©2011 Strobe Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

require("ember-views/views/view");
require("ember-handlebars/ext");

var set = Ember.set, get = Ember.get;

/**
  @class

  Creates an HTML input of type 'checkbox' with HTML related properties 
  applied directly to the input.

      {{view Ember.Checkbox classNames="applicaton-specific-checkbox"}}

      <input id="ember1" class="ember-view ember-checkbox applicaton-specific-checkbox" type="checkbox">

  You can add a `label` tag yourself in the template where the Ember.Checkbox is being used.

      <label>
        Some Title
        {{view Ember.Checkbox classNames="applicaton-specific-checkbox"}}
      </label>


  The `checked` attribute of an Ember.Checkbox object should always be set
  through the Ember object or by interacting with its rendered element representation
  via the mouse, keyboard, or touch.  Updating the value of the checkbox via jQuery will
  result in the checked value of the object and its element losing synchronization.

  ## Layout and LayoutName properties
  Because HTML `input` elements are self closing `layout` and `layoutName` properties will
  not be applied. See `Ember.View`'s layout section for more information.

  @extends Ember.View
*/
Ember.Checkbox = Ember.View.extend({
  classNames: ['ember-checkbox'],

  tagName: 'input',

  attributeBindings: ['type', 'checked', 'disabled', 'tabindex'],

  type: "checkbox",
  checked: false,
  disabled: false,

  init: function() {
    this._super();
    this.on("change", this, this._updateElementValue);
  },

  /**
    @private
  */
  _updateElementValue: function() {
    set(this, 'checked', this.$().prop('checked'));
  }
});
