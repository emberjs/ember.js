import { TrackerSnapshot, TagSnapshot, DebugTracking } from './debug-types';

export function containsRelevantObject(trackerSnapshot: TrackerSnapshot): boolean {
  let obj = getTrackingInfo().objectOfRelevance;

  function isRelevant(tag: TagSnapshot): boolean {
    if (tag.objectRef === obj) {
      return true;
    }

    for (let dep of tag.dependencies || []) {
      if (isRelevant(dep)) {
        return true;
      }
    }

    return false;
  }

  for (let tag of trackerSnapshot.all) {
    if (isRelevant(tag)) {
      return true;
    }
  }

  return false;
}

export function getTrackingInfo(): DebugTracking {
  return Ember.EMBER_DEBUG.TRACKING;
}

export function hasBeenSet(tracker: TrackerSnapshot) {
  return tracker.dependencies.length === 0;
}

export function hasChanged(rootTag: TrackerSnapshot, dependencies: TagSnapshot[]): boolean {
  if (!dependencies || dependencies.length === 0) return false;

  for (let i = 0; i < dependencies.length; i++) {
    let dependency = dependencies[i];
    let isChangedProperty = rootTag.tag.propertyName === dependency.propertyName;

    if (isChangedProperty) {
      return true;
    }

    return hasChanged(rootTag, dependency.dependencies);
  }

  return false;
}

