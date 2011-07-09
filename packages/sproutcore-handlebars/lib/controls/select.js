// ==========================================================================
// Project:   SproutCore Handlebar Views
// Copyright: ©2011 Strobe Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

var get = SC.get, set = SC.set;

SC.SelectOption = SC.View.extend({
  tagName: 'option',
  classNames: ['sc-select-option'],

  /*
    Note: we can't use a template with {{label}} here because it
    uses a BindableSpan. The browser will eat the span inside of
    an option tag.
  */
  template: function(context, options) {
    options.data.buffer.push(context.get('label'));
  },
  attributeBindings: ['value', 'selected'],

  labelBinding: '*content.label',
  valueBinding: '*content.value',
  selectedBinding: '*content.selected',
  
  _labelDidChange: function() {
    this.rerender();
  }.observes('*content.label')
});

SC.Select = SC.CollectionView.extend({
  tagName: 'select',
  classNames: ['sc-select'],

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
