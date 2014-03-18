import {indexOf} from "ember-metal/array";
import run from "ember-metal/run_loop";

/**
@module ember
@submodule ember-views
*/

// Add a new named queue after the 'actions' queue (where RSVP promises
// resolve), which is used in router transitions to prevent unnecessary
// loading state entry if all context promises resolve on the 
// 'actions' queue first.

var queues = run.queues;
queues.splice(indexOf.call(queues, 'actions') + 1, 0, 'routerTransitions');
