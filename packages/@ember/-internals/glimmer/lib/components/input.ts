/**
@module @ember/component
*/
import { hasDOM } from '@ember/-internals/browser-environment';
import { tracked } from '@ember/-internals/metal';
import { guidFor } from '@ember/-internals/utils';
import { jQuery, jQueryDisabled } from '@ember/-internals/views';
import { EMBER_MODERNIZED_BUILT_IN_COMPONENTS } from '@ember/canary-features';
import { assert, deprecate, warn } from '@ember/debug';
import {
  JQUERY_INTEGRATION,
  MOUSE_ENTER_LEAVE_MOVE_EVENTS,
  SEND_ACTION,
} from '@ember/deprecated-features';
import { action } from '@ember/object';
import { setComponentTemplate, setInternalComponentManager } from '@glimmer/manager';
import { isConstRef, isUpdatableRef, Reference, updateRef, valueForRef } from '@glimmer/reference';
import { untrack } from '@glimmer/validator';
import InternalManager from '../component-managers/internal';
import InputTemplate from '../templates/input';
import InternalComponent from './internal';

let isValidInputType: (type: string) => boolean;

if (hasDOM && EMBER_MODERNIZED_BUILT_IN_COMPONENTS) {
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

function NOOP() {}

const UNINITIALIZED: unknown = Object.freeze({});

/**
 * This interface paves over the differences between these three cases:
 *
 * 1. `<Input />` or `<Input @value="some string" />`
 * 2. `<Input @value={{this.value}} />`
 * 3. `<Input @value={{to-upper-case this.value}} />`
 *
 * For the first set of cases (any const reference in general), the semantics
 * are that `@value` is treated as an initial value only, just like the `value`
 * attribute. Perhaps using the `value` attribute would have been more Correct™
 * here, but that would make a pretty confusing API, and the user's intent is
 * pretty clear, so we support it.
 *
 * The second case is the most common. `{{this.value}}` is an updatable
 * reference here so the value is fully owned and bound to the "upstream" value
 * and we don't store a copy of it in the component.
 *
 * The last case is the most tricky. There are a lot of different ways for this
 * to happen, but the end result is that we have a non-const and non-updatable
 * reference in our hands. The semantics here is a mix of the first two cases.
 * We take the computed value as the initial value, but hold a copy of it and
 * allow it to diverge from upstream. However, when the upstream recomputes to
 * a value different than what we originally had, we would reconcile with the
 * new upstream value and throw away the local copy.
 *
 * It's not clear that we intended to support the last case, or that it is used
 * intentionally in the real world, but it's a fallout of the two-way binding
 * system and `Ember.Component` semantics from before.
 *
 * This interface paves over the differences so the component doesn't have to
 * worry about it.
 *
 * All of the above applies to `@checked` as well.
 */
function valueFrom(reference?: Reference<unknown>): Value {
  if (reference === undefined) {
    return new LocalValue(undefined);
  } else if (isConstRef(reference)) {
    return new LocalValue(valueForRef(reference));
  } else if (isUpdatableRef(reference)) {
    return new UpstreamValue(reference);
  } else {
    return new ForkedValue(reference);
  }
}

interface Value {
  get(): unknown;
  set(value: unknown): void;
}

class LocalValue implements Value {
  @tracked private value: unknown;

  constructor(value: unknown) {
    this.value = value;
  }

  get(): unknown {
    return this.value;
  }

  set(value: unknown): void {
    this.value = value;
  }
}

class UpstreamValue implements Value {
  constructor(private reference: Reference<unknown>) {}

  get(): unknown {
    return valueForRef(this.reference);
  }

  set(value: unknown): void {
    updateRef(this.reference, value);
  }
}

class ForkedValue implements Value {
  private local?: Value;
  private upstream: Value;

  private lastUpstreamValue = UNINITIALIZED;

  constructor(reference: Reference<unknown>) {
    this.upstream = new UpstreamValue(reference);
  }

  get(): unknown {
    let upstreamValue = this.upstream.get();

    if (upstreamValue !== this.lastUpstreamValue) {
      this.lastUpstreamValue = upstreamValue;
      this.local = new LocalValue(upstreamValue);
    }

    assert('[BUG] this.local must have been initialized at this point', this.local);
    return this.local.get();
  }

  set(value: unknown): void {
    assert('[BUG] this.local must have been initialized at this point', this.local);
    this.local.set(value);
  }
}

/**
  See [Ember.Templates.components.Input](/ember/release/classes/Ember.Templates.components/methods/Input?anchor=Input).

  @method input
  @for Ember.Templates.helpers
  @param {Hash} options
  @public
  */

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
class Input extends InternalComponent {
  modernized = Boolean(EMBER_MODERNIZED_BUILT_IN_COMPONENTS);

  /**
   * The default HTML id attribute. We don't really _need_ one, this is just
   * added for compatibility as it's hard to tell if people rely on it being
   * present, and it doens't really hurt.
   *
   * However, don't rely on this internally, like passing it to `getElementId`.
   * This can be (and often is) overriden by passing an `id` attribute on the
   * invocation, which shadows this default id via `...attributes`.
   */
  get id(): string {
    return guidFor(this);
  }

  /**
   * The default HTML class attribute. Similar to the above, we don't _need_
   * them, they are just added for compatibility as it's similarly hard to tell
   * if people rely on it in their CSS etc, and it doens't really hurt.
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
    let type = this.arg('type');

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
    return this.arg('type') === 'checkbox';
  }

  _checked = valueFrom(this.args.checked);

  get checked(): unknown {
    if (this.isCheckbox) {
      warn(
        '`<Input @type="checkbox" />` reflects its checked state via the `@checked` argument. ' +
          'You wrote `<Input @type="checkbox" @value={{...}} />` which is likely not what you intended. ' +
          'Did you mean `<Input @type="checkbox" @checked={{...}} />`?',
        untrack(
          () =>
            this.args.checked !== undefined ||
            this.args.value === undefined ||
            typeof valueForRef(this.args.value) === 'string'
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
          this.args.checked !== undefined ||
          this.args.value === undefined ||
          typeof valueForRef(this.args.value) === 'string'
      ),
      { id: 'ember.built-in-components.input-checkbox-value' }
    );

    this._checked.set(checked);
  }

  _value = valueFrom(this.args.value);

  get value(): unknown {
    return this._value.get();
  }

  set value(value: unknown) {
    this._value.set(value);
  }

  @action checkedDidChange(event: Event): void {
    this.checked = this.elementFor(event).checked;
  }

  @action valueDidChange(event: Event): void {
    this.value = this.valueFor(event);
  }

  @action change(event: Event): void {
    if (this.isCheckbox) {
      this.checkedDidChange(event);
    } else {
      this.valueDidChange(event);
    }
  }

  @action input(event: Event): void {
    if (!this.isCheckbox) {
      this.valueDidChange(event);
    }
  }

  @action keyUp(event: KeyboardEvent): void {
    let value = this.valueFor(event);

    switch (event.key) {
      case 'Enter':
        this.callbackFor('enter')(value, event);
        this.callbackFor('insert-newline')(value, event);
        break;

      case 'Escape':
        this.callbackFor('escape-press')(value, event);
        break;
    }
  }

  private elementFor(event: Event): HTMLInputElement {
    assert(
      '[BUG] Event target must be the <input> element',
      event.target instanceof HTMLInputElement
    );

    return event.target;
  }

  private valueFor(event: Event): string {
    return this.elementFor(event).value;
  }

  private callbackFor(type: string): (value: string, event: Event) => void {
    let callback = this.arg(type);

    if (callback) {
      assert(
        `The \`@${type}\` argument to the <Input> component must be a function`,
        typeof callback === 'function'
      );
      return callback as (value: string, event: Event) => void;
    } else {
      return NOOP;
    }
  }
}

// Deprecated features
if (EMBER_MODERNIZED_BUILT_IN_COMPONENTS) {
  // Attribute bindings
  {
    let defineGetterForDeprecatedAttributeBinding = (
      attribute: string,
      argument = attribute
    ): void => {
      assert(
        `[BUG] There is already a getter for _${argument} on Input`,
        !Object.getOwnPropertyDescriptor(Input.prototype, `_${argument}`)
      );

      Object.defineProperty(Input.prototype, `_${argument}`, {
        get(this: Input): unknown {
          deprecate(
            `Passing the \`@${argument}\` argument to <Input> is deprecated. ` +
              `Instead, please pass the attribute directly, i.e. \`<Input ${attribute}={{...}} />\` ` +
              `instead of \`<Input @${argument}={{...}} />\` or \`{{input ${argument}=...}}\`.`,
            true /* TODO !(argument in this.args) */,
            {
              id: 'ember.built-in-components.legacy-attribute-arguments',
              for: 'ember-source',
              since: {},
              until: '4.0.0',
            }
          );

          return this.arg(argument);
        },
      });

      let descriptor = Object.getOwnPropertyDescriptor(Input.prototype, argument);

      if (descriptor) {
        const superGetter = descriptor.get;
        assert(`Expecting ${argument} to be a getter on Input`, typeof superGetter === 'function');

        Object.defineProperty(Input.prototype, argument, {
          ...descriptor,
          get(this: Input): unknown {
            // The `class` attribute is concatenated/merged instead of clobbered
            if (attribute === 'class' && argument in this.args) {
              let arg = this[`_${argument}`];

              if (arg) {
                return `${superGetter.call(this)} ${this[`_${argument}`]}`;
              } else {
                return superGetter.call(this);
              }
            } else if (argument in this.args) {
              return this[`_${argument}`];
            } else {
              return superGetter.call(this);
            }
          },
        });
      }
    };

    let deprecatedAttributeBindings: Array<
      string | Parameters<typeof defineGetterForDeprecatedAttributeBinding>
    > = [
      // Component
      'id',
      'class',
      ['class', 'classNames'],

      // TextSupport
      'autocapitalize',
      'autocorrect',
      'autofocus',
      'disabled',
      'form',
      'maxlength',
      'minlength',
      'placeholder',
      'readonly',
      'required',
      'selectionDirection',
      'spellcheck',
      'tabindex',
      'title',

      // TextField
      'accept',
      'autocomplete',
      'autosave',
      'dir',
      'formaction',
      'formenctype',
      'formmethod',
      'formnovalidate',
      'formtarget',
      'height',
      'inputmode',
      'lang',
      'list',
      'max',
      'min',
      'multiple',
      'name',
      'pattern',
      'size',
      'step',
      'width',

      // Checkbox
      'indeterminate',
    ];

    deprecatedAttributeBindings.forEach((args) => {
      if (Array.isArray(args)) {
        defineGetterForDeprecatedAttributeBinding(...args);
      } else {
        defineGetterForDeprecatedAttributeBinding(args);
      }
    });
  }

  // Event callbacks
  {
    let defineGetterForDeprecatedEventCallback = (
      eventName: string,
      methodName: string = eventName,
      virtualEvent?: string
    ): void => {
      assert(
        `[BUG] There is already a getter for _${methodName} on Input`,
        !Object.getOwnPropertyDescriptor(Input.prototype, `_${methodName}`)
      );

      let descriptor = Object.getOwnPropertyDescriptor(Input.prototype, methodName);

      Object.defineProperty(Input.prototype, `_${methodName}`, {
        get(this: Input): unknown {
          return (event: Event): void => {
            let value = this['valueFor'].call(this, event);

            if (methodName in this.args) {
              deprecate(
                `Passing the \`@${methodName}\` argument to <Input> is deprecated. ` +
                  `This would have overwritten the internal \`${methodName}\` method on ` +
                  `the <Input> component and prevented it from functioning properly. ` +
                  `Instead, please use the {{on}} modifier, i.e. \`<Input {{on "${eventName}" ...}} />\` ` +
                  `instead of \`<Input @${methodName}={{...}} />\` or \`{{input ${methodName}=...}}\`.`,
                true /* TODO !descriptor */,
                {
                  id: 'ember.built-in-components.legacy-attribute-arguments',
                  for: 'ember-source',
                  since: {},
                  until: '4.0.0',
                }
              );

              deprecate(
                `Passing the \`@${methodName}\` argument to <Input> is deprecated. ` +
                  `Instead, please use the {{on}} modifier, i.e. \`<Input {{on "${eventName}" ...}} />\` ` +
                  `instead of \`<Input @${methodName}={{...}} />\` or \`{{input ${methodName}=...}}\`.`,
                true /* TODO descriptor */,
                {
                  id: 'ember.built-in-components.legacy-attribute-arguments',
                  for: 'ember-source',
                  since: {},
                  until: '4.0.0',
                }
              );

              let callback = this['callbackFor'].call(this, methodName);
              callback(value, event);
            } else if (virtualEvent && virtualEvent in this.args) {
              deprecate(
                `Passing the \`@${virtualEvent}\` argument to <Input> is deprecated. ` +
                  `Instead, please use the {{on}} modifier, i.e. \`<Input {{on "${eventName}" ...}} />\` ` +
                  `instead of \`<Input @${virtualEvent}={{...}} />\` or \`{{input ${virtualEvent}=...}}\`.`,
                true /* TODO false */,
                {
                  id: 'ember.built-in-components.legacy-attribute-arguments',
                  for: 'ember-source',
                  since: {},
                  until: '4.0.0',
                }
              );

              this['callbackFor'].call(this, virtualEvent)(value, event);
            }
          };
        },
      });

      if (descriptor) {
        const superGetter = descriptor.get;

        assert(
          `[BUG] Expecting ${methodName} on Input to be a getter`,
          typeof superGetter === 'function'
        );

        Object.defineProperty(Input.prototype, methodName, {
          get(this: Input): unknown {
            if (methodName in this.args) {
              return this[`_${methodName}`];
            } else if (virtualEvent && virtualEvent in this.args) {
              let superCallback = superGetter.call(this);
              let virtualCallback = this[`_${methodName}`];

              return (event: Event) => {
                superCallback(event);
                virtualCallback(event);
              };
            } else {
              return superGetter.call(this);
            }
          },
        });
      }
    };

    let deprecatedEventCallbacks: Array<
      string | Parameters<typeof defineGetterForDeprecatedEventCallback>
    > = [
      // EventDispatcher
      ['touchstart', 'touchStart'],
      ['touchmove', 'touchMove'],
      ['touchend', 'touchEnd'],
      ['touchcancel', 'touchCancel'],
      ['keydown', 'keyDown', 'key-down'],
      ['keyup', 'keyUp', 'key-up'],
      ['keypress', 'keyPress', 'key-press'],
      ['mousedown', 'mouseDown'],
      ['mouseup', 'mouseUp'],
      ['contextmenu', 'contextMenu'],
      'click',
      ['dblclick', 'doubleClick'],
      ['focusin', 'focusIn', 'focus-in'],
      ['focusout', 'focusOut', 'focus-out'],
      'submit',
      'input',
      'change',
      ['dragstart', 'dragStart'],
      'drag',
      ['dragenter', 'dragEnter'],
      ['dragleave', 'dragLeave'],
      ['dragover', 'dragOver'],
      'drop',
      ['dragend', 'dragEnd'],
    ];

    if (MOUSE_ENTER_LEAVE_MOVE_EVENTS) {
      deprecatedEventCallbacks.push(
        ['mouseenter', 'mouseEnter'],
        ['mouseleave', 'mouseLeave'],
        ['mousemove', 'mouseMove']
      );
    } else {
      Object.assign(Input.prototype, {
        _mouseEnter: NOOP,
        _mouseLeave: NOOP,
        _mouseMove: NOOP,
      });
    }

    deprecatedEventCallbacks.forEach((args) => {
      if (Array.isArray(args)) {
        defineGetterForDeprecatedEventCallback(...args);
      } else {
        defineGetterForDeprecatedEventCallback(args);
      }
    });
  }

  // String actions
  if (SEND_ACTION) {
    interface View {
      send(action: string, value: string, event: Event): void;
    }

    let isView = (target: {}): target is View => {
      return typeof (target as Partial<View>).send === 'function';
    };

    let superCallbackFor = Input.prototype['callbackFor'];

    Object.assign(Input.prototype, {
      callbackFor(this: Input, type: string): (value: string, event: Event) => void {
        const actionName = this.arg(type);

        if (typeof actionName === 'string') {
          deprecate(
            `Passing actions to components as strings (like \`<Input @${type}="${actionName}" />\`) is deprecated. ` +
              `Please use closure actions instead (\`<Input @${type}={{action "${actionName}"}} />\`).`,
            false,
            {
              id: 'ember-component.send-action',
              for: 'ember-source',
              since: {},
              until: '4.0.0',
              url: 'https://emberjs.com/deprecations/v3.x#toc_ember-component-send-action',
            }
          );

          const { caller } = this;

          assert('[BUG] Missing caller', caller && typeof caller === 'object');

          if (isView(caller)) {
            return (value: string, event: Event) => caller.send(actionName, value, event);
          } else {
            assert(
              `The action '${actionName}' did not exist on ${caller}`,
              typeof caller[actionName] === 'function'
            );

            return caller[actionName];
          }
        } else {
          return superCallbackFor.call(this, type);
        }
      },
    });
  }

  // jQuery Events
  if (JQUERY_INTEGRATION) {
    let superCallbackFor = Input.prototype['callbackFor'];

    Object.assign(Input.prototype, {
      callbackFor(this: Input, type: string): (value: string, event: Event) => void {
        let callback = superCallbackFor.call(this, type);

        if (jQuery && !jQueryDisabled) {
          return (value: string, event: Event) => {
            callback(value, new jQuery.Event(event));
          };
        } else {
          return callback;
        }
      },
    });
  }
}

// Use an opaque handle so implementation details are
const InputComponent = {
  // Factory interface
  create(): never {
    throw assert('Use constructor instead of create');
  },

  toString(): string {
    return '@ember/component/input';
  },
};

setInternalComponentManager(new InternalManager(Input, 'input'), InputComponent);
setComponentTemplate(InputTemplate, InputComponent);

Input.toString = InputComponent.toString;

export default InputComponent;
