# Binding transforms

In Ember 1.0, binding transforms have been removed. This fork introduces a flag, `ENV.BINDING_TRANSFORMS`, with three allowed values:

 * `null` (the default) -- `Ember.Evented#fire` works per 0.9.8.1
 * `"warn"` -- Using binding transforms will warn
 * `"1.0"` -- Using binding transforms will throw

See [issue #7](https://github.com/zendesk/ember.js/issues/7) for more information.
