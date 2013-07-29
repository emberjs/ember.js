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
it does not. This fork introduces a flag, `ENV.DOTTED_PATH_METHODS`, with four
allowed values:

 * `"0.9"` (the default) -- `getPath` and `setPath` work normally
 * `"0.9+warn"` -- `getPath` and `setPath` emit a warning via `Ember.warn`
 * `"0.9+deprecate"` -- `getPath` and `setPath` emit a deprecation warning via
   `Ember.deprecate`
 * `"1.0"` -- `getPath` and `setPath` raise exceptions

Regardless of the value of the flag, `get` now works on both dotted- and
non-dotted paths, just as in 1.0.

See [issue #1](https://github.com/zendesk/ember.js/issues/1) for more
information.

## Transitions

 * [Ember.Object.create](doc/object_create.md)
