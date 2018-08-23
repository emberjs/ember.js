import { DEBUG } from '@glimmer/env';
import { RevisionTag, TagWrapper } from '@glimmer/reference';
import {
  Arguments,
  CapturedNamedArguments,
  CapturedPositionalArguments,
  DynamicScope,
  ModifierManager,
} from '@glimmer/runtime';
import { Destroyable } from '@glimmer/util';
import { Factory } from 'ember-owner';
import { Modifier } from '../modifier';

let maybeFreeze: (obj: any) => void;
if (DEBUG) {
  // gaurding this in a DEBUG gaurd (as well as all invocations)
  // so that it is properly stripped during the minification's
  // dead code elimination
  maybeFreeze = (obj: any) => {
    // re-freezing an already frozen object introduces a significant
    // performance penalty on Chrome (tested through 59).
    //
    // See: https://bugs.chromium.org/p/v8/issues/detail?id=6450
    if (!Object.isFrozen(obj)) {
      Object.freeze(obj);
    }
  };
}

export class ModifierStateBucket {
  constructor(
    public element: Element,
    public modifier: Modifier,
    public positional: CapturedPositionalArguments,
    public named: CapturedNamedArguments,
    public tag: TagWrapper<RevisionTag | null>
  ) {}

  destroy() {
    this.modifier.willDestroyElement();
  }
}

export class ModifierDefinitonState {
  constructor(public ModifierClass: Factory<Modifier>) {}
}

class PublicModifierManager
  implements ModifierManager<ModifierStateBucket, ModifierDefinitonState> {
  create(
    element: Element,
    state: ModifierDefinitonState,
    args: Arguments,
    _dynamicScope: DynamicScope,
    _dom: any
  ): ModifierStateBucket {
    let { named, positional, tag } = args.capture();
    let { ModifierClass } = state;
    let modifier = ModifierClass.create();
    return new ModifierStateBucket(element, modifier, positional, named, tag);
  }

  getTag({ tag }: ModifierStateBucket) {
    return tag;
  }

  install({ modifier, element, named, positional }: ModifierStateBucket): void {
    modifier.element = element;
    let positionalValue = positional.value();
    let namedValue = named.value();

    if (DEBUG) {
      maybeFreeze(positionalValue);
      maybeFreeze(namedValue);
    }

    modifier.didInsertElement(positionalValue, namedValue);
  }
  update({ modifier, positional, named }: ModifierStateBucket): void {
    let positionalValue = positional.value();
    let namedValue = named.value();

    if (DEBUG) {
      maybeFreeze(positionalValue);
      maybeFreeze(namedValue);
    }

    modifier.didUpdate(positionalValue, namedValue);
  }

  getDestructor(modifier: Destroyable) {
    return modifier;
  }
}

export const PUBLIC_MODIFIER_MANAGER = new PublicModifierManager();
