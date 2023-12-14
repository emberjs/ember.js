declare module '@ember/-internals/glimmer/lib/components/abstract-input' {
  import type { Reference } from '@glimmer/reference';
  import type { EventListener } from '@ember/-internals/glimmer/lib/components/internal';
  import InternalComponent from '@ember/-internals/glimmer/lib/components/internal';
  type VirtualEventListener = (value: string, event: Event) => void;
  export function valueFrom(reference?: Reference<unknown>): Value;
  interface Value {
    get(): unknown;
    set(value: unknown): void;
  }
  export default abstract class AbstractInput extends InternalComponent {
    validateArguments(): void;
    private _value;
    get value(): unknown;
    set value(value: unknown);
    valueDidChange(event: Event): void;
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
    change(event: Event): void;
    input(event: Event): void;
    keyUp(event: KeyboardEvent): void;
    protected listenerFor(name: string): EventListener;
    protected isVirtualEventListener(
      name: string,
      _listener: Function
    ): _listener is VirtualEventListener;
  }
  export {};
}
