var set = Ember.set, get = Ember.get, getPath = Ember.getPath;
var indexOf = Ember.ArrayUtils.indexOf;

Ember.Select = Ember.View.extend({
  tagName: 'select',
  template: Ember.Handlebars.compile(
    '{{#if prompt}}<option>{{prompt}}</option>{{/if}}' +
    '{{#each content}}{{view Ember.SelectOption contentBinding="this"}}{{/each}}'
  ),

  content: null,
  selection: null,
  prompt: null,

  optionLabelPath: 'content',
  optionValuePath: 'content',


  didInsertElement: function() {
    var selection = get(this, 'selection');

    if (selection) { this.selectionDidChange(); }

    this.change();
  },

  change: function() {
    var selectedIndex = this.$()[0].selectedIndex,
        content = get(this, 'content'),
        prompt = get(this, 'prompt');

    if (!content) { return; }
    if (prompt && selectedIndex === 0) { set(this, 'selection', null); return; }

    if (prompt) { selectedIndex -= 1; }
    set(this, 'selection', content.objectAt(selectedIndex));
  },

  selectionDidChange: Ember.observer(function() {
    var el = this.$()[0],
        content = get(this, 'content'),
        selection = get(this, 'selection'),
        selectionIndex = indexOf(content, selection),
        prompt = get(this, 'prompt');

    if (prompt) { selectionIndex += 1; }
    if (el) { el.selectedIndex = selectionIndex; }
  }, 'selection')
});

Ember.SelectOption = Ember.View.extend({
  tagName: 'option',
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
});

