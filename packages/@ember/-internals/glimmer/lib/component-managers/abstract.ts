import {
  Bounds,
  ComponentCapabilities,
  ComponentManager,
  Destroyable,
  DynamicScope,
  ElementOperations,
  Option,
  PreparedArguments,
  VMArguments,
} from '@glimmer/interfaces';
import { VersionedPathReference } from '@glimmer/reference';
import { Tag } from '@glimmer/validator';
import { SimpleElement } from '@simple-dom/interface';
import RuntimeEnvironment from '../environment';

// implements the ComponentManager interface as defined in glimmer:
// tslint:disable-next-line:max-line-length
// https://github.com/glimmerjs/glimmer-vm/blob/v0.24.0-beta.4/packages/%40glimmer/runtime/lib/component/interfaces.ts#L21

export default abstract class AbstractManager<T, U> implements ComponentManager<T, U> {
  prepareArgs(_state: U, _args: VMArguments): Option<PreparedArguments> {
    return null;
  }

  abstract create(
    env: RuntimeEnvironment,
    definition: U,
    args: VMArguments,
    dynamicScope: DynamicScope,
    caller: VersionedPathReference<void | {}>,
    hasDefaultBlock: boolean
  ): T;

  abstract getSelf(component: T): VersionedPathReference<unknown>;
  abstract getCapabilities(state: U): ComponentCapabilities;

  didCreateElement(_component: T, _element: SimpleElement, _operations: ElementOperations): void {
    // noop
  }

  didRenderLayout(_component: T, _bounds: Bounds): void {
    // noop
  }

  didCreate(_bucket: T): void {
    // noop
  }

  abstract getTag(_bucket: T): Tag;

  update(_bucket: T, _dynamicScope: DynamicScope): void {
    // noop
  }

  didUpdateLayout(_bucket: T, _bounds: Bounds): void {
    // noop
  }

  didUpdate(_bucket: T): void {
    // noop
  }

  abstract getDestructor(bucket: T): Option<Destroyable>;
}
