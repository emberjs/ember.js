/**
@module ember
*/
import { get } from '@ember/object';
import { RoutingService } from '@ember/routing/-internals';
import { assert } from '@ember/debug';
/**
  Returns the currently active route name.

Example:

```javascript
function validateRouteName() {
  equal(currentRouteName(), 'some.path', "correct route was transitioned into.");
}
visit('/some/path').then(validateRouteName)
```

@method currentRouteName
@return {Object} The name of the currently active route.
@since 1.5.0
@public
*/
export default function currentRouteName(app) {
  assert('[BUG] app.__container__ is not set', app.__container__);
  let routingService = app.__container__.lookup('service:-routing');
  assert('[BUG] service:-routing is not a RoutingService', routingService instanceof RoutingService);
  return get(routingService, 'currentRouteName');
}