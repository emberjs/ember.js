
import { run } from 'ember-metal';

// Add a new named queue for rendering views that happens
// after bindings have synced, and a queue for scheduling actions
// that should occur after view rendering.
run._addQueue('render', 'actions');
run._addQueue('afterRender', 'render');
