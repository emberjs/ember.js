import { Tag, UpdatableTag } from '@glimmer/reference';

import { Tracker } from './tracker';

type Option<T> = T | null;

interface DebugTracking {
  history: { [revision: number]: TrackerSnapshot[] };
}

interface TrackerSnapshot {
  tag: TagSnapshot;
  dependents: TagSnapshot[];
  all: TagSnapshot[];
}

interface TagSnapshot {
  propertyName: string;
  objectName: string;
  objectRef: object;
  tag: Tag | UpdatableTag;
}

Ember.EMBER_DEBUG = {};
Ember.EMBER_DEBUG.TRACKING = {
  history: [],
} as DebugTracking;

function getTrackingInfo(): DebugTracking {
  return Ember.EMBER_DEBUG.TRACKING;
}

function prettyPrintTrackingInfo() {
  let history = getTrackingInfo().history;
  let revisions = Object.keys(history)
    .map(revision => parseInt(revision, 10))
    .sort();

  let i;
  let currentRevision: number;
  let currentBatch: TrackerSnapshot[];
  let changedTag: TrackerSnapshot;

  for (i = 0; i < revisions.length; i++) {
    currentRevision = revisions[i];
    currentBatch = history[currentRevision] || [];

    // eslint-disable-next-line no-console
    console.log(`[Revision: ${currentRevision}]`, currentBatch);
    changedTag = currentBatch[0];

    currentBatch.forEach((tracker, idx: number) => {
      if (tracker.dependents.length === 0) {
        // eslint-disable-next-line no-console
        console.log(
          `  #${idx}: ${tracker.tag.propertyName} on ${tracker.tag.objectName} has been set!`
        );
      } else {
        // eslint-disable-next-line no-console
        console.log(
          `  #${idx}: ${tracker.tag.propertyName} on ${tracker.tag.objectName} has changed!`
        );

        tracker.dependents.forEach(dependent => {
          let isChangedProperty = changedTag.tag.propertyName === dependent.propertyName;

          // eslint-disable-next-line no-console
          console.log(
            `      Dependency: ${dependent.propertyName} (rev: ${(dependent.tag as any).revision}) on ${dependent.objectName} ` +
              `${isChangedProperty ? 'changed' : 'did not change'}`
          );
        });
      }
    });
  }
}

Ember.EMBER_DEBUG.TRACKING.print = prettyPrintTrackingInfo;

export function debugTracker(current: Tracker, _parent: Option<Tracker>) {
  // Put into "revision" buckets, based on "lastChecked"
  // (because the revision of a tag may not have changed if the value didn't changed
  //  but last-checked is the last revision to inspect it)
  let lastChecked = `${(current as any).last.lastChecked}`;

  // Convert the Tracker to an isolated moment in time
  // hack around tags being a private field
  let tags = Array.from((current as any).tags.values()) as Tag[];

  // NOTE: if a tag has subtags, it is computed
  // TODO: tests -- this is getting complicated
  let normalizedTags = tags.map(toTagSnapshot);
  let [trackedTag, ...trackedDependents] = normalizedTags;
  let dependents = trackedDependents || ((trackedTag.tag as any).subtags || []).map(toTagSnapshot);

  let trackerSnapshot = {
    tag: trackedTag,
    dependents,
    all: normalizedTags,
  } as TrackerSnapshot;

  let currentBatch = getTrackingInfo().history[lastChecked];
  let batch = currentBatch || [];

  batch.push(trackerSnapshot);

  Ember.EMBER_DEBUG.TRACKING.history[lastChecked] = batch;
}

function toTagSnapshot(tag: any): TagSnapshot {
  let hostObject = tag.key ? tag.ref.parentValue : tag._object;

  let result: Partial<TagSnapshot> = {
    objectName: hostObject && hostObject.__proto__.constructor.name,
    objectRef: hostObject,
    tag,
  };

  result.propertyName = tag.key || tag._propertyKey;

  return result as TagSnapshot;
}

// NOTE:
//  track is a wrapper around a tag
//    cosume is called on other tags
//
//  let tag = track(() => {
//    cosume(someTag);
//    cosume(someTagB);
//  })
//
//  dirty(someTag); // also invalidates 'tag';
export function debugConsume(_tracker: Tracker, _tag: Tag | UpdatableTag) {}
