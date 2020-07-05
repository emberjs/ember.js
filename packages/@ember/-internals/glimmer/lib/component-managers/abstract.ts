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
import { PathReference } from '@glimmer/reference';
import { SimpleElement } from '@simple-dom/interface';
import { EmberVMEnvironment } from '../environment';

// implements the ComponentManager interface as defined in glimmer:
// tslint:disable-next-line:max-line-length
// https://github.com/glimmerjs/glimmer-vm/blob/v0.24.0-beta.4/packages/%40glimmer/runtime/lib/component/interfaces.ts#L21

export default abstract class AbstractManager<T, U> implements ComponentManager<T, U> {
  prepareArgs(_state: U, _args: VMArguments): Option<PreparedArguments> {
    return null;
  }

  abstract getDebugName(state: U): string;

  abstract create(
    env: EmberVMEnvironment,
    definition: U,
    args: VMArguments,
    dynamicScope: DynamicScope,
    caller: PathReference<void | {}>,
    hasDefaultBlock: boolean
  ): T;

  abstract getSelf(component: T): PathReference<unknown>;
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

  update(_bucket: T, _dynamicScope: DynamicScope): void {
    // noop
  }

  didUpdateLayout(_bucket: T, _bounds: Bounds): void {
    // noop
  }

  didUpdate(_bucket: T): void {
    // noop
  }

  abstract getDestroyable(bucket: T): Option<Destroyable>;
}
