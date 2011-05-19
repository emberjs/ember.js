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

  type: "text",
  value: "",
  placeholder: null,

  defaultTemplate: function() {
    var type = get(this, 'type');
    return SC.Handlebars.compile('<input type="%@" {{bindAttr value="value" placeholder="placeholder"}}>'.fmt(type));
  }.property(),

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
    var input = this.$('input');

    set(this, 'value', input.val());
  },

  _valueDidChange: function() {
    SC.run.once(this, this._updateElementValue);
  },

  _updateElementValue: function() {
    var input = this.$('input');
    input.val(get(this, 'value'));
  }
});

SC.TextField.KEY_EVENTS = {
  13: 'insertNewline',
  27: 'cancel'
};

