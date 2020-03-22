import { MERGE } from '@ember/deprecated-features';
import { default as deprecatedMerge } from './lib/merge';

let merge = MERGE ? deprecatedMerge : undefined;

// Export `assignPolyfill` for testing
export { default as assign, assign as assignPolyfill } from './lib/assign';
export { default as _WeakSet } from './lib/weak_set';
export { merge };
