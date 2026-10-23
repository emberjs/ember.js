import { DEBUG } from '@glimmer/env';
import { destroy } from '@ember/destroyable';
import { capabilities } from '@ember/component';
import { schedule } from '@ember/runloop';

import {
  type default as GlimmerComponent,
  ARGS_SET,
  IS_DESTROYING_KEY,
  IS_DESTROYED_KEY,
} from './component';
import type { Arguments, ComponentManager } from '@glimmer/interfaces';

const CAPABILITIES = capabilities('3.13', {
  destructor: true,
  asyncLifecycleCallbacks: false,
  updateHook: false,
});

interface Constructor<T> {
  new (owner: unknown, args: Record<string, unknown>): T;
}

function scheduledDestroyComponent(component: GlimmerComponent): void {
  if (component.isDestroyed) {
    return;
  }

  destroy(component);
  component[IS_DESTROYED_KEY] = true;
}

/**
 * This component manager runs in Ember.js environments and:
 *
 * 1. Properly destroys the component's associated `meta` data structure
 * 2. Schedules destruction using Ember's runloop
 */
class EmberGlimmerComponentManager implements ComponentManager<GlimmerComponent> {
  capabilities = CAPABILITIES;

  private owner: unknown;

  constructor(owner: unknown) {
    this.owner = owner;
  }

  createComponent(
    ComponentClass: Constructor<GlimmerComponent>,
    args: Arguments
  ): GlimmerComponent {
    if (DEBUG) {
      ARGS_SET.set(args.named, true);
    }

    return new ComponentClass(this.owner, args.named);
  }

  getContext(component: GlimmerComponent): GlimmerComponent {
    return component;
  }

  destroyComponent(component: GlimmerComponent): void {
    if (component.isDestroying) {
      return;
    }

    component[IS_DESTROYING_KEY] = true;

    schedule('actions', component, component.willDestroy);
    schedule('destroy', this, scheduledDestroyComponent, component);
  }
}

interface EmberGlimmerComponentManager {
  updateComponent?: (component: GlimmerComponent, args: Arguments) => void;
}

export default EmberGlimmerComponentManager;
