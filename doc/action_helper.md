# Action Helper

In Ember 0.9, `{{action "foo"}}` will pass a jQuery event object too `foo`. In Ember 1.0, it does not, but does allow passing other arguments. This fork introduces a flag, `ENV.ACTION_ARGUMENTS`, with three
allowed values:

 * `null` (the default) -- `{{action "foo"}}` calls `foo(event)`
 * `"warn"` -- `{{action "foo"}}` calls `foo(event)` and warns if `foo` expects arguments
 * `"1.0-compat"` -- `{{action "foo"}}` calls `foo()` and raises if `foo` expects arguments. Note that this is not the *full* Ember 1.0 behavior, as it does *not* pass additional arguments.

See [issue #12](https://github.com/zendesk/ember.js/issues/12) for more
information.

## Upgrade Guide

If you have code that looks like this:

```handlebars
{{action "destroy"}}
```

```javascript
destroy: function(event) {
  event.preventDefault();
}
```

You can change the event handler to

```javascript
destroy: function() {
  return false;
}
```

If you do something more complicated with the `event`, you might have to move
that data into the view or controller. In Ember 1.0, you will be able to pass
it to the action, but this version of the action helper doesn't backport that
behavior.
