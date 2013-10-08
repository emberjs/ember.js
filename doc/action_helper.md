# Action Helper

In Ember 0.9, `{{action "foo"}}` will pass a jQuery event object to `foo`. In Ember 1.0, it does not, but does allow passing other arguments. This fork introduces a flag, `ENV.ACTION_ARGUMENTS`, with three
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

If you do something more complicated with the `event`, you can use an event handler in the view. Thus,

### Before

```handlebars
<button {{action save}} {{bindAttr data-foo-id="id"}}>
```

```javascript
var MyView = Ember.View.extend({
  id: function() { ... }.property(),

  save: function(event) {
    doSomethingWith( $(event.target).data('foo-id') );
  }
});
```

### After

```handlebars
<button {{bindAttr data-foo-id="id"}}>
```

```javascript
var MyView = Ember.View.extend({
  id: function() { ... }.property(),
  
  click: function(event) {
    var $target = $(event.target);
    if ($target.is('button[data-foo-id]')) {
      doSomethingWith( $target.data('foo-id') );
      return false;
    }
  }
});
```
