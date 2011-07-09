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

  labelKey: 'label',
  valueKey: 'value',

  label: function() {
    var content = get(this, 'content'), ret = content,
        labelKey = get(this, 'labelKey');

    if (typeof content === "object") {
       ret = content.get(labelKey);
    }

    return ret;
  }.property().cacheable(),

  value: function() {
    var content = get(this, 'content'), ret = content,
        valueKey = get(this, 'valueKey');

    if (typeof content === "object") {
       ret = content.get(valueKey);
    }

    return ret;
  }.property().cacheable()
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
