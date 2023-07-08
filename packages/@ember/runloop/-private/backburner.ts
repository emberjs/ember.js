// This exists solely to provide a compatibility shim for `ember-test-helpers`
// as part of the transition off of DefinitelyTyped. Long-term, this should be
// structured differently:
//
// 1. `backburner.js` should provide actual public types for things which are
//    actually part of its public contract: these are currently used in key
//    areas as "intimate" API.
// 2. `ember-test-helpers` should use the types from `backburner.js` directly,
//    rather than relying on Ember's re-export.

import type Backburner from 'backburner.js';
export type { Backburner };
export type DebugInfo = ReturnType<Backburner['getDebugInfo']>;

export { IQueueItem as QueueItem } from 'backburner.js/dist/backburner/interfaces';
export { DeferredActionQueues } from 'backburner.js';
