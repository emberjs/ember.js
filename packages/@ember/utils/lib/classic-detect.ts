import CoreObject from '@ember/object/core';

/*
  `typeOf`'s detection of classic classes and instances, isolated so builds
  without the classic object model can swap it (see `classic-detect-modern.ts`)
  instead of pulling `CoreObject` into their module graph.
*/

export function isClassicClass(item: unknown): boolean {
  return CoreObject.detect(item);
}

export function isClassicInstance(item: unknown): boolean {
  return item instanceof CoreObject;
}
