import { tracked } from '@ember/-internals/metal';
import { TargetActionSupport } from '@ember/-internals/runtime';
import { TextSupport } from '@ember/-internals/views';
import { EMBER_MODERNIZED_BUILT_IN_COMPONENTS } from '@ember/canary-features';
import { assert, deprecate } from '@ember/debug';
import { JQUERY_INTEGRATION, SEND_ACTION } from '@ember/deprecated-features';
import { action } from '@ember/object';
import { isConstRef, isUpdatableRef, Reference, updateRef, valueForRef } from '@glimmer/reference';
import Component from '../component';
import InternalComponent, {
  DeprecatingInternalComponent,
  EventListener,
  handleDeprecatedArguments,
  handleDeprecatedAttributeArguments,
  handleDeprecatedEventArguments,
  InternalComponentConstructor,
  jQueryEventShim,
} from './internal';

const UNINITIALIZED: unknown = Object.freeze({});

type VirtualEventListener = (value: string, event: Event) => void;

function elementForEvent(event: Event): HTMLInputElement | HTMLTextAreaElement {
  assert(
    '[BUG] event target must be an <input> or <textarea> element',
    event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement
  );

  return event.target;
}

function valueForEvent(event: Event): string {
  return elementForEvent(event).value;
}

function devirtualize(callback: VirtualEventListener): EventListener {
  return (event: Event) => callback(valueForEvent(event), event);
}

export function valueFrom(reference?: Reference<unknown>): Value {
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

export default abstract class AbstractInput
  extends InternalComponent
  implements DeprecatingInternalComponent {
  modernized = this.shouldModernize();

  protected shouldModernize(): boolean {
    return (
      Boolean(EMBER_MODERNIZED_BUILT_IN_COMPONENTS) &&
      Component._wasReopened === false &&
      TextSupport._wasReopened === false &&
      TargetActionSupport._wasReopened === false
    );
  }

  private _value = valueFrom(this.args.value);

  get value(): unknown {
    return this._value.get();
  }

  set value(value: unknown) {
    this._value.set(value);
  }

  @action valueDidChange(event: Event): void {
    this.value = valueForEvent(event);
  }

  /**
   * The `change` and `input` actions need to be overridden in the `Input`
   * subclass. Unfortunately, some ember-source builds currently uses babel
   * loose mode to transpile its classes. Having the `@action` decorator on the
   * super class creates a getter on the prototype, and when the subclass
   * overrides the method, the loose mode transpilation would emit something
   * like `Subclass.prototype['change'] = function change() { ... }`, which
   * fails because `prototype['change']` is getter-only/readonly. The correct
   * solution is to use `Object.defineProperty(prototype, 'change', ...)` but
   * that requires disabling loose mode. For now, the workaround is to add the
   * decorator only on the subclass. This is more of a configuration issue on
   * our own builds and doesn't really affect apps.
   */

  /* @action */ change(event: Event): void {
    this.valueDidChange(event);
  }

  /* @action */ input(event: Event): void {
    this.valueDidChange(event);
  }

  @action keyUp(event: KeyboardEvent): void {
    switch (event.key) {
      case 'Enter':
        this.listenerFor('enter')(event);
        this.listenerFor('insert-newline')(event);
        break;

      case 'Escape':
        this.listenerFor('escape-press')(event);
        break;
    }
  }

  protected listenerFor(name: string): EventListener {
    let listener = super.listenerFor(name);

    if (this.isVirtualEventListener(name, listener)) {
      return devirtualize(listener);
    } else {
      return listener;
    }
  }

  protected isVirtualEventListener(
    name: string,
    _listener: Function
  ): _listener is VirtualEventListener {
    let virtualEvents = ['enter', 'insert-newline', 'escape-press'];

    return virtualEvents.indexOf(name) !== -1;
  }
}

export function handleDeprecatedFeatures(
  target: InternalComponentConstructor<AbstractInput>,
  attributeBindings: Array<string | [attribute: string, argument: string]>
): void {
  if (SEND_ACTION) {
    let angle = target.toString();
    let { prototype } = target;

    interface View {
      send(action: string, ...args: unknown[]): void;
    }

    let isView = (target: {}): target is View => {
      return typeof (target as Partial<View>).send === 'function';
    };

    let superListenerFor = prototype['listenerFor'];

    Object.defineProperty(prototype, 'listenerFor', {
      configurable: true,
      enumerable: false,
      value: function listenerFor(this: AbstractInput, name: string): EventListener {
        const actionName = this.arg(name);

        if (typeof actionName === 'string') {
          deprecate(
            `Passing actions to components as strings (like \`<${angle} @${name}="${actionName}" />\`) is deprecated. ` +
              `Please use closure actions instead (\`<${angle} @${name}={{action "${actionName}"}} />\`).`,
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

          assert('[BUG] missing caller', caller && typeof caller === 'object');

          let listener: Function;

          if (isView(caller)) {
            listener = (...args: unknown[]) => caller.send(actionName, ...args);
          } else {
            assert(
              `The action '${actionName}' did not exist on ${caller}`,
              typeof caller[actionName] === 'function'
            );

            listener = caller[actionName];
          }

          let deprecatedListener = (...args: unknown[]) => {
            deprecate(
              `Passing actions to components as strings (like \`<${angle} @${name}="${actionName}" />\`) is deprecated. ` +
                `Please use closure actions instead (\`<${angle} @${name}={{action "${actionName}"}} />\`).`,
              false,
              {
                id: 'ember-component.send-action',
                for: 'ember-source',
                since: {},
                until: '4.0.0',
                url: 'https://emberjs.com/deprecations/v3.x#toc_ember-component-send-action',
              }
            );

            return listener(...args);
          };

          if (this.isVirtualEventListener(name, deprecatedListener)) {
            return devirtualize(deprecatedListener);
          } else {
            return deprecatedListener as EventListener;
          }
        } else {
          return superListenerFor.call(this, name);
        }
      },
    });
  }

  if (EMBER_MODERNIZED_BUILT_IN_COMPONENTS) {
    let { prototype } = target;

    let virtualEvents = {
      focusin: 'focus-in',
      focusout: 'focus-out',
      keypress: 'key-press',
      keyup: 'key-up',
      keydown: 'key-down',
    };

    handleDeprecatedArguments(target);

    handleDeprecatedAttributeArguments(target, attributeBindings);

    handleDeprecatedEventArguments(target, Object.entries(virtualEvents));

    {
      let superIsVirtualEventListener = prototype['isVirtualEventListener'];

      Object.defineProperty(prototype, 'isVirtualEventListener', {
        configurable: true,
        enumerable: false,
        value: function isVirtualEventListener(
          this: AbstractInput,
          name: string,
          listener: Function
        ): listener is VirtualEventListener {
          return (
            Object.values(virtualEvents).indexOf(name) !== -1 ||
            superIsVirtualEventListener.call(this, name, listener)
          );
        },
      });
    }
  }

  if (JQUERY_INTEGRATION) {
    jQueryEventShim(target);
  }
}
