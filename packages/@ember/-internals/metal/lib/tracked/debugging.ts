import { Tag } from '@glimmer/reference';

import { Tracker } from './tracker';

import { StartOptions, DebugTracking, TrackerSnapshot, TagSnapshot } from './debug-types';
import { prettyPrintTrackingInfo } from './debug-printing';
import { getTrackingInfo, containsRelevantObject } from './debug-utils';

type Option<T> = T | null;

Ember.EMBER_DEBUG = {};
Ember.EMBER_DEBUG.TRACKING = {
  history: {},
  isRecording: false,
  verbose: false,
  objectMap: new WeakMap(),
  print: prettyPrintTrackingInfo,
  start({ watch = false, forObject, history = true, verbose = false }: StartOptions) {
    getTrackingInfo().history = {};
    getTrackingInfo().objectMap = new WeakMap();
    getTrackingInfo().isRecording = true;
    getTrackingInfo().isTrackingHistory = history;

    if (watch) {
      getTrackingInfo().isWatching = true;
    }

    if (forObject) {
      getTrackingInfo().objectOfRelevance = forObject;
    }

    if (verbose) {
      getTrackingInfo().verbose = true;
    }
  },
  stop() {
    getTrackingInfo().isRecording = false;
    getTrackingInfo().isWatching = false;
    getTrackingInfo().verbose = false;
    getTrackingInfo().objectOfRelevance = undefined;
    getTrackingInfo().objectMap = new WeakMap();
  },
} as DebugTracking;

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
export function debugTracker(current: Tracker, _parent: Option<Tracker>) {
  let { isRecording, isWatching, isTrackingHistory, objectOfRelevance } = getTrackingInfo();

  if (!isRecording) return;

  // In what scenarios would we get here with nothing on the tracker?
  if (!(current as any).last) return;

  // Convert the Tracker to an isolated moment in time
  // hack around tags being a private field
  let tags = Array.from((current as any).tags.values()) as Tag[];

  let trackerSnapshot = normalizeTags(tags);

  // if we're watching an object, and this snapshot does not
  // include the object we're watching, throw it all away!
  //
  // this is to help with performance of cpu / memory
  if (objectOfRelevance && !containsRelevantObject(trackerSnapshot)) return;

  let revision = `${trackerSnapshot.tag.revision}`;

  if (isTrackingHistory) {
    let currentBatch = getTrackingInfo().history[revision];
    let batch = currentBatch || [];

    batch.push(trackerSnapshot);

    Ember.EMBER_DEBUG.TRACKING.history[revision] = batch;
  } else {
    Ember.EMBER_DEBUG.TRACKING.history[revision] = [trackerSnapshot];
  }

  if (isWatching) {
    prettyPrintTrackingInfo();
  }
}

function normalizeTags(tags: any[]): TrackerSnapshot {
  let [tag, ...trackedDependents] = tags;

  let normalizedDependents = normalizeDependents(tag, trackedDependents);

  let normalizedTag = toTagSnapshot(tag);

  return {
    tag: normalizedTag,
    dependencies: normalizedDependents,
    all: tags,
  } as TrackerSnapshot;
}

function normalizeDependents(root: any, dependencies?: any) {
  let result: any[] = [];

  result = result.concat(dependencies);
  result = result.concat(root.subtag);
  result = result.concat(root.subtags);

  return result
    .flat()
    .filter((item?: Tag) => item) // filter out falsey
    .map(toTagSnapshot)
    .map((snapshot: TagSnapshot) => {
      let subDependents = normalizeDependents(snapshot.tag);

      snapshot.dependencies = subDependents;

      return snapshot;
    });
}

let objectId = 0;
function getOrAssignId(obj: object) {
  if (!obj) {
    return undefined;
  }

  let map = getTrackingInfo().objectMap;
  let id = map.get(obj);

  if (!id) {
    map.set(obj, ++objectId);
  }

  id = map.get(obj);

  return id;
}

function nameOf(obj: any) {
  return obj && obj.__proto__.constructor.name;
}

// the attributes we want live all over the place
function toTagSnapshot(tag: any): TagSnapshot {
  let kind = nameOf(tag);

  if (kind === 'TwoWayFlushDetectionTag') {
    let hostObject = tag.ref.propertyTag.subtag._object;
    let objectId = getOrAssignId(hostObject);
    let revision = Math.max(tag.ref.lastRevision, tag.ref.propertyTag.lastChecked);

    return {
      objectName: nameOf(hostObject),
      objectRef: hostObject,
      objectId: objectId || -1,
      propertyName: tag.key,
      revision,
      tag,
    } as TagSnapshot;
  } else if (kind === 'MonomorphicTagImpl') {
    let hostObject = tag._object;
    let objectId = getOrAssignId(hostObject);
    let revision = Math.max(tag.lastValue, tag.lastChecked);

    return {
      objectName: nameOf(hostObject),
      objectRef: hostObject,
      objectId: objectId || -1,
      propertyName: tag._propertyKey,
      revision,
      tag,
    } as TagSnapshot;
  }

  throw new Error(`tag: ${kind} not handled`);
}
