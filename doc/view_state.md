# Ember.ViewState

In Ember 1.0, `Ember.ViewState` has been removed. This fork introduces a flag, `ENV.VIEW_STATE`, with three allowed values:

 * `null` (the default) -- `Ember.ViewState` works per 0.9.8.1
 * `"warn"` -- Calling `extend` or `create` will warn
 * `"1.0"` -- Calling `extend` or `create` will throw

See [issue #6](https://github.com/zendesk/ember.js/issues/6) for more information.
