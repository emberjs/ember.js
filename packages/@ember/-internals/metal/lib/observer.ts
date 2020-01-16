import { ENV } from '@ember/-internals/environment';
import { peekMeta } from '@ember/-internals/meta';
import { schedule } from '@ember/runloop';
import { combine, CURRENT_TAG, Tag, validate, value } from '@glimmer/validator';
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
const SYNC_OBSERVERS: Map<object, Map<string, ActiveObserver>> = new Map();
const ASYNC_OBSERVERS: Map<object, Map<string, ActiveObserver>> = new Map();

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
  }

  return observerMap.get(target)!;
}

export function activateObserver(target: object, eventName: string, sync = false) {
  let activeObservers = getOrCreateActiveObserversFor(target, sync);

  if (activeObservers.has(eventName)) {
    activeObservers.get(eventName)!.count++;
  } else {
    let [path] = eventName.split(':');
    let tag = combine(getChainTagsForKey(target, path));

    activeObservers.set(eventName, {
      count: 1,
      path,
      tag,
      lastRevision: value(tag),
      suspended: false,
    });
  }
}

export function deactivateObserver(target: object, eventName: string, sync = false) {
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
      observer.tag = combine(getChainTagsForKey(target, observer.path));
      observer.lastRevision = value(observer.tag);
    });
  }

  if (SYNC_OBSERVERS.has(target)) {
    SYNC_OBSERVERS.get(target)!.forEach(observer => {
      observer.tag = combine(getChainTagsForKey(target, observer.path));
      observer.lastRevision = value(observer.tag);
    });
  }
}

let lastKnownRevision = 0;

export function flushAsyncObservers(shouldSchedule = true) {
  if (lastKnownRevision === value(CURRENT_TAG)) {
    return;
  }

  lastKnownRevision = value(CURRENT_TAG);

  ASYNC_OBSERVERS.forEach((activeObservers, target) => {
    let meta = peekMeta(target);

    if (meta && (meta.isSourceDestroying() || meta.isMetaDestroyed())) {
      ASYNC_OBSERVERS.delete(target);
      return;
    }

    activeObservers.forEach((observer, eventName) => {
      if (!validate(observer.tag, observer.lastRevision)) {
        let sendObserver = () => {
          try {
            sendEvent(target, eventName, [target, observer.path]);
          } finally {
            observer.tag = combine(getChainTagsForKey(target, observer.path));
            observer.lastRevision = value(observer.tag);
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

    if (meta && (meta.isSourceDestroying() || meta.isMetaDestroyed())) {
      SYNC_OBSERVERS.delete(target);
      return;
    }

    activeObservers.forEach((observer, eventName) => {
      if (!observer.suspended && !validate(observer.tag, observer.lastRevision)) {
        try {
          observer.suspended = true;
          sendEvent(target, eventName, [target, observer.path]);
        } finally {
          observer.tag = combine(getChainTagsForKey(target, observer.path));
          observer.lastRevision = value(observer.tag);
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
