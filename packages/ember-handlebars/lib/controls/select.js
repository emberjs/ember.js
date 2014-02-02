/*jshint eqeqeq:false */

/**
@module ember
@submodule ember-handlebars
*/

var set = Ember.set,
    get = Ember.get,
    indexOf = Ember.EnumerableUtils.indexOf,
    indexesOf = Ember.EnumerableUtils.indexesOf,
    forEach = Ember.EnumerableUtils.forEach,
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

  labelPathDidChange: Ember.observer('parentView.optionLabelPath', function() {
    var labelPath = get(this, 'parentView.optionLabelPath');

    if (!labelPath) { return; }

    Ember.defineProperty(this, 'label', Ember.computed(function() {
      return get(this, labelPath);
    }).property(labelPath));
  }),

  valuePathDidChange: Ember.observer('parentView.optionValuePath', function() {
    var valuePath = get(this, 'parentView.optionValuePath');

    if (!valuePath) { return; }

    Ember.defineProperty(this, 'value', Ember.computed(function() {
      return get(this, valuePath);
    }).property(valuePath));
  })
});

Ember.SelectOptgroup = Ember.CollectionView.extend({
  tagName: 'optgroup',
  attributeBindings: ['label'],

  selectionBinding: 'parentView.selection',
  multipleBinding: 'parentView.multiple',
  optionLabelPathBinding: 'parentView.optionLabelPath',
  optionValuePathBinding: 'parentView.optionValuePath',

  itemViewClassBinding: 'parentView.optionView'
});

