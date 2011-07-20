// ==========================================================================
// Project:   SproutCore Handlebar Views
// Copyright: ©2011 Strobe Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

require("sproutcore-views/views/view");
require("sproutcore-handlebars/ext");

var set = SC.set, get = SC.get;

// TODO: Be explicit in the class documentation that you
// *MUST* set the value of a checkbox through SproutCore.
// Updating the value of a checkbox directly via jQuery objects
// will not work.

SC.Checkbox = SC.View.extend({
  title: null,
  value: false,

  classNames: ['sc-checkbox'],

  defaultTemplate: SC.Handlebars.compile('<label><input type="checkbox" {{bindAttr checked="value"}}>{{title}}</label>'),

  change: function() {
    SC.run.once(this, this._updateElementValue);
    // returning false will cause IE to not change checkbox state
  },

  _updateElementValue: function() {
    var input = this.$('input:checkbox');
    set(this, 'value', input.prop('checked'));
  }
});

