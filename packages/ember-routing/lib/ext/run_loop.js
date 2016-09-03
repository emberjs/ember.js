import { run } from 'ember-metal';

/**
@module ember
@submodule ember-views
*/

// Add a new named queue after the 'actions' queue (where RSVP promises
// resolve), which is used in router transitions to prevent unnecessary
// loading state entry if all context promises resolve on the
// 'actions' queue first.
run._addQueue('routerTransitions', 'actions');
