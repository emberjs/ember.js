declare module '@ember/-internals/glimmer/lib/modifiers/internal' {
  import type { InternalOwner } from '@ember/-internals/owner';
  import type {
    CapturedArguments,
    Destroyable,
    InternalModifierManager as ModifierManager,
  } from '@glimmer/interfaces';
  import type { SimpleElement } from '@simple-dom/interface';
  export default class InternalModifier {
    protected owner: InternalOwner;
    protected readonly element: Element;
    protected readonly args: CapturedArguments;
    static toString(): string;
    constructor(owner: InternalOwner, element: Element, args: CapturedArguments);
    install(): void;
    remove(): void;
    protected positional(index: number): unknown;
    protected named(key: string): unknown;
    toString(): string;
  }
  class InternalModifierState implements Destroyable {
    readonly instance: InternalModifier;
    constructor(instance: InternalModifier);
  }
  export class InternalModifierManager
    implements ModifierManager<InternalModifierState, typeof InternalModifier>
  {
    private ModifierClass;
    private name;
    constructor(ModifierClass: typeof InternalModifier, name: string);
    create(
      owner: InternalOwner,
      element: SimpleElement,
      _definition: unknown,
      args: CapturedArguments
    ): InternalModifierState;
    getTag(): null;
    getDebugName(): string;
    install({ instance }: InternalModifierState): void;
    update(): void;
    getDestroyable({ instance }: InternalModifierState): Destroyable;
  }
  export {};
}
