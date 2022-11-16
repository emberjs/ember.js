import type { InternalOwner } from '@ember/-internals/owner';
import { setOwner } from '@ember/-internals/owner';
import { guidFor } from '@ember/-internals/utils';
import { assert } from '@ember/debug';
import { registerDestructor } from '@glimmer/destroyable';
import type {
  CapturedArguments,
  Destroyable,
  InternalModifierManager as ModifierManager,
} from '@glimmer/interfaces';
import { valueForRef } from '@glimmer/reference';
import type { SimpleElement } from '@simple-dom/interface';

export default class InternalModifier {
  // Override this
  static toString(): string {
    return 'internal modifier';
  }

  constructor(
    protected owner: InternalOwner,
    protected readonly element: Element,
    protected readonly args: CapturedArguments
  ) {
    setOwner(this, owner);
  }

  install(): void {}

  remove(): void {}

  protected positional(index: number): unknown {
    let ref = this.args.positional[index];
    return ref ? valueForRef(ref) : undefined;
  }

  protected named(key: string): unknown {
    let ref = this.args.named[key];
    return ref ? valueForRef(ref) : undefined;
  }

  toString(): string {
    return `<${this.constructor.toString()}:${guidFor(this)}>`;
  }
}

function destructor(modifier: InternalModifier): void {
  modifier.remove();
}

class InternalModifierState implements Destroyable {
  constructor(readonly instance: InternalModifier) {}
}

export class InternalModifierManager
  implements ModifierManager<InternalModifierState, typeof InternalModifier>
{
  constructor(private ModifierClass: typeof InternalModifier, private name: string) {}

  create(
    owner: InternalOwner,
    element: SimpleElement,
    _definition: unknown,
    args: CapturedArguments
  ): InternalModifierState {
    assert('element must be an HTMLElement', element instanceof HTMLElement);

    let { ModifierClass } = this;
    let instance = new ModifierClass(owner, element, args);

    registerDestructor(instance, destructor);

    return new InternalModifierState(instance);
  }

  // not needed for now, but feel free to implement this
  getTag(): null {
    return null;
  }

  getDebugName(): string {
    return this.name;
  }

  install({ instance }: InternalModifierState): void {
    return instance.install();
  }

  // not needed for now, but feel free to implement this
  update(): void {
    assert('update should never be called on an internal modifier');
  }

  getDestroyable({ instance }: InternalModifierState): Destroyable {
    return instance;
  }
}
