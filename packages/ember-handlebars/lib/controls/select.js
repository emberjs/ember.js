/*jshint eqeqeq:false */

/**
@module ember
@submodule ember-handlebars
*/

var set = Ember.set,
    get = Ember.get,
    indexOf = Ember.EnumerableUtils.indexOf,
    indexesOf = Ember.EnumerableUtils.indexesOf,
    replace = Ember.EnumerableUtils.replace,
    isArray = Ember.isArray,
    precompileTemplate = Ember.Handlebars.compile;

Ember.SelectOption = Ember.View.extend({
  tagName: 'option',
  attributeBindings: ['value', 'selected'],

  defaultTemplate: function(context, options) {
    options = { data: options.data, hash: {} };
    Ember.Handlebars.helpers.bind.call(context, "view.label", options);
  },

  init: function() {
    this.labelPathDidChange();
    this.valuePathDidChange();

    this._super();
  },

  selected: Ember.computed(function() {
    var content = get(this, 'content'),
        selection = get(this, 'parentView.selection');
    if (get(this, 'parentView.multiple')) {
      return selection && indexOf(selection, content.valueOf()) > -1;
    } else {
      // Primitives get passed through bindings as objects... since
      // `new Number(4) !== 4`, we use `==` below
      return content == selection;
    }
  }).property('content', 'parentView.selection'),

  labelPathDidChange: Ember.observer(function() {
    var labelPath = get(this, 'parentView.optionLabelPath');

    if (!labelPath) { return; }

    Ember.defineProperty(this, 'label', Ember.computed(function() {
      return get(this, labelPath);
    }).property(labelPath));
  }, 'parentView.optionLabelPath'),

  valuePathDidChange: Ember.observer(function() {
    var valuePath = get(this, 'parentView.optionValuePath');

    if (!valuePath) { return; }

    Ember.defineProperty(this, 'value', Ember.computed(function() {
      return get(this, valuePath);
    }).property(valuePath));
  }, 'parentView.optionValuePath')
});

