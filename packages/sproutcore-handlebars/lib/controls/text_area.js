// ==========================================================================
// Project:   Ember Handlebar Views
// Copyright: ©2011 Strobe Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

require("sproutcore-handlebars/ext");
require("sproutcore-views/views/view");
require("sproutcore-handlebars/controls/text_support");

/** @class */

var get = Ember.get, set = Ember.set;

Ember.TextArea = Ember.View.extend(Ember.TextSupport, {

  classNames: ['sc-text-area'],

  tagName: "textarea",

  /**
    @private
  */
  didInsertElement: function() {
    this._updateElementValue();
  },

  _updateElementValue: Ember.observer(function() {
    this.$().val(get(this, 'value'));
  }, 'value')

});
