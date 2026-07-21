/*
  Build-level replacement for `classic-detect.ts` in variants without the
  classic object model: nothing is a classic class or instance.
*/

export function isClassicClass(_item: unknown): boolean {
  return false;
}

export function isClassicInstance(_item: unknown): boolean {
  return false;
}
