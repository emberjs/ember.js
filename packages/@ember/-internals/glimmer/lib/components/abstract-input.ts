import { tracked } from '@ember/-internals/metal';
import { assert } from '@ember/debug';
import { action } from '@ember/object';
import { isConstRef, isUpdatableRef, Reference, updateRef, valueForRef } from '@glimmer/reference';
import InternalComponent, { EventListener } from './internal';

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

export default abstract class AbstractInput extends InternalComponent {
  validateArguments(): void {
    assert(
      `The ${this.constructor} component does not take any positional arguments`,
      this.args.positional.length === 0
    );

    super.validateArguments();
  }

  private _value = valueFrom(this.args.named['value']);

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
