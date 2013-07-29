# Accessors

In Ember 1.0, `get` works on property paths like `"foo.bar.baz"`; in Ember 0.9,
it does not. This fork introduces a flag, `ENV.ACCESSORS`, with three
allowed values:

 * `null` (the default) -- `get`, `set`, `getPath`, and `setPath` work per 0.9.8.1
 * `"0.9-dotted-properties"` -- `get` and `set` will warn if called with a property name
   containing a `.`
 * `"1.0"` -- `get` and `set` work with nested properties; `getPath` and `setPath`
   emit deprecation warnings

See [issue #1](https://github.com/zendesk/ember.js/issues/1) for more
information.
