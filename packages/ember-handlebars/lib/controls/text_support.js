require("ember-handlebars/ext");
require("ember-views/views/view");

/**
@module ember
@submodule ember-handlebars
*/

var get = Ember.get, set = Ember.set;

/**
  Shared mixin used by `Ember.TextField` and `Ember.TextArea`.

  @class TextSupport
  @namespace Ember
  @private
*/
Ember.TextSupport = Ember.Mixin.create({
  value: "",

  attributeBindings: ['placeholder', 'disabled', 'maxlength', 'tabindex'],
  placeholder: null,
  disabled: false,
  maxlength: null,

  insertNewline: Ember.K,
  cancel: Ember.K,

  init: function() {
    this._super();
    this.on("focusOut", this, this._elementValueDidChange);
    this.on("change", this, this._elementValueDidChange);
    this.on("paste", this, this._elementValueDidChange);
    this.on("cut", this, this._elementValueDidChange);
    this.on("input", this, this._elementValueDidChange);
    this.on("keyUp", this, this.interpretKeyEvents);
  },

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
