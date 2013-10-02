# View Preserves Context

In Ember 0.9.7.1, the context for a view's template is the view itself.

In Ember 1.0, it is the parent view's context, which, if you follow it all the
way up the chain, is usually a controller.

Ember 0.9.8.1 introduced a global flag, `VIEW_PRESERVES_CONTEXT`, which allows
application developers to select which behavior they want. Unfortunately, a
global flag is often insufficient for large applications, which cannot upgrade
all at once.

Ember 0.9.9 adds support for view classes to define a class-level
`preservesContext` property that overrides the flag. It also adds a new value
for the flag, "warn", which will warn for any view that *doesn't* declare that
it preserves context. If `VIEW_PRESERVES_CONTEXT` is `true`, it cannot be
overridden.

## Summary

| `VIEW_PRESERVES_CONTEXT` | `preservesContext` | preserves context? | extra  |
|--------------------------|--------------------|--------------------|--------|
| `false`                  | `undefined`        | no                 |        |
| `false`                  | `false`            | no                 |        |
| `false`                  | `true`             | yes                |        |
| `"warn"`                 | `undefined`        | no                 | warns  |
| `"warn"`                 | `false`            | no                 | warns  |
| `"warn"`                 | `true`             | yes                |        |
| `true`                   | `undefined`        | yes                |        |
| `true`                   | `false`            | n/a                | throws |
| `true`                   | `true`             | yes                |        |

## Upgrade Guide

First, set `VIEW_PRESERVES_CONTEXT` to `false`; commit that change.

Then, temporarily set `VIEW_PRESERVES_CONTEXT` to `"warn"`. For each view
class that it warns about, declare that it preserves context:

```javascript
var MyView = Ember.View.extend({
  someProperty: function() {
    return 'some value';
  }.property()
}).reopenClass({ preservesContext: true });
```

If there are properties on `MyView` that you were using in the template,
you will have to prefix the reference with `view.`:

```handlebars
{{#view MyView}}
  The value of someProperty is {{view.someProperty}}
{{/view}}
```

Continue to upgrade views, a few at a time. Once you are done or nearly done,
change `VIEW_PRESERVES_CONTEXT` to "warn" in source control to help find the
last few.

Once you feel confident that you have upgraded all of your view classes,
change `VIEW_PRESERVES_CONTEXT` to `true`. At this point, you can remove
all class-level `preservesContext: true` declarations.
