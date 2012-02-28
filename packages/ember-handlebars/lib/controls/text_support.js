// ==========================================================================
// Project:   Ember Handlebar Views
// Copyright: ©2011 Strobe Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

require("ember-handlebars/ext");
require("ember-views/views/view");

var get = Ember.get, set = Ember.set;

/** @class */
Ember.TextSupport = Ember.Mixin.create(
/** @scope Ember.TextSupport.prototype */ {

  value: "",

  attributeBindings: ['placeholder', 'disabled', 'maxlength'],
  placeholder: null,
  disabled: false,
  maxlength: null,

  insertNewline: Ember.K,
  cancel: Ember.K,

  focusOut: function(event) {
    this._elementValueDidChange();
  },

  change: function(event) {
    this._elementValueDidChange();
  },

  keyUp: function(event) {
    this.interpretKeyEvents(event);
  },

  /**
    @private
  */
  interpretKeyEvents: function(event) {
    var map = Ember.TextSupport.KEY_EVENTS;
    var method = map[event.keyCode];

    this._elementValueDidChange();
    if (method) { return this[method](event); }
  },

  _elementValueDidChange: function() {
    set(this, 'value', this.$().val());
  }

});

Ember.TextSupport.KEY_EVENTS = {
  13: 'insertNewline',
  27: 'cancel'
};
