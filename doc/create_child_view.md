# createChildView

In Ember 0.9, `Ember.View#createChildView` calls

```javascript
view = view.create(coreAttrs, attrs);
```

In Ember 1.0, it merges those "core" attributes into `attrs` and calls
`create` with a single argument.

Thus, if your `itemViewClass` class *expects* multiple arguments, it will cease
to work in Ember 1.0.

## Upgrade Guide

Setting `ENV.CREATE_CHILD_VIEW` to `"warn"` will tell you where your app has
child view classes that look like

```javascript
MyChildView = Ember.View.extend({
  ...
}).reopenClass({
  create: function(coreAttrs, attrs) {
    this._super(coreAttrs, attrs);

    doSomethingWith(coreAttrs._parentView);
    doSomethingElseWith(coreAttrs.templateData);
  }
});
```

At the `"warn"` level, those constructors will continue to receive two
arguments, though the first one will be the union of the two. Identify the
constructors that expect two arguments and change them to expect all attributes
in a single, merged hash.

After you have eliminated all warnings, you can set `ENV.CREATE_CHILD_VIEW` to
`"1.0"`, which will cause `Ember.View#createChildView` to throw an exception
(via `Ember.assert`) if your view constructor expects multiple arguments.
