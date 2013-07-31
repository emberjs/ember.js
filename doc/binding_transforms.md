# Binding transforms

In Ember 1.0, binding transforms have been removed. This fork introduces a flag,
`ENV.BINDING_TRANSFORMS`, with three allowed values:

 * `null` (the default) -- `Ember.Evented#fire` works per 0.9.8.1
 * `"warn"` -- Using binding transforms will warn
 * `"1.0"` -- Using binding transforms will throw

See [issue #7](https://github.com/zendesk/ember.js/issues/7) for more information.

## Upgrade Guide

Setting `ENV.BINDING_TRANSFORMS` to `"warn"` will tell you where your app uses
code like

```javascript
Ember.Object.extend({
  notes: null,
  hasNotesBinding: Ember.Binding.oneWay('notes.length').bool()
});
```

You will have to change those uses to Computed Properties. If you are using
the [Ember 0.9 branch of Ember-CPM](https://github.com/jamesarosen/ember-cpm/tree/ember_09)
or have otherwise backported Computed Property macros from Ember 1.0, you can
replace the above code with

```javascript
Ember.Object.extend({
  notes: null,
  hasNotes: Ember.computed.bool('notes.length')
});
```

If you haven't backported the Computed Property macros, you'll have to use the
long form:

```javascript
Ember.Object.extend({
  notes: null,
  hasNotes: function() {
    return !!this.getPath('notes.length');
  }.property('notes.length').cacheable()
});
```

Once you have eliminated all warnings, you can set `ENV.BINDING_TRANSFORMS` to
`"1.0"`, which will raise an exception if your app tries to use Binding
transforms.
