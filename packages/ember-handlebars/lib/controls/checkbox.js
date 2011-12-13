// ==========================================================================
// Project:   Ember Handlebar Views
// Copyright: ©2011 Strobe Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

require("ember-views/views/view");
require("ember-handlebars/ext");

var set = Ember.set, get = Ember.get;

// TODO: Be explicit in the class documentation that you
// *MUST* set the value of a checkbox through Ember.
// Updating the value of a checkbox directly via jQuery objects
// will not work.

Ember.Checkbox = Ember.View.extend({
  title: null,
  value: false,
  disabled: false,

  classNames: ['ember-checkbox'],

  defaultTemplate: Ember.Handlebars.compile('<label><input type="checkbox" {{bindAttr checked="value" disabled="disabled"}}>{{title}}</label>'),

  change: function() {
    Ember.run.once(this, this._updateElementValue);
    // returning false will cause IE to not change checkbox state
  },

  _updateElementValue: function() {
    var input = this.$('input:checkbox');
    set(this, 'value', input.prop('checked'));
  }
});

