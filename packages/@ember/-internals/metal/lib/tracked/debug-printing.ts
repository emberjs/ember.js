import { TrackerSnapshot, TagSnapshot } from './debug-types';
import { hasBeenSet, hasChanged, getTrackingInfo } from './debug-utils';

export function prettyPrintTrackingInfo({ verbose = false, showInitial = true } = {}) {
  let history = getTrackingInfo().history;
  let revisions = Object.keys(history)
    .map(revision => parseInt(revision, 10))
    .sort((a, b) => a - b);

  let i;
  let currentRevision: number;
  let currentBatch: TrackerSnapshot[];
  let changedTag: TrackerSnapshot;

  for (i = 0; i < revisions.length; i++) {
    currentRevision = revisions[i];
    currentBatch = history[currentRevision] || [];

    if (!showInitial && `${currentRevision}` === '1') {
      continue;
    }

    // eslint-disable-next-line no-console
    console.log(`[Revision: ${currentRevision}]`, currentBatch);
    changedTag = currentBatch[0];

    currentBatch.forEach((tracker, idx: number) => {
      let { objectName, propertyName, objectId } = tracker.tag;

      let wasSet = hasBeenSet(tracker);

      if (wasSet) {
        // eslint-disable-next-line no-console
        console.log(`  #${idx}: ${propertyName} on ${objectName} (#${objectId}) has been set!`);
      } else {
        // eslint-disable-next-line no-console
        console.log(`  #${idx}: ${propertyName} on ${objectName} (#${objectId}) has changed!`);
      }

      printDependents(changedTag, tracker.dependencies, verbose);
    });
  }
}

function printDependents(
  rootTag: TrackerSnapshot,
  dependencies: TagSnapshot[],
  verbose: boolean,
  indent = 6
) {
  if (!dependencies || dependencies.length === 0) return;

  let indentation = ' '.repeat(indent);
  let verboseOverride = getTrackingInfo().verbose;

  dependencies.forEach(dependency => {
    let isChanged = rootTag.tag.lastChecked === dependency.revision;
    let isChangedProperty = isChanged;

    if (!verboseOverride) {
      if (!verbose && !isChangedProperty) {
        return;
      }
    }

    if (!dependency.objectRef && !dependency.propertyName) {
      // eslint-disable-next-line no-console
      console.log(`${indentation} Intermediate Tracking Tag @ rev: ${dependency.revision}`);
    } else {
      // eslint-disable-next-line no-console
      console.log(
        `${indentation}Dependency: ${dependency.propertyName} ` +
          `(rev: ${dependency.revision}) on ` +
          `${dependency.objectName} ` +
          `(#${dependency.objectId}) ` +
          `${isChangedProperty ? 'changed' : 'did not change'}`
      );
    }

    printDependents(rootTag, dependency.dependencies, verbose, indent + 2);
  });
}
