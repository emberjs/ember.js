/**
@module @ember/component
*/
import { hasDOM } from '@ember/-internals/browser-environment';
import { assert, warn } from '@ember/debug';
import { action } from '@ember/object';
import { valueForRef } from '@glimmer/reference';
import { untrack } from '@glimmer/validator';
import InputTemplate from '../templates/input';
import AbstractInput, { valueFrom } from './abstract-input';
import { opaquify } from './internal';

let isValidInputType: (type: string) => boolean;

if (hasDOM) {
  const INPUT_TYPES: Record<string, boolean | undefined> = Object.create(null);
  const INPUT_ELEMENT = document.createElement('input');

  INPUT_TYPES[''] = false;
  INPUT_TYPES['text'] = true;
  INPUT_TYPES['checkbox'] = true;

  isValidInputType = (type: string) => {
    let isValid = INPUT_TYPES[type];

    if (isValid === undefined) {
      try {
        INPUT_ELEMENT.type = type;
        isValid = INPUT_ELEMENT.type === type;
      } catch (e) {
        isValid = false;
      } finally {
        INPUT_ELEMENT.type = 'text';
      }

      INPUT_TYPES[type] = isValid;
    }

    return isValid;
  };
} else {
  isValidInputType = (type: string) => type !== '';
}

/**
  See [Ember.Templates.components.Input](/ember/release/classes/Ember.Templates.components/methods/Input?anchor=Input).

  @method input
  @for Ember.Templates.helpers
  @param {Hash} options
  @public
  */

/**
  An opaque interface which can be imported and used in strict-mode
  templates to call <Input>.

  See [Ember.Templates.components.Input](/ember/release/classes/Ember.Templates.components/methods/Input?anchor=Input).

  @for @ember/component
  @method Input
  @see {Ember.Templates.components.Input}
  @public
**/

/**
  The `Input` component lets you create an HTML `<input>` element.

  ```handlebars
  <Input @value="987" />
  ```

  creates an `<input>` element with `type="text"` and value set to 987.

  ### Text field

  If no `type` argument is specified, a default of type 'text' is used.

  ```handlebars
  Search:
  <Input @value={{this.searchWord}} />
  ```

  In this example, the initial value in the `<input>` will be set to the value of
  `this.searchWord`. If the user changes the text, the value of `this.searchWord` will also be
  updated.

  ### Actions

  The `Input` component takes a number of arguments with callbacks that are invoked in response to
  user events.

  * `enter`
  * `insert-newline`
  * `escape-press`
  * `focus-in`
  * `focus-out`
  * `key-down`
  * `key-press`
  * `key-up`

  These callbacks are passed to `Input` like this:

  ```handlebars
  <Input @value={{this.searchWord}} @enter={{this.query}} />
  ```

  Starting with Ember Octane, we recommend using the `{{on}}` modifier to call actions
  on specific events, such as the input event.

  ```handlebars
  <label for="input-name">Name:</label>
  <Input
    @id="input-name"
    @value={{this.name}}
    {{on "input" this.validateName}}
  />
  ```

  The event name (e.g. `focusout`, `input`, `keydown`) always follows the casing
  that the HTML standard uses.

  ### `<input>` HTML Attributes to Avoid

  In most cases, if you want to pass an attribute to the underlying HTML `<input>` element, you
  can pass the attribute directly, just like any other Ember component.

  ```handlebars
  <Input @type="text" size="10" />
  ```

  In this example, the `size` attribute will be applied to the underlying `<input>` element in the
  outputted HTML.

  However, there are a few attributes where you **must** use the `@` version.

  * `@type`: This argument is used to control which Ember component is used under the hood
  * `@value`: The `@value` argument installs a two-way binding onto the element. If you wanted a
    one-way binding, use `<input>` with the `value` property and the `input` event instead.
  * `@checked` (for checkboxes): like `@value`, the `@checked` argument installs a two-way binding
    onto the element. If you wanted a one-way binding, use `<input type="checkbox">` with
    `checked` and the `input` event instead.

  ### Extending `TextField`

  Internally, `<Input @type="text" />` creates an instance of `TextField`, passing arguments from
  the helper to `TextField`'s `create` method. Subclassing `TextField` is supported but not
  recommended.

  See [TextField](/ember/release/classes/TextField)

  ### Checkbox

  To create an `<input type="checkbox">`:

  ```handlebars
  Emberize Everything:
  <Input @type="checkbox" @checked={{this.isEmberized}} name="isEmberized" />
  ```

  This will bind the checked state of this checkbox to the value of `isEmberized` -- if either one
  changes, it will be reflected in the other.

  ### Extending `Checkbox`

  Internally, `<Input @type="checkbox" />` creates an instance of `Checkbox`. Subclassing
  `TextField` is supported but not recommended.

  See [Checkbox](/ember/release/classes/Checkbox)

  @method Input
  @for Ember.Templates.components
  @see {TextField}
  @see {Checkbox}
  @param {Hash} options
  @public
*/
class Input extends AbstractInput {
  static toString(): string {
    return 'Input';
  }

