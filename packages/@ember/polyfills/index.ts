import { ASSIGN, MERGE } from '@ember/deprecated-features';
import { assign as assignPolyfill, default as deprecatedAssign } from './lib/assign';
import { default as deprecatedMerge } from './lib/merge';

let merge = MERGE ? deprecatedMerge : undefined;
let assign = ASSIGN ? deprecatedAssign : undefined;

// Export `assignPolyfill` for testing
export { assign, assignPolyfill };
export { merge };

export const hasPropertyAccessors = true;
