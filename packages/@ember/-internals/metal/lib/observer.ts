import { peekMeta } from '@ember/-internals/meta';
import { EMBER_METAL_TRACKED_PROPERTIES } from '@ember/canary-features';
import { schedule } from '@ember/runloop';
import { CURRENT_TAG, Tag } from '@glimmer/reference';
import { getChainTagsForKey } from './chain-tags';
import changeEvent from './change_event';
import { addListener, removeListener, sendEvent } from './events';
import { unwatch, watch } from './watching';

interface ActiveObserver {
  tag: Tag;
  path: string;
  lastRevision: number;
  count: number;
}

const ACTIVE_OBSERVERS: Map<object, Map<string, ActiveObserver>> = new Map();

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
  method: string | Function | undefined
): void {
  let eventName = changeEvent(path);

  addListener(obj, eventName, target, method);

  if (EMBER_METAL_TRACKED_PROPERTIES) {
    let meta = peekMeta(obj);

    if (meta === null || !(meta.isPrototypeMeta(obj) || meta.isInitializing())) {
      activateObserver(obj, eventName);
    }
  } else {
    watch(obj, path);
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
  method: string | Function | undefined
): void {
  let eventName = changeEvent(path);

  if (EMBER_METAL_TRACKED_PROPERTIES) {
    let meta = peekMeta(obj);

    if (meta === null || !(meta.isPrototypeMeta(obj) || meta.isInitializing())) {
      deactivateObserver(obj, eventName);
    }
  } else {
    unwatch(obj, path);
  }

  removeListener(obj, eventName, target, method);
}

function getOrCreateActiveObserversFor(target: object) {
  if (!ACTIVE_OBSERVERS.has(target)) {
    ACTIVE_OBSERVERS.set(target, new Map());
  }

  return ACTIVE_OBSERVERS.get(target)!;
}

export function activateObserver(target: object, eventName: string) {
  let activeObservers = getOrCreateActiveObserversFor(target);

  if (activeObservers.has(eventName)) {
    activeObservers.get(eventName)!.count++;
  } else {
    let [path] = eventName.split(':');
    let tag = getChainTagsForKey(target, path);

    activeObservers.set(eventName, {
      count: 1,
      path,
      tag,
      lastRevision: tag.value(),
    });
  }
}

export function deactivateObserver(target: object, eventName: string) {
  let activeObservers = ACTIVE_OBSERVERS.get(target);

  if (activeObservers !== undefined) {
    let observer = activeObservers.get(eventName)!;

    observer.count--;

    if (observer.count === 0) {
      activeObservers.delete(eventName);

      if (activeObservers.size === 0) {
        ACTIVE_OBSERVERS.delete(target);
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
  if (!ACTIVE_OBSERVERS.has(target)) {
    return;
  }

  ACTIVE_OBSERVERS.get(target)!.forEach(observer => {
    observer.tag = getChainTagsForKey(target, observer.path);
    observer.lastRevision = observer.tag.value();
  });
}

let lastKnownRevision = 0;

export function flushInvalidActiveObservers(shouldSchedule = true) {
  if (lastKnownRevision === CURRENT_TAG.value()) {
    return;
  }

  lastKnownRevision = CURRENT_TAG.value();

  ACTIVE_OBSERVERS.forEach((activeObservers, target) => {
    let meta = peekMeta(target);

    if (meta && (meta.isSourceDestroying() || meta.isMetaDestroyed())) {
      ACTIVE_OBSERVERS.delete(target);
      return;
    }

    activeObservers.forEach((observer, eventName) => {
      if (!observer.tag.validate(observer.lastRevision)) {
        let sendObserver = () => {
          try {
            sendEvent(target, eventName, [target, observer.path]);
          } finally {
            observer.tag = getChainTagsForKey(target, observer.path);
            observer.lastRevision = observer.tag.value();
          }
        };

        if (shouldSchedule) {
          schedule('actions', sendObserver);
        } else {
          // TODO: we need to schedule eagerly in exactly one location (_internalReset),
          // for query params. We should get rid of this ASAP
          sendObserver();
        }
      }
    });
  });
}
