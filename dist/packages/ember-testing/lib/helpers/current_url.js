/**
@module ember
*/
import { get } from '@ember/object';
import { assert } from '@ember/debug';
import Router from '@ember/routing/router';
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
  assert('[BUG] app.__container__ is not set', app.__container__);
  let router = app.__container__.lookup('router:main');
  assert('[BUG] router:main is not a Router', router instanceof Router);
  let location = get(router, 'location');
  assert('[BUG] location is still a string', typeof location !== 'string');
  return location.getURL();
}