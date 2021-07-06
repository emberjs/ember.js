import { MERGE, ASSIGN } from '@ember/deprecated-features';
import { default as deprecatedMerge } from './lib/merge';
import { default as deprecatedAssign, assign as assignPolyfill } from './lib/assign';

let merge = MERGE ? deprecatedMerge : undefined;
let assign = ASSIGN ? deprecatedAssign : undefined;

// Export `assignPolyfill` for testing
export { assign, assignPolyfill };
export { merge };

export const hasPropertyAccessors = true;
