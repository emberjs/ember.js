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

  attributeBindings: ['placeholder', 'disabled'],
  placeholder: null,
  disabled: false,

  deleteBackward: Ember.K,
  insertTab: Ember.K,
  insertNewline: Ember.K,
  cancel: Ember.K,
  moveLeft: Ember.K,
  moveUp: Ember.K,
  moveRight: Ember.K,
  moveDown: Ember.K,
  deleteForward: Ember.K,

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
  8: 'deleteBackward',
  9: 'insertTab',
  13: 'insertNewline',
  27: 'cancel',
  37: 'moveLeft',
  38: 'moveUp',
  39: 'moveRight',
  40: 'moveDown',
  46: 'deleteForward'
};