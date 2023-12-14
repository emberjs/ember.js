declare module '@ember/-internals/glimmer/lib/components/internal' {
  import type { InternalOwner } from '@ember/-internals/owner';
  import type { CapturedArguments, TemplateFactory } from '@glimmer/interfaces';
  export type EventListener = (event: Event) => void;
  export default class InternalComponent {
    protected owner: InternalOwner;
    protected readonly args: CapturedArguments;
    protected readonly caller: unknown;
    static toString(): string;
    constructor(owner: InternalOwner, args: CapturedArguments, caller: unknown);
    /**
     * The default HTML id attribute. We don't really _need_ one, this is just
     * added for compatibility as it's hard to tell if people rely on it being
     * present, and it doens't really hurt.
     *
     * However, don't rely on this internally, like passing it to `getElementId`.
     * This can be (and often is) overriden by passing an `id` attribute on the
     * invocation, which shadows this default id via `...attributes`.
     */
    get id(): string;
    /**
     * The default HTML class attribute. Similar to the above, we don't _need_
     * them, they are just added for compatibility as it's similarly hard to tell
     * if people rely on it in their CSS etc, and it doens't really hurt.
     */
    get class(): string;
    protected validateArguments(): void;
    protected named(name: string): unknown;
    protected positional(index: number): unknown;
    protected listenerFor(name: string): EventListener;
    protected isSupportedArgument(_name: string): boolean;
    protected onUnsupportedArgument(_name: string): void;
    toString(): string;
  }
  export interface InternalComponentConstructor<T extends InternalComponent = InternalComponent> {
    new (owner: InternalOwner, args: CapturedArguments, caller: unknown): T;
    prototype: T;
    toString(): string;
  }
  const OPAQUE_INTERNAL_COMPONENT_CONSTRUCTOR: unique symbol;
  export interface OpaqueInternalComponentConstructor {
    create(): never;
    toString(): string;
    [OPAQUE_INTERNAL_COMPONENT_CONSTRUCTOR]: true;
  }
  export function opaquify(
    constructor: InternalComponentConstructor,
    template: TemplateFactory
  ): OpaqueInternalComponentConstructor;
  export {};
}
