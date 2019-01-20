import {
  ComponentManager,
  ComponentDefinitionState,
  VMArguments,
  ComponentCapabilities,
  Option,
  DynamicScope,
  ComponentInstanceState,
  PreparedArguments,
  Bounds,
  SymbolDestroyable,
  Destroyable,
  Environment,
} from '@glimmer/interfaces';
import { MINIMAL_CAPABILITIES } from './interfaces';
import { VersionedPathReference, Tag } from '@glimmer/reference';
import { UNDEFINED_REFERENCE } from '../references';

export class SimpleComponentManager implements ComponentManager {
  getCapabilities(_state: ComponentDefinitionState): ComponentCapabilities {
    return MINIMAL_CAPABILITIES;
  }

  prepareArgs(_state: ComponentDefinitionState, _args: VMArguments): Option<PreparedArguments> {
    throw new Error(`Unimplemented prepareArgs in SimpleComponentManager`);
  }

  create(
    _env: Environment,
    _state: ComponentDefinitionState,
    _args: Option<VMArguments>,
    _dynamicScope: Option<DynamicScope>,
    _caller: Option<VersionedPathReference<unknown>>,
    _hasDefaultBlock: boolean
  ): ComponentInstanceState {
    throw new Error(`Unimplemented create in SimpleComponentManager`);
  }

  getSelf(_state: ComponentInstanceState): VersionedPathReference {
    return UNDEFINED_REFERENCE;
  }

  getTag(_state: ComponentInstanceState): Tag {
    throw new Error(`Unimplemented getTag in SimpleComponentManager`);
  }

  didRenderLayout(_state: ComponentInstanceState, _bounds: Bounds): void {
    throw new Error(`Unimplemented didRenderLayout in SimpleComponentManager`);
  }

  didCreate(_state: ComponentInstanceState): void {
    throw new Error(`Unimplemented didCreate in SimpleComponentManager`);
  }

  update(_state: ComponentInstanceState, _dynamicScope: Option<DynamicScope>): void {
    throw new Error(`Unimplemented update in SimpleComponentManager`);
  }

  didUpdateLayout(_state: ComponentInstanceState, _bounds: Bounds): void {
    throw new Error(`Unimplemented didUpdateLayout in SimpleComponentManager`);
  }

  didUpdate(_state: ComponentInstanceState): void {
    throw new Error(`Unimplemented didUpdate in SimpleComponentManager`);
  }

  getDestructor(_state: ComponentInstanceState): Option<SymbolDestroyable | Destroyable> {
    return null;
  }
}

export const TEMPLATE_ONLY_COMPONENT = {
  state: null,
  manager: new SimpleComponentManager(),
};
