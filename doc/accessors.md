# Accessors

In Ember 1.0, `get` works on property paths like `"foo.bar.baz"`; in Ember 0.9,
it does not. This fork introduces a flag, `ENV.ACCESSORS`, with three
allowed values:

 * `null` (the default) -- `get`, `set`, `getPath`, and `setPath` work per 0.9.8.1
 * `"0.9-dotted-properties"` -- `get` and `set` will warn if called with a property name
   containing a `.`
 * `"1.0-no-warn"` -- `get` and `set` work with nested properties; `getPath`
   and `setPath` do not emit deprecation warnings
 * `"1.0"` -- `get` and `set` work with nested properties; `getPath` and `setPath`
   emit deprecation warnings

See [issue #1](https://github.com/zendesk/ember.js/issues/1) for more
information.

## Upgrade Guide

First, ensure you don't have any properties that have dots in them. To do this,
set `ENV.ACCESSORS` to `"0.9-dotted-properties"`. This will warn you if you do
use `get` or `set` to access a property that has a dot in its name:

```javascript
var pam = Ember.Object.create({
  "my.name": function() {
    return 'Pam';
  }.property()
});
pam.get('my.name');
```

Ember 1.0's `get` won't work with those properties. Change `"my.name"` to
`myName` or `my-name`.

After you have eliminated any single properties with dots, you can upgrade to
Ember 1.0 behavior by setting `ENV.ACCESSORS` to `"1.0"`. This will tell you
to use `get` instead of `getPath` in the following case:

```javascript
var pam = Ember.Object.create({
  address: Ember.Object.create({
    street: '503 Oxford Ln.'
  });
});
pam.getPath('address.street');
```

Simply change `getPath` to `get` and `setPath` to `set` in these cases.

If your application is large and you can't change all `getPath` and `setPath`
calls in one commit, you can alternate between `"1.0"` and `"1.0-no-warn"`
to gradually eliminate deprecated usage.
