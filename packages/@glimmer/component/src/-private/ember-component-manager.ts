import { destroy } from '@ember/destroyable';
import { capabilities } from '@ember/component';
import { scheduleDestroy, scheduleDestroyed } from '@glimmer/global-context';
import BaseComponentManager from './base-component-manager';

import { type default as GlimmerComponent, setDestroyed, setDestroying } from './component';
import type { Arguments } from '@glimmer/interfaces';

const CAPABILITIES = capabilities('3.13', {
  destructor: true,
  asyncLifecycleCallbacks: false,
  updateHook: false,
});

function invokeWillDestroy(component: GlimmerComponent): void {
  component.willDestroy();
}

function scheduledDestroyComponent(component: GlimmerComponent): void {
  if (component.isDestroyed) {
    return;
  }

  destroy(component);
  setDestroyed(component);
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

    setDestroying(component);

    // eslint-disable-next-line @typescript-eslint/no-unsafe-call -- global-context types are ambient here
    scheduleDestroy(component, invokeWillDestroy);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call -- global-context types are ambient here
    scheduleDestroyed(() => {
      scheduledDestroyComponent(component);
    });
  }
}

interface EmberGlimmerComponentManager {
  updateComponent?: (component: GlimmerComponent, args: Arguments) => void;
}

export default EmberGlimmerComponentManager;
