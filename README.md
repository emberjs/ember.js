# zendesk/ember.js

This is a non-hostile fork of
[emberjs/ember.js](https://github.com/emberjs/ember.js)

## Purpose

The purpose of this fork is to provide an upgrade path from Ember 0.9 to 1.0.

This project will collect a list of incompatibilities between Ember 0.9 and
1.0 and seek to build a transition path for each one. It will *not* add
functionality to Ember 0.9 other than what is already in 1.0 and s necessary
for making the upgrade.

## Method

The general philosophy of `zendesk/ember.js` is to backport behavior and let
apps set flags to help them diagnose how much they have left to do in the
upgrade. Over time, they will "ratchet up" the value of the flags to make their
app more and more Ember-1.0-compatible.

## `get` and `getPath`

In Ember 1.0, `get` works on property paths like `"foo.bar.baz"`; in Ember 0.9,
it does not. This fork introduces a flag, `ENV.DOTTED_GETS`, with four
allowed values:

 * `"0.9"` (the default) -- `getPath` works normally
 * `"0.9+warn"` -- `getPath` emits a warning via `Ember.warn`
 * `"0.9+deprecate"` -- `getPath` emits a deprecation warning via
   `Ember.deprecate`
 * `"1.0"` -- `getPath` raises an exception

Regardless of the value of the flag, `get` now works on both dotted- and
non-dotted paths, just as in 1.0.

## `Ember.Object.create`

This backports the `create` and `createWithMixins` functionality from Ember 1.0
to Ember 0.9. In Ember 0.9.8.1, the following is perfectly valid:

```javascript
Ember.Object.create(Ember.Mixin.create(), {
  someProperty: function() { return 'some value'; }.property(),
  someFunction: function() { return this._super(); }
});
```

In Ember 1.0, that same code throws three exceptions:

 * Ember.Object.create no longer supports mixing in other definitions, use createWithMixins instead.
 * mber.Object.create no longer supports defining computed properties.
 * Ember.Object.create no longer supports defining methods that call _super.

This helps those migrating from Ember 0.9 to 1.0 by backporting the new
behavior, conditional on a flag, `ENV.CREATE_WITH_MIXINS`, which
has four possible values:

 * `"0.9"` (the default): Ember 0.9.8.1 compatibility; `Ember.Object.create`
   accepts `Ember.Mixin`s and `Object`s that contain
   `Ember.ComputedProperty`s or `Function`s that call `_super`.
 * `"0.9+warn"`: Ember 0.9.8.1 compatibility with warnings.
 * `"0.9+deprecate"`: Ember 0.9.8.1 compatibility with deprecation warnings
   (errors if `ENV.RAISE_ON_DEPRECATION` is `true`)
 * `"1.0"`: Ember 1.0 compatibility; `Ember.Obect.create` will throw an
   exception if passed an `Ember.Mixin` or an object that contains an
   `Ember.ComputedProperty` or `Function` that calls `_super`.
