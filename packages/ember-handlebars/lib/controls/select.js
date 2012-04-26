/*jshint eqeqeq:false */

var set = Ember.set, get = Ember.get, getPath = Ember.getPath;
var indexOf = Ember.ArrayUtils.indexOf, indexesOf = Ember.ArrayUtils.indexesOf;

Ember.Select = Ember.View.extend({
  tagName: 'select',
  defaultTemplate: Ember.Handlebars.compile('{{#if view.prompt}}<option>{{view.prompt}}</option>{{/if}}{{#each view.content}}{{view Ember.SelectOption contentBinding="this"}}{{/each}}'),
  attributeBindings: ['multiple'],

  multiple: false,
  content: null,
  selection: null,
  prompt: null,

  optionLabelPath: 'content',
  optionValuePath: 'content',

  change: function() {
    if (get(this, 'multiple')) {
      this._changeMultiple();
    } else {
      this._changeSingle();
    }
  },

  selectionDidChange: Ember.observer(function() {
    var selection = get(this, 'selection'),
        isArray = Ember.isArray(selection);
    if (get(this, 'multiple')) {
      if (!isArray) {
        set(this, 'selection', Ember.A([selection]));
        return;
      }
      this._selectionDidChangeMultiple();
    } else {
      this._selectionDidChangeSingle();
    }
  }, 'selection'),

  _triggerChange: function() {
    var selection = get(this, 'selection');

    if (selection) { this.selectionDidChange(); }

    this.change();
  },

  _changeSingle: function() {
    var selectedIndex = this.$()[0].selectedIndex,
        content = get(this, 'content'),
        prompt = get(this, 'prompt');

    if (!content) { return; }
    if (prompt && selectedIndex === 0) { set(this, 'selection', null); return; }

    if (prompt) { selectedIndex -= 1; }
    set(this, 'selection', content.objectAt(selectedIndex));
  },

  _changeMultiple: function() {
    var options = this.$('option:selected'),
        prompt = get(this, 'prompt'),
        offset = prompt ? 1 : 0,
        content = get(this, 'content');

    if (!content){ return; }
    if (options) {
      var selectedIndexes = options.map(function(){
        return this.index - offset;
      }).toArray();
      set(this, 'selection', content.objectsAt(selectedIndexes));
    }
  },

  _selectionDidChangeSingle: function() {
    var el = this.$()[0],
        content = get(this, 'content'),
        selection = get(this, 'selection'),
        selectionIndex = indexOf(content, selection),
        prompt = get(this, 'prompt');

    if (prompt) { selectionIndex += 1; }
    if (el) { el.selectedIndex = selectionIndex; }
  },

  _selectionDidChangeMultiple: function() {
    var content = get(this, 'content'),
        selection = get(this, 'selection'),
        selectedIndexes = indexesOf(content, selection),
        prompt = get(this, 'prompt'),
        offset = prompt ? 1 : 0,
        options = this.$('option');

    if (options) {
      options.each(function() {
        this.selected = indexOf(selectedIndexes, this.index + offset) > -1;
      });
    }
  },

  init: function() {
    this._super();
    this.on("didInsertElement", this, this._triggerChange);
  }

});

Ember.SelectOption = Ember.View.extend({
  tagName: 'option',
  defaultTemplate: Ember.Handlebars.compile("{{view.label}}"),
  attributeBindings: ['value', 'selected'],

  init: function() {
    this.labelPathDidChange();
    this.valuePathDidChange();

    this._super();
  },

  selected: Ember.computed(function() {
    var content = get(this, 'content'),
        selection = getPath(this, 'parentView.selection');
    if (getPath(this, 'parentView.multiple')) {
      return selection && indexOf(selection, content) > -1;
    } else {
      // Primitives get passed through bindings as objects... since
      // `new Number(4) !== 4`, we use `==` below
      return content == selection;
    }
  }).property('content', 'parentView.selection').volatile(),

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

