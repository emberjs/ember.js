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

## Transitions

 * [Accessors](doc/accessors.md)
 * [Action Helper arguments](doc/action_helper.md#event-argument)
 * [Action Helper via Send](doc/action_helper.md#via-send)
 * [Ember.Object.create](doc/object_create.md)
 * [Ember.ViewState](doc/view_state.md)
 * [Ember.Evented#fire](doc/evented_fire.md)
 * [Binding transforms](doc/binding_transforms.md)
 * [View Preserves Context](doc/view_preserves_context.md)
