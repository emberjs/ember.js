/**
@module ember
@submodule ember-views
*/

import {
  forEach,
  indexOf,
  indexesOf,
  replace
} from "ember-metal/enumerable_utils";

import { get } from "ember-metal/property_get";
import { set } from "ember-metal/property_set";
import View from "ember-views/views/view";
import CollectionView from "ember-views/views/collection_view";
import { isArray } from "ember-metal/utils";
import isNone from 'ember-metal/is_none';
import { computed } from "ember-metal/computed";
import { A as emberA } from "ember-runtime/system/native_array";
import { observer } from "ember-metal/mixin";
import { defineProperty } from "ember-metal/properties";

import htmlbarsTemplate from "ember-htmlbars/templates/select";
import selectOptionDefaultTemplate from "ember-htmlbars/templates/select-option";

var defaultTemplate = htmlbarsTemplate;

var SelectOption = View.extend({
  instrumentDisplay: 'Ember.SelectOption',

  tagName: 'option',
  attributeBindings: ['value', 'selected'],

  defaultTemplate: selectOptionDefaultTemplate,

  init: function() {
    this.labelPathDidChange();
    this.valuePathDidChange();

    this._super();
  },

  selected: computed(function() {
    var content = get(this, 'content');
    var selection = get(this, 'parentView.selection');
    if (get(this, 'parentView.multiple')) {
      return selection && indexOf(selection, content.valueOf()) > -1;
    } else {
      // Primitives get passed through bindings as objects... since
      // `new Number(4) !== 4`, we use `==` below
      return content == selection; // jshint ignore:line
    }
  }).property('content', 'parentView.selection'),

  labelPathDidChange: observer('parentView.optionLabelPath', function() {
    var labelPath = get(this, 'parentView.optionLabelPath');

    if (!labelPath) { return; }

    defineProperty(this, 'label', computed(function() {
      return get(this, labelPath);
    }).property(labelPath));
  }),

  valuePathDidChange: observer('parentView.optionValuePath', function() {
    var valuePath = get(this, 'parentView.optionValuePath');

    if (!valuePath) { return; }

    defineProperty(this, 'value', computed(function() {
      return get(this, valuePath);
    }).property(valuePath));
  })
});