  /**
   * The HTML class attribute.
   */
  get class(): string {
    if (this.isCheckbox) {
      return 'ember-checkbox ember-view';
    } else {
      return 'ember-text-field ember-view';
    }
  }

  /**
   * The HTML type attribute.
   */
  get type(): string {
    let type = this.named('type');

    if (type === null || type === undefined) {
      return 'text';
    }

    assert(
      'The `@type` argument to the <Input> component must be a string',
      typeof type === 'string'
    );

    return isValidInputType(type) ? type : 'text';
  }

  get isCheckbox(): boolean {
    return this.named('type') === 'checkbox';
  }

  private _checked = valueFrom(this.args.named['checked']);

  get checked(): unknown {
    if (this.isCheckbox) {
      warn(
        '`<Input @type="checkbox" />` reflects its checked state via the `@checked` argument. ' +
          'You wrote `<Input @type="checkbox" @value={{...}} />` which is likely not what you intended. ' +
          'Did you mean `<Input @type="checkbox" @checked={{...}} />`?',
        untrack(
          () =>
            this.args.named['checked'] !== undefined ||
            this.args.named['value'] === undefined ||
            typeof valueForRef(this.args.named['value']) === 'string'
        ),
        { id: 'ember.built-in-components.input-checkbox-value' }
      );

      return this._checked.get();
    } else {
      return undefined;
    }
  }

  set checked(checked: unknown) {
    warn(
      '`<Input @type="checkbox" />` reflects its checked state via the `@checked` argument. ' +
        'You wrote `<Input @type="checkbox" @value={{...}} />` which is likely not what you intended. ' +
        'Did you mean `<Input @type="checkbox" @checked={{...}} />`?',
      untrack(
        () =>
          this.args.named['checked'] !== undefined ||
          this.args.named['value'] === undefined ||
          typeof valueForRef(this.args.named['value']) === 'string'
      ),
      { id: 'ember.built-in-components.input-checkbox-value' }
    );

    this._checked.set(checked);
  }

  @action change(event: Event): void {
    if (this.isCheckbox) {
      this.checkedDidChange(event);
    } else {
      super.change(event);
    }
  }

  @action input(event: Event): void {
    if (!this.isCheckbox) {
      super.input(event);
    }
  }

  @action checkedDidChange(event: Event): void {
    let element = event.target;
    assert('[BUG] element must be an <input>', element instanceof HTMLInputElement);
    this.checked = element.checked;
  }

  protected isSupportedArgument(name: string): boolean {
    let supportedArguments = [
      'type',
      'value',
      'checked',
      'enter',
      'insert-newline',
      'escape-press',
    ];

    return supportedArguments.indexOf(name) !== -1 || super.isSupportedArgument(name);
  }
}

export default opaquify(Input, InputTemplate);
