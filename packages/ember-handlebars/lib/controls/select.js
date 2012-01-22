var set = Ember.set, get = Ember.get, getPath = Ember.getPath;

Ember.Select = Ember.CollectionView.extend({
  tagName: 'select',

  optionLabelPath: 'content',
  optionValuePath: 'content',

  selection: null,

  didInsertElement: function() {
    var selection = get(this, 'selection');
    
    if (selection) { this.selectionDidChange(); }

    this.change();
  },

  change: function() {
    var selectedIndex = this.$()[0].selectedIndex,
        content = get(this, 'content');

    if (!content) { return; }

    set(this, 'selection', content.objectAt(selectedIndex));
  },

  selectionDidChange: Ember.observer(function() {
    var el = this.$()[0],
        content = get(this, 'content'),
        selection = get(this, 'selection'),
        selectionIndex = content.indexOf(selection);

    if (el) { el.selectedIndex = selectionIndex; }
  }, 'selection'),

  itemViewClass: Ember.View.extend({
    template: Ember.Handlebars.compile("{{label}}"),
    attributeBindings: ['value'],

    init: function() {
      this.labelPathDidChange();
      this.valuePathDidChange();

      this._super();
    },

    labelPathDidChange: Ember.observer(function() {
      var labelPath = getPath(this, 'parentView.optionLabelPath');

      if (!labelPath) { return; }
      
      Ember.defineProperty(this, 'label', Ember.computed(function() {
        return getPath(this, labelPath);
      }).property(labelPath).cacheable());
    }, 'parentView.optionLabelPath'),

    valuePathDidChange: Ember.observer(function() {
      var valuePath = getPath(this, 'parentView.optionValuePath');

      if (!valuePath) { return; }

      Ember.defineProperty(this, 'value', Ember.computed(function() {
        return getPath(this, valuePath);
      }).property(valuePath).cacheable());
    }, 'parentView.optionValuePath')
  })
});
