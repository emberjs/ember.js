require("sproutcore-views/views/view");
/** @class */

SC.TextField = SC.View.extend(
  /** @scope SC.TextField.prototype */ {

  classNames: ['sc-text-field'],

  insertNewline: function(event) { },
  cancel: function(event) { },

  type: "text",
  value: null,
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
    if (evt.keyCode === 13) {
      return this.insertNewline(evt);
    } else if (evt.keyCode === 27) {
      return this.cancel(evt);
    } else {
      this._elementValueDidChange();
    }

    return false;
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

