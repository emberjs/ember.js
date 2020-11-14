import { Owner, setOwner } from '@ember/-internals/owner';
import { guidFor } from '@ember/-internals/utils';
import { assert } from '@ember/debug';
import {
  CapturedArguments,
  Destroyable,
  InternalModifierManager as ModifierManager,
  VMArguments,
} from '@glimmer/interfaces';
import { valueForRef } from '@glimmer/reference';
import { registerDestructor, setModifierManager } from '@glimmer/runtime';
import { SimpleElement } from '@simple-dom/interface';

export default class InternalModifier {
  // Factory interface
  static create(): never {
    throw assert('Use constructor instead of create');
  }

  static get class(): typeof InternalModifier {
    return this;
  }

  static get fullName(): string {
    return this.name;
  }

  static get normalizedName(): string {
    return this.name;
  }

  constructor(
    protected owner: Owner,
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

class InternalModifierState implements Destroyable {
  constructor(readonly name: string, readonly instance: InternalModifier) {}
}

class InternalModifierManager
  implements ModifierManager<InternalModifierState, typeof InternalModifier> {
  constructor(private readonly owner: Owner) {}

  create(
    element: SimpleElement,
    factory: typeof InternalModifier,
    args: VMArguments
  ): InternalModifierState {
    assert('element must be an HTMLElement', element instanceof HTMLElement);

    let instance = new factory(this.owner, element, args.capture());

    registerDestructor(instance, (modifier) => modifier.remove());

    return new InternalModifierState(
      factory.name,
      new factory(this.owner, element, args.capture())
    );
  }

  // not needed for now, but feel free to implement this
  getTag(): null {
    return null;
  }

  getDebugName({ name }: InternalModifierState): string {
    return name;
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

setModifierManager((owner: Owner) => new InternalModifierManager(owner), InternalModifier);
