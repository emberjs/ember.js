import type { Arguments } from '../runtime';
import type { Capabilities } from './capabilities';

export interface ComponentCapabilitiesVersions {
  '3.4': {
    asyncLifecycleCallbacks?: boolean;
    destructor?: boolean;
  };

  '3.13': {
    asyncLifecycleCallbacks?: boolean;
    destructor?: boolean;
    updateHook?: boolean;
  };
}

export interface ComponentCapabilities extends Capabilities {
  asyncLifeCycleCallbacks: boolean;
  destructor: boolean;
  updateHook: boolean;
}

export interface ComponentManager<ComponentStateBucket> {
  capabilities: ComponentCapabilities;
  createComponent(factory: object, args: Arguments): ComponentStateBucket;
  getContext(instance: ComponentStateBucket): unknown;
}

export interface ComponentManagerWithAsyncLifeCycleCallbacks<ComponentStateBucket>
  extends ComponentManager<ComponentStateBucket> {
  didCreateComponent(instance: ComponentStateBucket): void;
}

export interface ComponentManagerWithUpdateHook<ComponentStateBucket>
  extends ComponentManager<ComponentStateBucket> {
  updateComponent(instance: ComponentStateBucket, args: Arguments): void;
}

export interface ComponentManagerWithAsyncUpdateHook<ComponentStateBucket>
  extends ComponentManagerWithAsyncLifeCycleCallbacks<ComponentStateBucket>,
    ComponentManagerWithUpdateHook<ComponentStateBucket> {
  didUpdateComponent(instance: ComponentStateBucket): void;
}

export interface ComponentManagerWithDestructors<ComponentStateBucket>
  extends ComponentManager<ComponentStateBucket> {
  destroyComponent(instance: ComponentStateBucket): void;
}
