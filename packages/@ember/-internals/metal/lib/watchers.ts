import type { schedule } from '@ember/runloop';
import { registerDestructor } from '@glimmer/destroyable';
import type { Tag } from '@glimmer/interfaces';
import { track } from '@glimmer/validator/lib/tracking';
import { CURRENT_TAG, validateTag, valueForTag } from '@glimmer/validator/lib/validators';
import { flushAsyncObservers } from './observer';
import { get } from './property_get';

interface Watcher {
  onChange: () => void;
  tag: Tag;
  revision: number;
}

const WATCHERS: Map<object, Map<string, Watcher>> = new Map();

let lastKnownRevision = 0;

function trackProperty(watcher: Watcher, target: object, path: string) {
  watcher.tag = track(() => get(target, path));
  watcher.revision = valueForTag(watcher.tag);
}

/**
  Runs `onChange` after `path` of `target` changes, at the same points of the
  run loop as an async observer. The `path` can be anything that `get` reads,
  so a getter is watched through the tracked state that it uses.

  It replaces observers in builds with the `EMBER_DROP_CLASSIC_FEATURES` flag.

  @private
*/
export function watchProperty(target: object, path: string, onChange: () => void) {
  let watchers = WATCHERS.get(target);

  if (watchers === undefined) {
    watchers = new Map();
    WATCHERS.set(target, watchers);
    registerDestructor(target, () => WATCHERS.delete(target), true);
  }

  if (!watchers.has(path)) {
    let watcher = { onChange } as Watcher;

    trackProperty(watcher, target, path);
    watchers.set(path, watcher);
  }
}

function flushWatchers(_schedule: typeof schedule | false) {
  let currentRevision = valueForTag(CURRENT_TAG);

  if (lastKnownRevision === currentRevision) {
    return;
  }

  lastKnownRevision = currentRevision;

  WATCHERS.forEach((watchers, target) => {
    watchers.forEach((watcher, path) => {
      if (!validateTag(watcher.tag, watcher.revision)) {
        let notify = () => {
          try {
            watcher.onChange();
          } finally {
            trackProperty(watcher, target, path);
          }
        };

        if (_schedule) {
          _schedule('actions', notify);
        } else {
          notify();
        }
      }
    });
  });
}

/**
  The run loop calls this before it renders and when it ends. Pass `false` to
  run the callbacks now.
*/
export const flushChanges = import.meta.env?.EMBER_DROP_CLASSIC_FEATURES
  ? flushWatchers
  : flushAsyncObservers;
