import { Tag, CONSTANT_TAG, UpdatableTag } from '@glimmer/reference';

import { Tracker } from './tracker';

type Option<T> = T | null;

Ember.EMBER_DEBUG = {};

let TAG_MAP = new Map<Tag | UpdatableTag, any>();

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
  // it looks like there are two types of data on a tracker's tag list.
  // one type has the shape (which maybe isn't a tag?):
  //   key: string
  //   ref: object
  //   tag: object
  // the other is an actual Tag,
  //   but with a private secret property _propertyName

  let hostObject = TAG_MAP.get(tag);

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

  console.log(history, TAG_MAP);
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

  console.log('[ track event ] current:', current, 'parent:', parent);
  // Ember.EMBER_DEBUG.TRACKING.print();
}


export function debugConsume(tracker: Tracker, tag: Tag | UpdatableTag, target: any) {
  if (!TAG_MAP.has(tag)) {
    TAG_MAP.set(tag, target);
  }
  console.log(TAG_MAP, tracker, tag === CONSTANT_TAG);


  // If trackers keep getting added, how do they get cleaned up?
  // seems like this list grows forever if I were to keep changing values.
  // I would have thought that trackers would be re-used? idk.
  //
  // Ember.EMBER_DEBUG.TRACKING.stacks.add(tracker);
  // console.log('property consumed. Stacks:', Ember.EMBER_DEBUG.TRACKING.stacks);
}
