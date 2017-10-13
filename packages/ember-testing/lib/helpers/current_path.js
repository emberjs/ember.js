/**
@module ember
*/
import { get } from 'ember-metal';

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
  let routingService = app.__container__.lookup('service:-routing');
  return get(routingService, 'currentPath');
}
