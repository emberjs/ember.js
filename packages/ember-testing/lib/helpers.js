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
  @return {RSVP.Promise}
  @public
*/
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
