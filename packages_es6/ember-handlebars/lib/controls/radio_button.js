import Ember from "ember-metal/core"; //FEATURES
import {get} from "ember-metal/property_get";
import {set} from "ember-metal/property_set";
import Component from "ember-views/views/component";
import {observer} from "ember-metal/mixin";
import {computed} from "ember-metal/computed";
import run from "ember-metal/run_loop";
import isEmpty from "ember-metal/is_empty";

if(Ember.FEATURES.isEnabled('ember-handlebars-radio-buttons')) {

  /**
    @class

    The `Ember.RadioButton` view class renders an html radio input, allowing the
    user to select a single value from a list of values.

    Dealing with multiple radio buttons can be simplified by using an
    `Ember.RadioButtonGroup`. See the {@link Ember.RadioButtonGroup} documentation
    for more information.

    @extends Ember.Component
  */

  var RadioButton = Component.extend({  
    /** @scope Ember.RadioButton.prototype */

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

    selectedValueChanged: observer(function() {
      var selectedValue = get(this, 'selectedValue');
      if(!isEmpty(selectedValue) && get(this, 'value') === selectedValue) {
        set(this, "checked", true);
      } else {
        set(this, "checked", false);
      }
    }, 'selectedValue'),

    checkedChanged: observer(function() {
      this._updateElementValue();
    }, 'checked'),

    init: function() {
      this._super();
      this.selectedValueChanged();
      this.on('change', this, this._change);
    },

    _change: function() {
      set(this, 'checked', this.$().prop('checked'));
      run.once(this, this._updateElementValue);
    },

    _updateElementValue: function() {
      if(!get(this, 'checked')) return;
      set(this, 'selectedValue', get(this, 'value'));
    }

  });

  /*
    @class

    The `Ember.RadioButtonGroup` view class provides a simplfied method for dealing
    with multiple `Ember.RadioButton` instances.

    ## Simple Example

    ```handlebars
    {{#view Ember.RadioButtonGroup name="role" value=role}}
      {{view view.RadioButton value="admin"}}
      {{view view.RadioButton value="owner"}}
      {{view view.RadioButton value="user"}}
    {{/view}}
    ```

    Note that the radio buttons are declared as `{{view view.RadioButton ...}}` as opposed
    to `{{view Ember.RadioButton ...}}`. When inside the body of a RadioButtonGroup,
    a `RadioButton` view is provided which automatically picks up the same name and value
    binding as the containing group.

    ## More Complex Example

    ```javascript
    App.person = Ember.Object.create({name: 'Gordon', role: 'admin'})
    App.PersonController = Ember.Controller.extend({
      content: 'App.person',
      roleOptions: ['admin', 'owner', 'user', 'banned']
    });
    ```

    ```handlebars
    {{#view Ember.RadioButtonGroup name="role" value=role}}
      {{#each role in controller.roleOptions}}
        <label>
          {{view view.RadioButton value="role"}}
          {{role}}
        </label>
      {{/each}}
    {{/view}}
    ```

    Again, you can also use the helpers to simplify this template:

    ```handlebars
    {{#radiogroup name="role" value=roleOptions}}
      {{#each role in controller.roleOptions}}
        <label>
          {{radio value=role}
          {{role}}
        </label>
      {{/each}}
    {{/radiogroup}}
    ```

    The above controller/template combination will render html containing a
    radio input for each item in the `roleOptions` property of the controller.
    Initially, the `admin` option will be checked. If the user selects a different
    radio, the `role` property of the controller's `content` will be updated
    accordingly.

    @extends Ember.Component
  */
  var RadioButtonGroup = Component.extend({
  /** @scope Ember.RadioButtonGroup.prototype */

    classNames: ['ember-radio-button-group'],
    attributeBindings: ['name:data-name'],

    //name: Ember.required(),
    /**
      The value of the selected radio button in this group

      @type Object
    */
    value: null,

    RadioButton: computed(function() {
      return RadioButton.extend({
        group: this,
        selectedValueBinding: 'group.value',
        nameBinding: 'group.name'
      });
    })

  });
}

export default RadioButtonGroup
export {RadioButton, RadioButtonGroup}