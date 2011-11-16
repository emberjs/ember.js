// ==========================================================================
// Project:   SproutCore Handlebar Views
// Copyright: ©2011 Strobe Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

require("sproutcore-handlebars/ext");
require("sproutcore-views/views/view");
require("sproutcore-handlebars/controls/text_support");

/** @class */

var get = SC.get, set = SC.set;

SC.TextArea = SC.View.extend(SC.TextSupport, {

  classNames: ['sc-text-area'],

  tagName: "textarea",

  /**
    @private
  */
  willInsertElement: function() {
    this._updateElementValue();
  },

  _updateElementValue: function() {
    this.$().val(get(this, 'value'));
  }.observes('value')

});
