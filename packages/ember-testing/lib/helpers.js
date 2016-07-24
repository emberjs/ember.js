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
asyncHelper('click', click);

/**
  Simulates a key event, e.g. `keypress`, `keydown`, `keyup` with the desired keyCode

  Example:

  ```javascript
  keyEvent('.some-jQuery-selector', 'keypress', 13).then(function() {
   // assert something
  });
  ```

  @method keyEvent
  @param {String} selector jQuery selector for finding element on the DOM
  @param {String} type the type of key event, e.g. `keypress`, `keydown`, `keyup`
  @param {Number} keyCode the keyCode of the simulated key event
  @return {RSVP.Promise}
  @since 1.5.0
  @public
*/
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

  @method find
  @param {String} selector jQuery string selector for element lookup
  @return {Object} jQuery object representing the results of the query
  @public
*/
helper('find', find);

/**
  Like `find`, but throws an error if the element selector returns no results.

  Example:

  ```javascript
  var $el = findWithAssert('.doesnt-exist'); // throws error
  ```

  @method findWithAssert
  @param {String} selector jQuery selector string for finding an element within
  the DOM
  @return {Object} jQuery object representing the results of the query
  @throws {Error} throws error if jQuery object returned has a length of 0
  @public
*/
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
helper('currentRouteName', currentRouteName);
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

/**
 Pauses the current test - this is useful for debugging while testing or for test-driving.
 It allows you to inspect the state of your application at any point.

 Example (The test will pause before clicking the button):

 ```javascript
 visit('/')
 return pauseTest();

 click('.btn');
 ```

 @since 1.9.0
 @method pauseTest
 @return {Object} A promise that will never resolve
 @public
*/
asyncHelper('pauseTest', pauseTest);

/**
  Triggers the given DOM event on the element identified by the provided selector.

  Example:

  ```javascript
  triggerEvent('#some-elem-id', 'blur');
  ```

  This is actually used internally by the `keyEvent` helper like so:

  ```javascript
  triggerEvent('#some-elem-id', 'keypress', { keyCode: 13 });
  ```

 @method triggerEvent
 @param {String} selector jQuery selector for finding element on the DOM
 @param {String} [context] jQuery selector that will limit the selector
                           argument to find only within the context's children
 @param {String} type The event type to be triggered.
 @param {Object} [options] The options to be passed to jQuery.Event.
 @return {RSVP.Promise}
 @since 1.5.0
 @public
*/
asyncHelper('triggerEvent', triggerEvent);
