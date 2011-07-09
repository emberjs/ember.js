// ==========================================================================
// Project:   SproutCore Handlebar Views
// Copyright: ©2011 Strobe Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

var get = SC.get, set = SC.set;

SC.SelectOption = SC.View.extend({
  tagName: 'option',
  template: SC.Handlebars.compile("{{label}}"),
  attributeBindings: ['value', 'selected'],

  label: function() {
    var content = get(this, 'content'), ret = content;

    if (typeof content === "object") {
       ret = content.label;
    }

    return ret;
  }.property(),

  value: function() {
    var content = get(this, 'content'), ret = content;

    if (typeof content === "object") {
       ret = content.value;
    }

    return ret;
  }.property()
});

SC.Select = SC.CollectionView.extend({
  tagName: 'select',
  itemViewClass: SC.SelectOption,

  value: null,

  willInsertElement: function() {
    this._elementValueDidChange();
  },

  change: function() {
    this._elementValueDidChange();
  },

  _elementValueDidChange: function() {
    set(this, 'value', this.$().val());
  }
});
