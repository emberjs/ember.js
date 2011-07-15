// ==========================================================================
// Project:   SproutCore Handlebar Views
// Copyright: ©2011 Strobe Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

require("sproutcore-handlebars/ext");
require("sproutcore-views/views/view");
/** @class */

var get = SC.get, set = SC.set;

SC.TextField = SC.View.extend(
  /** @scope SC.TextField.prototype */ {

  classNames: ['sc-text-field'],

  insertNewline: SC.K,
  cancel: SC.K,

  tagName: "input",
  attributeBindings: ['type', 'placeholder', 'value'],
  type: "text",
  value: "",
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
    this.interpretKeyEvents(event);
    return false;
  },

  /**
    @private
  */
  interpretKeyEvents: function(event) {
    var map = SC.TextField.KEY_EVENTS;
    var method = map[event.keyCode];

    if (method) { return this[method](event); }
    else { this._elementValueDidChange(); }
  },

  _elementValueDidChange: function() {
    set(this, 'value', this.$().val());
  },

  _updateElementValue: function() {
    this.$().val(get(this, 'value'));
  }
});

SC.TextField.KEY_EVENTS = {
  13: 'insertNewline',
  27: 'cancel'
};

