/**
@module ember
@submodule ember-templates
*/
import { assert } from 'ember-metal/debug';
import assign from 'ember-metal/assign';

/**
  The `{{input}}` helper lets you create an HTML `<input />` component.
  It causes an `Ember.TextField` component to be rendered.  For more info,
  see the [Ember.TextField](/api/classes/Ember.TextField.html) docs and
  the [templates guide](http://emberjs.com/guides/templates/input-helpers/).

  ```handlebars
  {{input value="987"}}
  ```

  renders as:

  ```HTML
  <input type="text" value="987" />
  ```

  ### Text field

  If no `type` option is specified, a default of type 'text' is used.

  Many of the standard HTML attributes may be passed to this helper.

  <table>
    <tr><td>`readonly`</td><td>`required`</td><td>`autofocus`</td></tr>
    <tr><td>`value`</td><td>`placeholder`</td><td>`disabled`</td></tr>
    <tr><td>`size`</td><td>`tabindex`</td><td>`maxlength`</td></tr>
    <tr><td>`name`</td><td>`min`</td><td>`max`</td></tr>
    <tr><td>`pattern`</td><td>`accept`</td><td>`autocomplete`</td></tr>
    <tr><td>`autosave`</td><td>`formaction`</td><td>`formenctype`</td></tr>
    <tr><td>`formmethod`</td><td>`formnovalidate`</td><td>`formtarget`</td></tr>
    <tr><td>`height`</td><td>`inputmode`</td><td>`multiple`</td></tr>
    <tr><td>`step`</td><td>`width`</td><td>`form`</td></tr>
    <tr><td>`selectionDirection`</td><td>`spellcheck`</td><td>&nbsp;</td></tr>
  </table>


  When set to a quoted string, these values will be directly applied to the HTML
  element. When left unquoted, these values will be bound to a property on the
  template's current rendering context (most typically a controller instance).


  A very common use of this helper is to bind the `value` of an input to an Object's attribute:

  ```handlebars
  Search:
  {{input value=searchWord}}
  ```

  In this example, the inital value in the `<input />` will be set to the value of `searchWord`.
  If the user changes the text, the value of `searchWord` will also be updated.

  ### Actions
  The helper can send multiple actions based on user events.
  The action property defines the action which is sent when
  the user presses the return key.

  ```handlebars
  {{input action="submit"}}
  ```

  The helper allows some user events to send actions.

  * `enter`
  * `insert-newline`
  * `escape-press`
  * `focus-in`
  * `focus-out`
  * `key-press`
  * `key-up`


  For example, if you desire an action to be sent when the input is blurred,
  you only need to setup the action name to the event name property.

  ```handlebars
  {{input focus-out="alertMessage"}}
  ```

  See more about [Text Support Actions](/api/classes/Ember.TextField.html)


  ### Extending `Ember.TextField`

  Internally, `{{input type="text"}}` creates an instance of `Ember.TextField`, passing
  arguments from the helper to `Ember.TextField`'s `create` method. You can extend the
  capabilities of text inputs in your applications by reopening this class. For example,
  if you are building a Bootstrap project where `data-*` attributes are used, you
  can add one to the `TextField`'s `attributeBindings` property:


  ```javascript
  Ember.TextField.reopen({
    attributeBindings: ['data-error']
  });
  ```

  Keep in mind when writing `Ember.TextField` subclasses that `Ember.TextField`
  itself extends `Ember.Component`. Expect isolated component semantics, not
  legacy 1.x view semantics (like `controller` being present).

  See more about [Ember components](/api/classes/Ember.Component.html)


  ### Checkbox

  Checkboxes are special forms of the `{{input}}` helper.  To create a `<checkbox />`:

  ```handlebars
  Emberize Everything:
  {{input type="checkbox" name="isEmberized" checked=isEmberized}}
  ```

  This will bind checked state of this checkbox to the value of `isEmberized`  -- if either one changes,
  it will be reflected in the other.


  The following HTML attributes can be set via the helper:

  * `checked`
  * `disabled`
  * `tabindex`
  * `indeterminate`
  * `name`
  * `autofocus`
  * `form`


  ### Extending `Ember.Checkbox`

  Internally, `{{input type="checkbox"}}` creates an instance of `Ember.Checkbox`, passing
  arguments from the helper to `Ember.Checkbox`'s `create` method. You can extend the
  capablilties of checkbox inputs in your applications by reopening this class. For example,
  if you wanted to add a css class to all checkboxes in your application:

  ```javascript
  Ember.Checkbox.reopen({
    classNames: ['my-app-checkbox']
  });
  ```


  @method input
  @for Ember.Templates.helpers
  @param {Hash} options
  @public
*/
export default {
  setupState(lastState, env, scope, params, hash) {
    var type = env.hooks.getValue(hash.type);
    var componentName = componentNameMap[type] || defaultComponentName;

    assert(
      '{{input type=\'checkbox\'}} does not support setting `value=someBooleanValue`; ' +
      'you must use `checked=someBooleanValue` instead.',
      !(type === 'checkbox' && hash.hasOwnProperty('value'))
    );

    return assign({}, lastState, { componentName });
  },

  render(morph, env, scope, params, hash, template, inverse, visitor) {
    env.hooks.component(morph, env, scope, morph.getState().componentName, params, hash, { default: template, inverse }, visitor);
  },

  rerender(...args) {
    this.render(...args);
  }
};

var defaultComponentName = '-text-field';

var componentNameMap = {
  'checkbox': '-checkbox'
};
