import { destroy } from '@ember/destroyable';
import { capabilities } from '@ember/component';
import { schedule } from '@ember/runloop';
import BaseComponentManager from './base-component-manager';

import { type default as GlimmerComponent, IS_DESTROYING_KEY, IS_DESTROYED_KEY } from './component';
import type { Arguments } from '@glimmer/interfaces';

const CAPABILITIES = capabilities('3.13', {
  destructor: true,
  asyncLifecycleCallbacks: false,
  updateHook: false,
});

function scheduledDestroyComponent(component: GlimmerComponent): void {
  if (component.isDestroyed) {
    return;
  }

  destroy(component);
  component[IS_DESTROYED_KEY] = true;
}

/**
 * This component manager runs in Ember.js environments and extends the base component manager to:
 *
 * 1. Properly destroy the component's associated `meta` data structure
 * 2. Schedule destruction using Ember's runloop
 */
class EmberGlimmerComponentManager extends BaseComponentManager<GlimmerComponent> {
  capabilities = CAPABILITIES;

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
