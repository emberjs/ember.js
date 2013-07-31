# Ember.ViewState

In Ember 1.0, `Ember.ViewState` has been removed. This fork introduces a flag,
`ENV.VIEW_STATE`, with three allowed values:

 * `null` (the default) -- `Ember.ViewState` works per 0.9.8.1
 * `"warn"` -- Calling `Ember.ViewState.extend` or `.create` will warn
 * `"1.0"` -- Calling `Ember.ViewState.extend` or `.create` will throw

See [issue #6](https://github.com/zendesk/ember.js/issues/6) for more information.

## Upgrade Guide

There is no replacement for `Ember.ViewState` in Ember 1.0. Some alternatives
include

 * creating a `ContainerView` that only ever has one child and having your
   states set their own view as its child
 * backporting or faking the `{{outlet}}` helper and having your states set
   their own view as the content of the outlet
