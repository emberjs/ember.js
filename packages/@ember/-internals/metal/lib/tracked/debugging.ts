import { Tag, UpdatableTag } from '@glimmer/reference';

import { Tracker } from './tracker';

type Option<T> = T | null;

Ember.EMBER_DEBUG = {};

interface TrackerHistory {
  property: string;
  value: any;
  tracker: Tracker;
}

interface DebugTracking {
  history: TrackerHistory[];
  stacks: Set<Tracker>;
}

interface TrackerSnapshot {
  tags: Array<Tag | UpdatableTag>;
}

interface TrackerProperty {
  propertyName: string;
  objectName: string;
  objectRef: object;
  tag: Tag | UpdatableTag;
}

Ember.EMBER_DEBUG.TRACKING = {
  history: [],
  stacks: new Set<Tracker>(),
} as DebugTracking;

function normalizeTrackerEntry(tag: any) {
  let hostObject = tag.key ? tag.ref.parentValue : tag._object;

  let result: Partial<TrackerProperty> = {
    objectName: hostObject && hostObject.__proto__.constructor.name,
    objectRef: hostObject,
    tag,
  };

  result.propertyName = tag.key || tag._propertyKey;

  return result;
}

function prettyPrintTrackingInfo() {
  let history = Ember.EMBER_DEBUG.TRACKING.history;

  // console.log(history, TAG_MAP);
  history.forEach((tracker: TrackerSnapshot, i: number) => {
    // tags seems to always be a touple
    // (property that changed, the source property)
    let values = tracker.tags;

    let first = values[0];
    let last = values[values.length - 1];

    console.log(
      '\t',
      i,
      normalizeTrackerEntry(first),
      'Because',
      normalizeTrackerEntry(last),
      'changed'
    );
  });
}

Ember.EMBER_DEBUG.TRACKING.print = prettyPrintTrackingInfo;

export function debugTracker(current: Tracker, parent: Option<Tracker>) {
  // Convert the Tracker to an isolated moment in time
  Ember.EMBER_DEBUG.TRACKING.history.push({
    // hack around tags being a private field
    tags: Array.from((current as any).tags.values()),
  });
}


export function debugConsume(tracker: Tracker, tag: Tag | UpdatableTag, target: any) {
  console.log('Consume started', tracker, tag);
}
