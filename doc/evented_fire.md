# Ember.Evented#fire

In Ember 1.0, `Ember.Evented#fire` has been deprecated. This fork introduces a flag, `ENV.EVENTED_FIRE`, with two allowed values:

 * `null` (the default) -- `Ember.Evented#fire` works per 0.9.8.1
 * `"1.0"` -- Calling `Ember.Evented#fire` will trigger a deprecation warning

In either case, `Ember.Evented#trigger` will work as per 1.0.

See [issue #8](https://github.com/zendesk/ember.js/issues/8) for more information.

## Upgrade Guide

Setting `ENV.EVENTED_FIRE` to `"1.0"` will cause the following code to emit
a deprecation warning:

```javascript
var c = Ember.Object.extend(Ember.Evented);
c.fire('someEvent');
```

Simply change `c.fire` to `c.trigger` to eliminate the warning.
