/**
@module ember
*/
import { get } from 'ember-metal';
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
  let routingService = app.__container__.lookup('service:-routing');
  return get(routingService, 'currentRouteName');
}