/**
  The `Ember.Select` view class renders a
  [select](https://developer.mozilla.org/en/HTML/Element/select) HTML element,
  allowing the user to choose from a list of options.

  The text and `value` property of each `<option>` element within the
  `<select>` element are populated from the objects in the `Element.Select`'s
  `content` property. The underlying data object of the selected `<option>` is
  stored in the `Element.Select`'s `value` property.

  ## The Content Property (array of strings)

  The simplest version of an `Ember.Select` takes an array of strings as its
  `content` property. The string will be used as both the `value` property and
  the inner text of each `<option>` element inside the rendered `<select>`.

  Example:

  ```javascript
  App.ApplicationController = Ember.Controller.extend({
    names: ["Yehuda", "Tom"]
  });
  ```

  ```handlebars
  {{view Ember.Select content=names}}
  ```

  Would result in the following HTML:

  ```html
  <select class="ember-select">
    <option value="Yehuda">Yehuda</option>
    <option value="Tom">Tom</option>
  </select>
  ```

  You can control which `<option>` is selected through the `Ember.Select`'s
  `value` property:

  ```javascript
  App.ApplicationController = Ember.Controller.extend({
    selectedName: 'Tom',
    names: ["Yehuda", "Tom"]
  });
  ```

  ```handlebars
  {{view Ember.Select
         content=names
         value=selectedName
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
  update the value of `selectedName` to "Yehuda".

  ## The Content Property (array of Objects)

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
  App.ApplicationController = Ember.Controller.extend({
    programmers: [
      {firstName: "Yehuda", id: 1},
      {firstName: "Tom",    id: 2}
    ]
  });
  ```

  ```handlebars
  {{view Ember.Select
         content=programmers
         optionValuePath="content.id"
         optionLabelPath="content.firstName"}}
  ```

  Would result in the following HTML:

  ```html
  <select class="ember-select">
    <option value="1">Yehuda</option>
    <option value="2">Tom</option>
  </select>
  ```

  The `value` attribute of the selected `<option>` within an `Ember.Select`
  can be bound to a property on another object:

  ```javascript
  App.ApplicationController = Ember.Controller.extend({
    programmers: [
      {firstName: "Yehuda", id: 1},
      {firstName: "Tom",    id: 2}
    ],
    currentProgrammer: {
      id: 2
    }
  });
  ```

  ```handlebars
  {{view Ember.Select
         content=programmers
         optionValuePath="content.id"
         optionLabelPath="content.firstName"
         value=currentProgrammer.id}}
  ```

  Would result in the following HTML with a selected option:

  ```html
  <select class="ember-select">
    <option value="1">Yehuda</option>
    <option value="2" selected="selected">Tom</option>
  </select>
  ```

  Interacting with the rendered element by selecting the first option
  ('Yehuda') will update the `id` of `currentProgrammer`
  to match the `value` property of the newly selected `<option>`.

  Alternatively, you can control selection through the underlying objects
  used to render each object by binding the `selection` option. When the selected
  `<option>` is changed, the property path provided to `selection`
  will be updated to match the content object of the rendered `<option>`
  element:

  ```javascript
  App.ApplicationController = Ember.Controller.extend({
    selectedPerson: null,
    programmers: [
      {firstName: "Yehuda", id: 1},
      {firstName: "Tom",    id: 2}
    ]
  });
  ```

  ```handlebars
  {{view Ember.Select
         content=programmers
         optionValuePath="content.id"
         optionLabelPath="content.firstName"
         selection=selectedPerson}}
  ```

  Would result in the following HTML with a selected option:

  ```html
  <select class="ember-select">
    <option value="1">Yehuda</option>
    <option value="2" selected="selected">Tom</option>
  </select>
  ```

  Interacting with the rendered element by selecting the first option
  ('Yehuda') will update the `selectedPerson` to match the object of
  the newly selected `<option>`. In this case it is the first object
  in the `programmers`

  ## Supplying a Prompt

  A `null` value for the `Ember.Select`'s `value` or `selection` property
  results in there being no `<option>` with a `selected` attribute:

  ```javascript
  App.ApplicationController = Ember.Controller.extend({
    selectedProgrammer: null,
    programmers: [
      "Yehuda",
      "Tom"
    ]
  });
  ```

  ``` handlebars
  {{view Ember.Select
         content=programmers
         value=selectedProgrammer
  }}
  ```

  Would result in the following HTML:

  ```html
  <select class="ember-select">
    <option value="Yehuda">Yehuda</option>
    <option value="Tom">Tom</option>
  </select>
  ```

  Although `selectedProgrammer` is `null` and no `<option>`
  has a `selected` attribute the rendered HTML will display the
  first item as though it were selected. You can supply a string
  value for the `Ember.Select` to display when there is no selection
  with the `prompt` option:

  ```javascript
  App.ApplicationController = Ember.Controller.extend({
    selectedProgrammer: null,
    programmers: [
      "Yehuda",
      "Tom"
    ]
  });
  ```

  ```handlebars
  {{view Ember.Select
         content=programmers
         value=selectedProgrammer
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
Ember.Select = Ember.View.extend({
  tagName: 'select',
  classNames: ['ember-select'],
  defaultTemplate: precompileTemplate('{{#if view.prompt}}<option value="">{{view.prompt}}</option>{{/if}}{{#if view.optionGroupPath}}{{#each view.groupedContent}}{{view view.groupView content=content label=label}}{{/each}}{{else}}{{#each view.content}}{{view view.optionView content=this}}{{/each}}{{/if}}'),
  attributeBindings: ['multiple', 'disabled', 'tabindex', 'name', 'required'],

  /**
    The `multiple` attribute of the select element. Indicates whether multiple
    options can be selected.

    @property multiple
    @type Boolean
    @default false
  */
  multiple: false,

  /**
    The `disabled` attribute of the select element. Indicates whether
    the element is disabled from interactions.

    @property disabled
    @type Boolean
    @default false
  */
  disabled: false,

  /**
    The `required` attribute of the select element. Indicates whether
    a selected option is required for form validation.

    @property required
    @type Boolean
    @default false
  */
  required: false,

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
    The path of the option labels. See [content](/api/classes/Ember.Select.html#property_content).

    @property optionLabelPath
    @type String
    @default 'content'
  */
  optionLabelPath: 'content',

  /**
    The path of the option values. See [content](/api/classes/Ember.Select.html#property_content).

    @property optionValuePath
    @type String
    @default 'content'
  */
  optionValuePath: 'content',

  /**
    The path of the option group.
    When this property is used, `content` should be sorted by `optionGroupPath`.

    @property optionGroupPath
    @type String
    @default null
  */
  optionGroupPath: null,

  /**
    The view class for optgroup.

    @property groupView
    @type Ember.View
    @default Ember.SelectOptgroup
  */
  groupView: Ember.SelectOptgroup,

  groupedContent: Ember.computed(function() {
    var groupPath = get(this, 'optionGroupPath');
    var groupedContent = Ember.A();
    var content = get(this, 'content') || [];

    forEach(content, function(item) {
      var label = get(item, groupPath);

      if (get(groupedContent, 'lastObject.label') !== label) {
        groupedContent.pushObject({
          label: label,
          content: Ember.A()
        });
      }

      get(groupedContent, 'lastObject.content').push(item);
    });

    return groupedContent;
  }).property('optionGroupPath', 'content.@each'),

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

  selectionDidChange: Ember.observer('selection.@each', function() {
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
  }),

  valueDidChange: Ember.observer('value', function() {
    var content = get(this, 'content'),
        value = get(this, 'value'),
        valuePath = get(this, 'optionValuePath').replace(/^content\.?/, ''),
        selectedValue = (valuePath ? get(this, 'selection.' + valuePath) : get(this, 'selection')),
        selection;

    if (value !== selectedValue) {
      selection = content ? content.find(function(obj) {
        return value === (valuePath ? get(obj, valuePath) : obj);
      }) : null;

      this.set('selection', selection);
    }
  }),


  _triggerChange: function() {
    var selection = get(this, 'selection');
    var value = get(this, 'value');

    if (!Ember.isNone(selection)) { this.selectionDidChange(); }
    if (!Ember.isNone(value)) { this.valueDidChange(); }

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

    if (!content) { return; }
    if (options) {
      var selectedIndexes = options.map(function() {
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
