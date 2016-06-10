import {
  registerHelper as helper,
  registerAsyncHelper as asyncHelper
} from './test/helpers';
import andThen from './helpers/and_then';
import click from './helpers/click';
import currentPath from './helpers/current_path';
import currentRouteName from './helpers/current_route_name';
import currentURL from './helpers/current_url';
import fillIn from './helpers/fill_in';
import find from './helpers/find';
import findWithAssert from './helpers/find_with_assert';
import keyEvent from './helpers/key_event';
import pauseTest from './helpers/pause_test';
import triggerEvent from './helpers/trigger_event';
import visit from './helpers/visit';
import wait from './helpers/wait';

/**
@module ember
@submodule ember-testing
*/

/**
  Loads a route, sets up any controllers, and renders any templates associated
  with the route as though a real user had triggered the route change while
  using your app.

  Example:

  ```javascript
  visit('posts/index').then(function() {
    // assert something
  });
  ```

  @method visit
  @param {String} url the name of the route
  @return {RSVP.Promise}
  @public
*/
asyncHelper('visit', visit);

/**
  Clicks an element and triggers any actions triggered by the element's `click`
  event.

  Example:

  ```javascript
  click('.some-jQuery-selector').then(function() {
    // assert something
  });
  ```

  @method click
  @param {String} selector jQuery selector for finding element on the DOM
  @param {Object} context A DOM Element, Document, or jQuery to use as context
  @return {RSVP.Promise}
  @public
*/
asyncHelper('click', click);

asyncHelper('keyEvent', keyEvent);

/**
  Fills in an input element with some text.

  Example:

  ```javascript
  fillIn('#email', 'you@example.com').then(function() {
    // assert something
  });
  ```

  @method fillIn
  @param {String} selector jQuery selector finding an input element on the DOM
  to fill text with
  @param {String} text text to place inside the input element
  @return {RSVP.Promise}
  @public
*/
asyncHelper('fillIn', fillIn);

/**
  Finds an element in the context of the app's container element. A simple alias
  for `app.$(selector)`.

  Example:

  ```javascript
  var $el = find('.my-selector');
  ```

  With the `context` param:

  ```javascript
  var $el = find('.my-selector', '.parent-element-class');
  ```

  @method find
  @param {String} selector jQuery string selector for element lookup
  @param {String} [context] (optional) jQuery selector that will limit the selector
                            argument to find only within the context's children
  @return {Object} jQuery object representing the results of the query
  @public
*/
helper('find', find);

helper('findWithAssert', findWithAssert);

/**
  Causes the run loop to process any pending events. This is used to ensure that
  any async operations from other helpers (or your assertions) have been processed.

  This is most often used as the return value for the helper functions (see 'click',
  'fillIn','visit',etc).

  Example:

  ```javascript
  Ember.Test.registerAsyncHelper('loginUser', function(app, username, password) {
    visit('secured/path/here')
    .fillIn('#username', username)
    .fillIn('#password', password)
    .click('.submit')

    return app.testHelpers.wait();
  });

  @method wait
  @param {Object} value The value to be returned.
  @return {RSVP.Promise}
  @public
*/
asyncHelper('wait', wait);
asyncHelper('andThen', andThen);
helper('currentRouteName', currentRouteName);
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
helper('currentPath', currentPath);

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
helper('currentURL', currentURL);
asyncHelper('pauseTest', pauseTest);
asyncHelper('triggerEvent', triggerEvent);
