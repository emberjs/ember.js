// ==========================================================================
// Project:   Ember Handlebar Views
// Copyright: ©2011 Strobe Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

require("ember-handlebars/ext");
require("ember-views/views/view");
/** @class */

var get = Ember.get, set = Ember.set;

Ember.TextSupport = Ember.Mixin.create({

  value: "",

  attributeBindings: ['placeholder', 'disabled'],
  placeholder: null,
  disabled: false,

  insertNewline: Ember.K,
  cancel: Ember.K,

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
    var map = Ember.TextSupport.KEY_EVENTS;
    var method = map[event.keyCode];

    this._elementValueDidChange();
    if (method) { return this[method](event); }
  },

  _elementValueDidChange: function() {
    set(this, 'value', this.$().val() || '');
  }

});

Ember.TextSupport.KEY_EVENTS = {
  13: 'insertNewline',
  27: 'cancel'
};
