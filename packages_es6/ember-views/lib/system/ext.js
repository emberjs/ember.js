/**
@module ember
@submodule ember-views
*/

import run from "ember-metal/run_loop";
import {indexOf} from "ember-metal/array";

// Add a new named queue for rendering views that happens
// after bindings have synced, and a queue for scheduling actions
// that that should occur after view rendering.
var queues = run.queues;

queues.splice(indexOf.call(queues, 'actions')+1, 0, 'render', 'afterRender');
