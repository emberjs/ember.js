require("sproutcore-handlebars/ext");
require("sproutcore-views/views/view");
/** @class */

SC.TextField = SC.View.extend(
  /** @scope SC.TextField.prototype */ {

  classNames: ['sc-text-field'],

  insertNewline: function(event) { },
  cancel: function(event) { },

  type: "text",
  value: "",
  placeholder: null,

  defaultTemplate: function() {
    var type = this.get('type');
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

    this.set('value', input.val());
  },

  _valueDidChange: function() {
    this.invokeOnce(this._updateElementValue);
  },

  _updateElementValue: function() {
    var input = this.$('input');
    input.val(this.get('value'));
  }
});

SC.TextField.KEY_EVENTS = {
  13: 'insertNewline',
  27: 'cancel'
};

