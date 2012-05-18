// ==========================================================================
// Project:   Ember Handlebar Views
// Copyright: ©2011 Strobe Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

require("ember-views/views/view");
require("ember-handlebars/ext");

var set = Ember.set, get = Ember.get;

/**
  @class

  Creates an HTML input view in one of two formats.

  If a `title` property or binding is provided the input will be wrapped in
  a `div` and `label` tag. View properties like `classNames` will be applied to
  the outermost `div`. This behavior is deprecated and will issue a warning in development.


      {{view Ember.Checkbox classNames="applicaton-specific-checkbox" title="Some title"}}


      <div id="ember1" class="ember-view ember-checkbox applicaton-specific-checkbox">
        <label><input type="checkbox" />Some title</label>
      </div>

  If `title` isn't provided the view will render as an input element of the 'checkbox' type and HTML
  related properties will be applied directly to the input.

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

*/
Ember.Checkbox = Ember.View.extend({
  classNames: ['ember-checkbox'],

  tagName: 'input',

  attributeBindings: ['type', 'checked', 'disabled'],

  type: "checkbox",
  checked: false,
  disabled: false,

  /** @deprecated */
  title: null,

  value: Ember.computed(function(propName, value){
    Ember.deprecate("Ember.Checkbox's 'value' property has been renamed to 'checked' to match the html element attribute name");
    if (value !== undefined) {
      return set(this, 'checked', value);
    } else {
      return get(this, 'checked');
    }
  }).property('checked').volatile(),

  change: function() {
    Ember.run.once(this, this._updateElementValue);
    // returning false will cause IE to not change checkbox state
  },

  /**
    @private
  */
  _updateElementValue: function() {
    var input = get(this, 'title') ? this.$('input:checkbox') : this.$();
    set(this, 'checked', input.prop('checked'));
  },

  init: function() {
    if (get(this, 'title') || get(this, 'titleBinding')) {
      Ember.deprecate("Automatically surrounding Ember.Checkbox inputs with a label by providing a 'title' property is deprecated");
      this.tagName = undefined;
      this.attributeBindings = [];
      this.defaultTemplate = Ember.Handlebars.compile('<label><input type="checkbox" {{bindAttr checked="checked" disabled="disabled"}}>{{title}}</label>');
    }

    this._super();
  }
});
