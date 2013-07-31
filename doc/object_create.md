# `Ember.Object.create`

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
 * Ember.Object.create no longer supports defining computed properties.
 * Ember.Object.create no longer supports defining methods that call _super.

This helps those migrating from Ember 0.9 to 1.0 by backporting the new
behavior, conditional on a flag, `ENV.CREATE_WITH_MIXINS`, which
has four possible values:

 * `null` (the default): Ember 0.9.8.1 compatibility; `Ember.Object.create`
   accepts `Ember.Mixin`s and `Object`s that contain
   `Ember.ComputedProperty`s or `Function`s that call `_super`.
 * `"warn"`: Ember 0.9.8.1 compatibility with warnings.
 * `"1.0"`: Ember 1.0 compatibility; `Ember.Object.create` will throw an
   exception if passed an `Ember.Mixin` or an object that contains an
   `Ember.ComputedProperty` or `Function` that calls `_super`.

See [issue #2](https://github.com/zendesk/ember.js/issues/2) for more
information.

## Upgrade Guide

If your app passes mixins, computed properties, or functions that call
`_super` directly to `.create()`, you can make it Ember-1.0-compatible in one
of two ways:

 1. Change `.create(...)` to `.createWithMixins(...)`.
 1. Create subclasses with `.extend(...)` and then instantiate the subclasses.

That is, either of the following are fine in Ember 1.0:

```javascript
Ember.Object.createWithMixins( Ember.Mixin.create() );
```

```javascript
Ember.Object.extend( Ember.Mixin.create() ).create();
```
