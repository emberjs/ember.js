import { getCurrentTracker, setCurrentTracker } from '../..';

/**
  Creates an autotrack stack so we can test field changes as they flow through
  getters/setters, and through the system overall

  @private
*/
export function track(fn) {
  let parent = getCurrentTracker();
  let tracker = setCurrentTracker();

  fn();

  setCurrentTracker(parent);
  return tracker.combine();
}
