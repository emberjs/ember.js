/**
@module ember
*/
import { get } from '@ember/object';
import { RoutingService } from '@ember/routing/-internals';
import { assert } from '@ember/debug';
/**
  Returns the current path.

Example:

```javascript
function validateURL() {
  equal(currentPath(), 'some.path.index', "correct path was transitioned into.");
}

click('#some-link-id').then(validateURL);
```

@method currentPath
@return {Object} The currently active path.
@since 1.5.0
@public
*/
export default function currentPath(app) {
  assert('[BUG] app.__container__ is not set', app.__container__);
  let routingService = app.__container__.lookup('service:-routing');
  assert('[BUG] service:-routing is not a RoutingService', routingService instanceof RoutingService);
  return get(routingService, 'currentPath');
}