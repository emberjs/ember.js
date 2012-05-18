/*jshint eqeqeq:false */

var set = Ember.set, get = Ember.get, getPath = Ember.getPath;
var indexOf = Ember.ArrayUtils.indexOf, indexesOf = Ember.ArrayUtils.indexesOf;

/**
  @class

  The Ember.Select view class renders a
  [select](https://developer.mozilla.org/en/HTML/Element/select) HTML element,
  allowing the user to choose from a list of options. The selected option(s)
  are updated live in the `selection` property.

  @extends Ember.View
*/
Ember.Select = Ember.View.extend(
  /** @scope Ember.Select.prototype */ {

  tagName: 'select',
  defaultTemplate: Ember.Handlebars.compile('{{#if view.prompt}}<option>{{view.prompt}}</option>{{/if}}{{#each view.content}}{{view Ember.SelectOption contentBinding="this"}}{{/each}}'),
  attributeBindings: ['multiple'],

  /**
    The `multiple` attribute of the select element. Indicates whether multiple
    options can be selected.

    @type Boolean
    @default false
  */
  multiple: false,

  /**
    The list of options.

    If `optionLabelPath` and `optionValuePath` are not overridden, this should
    be a list of strings, which will serve simultaneously as labels and values.

    Otherwise, this should be a list of objects. For instance:

        content: Ember.A([
            { id: 1, firstName: 'Yehuda' },
            { id: 2, firstName: 'Tom' }
          ])),
        optionLabelPath: 'content.firstName',
        optionValuePath: 'content.id'

    @type Array
    @default null
  */
  content: null,

  /**
    When `multiple` is false, the element of `content` that is currently
    selected, if any.

    When `multiple` is true, an array of such elements.

    @type Object or Array
    @default null
  */
  selection: null,

  /**
    If given, a top-most dummy option will be rendered to serve as a user
    prompt.

    @type String
    @default null
  */
  prompt: null,

  /**
    The path of the option labels. See `content`.

    @type String
    @default 'content'
  */
  optionLabelPath: 'content',

  /**
    The path of the option values. See `content`.

    @type String
    @default 'content'
  */
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
        selectionIndex = content ? indexOf(content, selection) : -1,
        prompt = get(this, 'prompt');

    if (prompt && selectionIndex > -1) { selectionIndex += 1; }
    if (el) { el.selectedIndex = selectionIndex; }
  },

  _selectionDidChangeMultiple: function() {
    var content = get(this, 'content'),
        selection = get(this, 'selection'),
        selectedIndexes = content ? indexesOf(content, selection) : [-1],
        prompt = get(this, 'prompt'),
        offset = prompt ? 1 : 0,
        options = this.$('option'),
        adjusted;

    if (options) {
      options.each(function() {
        adjusted = this.index > -1 ? this.index + offset : -1;
        this.selected = indexOf(selectedIndexes, adjusted) > -1;
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

