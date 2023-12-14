declare module '@ember/-internals/metal/lib/observer' {
  import type { Tag } from '@glimmer/validator';
  interface ActiveObserver {
    tag: Tag;
    path: string;
    lastRevision: number;
    count: number;
    suspended: boolean;
  }
  export const SYNC_OBSERVERS: Map<object, Map<string, ActiveObserver>>;
  export const ASYNC_OBSERVERS: Map<object, Map<string, ActiveObserver>>;
  /**
    @module @ember/object
    */
  /**
      @method addObserver
      @static
      @for @ember/object/observers
      @param obj
      @param {String} path
      @param {Object|Function} target
      @param {Function|String} [method]
      @public
    */
  export function addObserver(
    obj: any,
    path: string,
    target: object | Function | null,
    method?: string | Function,
    sync?: boolean
  ): void;
  /**
      @method removeObserver
      @static
      @for @ember/object/observers
      @param obj
      @param {String} path
      @param {Object|Function} target
      @param {Function|String} [method]
      @public
    */
  export function removeObserver(
    obj: any,
    path: string,
    target: object | Function | null,
    method?: string | Function,
    sync?: boolean
  ): void;
  export function activateObserver(target: object, eventName: string, sync?: boolean): void;
  export function deactivateObserver(target: object, eventName: string, sync?: boolean): void;
  export function suspendedObserverDeactivation(): void;
  export function resumeObserverDeactivation(): void;
  /**
   * Primarily used for cases where we are redefining a class, e.g. mixins/reopen
   * being applied later. Revalidates all the observers, resetting their tags.
   *
   * @private
   * @param target
   */
  export function revalidateObservers(target: object): void;
  export function flushAsyncObservers(shouldSchedule?: boolean): void;
  export function flushSyncObservers(): void;
  export function setObserverSuspended(target: object, property: string, suspended: boolean): void;
  export function destroyObservers(target: object): void;
  export {};
}
