import {
  ComponentManager,
  InternalComponentManager,
  ModifierManager,
  InternalModifierManager,
  Helper,
  HelperManager,
  Environment,
  VMArguments,
  DynamicScope,
  InternalComponentCapabilities,
  ElementOperations,
  Bounds,
  Destroyable,
  GlimmerTreeChanges,
} from '@glimmer/interfaces';
import { _WeakSet } from '@glimmer/util';
import { Reference } from '@glimmer/reference';
import { SimpleElement } from '@simple-dom/interface';
import { UpdatableTag } from '@glimmer/validator';

const INTERNAL_MANAGERS = new _WeakSet();

export function isInternalComponentManager(
  manager: InternalComponentManager | ComponentManager<unknown>
): manager is InternalComponentManager {
  return INTERNAL_MANAGERS.has(manager);
}

export function isInternalModifierManager(
  manager: InternalModifierManager | ModifierManager<unknown>
): manager is InternalModifierManager {
  return INTERNAL_MANAGERS.has(manager);
}

export function isInternalHelper(manager: Helper | HelperManager<unknown>): manager is Helper {
  return typeof manager === 'function';
}

export abstract class BaseInternalComponentManager<T, U> implements InternalComponentManager<T, U> {
  constructor() {
    INTERNAL_MANAGERS.add(this);
  }

  abstract getDebugName(state: U): string;

  abstract create(
    env: Environment,
    definition: U,
    args: VMArguments,
    dynamicScope: DynamicScope,
    caller: Reference<void | {}>,
    hasDefaultBlock: boolean
  ): T;

  abstract getSelf(component: T): Reference;
  abstract getCapabilities(state: U): InternalComponentCapabilities;

  didCreateElement(_component: T, _element: SimpleElement, _operations: ElementOperations): void {
    // noop
  }

  didRenderLayout(_component: T, _bounds: Bounds): void {
    // noop
  }

  didCreate(_bucket: T): void {
    // noop
  }

  update(_bucket: T, _dynamicScope: DynamicScope): void {
    // noop
  }

  didUpdateLayout(_bucket: T, _bounds: Bounds): void {
    // noop
  }

  didUpdate(_bucket: T): void {
    // noop
  }

  abstract getDestroyable(bucket: T): Destroyable | null;
}

export abstract class BaseInternalModifierManager<T, U> implements InternalModifierManager<T, U> {
  constructor() {
    INTERNAL_MANAGERS.add(this);
  }

  abstract getDebugName(state: T): string;

  abstract create(
    element: SimpleElement,
    state: U,
    args: VMArguments,
    dynamicScope: DynamicScope,
    dom: GlimmerTreeChanges
  ): T;

  abstract getTag(bucket: T): UpdatableTag | null;

  abstract install(bucket: T): void;

  abstract update(bucket: T): void;

  abstract getDestroyable(bucket: T): Destroyable | null;
}
