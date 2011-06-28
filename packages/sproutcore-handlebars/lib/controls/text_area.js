// ==========================================================================
// Project:   SproutCore Handlebar Views
// Copyright: ©2011 Strobe Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

require("sproutcore-handlebars/ext");
require("sproutcore-views/views/view");
/** @class */

var get = SC.get, set = SC.set;

SC.TextArea = SC.View.extend({

  classNames: ['sc-text-area'],

  tagName: "textarea",
  value: "",
  attributeBindings: ['placeholder'],
  placeholder: null,
  
  focusOut: function(event) {
    this._elementValueDidChange();
    return false;
  },

  change: function(event) {
    this._elementValueDidChange();
    return false;
  },

  keyUp: function(event) {
    this._elementValueDidChange();
    return false;
  },

  /**
    @private
  */
  willInsertElement: function() {
    this._updateElementValue();
  },

  _elementValueDidChange: function() {
    set(this, 'value', this.$().val());
  },

  _updateElementValue: function() {
    this.$().val(get(this, 'value'));
  }.observes('value')
});