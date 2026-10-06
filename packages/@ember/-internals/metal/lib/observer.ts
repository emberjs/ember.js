import { ENV } from '@ember/-internals/environment/lib/env';
import { peekMeta } from '@ember/-internals/meta/lib/meta';
import type { schedule } from '@ember/runloop';
import { registerDestructor } from '@glimmer/destroyable';
import {
  createFrame,
  disposeFrame,
  isFrameStale,
  watchTag,
  writeCount,
} from '@glimmer/signals/lib/tags';
import type { TagNode } from '@glimmer/signals/lib/tags';
import { tagMetaFor } from '@glimmer/signals/lib/meta';
import { getChainTagsForKey } from './chain-tags';
import changeEvent from './change_event';
import { addListener, removeListener, sendEvent } from './events';

interface ActiveObserver {
  /**
   * The subscriber for the tags of `path`. It is stale after a write to one of them.
   */
  watch: TagNode;
  path: string;
  count: number;
  suspended: boolean;
}

const SYNC_DEFAULT = !ENV._DEFAULT_ASYNC_OBSERVERS;
export const SYNC_OBSERVERS: Map<object, Map<string, ActiveObserver>> = new Map();
export const ASYNC_OBSERVERS: Map<object, Map<string, ActiveObserver>> = new Map();

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
  sync = SYNC_DEFAULT
): void {
  let eventName = changeEvent(path);

  addListener(obj, eventName, target, method, false, sync);

  let meta = peekMeta(obj);

  if (meta === null || !(meta.isPrototypeMeta(obj) || meta.isInitializing())) {
    activateObserver(obj, eventName, sync);
  }
}

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
  sync = SYNC_DEFAULT
): void {
  let eventName = changeEvent(path);

  let meta = peekMeta(obj);

  if (meta === null || !(meta.isPrototypeMeta(obj) || meta.isInitializing())) {
    deactivateObserver(obj, eventName, sync);
  }

  removeListener(obj, eventName, target, method);
}

function getOrCreateActiveObserversFor(target: object, sync: boolean) {
  let observerMap = sync === true ? SYNC_OBSERVERS : ASYNC_OBSERVERS;

  if (!observerMap.has(target)) {
    observerMap.set(target, new Map());
    registerDestructor(target, () => destroyObservers(target), true);
  }

  return observerMap.get(target)!;
}

export function activateObserver(target: object, eventName: string, sync = false) {
  let activeObservers = getOrCreateActiveObserversFor(target, sync);

  if (activeObservers.has(eventName)) {
    activeObservers.get(eventName)!.count++;
  } else {
    let path = eventName.substring(0, eventName.lastIndexOf(':'));
    let observer = { count: 1, path, watch: createFrame(), suspended: false };

    rewatch(target, observer);
    activeObservers.set(eventName, observer);
  }
}

let DEACTIVATE_SUSPENDED = false;
let SCHEDULED_DEACTIVATE: [object, string, boolean][] = [];

function deactivateObserver(target: object, eventName: string, sync = false) {
  if (DEACTIVATE_SUSPENDED === true) {
    SCHEDULED_DEACTIVATE.push([target, eventName, sync]);
    return;
  }

  let observerMap = sync === true ? SYNC_OBSERVERS : ASYNC_OBSERVERS;

  let activeObservers = observerMap.get(target);

  if (activeObservers !== undefined) {
    let observer = activeObservers.get(eventName)!;

    observer.count--;

    if (observer.count === 0) {
      disposeFrame(observer.watch);
      activeObservers.delete(eventName);

      if (activeObservers.size === 0) {
        observerMap.delete(target);
      }
    }
  }
}

export function suspendedObserverDeactivation() {
  DEACTIVATE_SUSPENDED = true;
}

export function resumeObserverDeactivation() {
  DEACTIVATE_SUSPENDED = false;

  for (let [target, eventName, sync] of SCHEDULED_DEACTIVATE) {
    deactivateObserver(target, eventName, sync);
  }

  SCHEDULED_DEACTIVATE = [];
}

/**
 * Primarily used for cases where we are redefining a class, e.g. mixins/reopen
 * being applied later. Revalidates all the observers, resetting their tags.
 *
 * @private
 * @param target
 */
export function revalidateObservers(target: object) {
  if (ASYNC_OBSERVERS.has(target)) {
    ASYNC_OBSERVERS.get(target)!.forEach((observer) => {
      rewatch(target, observer);
    });
  }

  if (SYNC_OBSERVERS.has(target)) {
    SYNC_OBSERVERS.get(target)!.forEach((observer) => {
      rewatch(target, observer);
    });
  }
}

let lastKnownWrites = 0;

export function flushAsyncObservers(_schedule: typeof schedule | false) {
  let writes = writeCount();
  if (lastKnownWrites === writes) {
    return;
  }
  lastKnownWrites = writes;

  ASYNC_OBSERVERS.forEach((activeObservers, target) => {
    let meta = peekMeta(target);

    activeObservers.forEach((observer, eventName) => {
      if (isFrameStale(observer.watch)) {
        let sendObserver = () => {
          try {
            sendEvent(target, eventName, [target, observer.path], undefined, meta);
          } finally {
            rewatch(target, observer);
          }
        };

        if (_schedule) {
          _schedule('actions', sendObserver);
        } else {
          sendObserver();
        }
      }
    });
  });
}

export function flushSyncObservers() {
  // When flushing synchronous observers, we know that something has changed (we
  // only do this during a notifyPropertyChange), so there's no reason to check
  // a global revision.

  SYNC_OBSERVERS.forEach((activeObservers, target) => {
    let meta = peekMeta(target);

    activeObservers.forEach((observer, eventName) => {
      if (!observer.suspended && isFrameStale(observer.watch)) {
        try {
          observer.suspended = true;
          sendEvent(target, eventName, [target, observer.path], undefined, meta);
        } finally {
          rewatch(target, observer);
          observer.suspended = false;
        }
      }
    });
  });
}

export function setObserverSuspended(target: object, property: string, suspended: boolean) {
  let activeObservers = SYNC_OBSERVERS.get(target);

  if (!activeObservers) {
    return;
  }

  let observer = activeObservers.get(changeEvent(property));

  if (observer) {
    observer.suspended = suspended;
  }
}

function rewatch(target: object, observer: ActiveObserver) {
  watchTag(
    observer.watch,
    getChainTagsForKey(target, observer.path, tagMetaFor(target), peekMeta(target))
  );
}

function destroyObservers(target: object) {
  SYNC_OBSERVERS.get(target)?.forEach(disposeWatch);
  ASYNC_OBSERVERS.get(target)?.forEach(disposeWatch);

  if (SYNC_OBSERVERS.size > 0) SYNC_OBSERVERS.delete(target);
  if (ASYNC_OBSERVERS.size > 0) ASYNC_OBSERVERS.delete(target);
}

function disposeWatch(observer: ActiveObserver) {
  disposeFrame(observer.watch);
}