/**
  The `Ember.Select` view class renders a
  [select](https://developer.mozilla.org/en/HTML/Element/select) HTML element,
  allowing the user to choose from a list of options.

  The text and `value` property of each `<option>` element within the
  `<select>` element are populated from the objects in the `Element.Select`'s
  `content` property. The underlying data object of the selected `<option>` is
  stored in the `Element.Select`'s `value` property.

  ### `content` as an array of Strings

  The simplest version of an `Ember.Select` takes an array of strings as its
  `content` property. The string will be used as both the `value` property and
  the inner text of each `<option>` element inside the rendered `<select>`.

  Example:

  ```javascript
  App.names = ["Yehuda", "Tom"];
  ```

  ```handlebars
  {{view Ember.Select contentBinding="App.names"}}
  ```

  Would result in the following HTML:

  ```html
  <select class="ember-select">
    <option value="Yehuda">Yehuda</option>
    <option value="Tom">Tom</option>
  </select>
  ```

  You can control which `<option>` is selected through the `Ember.Select`'s
  `value` property directly or as a binding:

  ```javascript
  App.names = Ember.Object.create({
    selected: 'Tom',
    content: ["Yehuda", "Tom"]
  });
  ```

  ```handlebars
  {{view Ember.Select
         contentBinding="App.names.content"
         valueBinding="App.names.selected"
  }}
  ```

  Would result in the following HTML with the `<option>` for 'Tom' selected:

  ```html
  <select class="ember-select">
    <option value="Yehuda">Yehuda</option>
    <option value="Tom" selected="selected">Tom</option>
  </select>
  ```

  A user interacting with the rendered `<select>` to choose "Yehuda" would
  update the value of `App.names.selected` to "Yehuda".

  ### `content` as an Array of Objects

  An `Ember.Select` can also take an array of JavaScript or Ember objects as
  its `content` property.

  When using objects you need to tell the `Ember.Select` which property should
  be accessed on each object to supply the `value` attribute of the `<option>`
  and which property should be used to supply the element text.

  The `optionValuePath` option is used to specify the path on each object to
  the desired property for the `value` attribute. The `optionLabelPath`
  specifies the path on each object to the desired property for the
  element's text. Both paths must reference each object itself as `content`:

  ```javascript
  App.programmers = [
    Ember.Object.create({firstName: "Yehuda", id: 1}),
    Ember.Object.create({firstName: "Tom",    id: 2})
  ];
  ```

  ```handlebars
  {{view Ember.Select
         contentBinding="App.programmers"
         optionValuePath="content.id"
         optionLabelPath="content.firstName"}}
  ```

  Would result in the following HTML:

  ```html
  <select class="ember-select">
    <option value>Please Select</option>
    <option value="1">Yehuda</option>
    <option value="2">Tom</option>
  </select>
  ```

  The `value` attribute of the selected `<option>` within an `Ember.Select`
  can be bound to a property on another object by providing a
  `valueBinding` option:

  ```javascript
  App.programmers = [
    Ember.Object.create({firstName: "Yehuda", id: 1}),
    Ember.Object.create({firstName: "Tom",    id: 2})
  ];

  App.currentProgrammer = Ember.Object.create({
    id: 2
  });
  ```

  ```handlebars
  {{view Ember.Select
         contentBinding="App.programmers"
         optionValuePath="content.id"
         optionLabelPath="content.firstName"
         valueBinding="App.currentProgrammer.id"}}
  ```

  Would result in the following HTML with a selected option:

  ```html
  <select class="ember-select">
    <option value>Please Select</option>
    <option value="1">Yehuda</option>
    <option value="2" selected="selected">Tom</option>
  </select>
  ```

  Interacting with the rendered element by selecting the first option
  ('Yehuda') will update the `id` value of `App.currentProgrammer`
  to match the `value` property of the newly selected `<option>`.

  Alternatively, you can control selection through the underlying objects
  used to render each object providing a `selectionBinding`. When the selected
  `<option>` is changed, the property path provided to `selectionBinding`
  will be updated to match the content object of the rendered `<option>`
  element:

  ```javascript
  App.controller = Ember.Object.create({
    selectedPerson: null,
    content: [
      Ember.Object.create({firstName: "Yehuda", id: 1}),
      Ember.Object.create({firstName: "Tom",    id: 2})
    ]
  });
  ```

  ```handlebars
  {{view Ember.Select
         contentBinding="App.controller.content"
         optionValuePath="content.id"
         optionLabelPath="content.firstName"
         selectionBinding="App.controller.selectedPerson"}}
  ```

  Would result in the following HTML with a selected option:

  ```html
  <select class="ember-select">
    <option value>Please Select</option>
    <option value="1">Yehuda</option>
    <option value="2" selected="selected">Tom</option>
  </select>
  ```

  Interacting with the rendered element by selecting the first option
  ('Yehuda') will update the `selectedPerson` value of `App.controller`
  to match the content object of the newly selected `<option>`. In this
  case it is the first object in the `App.controller.content`

  ### Supplying a Prompt

  A `null` value for the `Ember.Select`'s `value` or `selection` property
  results in there being no `<option>` with a `selected` attribute:

  ```javascript
  App.controller = Ember.Object.create({
    selected: null,
    content: [
      "Yehuda",
      "Tom"
    ]
  });
  ```

  ``` handlebars
  {{view Ember.Select
         contentBinding="App.controller.content"
         valueBinding="App.controller.selected"
  }}
  ```

  Would result in the following HTML:

  ```html
  <select class="ember-select">
    <option value="Yehuda">Yehuda</option>
    <option value="Tom">Tom</option>
  </select>
  ```

  Although `App.controller.selected` is `null` and no `<option>`
  has a `selected` attribute the rendered HTML will display the
  first item as though it were selected. You can supply a string
  value for the `Ember.Select` to display when there is no selection
  with the `prompt` option:

  ```javascript
  App.controller = Ember.Object.create({
    selected: null,
    content: [
      "Yehuda",
      "Tom"
    ]
  });
  ```

  ```handlebars
  {{view Ember.Select
         contentBinding="App.controller.content"
         valueBinding="App.controller.selected"
         prompt="Please select a name"
  }}
  ```

  Would result in the following HTML:

  ```html
  <select class="ember-select">
    <option>Please select a name</option>
    <option value="Yehuda">Yehuda</option>
    <option value="Tom">Tom</option>
  </select>
  ```

  @class Select
  @namespace Ember
  @extends Ember.View
*/
Ember.Select = Ember.View.extend(
  /** @scope Ember.Select.prototype */ {

  tagName: 'select',
  classNames: ['ember-select'],
  defaultTemplate: precompileTemplate('{{#if view.prompt}}<option value="">{{view.prompt}}</option>{{/if}}{{#each view.content}}{{view view.optionView contentBinding="this"}}{{/each}}'),
  attributeBindings: ['multiple', 'disabled', 'tabindex', 'name'],

  /**
    The `multiple` attribute of the select element. Indicates whether multiple
    options can be selected.

    @property multiple
    @type Boolean
    @default false
  */
  multiple: false,

  disabled: false,

  /**
    The list of options.

    If `optionLabelPath` and `optionValuePath` are not overridden, this should
    be a list of strings, which will serve simultaneously as labels and values.

    Otherwise, this should be a list of objects. For instance:

    ```javascript
    Ember.Select.create({
      content: Ember.A([
          { id: 1, firstName: 'Yehuda' },
          { id: 2, firstName: 'Tom' }
        ]),
      optionLabelPath: 'content.firstName',
      optionValuePath: 'content.id'
    });
    ```

    @property content
    @type Array
    @default null
  */
  content: null,

  /**
    When `multiple` is `false`, the element of `content` that is currently
    selected, if any.

    When `multiple` is `true`, an array of such elements.

    @property selection
    @type Object or Array
    @default null
  */
  selection: null,

  /**
    In single selection mode (when `multiple` is `false`), value can be used to
    get the current selection's value or set the selection by it's value.

    It is not currently supported in multiple selection mode.

    @property value
    @type String
    @default null
  */
  value: Ember.computed(function(key, value) {
    if (arguments.length === 2) { return value; }
    var valuePath = get(this, 'optionValuePath').replace(/^content\.?/, '');
    return valuePath ? get(this, 'selection.' + valuePath) : get(this, 'selection');
  }).property('selection'),

  /**
    If given, a top-most dummy option will be rendered to serve as a user
    prompt.

    @property prompt
    @type String
    @default null
  */
  prompt: null,

  /**
    The path of the option labels. See `content`.

    @property optionLabelPath
    @type String
    @default 'content'
  */
  optionLabelPath: 'content',

  /**
    The path of the option values. See `content`.

    @property optionValuePath
    @type String
    @default 'content'
  */
  optionValuePath: 'content',

  /**
    The view class for option.

    @property optionView
    @type Ember.View
    @default Ember.SelectOption
  */
  optionView: Ember.SelectOption,

  _change: function() {
    if (get(this, 'multiple')) {
      this._changeMultiple();
    } else {
      this._changeSingle();
    }
  },

  selectionDidChange: Ember.observer(function() {
    var selection = get(this, 'selection');
    if (get(this, 'multiple')) {
      if (!isArray(selection)) {
        set(this, 'selection', Ember.A([selection]));
        return;
      }
      this._selectionDidChangeMultiple();
    } else {
      this._selectionDidChangeSingle();
    }
  }, 'selection.@each'),

  valueDidChange: Ember.observer(function() {
    var content = get(this, 'content'),
        value = get(this, 'value'),
        valuePath = get(this, 'optionValuePath').replace(/^content\.?/, ''),
        selectedValue = (valuePath ? get(this, 'selection.' + valuePath) : get(this, 'selection')),
        selection;

    if (value !== selectedValue) {
      selection = content.find(function(obj) {
        return value === (valuePath ? get(obj, valuePath) : obj);
      });

      this.set('selection', selection);
    }
  }, 'value'),


  _triggerChange: function() {
    var selection = get(this, 'selection');
    var value = get(this, 'value');

    if (selection) { this.selectionDidChange(); }
    if (value) { this.valueDidChange(); }

    this._change();
  },

  _changeSingle: function() {
    var selectedIndex = this.$()[0].selectedIndex,
        content = get(this, 'content'),
        prompt = get(this, 'prompt');

    if (!content || !get(content, 'length')) { return; }
    if (prompt && selectedIndex === 0) { set(this, 'selection', null); return; }

    if (prompt) { selectedIndex -= 1; }
    set(this, 'selection', content.objectAt(selectedIndex));
  },


  _changeMultiple: function() {
    var options = this.$('option:selected'),
        prompt = get(this, 'prompt'),
        offset = prompt ? 1 : 0,
        content = get(this, 'content'),
        selection = get(this, 'selection');

    if (!content){ return; }
    if (options) {
      var selectedIndexes = options.map(function(){
        return this.index - offset;
      }).toArray();
      var newSelection = content.objectsAt(selectedIndexes);

      if (isArray(selection)) {
        replace(selection, 0, get(selection, 'length'), newSelection);
      } else {
        set(this, 'selection', newSelection);
      }
    }
  },

  _selectionDidChangeSingle: function() {
    var el = this.get('element');
    if (!el) { return; }

    var content = get(this, 'content'),
        selection = get(this, 'selection'),
        selectionIndex = content ? indexOf(content, selection) : -1,
        prompt = get(this, 'prompt');

    if (prompt) { selectionIndex += 1; }
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
        adjusted = this.index > -1 ? this.index - offset : -1;
        this.selected = indexOf(selectedIndexes, adjusted) > -1;
      });
    }
  },

  init: function() {
    this._super();
    this.on("didInsertElement", this, this._triggerChange);
    this.on("change", this, this._change);
  }
});
