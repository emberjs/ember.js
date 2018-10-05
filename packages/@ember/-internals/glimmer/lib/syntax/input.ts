/**
@module ember
*/
import { OwnedTemplateMeta } from '@ember/-internals/views';
import { assert } from '@ember/debug';
import { Option } from '@glimmer/interfaces';
import { OpcodeBuilder } from '@glimmer/opcode-compiler';
import * as WireFormat from '@glimmer/wire-format';
import { wrapComponentClassAttribute } from '../utils/bindings';
import { hashToArgs } from './utils';

function buildSyntax(
  type: string,
  params: any[],
  hash: any,
  builder: OpcodeBuilder<OwnedTemplateMeta>
) {
  let definition = builder.compiler['resolver'].lookupComponentDefinition(type, builder.referrer);
  builder.component.static(definition!, [params, hashToArgs(hash), null, null]);
  return true;
}

/**
  The `{{input}}` helper lets you create an HTML `<input />` component.
  It causes an `TextField` component to be rendered.  For more info,
  see the [TextField](/api/ember/release/classes/TextField) docs and
  the [templates guide](https://guides.emberjs.com/release/templates/input-helpers/).

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

  In this example, the initial value in the `<input />` will be set to the value of `searchWord`.
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
  See more about [Text Support Actions](/api/ember/release/classes/TextField)

  ### Extending `TextField`

  Internally, `{{input type="text"}}` creates an instance of `TextField`, passing
  arguments from the helper to `TextField`'s `create` method. You can extend the
  capabilities of text inputs in your applications by reopening this class. For example,
  if you are building a Bootstrap project where `data-*` attributes are used, you
  can add one to the `TextField`'s `attributeBindings` property:

  ```javascript
  import TextField from '@ember/component/text-field';
  TextField.reopen({
    attributeBindings: ['data-error']
  });
  ```

  Keep in mind when writing `TextField` subclasses that `TextField`
  itself extends `Component`. Expect isolated component semantics, not
  legacy 1.x view semantics (like `controller` being present).
  See more about [Ember components](/api/ember/release/classes/Component)

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

  ### Extending `Checkbox`

  Internally, `{{input type="checkbox"}}` creates an instance of `Checkbox`, passing
  arguments from the helper to `Checkbox`'s `create` method. You can extend the
  capablilties of checkbox inputs in your applications by reopening this class. For example,
  if you wanted to add a css class to all checkboxes in your application:

  ```javascript
  import Checkbox from '@ember/component/checkbox';

  Checkbox.reopen({
    classNames: ['my-app-checkbox']
  });
  ```

  @method input
  @for Ember.Templates.helpers
  @param {Hash} options
  @public
*/

export function inputMacro(
  _name: string,
  params: Option<WireFormat.Core.Params>,
  hash: Option<WireFormat.Core.Hash>,
  builder: OpcodeBuilder<OwnedTemplateMeta>
) {
  if (params === null) {
    params = [];
  }
  if (hash !== null) {
    let keys = hash[0];
    let values = hash[1];
    let typeIndex = keys.indexOf('type');

    if (typeIndex > -1) {
      let typeArg = values[typeIndex];
      if (Array.isArray(typeArg)) {
        // there is an AST plugin that converts this to an expression
        // it really should just compile in the component call too.
        let inputTypeExpr = params[0] as WireFormat.Expression;
        builder.dynamicComponent(inputTypeExpr, null, params.slice(1), hash, true, null, null);
        return true;
      }
      if (typeArg === 'checkbox') {
        assert(
          "{{input type='checkbox'}} does not support setting `value=someBooleanValue`; " +
            'you must use `checked=someBooleanValue` instead.',
          keys.indexOf('value') === -1
        );
        wrapComponentClassAttribute(hash);
        return buildSyntax('-checkbox', params, hash, builder);
      }
    }
  }
  return buildSyntax('-text-field', params, hash, builder);
}
