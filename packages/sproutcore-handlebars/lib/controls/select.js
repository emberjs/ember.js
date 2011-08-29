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
  }.observes('label')
});

SC.Select = SC.CollectionView.extend({
  tagName: 'select',
  classNames: ['sc-select'],
  attributeBindings: ['multiple'],

  itemViewClass: SC.SelectOption,

  _value: null,

  value: function(key, value) {
    if (value !== undefined) {
      set(this, '_value', value);

      get(this, 'childViews').forEach(function(el, idx) {
        var content = get(el, 'content');

        if (content === value) {
          set(content, 'selected', true);
        } else {
          set(content, 'selected', false);
        }
      });
    }

    return get(this, '_value');
  }.property('_value').cacheable(),

  willInsertElement: function() {
    this._elementValueDidChange();
  },

  change: function() {
    this._elementValueDidChange();
  },

  _elementValueDidChange: function() {
    var views = SC.View.views,
        selectedOptions = this.$('option:selected'),
        value;

    if (get(this, 'multiple') && get(this, 'multiple') !== "false") {
      value = selectedOptions.toArray().map(function(el) { return get(views[el.id], 'content'); });
    } else {
      value = get(views[selectedOptions.prop('id')], 'content');
    }

    set(this, 'value', value);
    set(get(this, 'content'), 'selection', value);
  },

  arrayWillChange: function(content, start, removed) {
    var selected, idx, obj;

    if (content && removed) {
      for (idx = start; idx < start+removed; idx++) {
        obj = content.objectAt(idx);

        if (selected = get(content, 'selection')) {
          if (SC.isArray(selected) && selected.contains(obj)) {
            selected.removeObject(obj);
          } else if (selected === obj) {
            set(content, 'selection', null);
          }
        }
      }
    }

    this._super(content, start, removed);
  }
});
