declare module '@ember/-internals/glimmer/lib/utils/managers' {
  import type { InternalOwner } from '@ember/-internals/owner';
  import type { ComponentManager } from '@glimmer/interfaces';
  import {
    componentCapabilities as glimmerComponentCapabilities,
    modifierCapabilities as glimmerModifierCapabilities,
  } from '@glimmer/manager';
  /**
       Associate a class with a component manager (an object that is responsible for
       coordinating the lifecycle events that occurs when invoking, rendering and
       re-rendering a component).

       @method setComponentManager
       @param {Function} factory a function to create the owner for an object
       @param {Object} obj the object to associate with the componetn manager
       @return {Object} the same object passed in
       @public
      */
  export function setComponentManager<T extends object>(
    manager: (owner: InternalOwner) => ComponentManager<unknown>,
    obj: T
  ): T;
  export let componentCapabilities: typeof glimmerComponentCapabilities;
  export let modifierCapabilities: typeof glimmerModifierCapabilities;
}
