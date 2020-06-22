import { ENV } from '@ember/-internals/environment';
import { peekMeta } from '@ember/-internals/meta';
import { schedule } from '@ember/runloop';
import { registerDestructor } from '@glimmer/runtime';
import { combine, CURRENT_TAG, Tag, validateTag, valueForTag } from '@glimmer/validator';
import { getChainTagsForKey } from './chain-tags';
import changeEvent from './change_event';
import { addListener, removeListener, sendEvent } from './events';

interface ActiveObserver {
  tag: Tag;
  path: string;
  lastRevision: number;
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
    let [path] = eventName.split(':');
    let tag = combine(getChainTagsForKey(target, path, true));

    activeObservers.set(eventName, {
      count: 1,
      path,
      tag,
      lastRevision: valueForTag(tag),
      suspended: false,
    });
  }
}

let DEACTIVATE_SUSPENDED = false;
let SCHEDULED_DEACTIVATE: [object, string, boolean][] = [];

export function deactivateObserver(target: object, eventName: string, sync = false) {
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
    ASYNC_OBSERVERS.get(target)!.forEach(observer => {
      observer.tag = combine(getChainTagsForKey(target, observer.path, true));
      observer.lastRevision = valueForTag(observer.tag);
    });
  }

  if (SYNC_OBSERVERS.has(target)) {
    SYNC_OBSERVERS.get(target)!.forEach(observer => {
      observer.tag = combine(getChainTagsForKey(target, observer.path, true));
      observer.lastRevision = valueForTag(observer.tag);
    });
  }
}

let lastKnownRevision = 0;

export function flushAsyncObservers(shouldSchedule = true) {
  let currentRevision = valueForTag(CURRENT_TAG);
  if (lastKnownRevision === currentRevision) {
    return;
  }
  lastKnownRevision = currentRevision;

  ASYNC_OBSERVERS.forEach((activeObservers, target) => {
    let meta = peekMeta(target);

    activeObservers.forEach((observer, eventName) => {
      if (!validateTag(observer.tag, observer.lastRevision)) {
        let sendObserver = () => {
          try {
            sendEvent(target, eventName, [target, observer.path], undefined, meta);
          } finally {
            observer.tag = combine(getChainTagsForKey(target, observer.path, true));
            observer.lastRevision = valueForTag(observer.tag);
          }
        };

        if (shouldSchedule) {
          schedule('actions', sendObserver);
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
      if (!observer.suspended && !validateTag(observer.tag, observer.lastRevision)) {
        try {
          observer.suspended = true;
          sendEvent(target, eventName, [target, observer.path], undefined, meta);
        } finally {
          observer.tag = combine(getChainTagsForKey(target, observer.path, true));
          observer.lastRevision = valueForTag(observer.tag);
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

export function destroyObservers(target: object) {
  if (SYNC_OBSERVERS.size > 0) SYNC_OBSERVERS.delete(target);
  if (ASYNC_OBSERVERS.size > 0) ASYNC_OBSERVERS.delete(target);
}
