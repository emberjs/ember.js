/**
@module ember
@submodule ember-testing
*/
import { get } from 'ember-metal';

/**
  Returns the current URL.

Example:

```javascript
function validateURL() {
  equal(currentURL(), '/some/path', "correct URL was transitioned into.");
}

click('#some-link-id').then(validateURL);
```

@method currentURL
@return {Object} The currently active URL.
@since 1.5.0
@public
*/
export default function currentURL(app) {
  let router = app.__container__.lookup('router:main');
  return get(router, 'location').getURL();
}
