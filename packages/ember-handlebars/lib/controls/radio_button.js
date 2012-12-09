require("ember-handlebars/controls/control");

var get = Ember.get, getPath = Ember.getPath, set = Ember.set, fmt = Ember.String.fmt;

/**
  @class

  A radio button view that enables `Ember.RadioButtonGroup` membership and binding.

  See the {@link Ember.RadioButtonGroup} documentation for more information.

  @extends Ember.View
*/
Ember.RadioButton = Ember.Control.extend(
/** @scope Ember.RadioButton.prototype */ {

  attributeBindings: ["disabled", "type", "name", "value", "checked"],
  classNames: ["ember-radio-button"],

  /**
    The value of this radio button.

    @type Object
  */
  value: null,

  /**
    The selected value in this group of radio buttons.

    @type Object
  */
  selectedValue: null,

  /**
    Sets the disabled property on the element.

    @default false
    @type Boolean
  */
  isDisabled: false,

  /**
    Sets the checked property on the element.

    @default false
    @type Boolean
  */
  checked: false,

  tagName: "input",
  type: "radio",

  selectedValueChanged: Ember.observer(function() {
    var selectedValue = get(this, "selectedValue");
    if(!Ember.empty(selectedValue) && get(this, "value") === selectedValue) {
      set(this, "checked", true);
    } else {
      set(this, "checked", false);
    }
  }, 'selectedValue'),

  checkedChanged: Ember.observer(function() {
    this._updateElementValue();
  }, 'checked'),

  init: function() {
    this._super();
    this.selectedValueChanged();
  },

  change: function() {
    set(this, 'checked', this.$().prop('checked'));
    Ember.run.once(this, this._updateElementValue);
  },

  _updateElementValue: function() {
    if(!get(this, 'checked')) return;
    set(this, 'selectedValue', get(this, 'value'));
  }

});

/**
  @class A view for a group of radio buttons.

  ## Creating a RadioButtonGroup

  You can create radio buttons like this:

  ```handlebars
  {{#view Ember.RadioButtonGroup name="someName"}}
    <label>
      {{view RadioButton value="option1"}}
      Option 1
    </label>
    <label>
      {{view RadioButton value="option2"}}
    </label>
  {{/view}}
  ```

  ## Getting/Setting the selected radio button

  ```javascript
  // get a reference to the selected radio button
  group.get("selection");

  // select a different radio button
  group.set("selection", someRadioButton);

  // or set a button as selected
  someRadioButton.set("isSelected", true);

  // clear the selection
  group.set("selection", null);

  // or deselect the selected button
  selectedButton.set("isSelected", false);
  ```

  ## Getting/Setting the selected value

  ```javascipt
  // get the `value` property of the selected radio button
  // or `null` if no buttons are selected
  group.get("value");

  // Select a different radio button by value.
  // This also selects the proper radio button in the UI
  group.set("value", someValue);
  ```

  ## Real world example

  ```javascript
  window.App = Ember.Application.create();

  App.question = Ember.Object.create({
    content: "Which of the following is the largest?",
    possibleAnswers: [
      Ember.Object.create({ label: "A peanut"      value: "peanut"      }),
      Ember.Object.create({ label: "An elephant"   value: "elephant"    }),
      Ember.Object.create({ label: "The moon"      value: "moon"        }),
      Ember.Object.create({ label: "A tennis ball" value: "tennis ball" })
    ],
    selectedAnswer: null
  });

  App.questionView = Ember.View.create({
    templateName: "question",
    questionBinding: "App.question",
    group: Ember.RadioButtonGroup.create({
      // create a two-way binding so changes in the
      // view propogate to the `selectedAnswer` property
      // on the question object.
      value: "App.question.selectedAnswer"
    })
  });

  App.questionView.append();
  ```

  The question template could look like this:

  ```handlebars
  <h2>{{question.content}}</h2>
  {{#view Ember.RadioButtonGroup name="answer" value="App.question.selectedAnswer"}}
  {{#each question.possibleAnswers}}
    <label>
      {{view RadioButton valueBinding="value"}}
      {{label}}
    </label>
  {{/each}}
  ```

  @extends Ember.View
*/
Ember.RadioButtonGroup = Ember.Control.extend(
/** @scope Ember.RadioButtonGroup.prototype */ {

  classNames: ['ember-radio-button-group'],
  attributeBindings: ['name:data-name'],

  name: Ember.required(),

  /**
    The value of the selected radio button in this group

    @type Object
  */
  value: null,

  RadioButton: Ember.computed(function() {
    return Ember.RadioButton.extend({
      group: this,
      selectedValueBinding: 'group.value',
      nameBinding: 'group.name'
    });
  })

});