var SelectOptgroup = CollectionView.extend({
  instrumentDisplay: 'Ember.SelectOptgroup',

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
  App.ApplicationController = Ember.ObjectController.extend({
    names: ["Yehuda", "Tom"]
  });
  ```

  ```handlebars
  {{view "select" content=names}}
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
  App.ApplicationController = Ember.ObjectController.extend({
    selectedName: 'Tom',
    names: ["Yehuda", "Tom"]
  });
  ```

  ```handlebars
  {{view "select" content=names value=selectedName}}
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
  App.ApplicationController = Ember.ObjectController.extend({
    programmers: [
      {firstName: "Yehuda", id: 1},
      {firstName: "Tom",    id: 2}
    ]
  });
  ```

  ```handlebars
  {{view "select"
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
  App.ApplicationController = Ember.ObjectController.extend({
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
  {{view "select"
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

  var yehuda = {firstName: "Yehuda", id: 1, bff4eva: 'tom'}
  var tom = {firstName: "Tom", id: 2, bff4eva: 'yehuda'};

  App.ApplicationController = Ember.ObjectController.extend({
    selectedPerson: tom,
    programmers: [ yehuda, tom ]
  });
  ```

  ```handlebars
  {{view "select"
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
  App.ApplicationController = Ember.ObjectController.extend({
    selectedProgrammer: null,
    programmers: ["Yehuda", "Tom"]
  });
  ```

  ``` handlebars
  {{view "select"
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
  App.ApplicationController = Ember.ObjectController.extend({
    selectedProgrammer: null,
    programmers: [ "Yehuda", "Tom" ]
  });
  ```

  ```handlebars
  {{view "select"
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
var Select = View.extend({
  instrumentDisplay: 'Ember.Select',

  tagName: 'select',
  classNames: ['ember-select'],
  defaultTemplate: defaultTemplate,
  attributeBindings: ['multiple', 'disabled', 'tabindex', 'name', 'required', 'autofocus',
                      'form', 'size'],

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
    @since 1.5.0
  */
  required: false,

  /**
    The list of options.

    If `optionLabelPath` and `optionValuePath` are not overridden, this should
    be a list of strings, which will serve simultaneously as labels and values.

    Otherwise, this should be a list of objects. For instance:

    ```javascript
    var App = Ember.Application.create();
    var App.MySelect = Ember.Select.extend({
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
    get the current selection's value or set the selection by its value.

    It is not currently supported in multiple selection mode.

    @property value
    @type String
    @default null
  */
  value: computed(function(key, value) {
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
  groupView: SelectOptgroup,

  groupedContent: computed(function() {
    var groupPath = get(this, 'optionGroupPath');
    var groupedContent = emberA();
    var content = get(this, 'content') || [];

    forEach(content, function(item) {
      var label = get(item, groupPath);

      if (get(groupedContent, 'lastObject.label') !== label) {
        groupedContent.pushObject({
          label: label,
          content: emberA()
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
  optionView: SelectOption,

  _change: function() {
    if (get(this, 'multiple')) {
      this._changeMultiple();
    } else {
      this._changeSingle();
    }
  },

  selectionDidChange: observer('selection.@each', function() {
    var selection = get(this, 'selection');
    if (get(this, 'multiple')) {
      if (!isArray(selection)) {
        set(this, 'selection', emberA([selection]));
        return;
      }
      this._selectionDidChangeMultiple();
    } else {
      this._selectionDidChangeSingle();
    }
  }),

  valueDidChange: observer('value', function() {
    var content = get(this, 'content');
    var value = get(this, 'value');
    var valuePath = get(this, 'optionValuePath').replace(/^content\.?/, '');
    var selectedValue = (valuePath ? get(this, 'selection.' + valuePath) : get(this, 'selection'));
    var selection;

    if (value !== selectedValue) {
      selection = content ? content.find(function(obj) {
        return value === (valuePath ? get(obj, valuePath) : obj);
      }) : null;

      this.set('selection', selection);
    }
  }),

  _setDefaults: function() {
    var selection = get(this, 'selection');
    var value = get(this, 'value');

    if (!isNone(selection)) { this.selectionDidChange(); }
    if (!isNone(value)) { this.valueDidChange(); }
    if (isNone(selection)) {
      this._change();
    }
  },

  _changeSingle: function() {
    var selectedIndex = this.$()[0].selectedIndex;
    var content = get(this, 'content');
    var prompt = get(this, 'prompt');

    if (!content || !get(content, 'length')) { return; }
    if (prompt && selectedIndex === 0) { set(this, 'selection', null); return; }

    if (prompt) { selectedIndex -= 1; }
    set(this, 'selection', content.objectAt(selectedIndex));
  },

  _changeMultiple: function() {
    var options = this.$('option:selected');
    var prompt = get(this, 'prompt');
    var offset = prompt ? 1 : 0;
    var content = get(this, 'content');
    var selection = get(this, 'selection');

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
    var content = get(this, 'content');
    var selection = get(this, 'selection');
    var self = this;
    if (selection && selection.then) {
      selection.then(function(resolved) {
        // Ensure that we don't overwrite a new selection
        if (self.get('selection') === selection) {
          self._setSelectionIndex(content, resolved);
        }
      });
    } else {
      this._setSelectionIndex(content, selection);
    }
  },

  _setSelectionIndex: function(content, selection) {
    var el = get(this, 'element');
    if (!el) { return; }

    var selectionIndex = content ? indexOf(content, selection) : -1;
    var prompt = get(this, 'prompt');

    if (prompt) { selectionIndex += 1; }
    if (el) { el.selectedIndex = selectionIndex; }
  },

  _selectionDidChangeMultiple: function() {
    var content = get(this, 'content');
    var selection = get(this, 'selection');
    var selectedIndexes = content ? indexesOf(content, selection) : [-1];
    var prompt = get(this, 'prompt');
    var offset = prompt ? 1 : 0;
    var options = this.$('option');
    var adjusted;

    if (options) {
      options.each(function() {
        adjusted = this.index > -1 ? this.index - offset : -1;
        this.selected = indexOf(selectedIndexes, adjusted) > -1;
      });
    }
  },

  init: function() {
    this._super();
    this.on("didInsertElement", this, this._setDefaults);
    this.on("change", this, this._change);
  }
});

export default Select;
export {
  Select,
  SelectOption,
  SelectOptgroup
};
