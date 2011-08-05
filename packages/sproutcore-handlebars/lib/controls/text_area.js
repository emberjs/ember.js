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

  insertNewline: SC.K,
  cancel: SC.K,
  
  focusOut: function(event) {
    this._elementValueDidChange();
    return false;
  },

  change: function(event) {
    this._elementValueDidChange();
    return false;
  },

  keyUp: function(event) {
    this.interpretKeyEvents(event);
    return false;
  },

  /**
    @private
  */
  willInsertElement: function() {
    this._updateElementValue();
  },

  interpretKeyEvents: function(event) {
    var map = SC.TextArea.KEY_EVENTS;
    var method = map[event.keyCode];

    this._elementValueDidChange();
    if (method) { return this[method](event); }
  },

  _elementValueDidChange: function() {
    set(this, 'value', this.$().val() || null);
  },

  _updateElementValue: function() {
    this.$().val(get(this, 'value'));
  }.observes('value')
});

SC.TextArea.KEY_EVENTS = {
  13: 'insertNewline',
  27: 'cancel'
};
