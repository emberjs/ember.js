/**
@module ember
@submodule ember-views
*/

// Add a new named queue for rendering views that happens
// after bindings have synced, and a queue for scheduling actions
// that that should occur after view rendering.
var queues = Ember.run.queues;
queues.splice(Ember.$.inArray('actions', queues)+1, 0, 'render', 'afterRender');
