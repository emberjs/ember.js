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
 * `"error"`: Ember 1.0 compatibility; `Ember.Object.create` will throw an
   exception if passed an `Ember.Mixin` or an object that contains an
   `Ember.ComputedProperty` or `Function` that calls `_super`.

See [issue #2](https://github.com/zendesk/ember.js/issues/2) for more
information.
