require('ember-testing/test');

/**
* @module ember
* @submodule ember-testing
*/

var get = Ember.get,
    Test = Ember.Test,
    helper = Test.registerHelper,
    asyncHelper = Test.registerAsyncHelper,
    countAsync = 0;

Test.pendingAjaxRequests = 0;

Test.onInjectHelpers(function() {
  Ember.$(document).ajaxSend(function() {
    Test.pendingAjaxRequests++;
  });

  Ember.$(document).ajaxComplete(function() {
    Ember.assert("An ajaxComplete event which would cause the number of pending AJAX " +
                 "requests to be negative has been triggered. This is most likely " +
                 "caused by AJAX events that were started before calling " +
                 "`injectTestHelpers()`.", Test.pendingAjaxRequests !== 0);
    Test.pendingAjaxRequests--;
  });
});

function currentRouteName(app){
  var appController = app.__container__.lookup('controller:application');

  return get(appController, 'currentRouteName');
}

function currentPath(app){
  var appController = app.__container__.lookup('controller:application');

  return get(appController, 'currentPath');
}

function currentURL(app){
  var router = app.__container__.lookup('router:main');

  return get(router, 'location').getURL();
}

function visit(app, url) {
  var router = app.__container__.lookup('router:main');
  router.location.setURL(url);

  if (app._readinessDeferrals > 0) {
    router['initialURL'] = url;
    Ember.run(app, 'advanceReadiness');
    delete router['initialURL'];
  } else {
    Ember.run(app, app.handleURL, url);
  }

  return wait(app);
}

function click(app, selector, context) {
  var $el = findWithAssert(app, selector, context);
  Ember.run($el, 'mousedown');

  if ($el.is(':input')) {
    var type = $el.prop('type');
    if (type !== 'checkbox' && type !== 'radio' && type !== 'hidden') {
      Ember.run($el, function(){
        // Firefox does not trigger the `focusin` event if the window
        // does not have focus. If the document doesn't have focus just
        // use trigger('focusin') instead.
        if (!document.hasFocus || document.hasFocus()) {
          this.focus();
        } else {
          this.trigger('focusin');
        }
      });
    }
  }

  Ember.run($el, 'mouseup');
  Ember.run($el, 'click');

  return wait(app);
}

function triggerEvent(app, selector, context, type, options){
  if (arguments.length === 3) {
    type = context;
    context = null;
  }

  if (typeof options === 'undefined') {
    options = {};
  }

  var $el = findWithAssert(app, selector, context);

  var event = Ember.$.Event(type, options);

  Ember.run($el, 'trigger', event);

  return wait(app);
}

function keyEvent(app, selector, context, type, keyCode) {
  if (typeof keyCode === 'undefined') {
    keyCode = type;
    type = context;
    context = null;
  }

  return triggerEvent(app, selector, context, type, { keyCode: keyCode });
}

function fillIn(app, selector, context, text) {
  var $el;
  if (typeof text === 'undefined') {
    text = context;
    context = null;
  }
  $el = findWithAssert(app, selector, context);
  Ember.run(function() {
    $el.val(text).change();
  });
  return wait(app);
}

function findWithAssert(app, selector, context) {
  var $el = find(app, selector, context);
  if ($el.length === 0) {
    throw new Ember.Error("Element " + selector + " not found.");
  }
  return $el;
}

function find(app, selector, context) {
  var $el;
  context = context || get(app, 'rootElement');
  $el = app.$(selector, context);

  return $el;
}

function andThen(app, callback) {
  return wait(app, callback(app));
}

function wait(app, value) {
  return Test.promise(function(resolve) {
    // If this is the first async promise, kick off the async test
    if (++countAsync === 1) {
      Test.adapter.asyncStart();
    }

    // Every 10ms, poll for the async thing to have finished
    var watcher = setInterval(function() {
      // 1. If the router is loading, keep polling
      var routerIsLoading = !!app.__container__.lookup('router:main').router.activeTransition;
      if (routerIsLoading) { return; }

      // 2. If there are pending Ajax requests, keep polling
      if (Test.pendingAjaxRequests) { return; }

      // 3. If there are scheduled timers or we are inside of a run loop, keep polling
      if (Ember.run.hasScheduledTimers() || Ember.run.currentRunLoop) { return; }
      if (Test.waiters && Test.waiters.any(function(waiter) {
        var context = waiter[0];
        var callback = waiter[1];
        return !callback.call(context);
      })) { return; }
      // Stop polling
      clearInterval(watcher);

      // If this is the last async promise, end the async test
      if (--countAsync === 0) {
        Test.adapter.asyncEnd();
      }

      // Synchronously resolve the promise
      Ember.run(null, resolve, value);
    }, 10);
  });

}


/**
* Loads a route, sets up any controllers, and renders any templates associated
* with the route as though a real user had triggered the route change while
* using your app.
*
* Example:
*
* ```javascript
* visit('posts/index').then(function() {
*   // assert something
* });
* ```
*
* @method visit
* @param {String} url the name of the route
* @return {RSVP.Promise}
*/
asyncHelper('visit', visit);

/**
* Clicks an element and triggers any actions triggered by the element's `click`
* event.
*
* Example:
*
* ```javascript
* click('.some-jQuery-selector').then(function() {
*   // assert something
* });
* ```
*
* @method click
* @param {String} selector jQuery selector for finding element on the DOM
* @return {RSVP.Promise}
*/
asyncHelper('click', click);

/**
* Simulates a key event, e.g. `keypress`, `keydown`, `keyup` with the desired keyCode
*
* Example:
*
* ```javascript
* keyEvent('.some-jQuery-selector', 'keypress', 13).then(function() {
*  // assert something
* });
* ```
*
* @method keyEvent
* @param {String} selector jQuery selector for finding element on the DOM
* @param {String} type the type of key event, e.g. `keypress`, `keydown`, `keyup`
* @param {Number} keyCode the keyCode of the simulated key event
* @return {RSVP.Promise}
*/
asyncHelper('keyEvent', keyEvent);

/**
* Fills in an input element with some text.
*
* Example:
*
* ```javascript
* fillIn('#email', 'you@example.com').then(function() {
*   // assert something
* });
* ```
*
* @method fillIn
* @param {String} selector jQuery selector finding an input element on the DOM
* to fill text with
* @param {String} text text to place inside the input element
* @return {RSVP.Promise}
*/
asyncHelper('fillIn', fillIn);

/**
* Finds an element in the context of the app's container element. A simple alias
* for `app.$(selector)`.
*
* Example:
*
* ```javascript
* var $el = find('.my-selector');
* ```
*
* @method find
* @param {String} selector jQuery string selector for element lookup
* @return {Object} jQuery object representing the results of the query
*/
helper('find', find);

/**
* Like `find`, but throws an error if the element selector returns no results.
*
* Example:
*
* ```javascript
* var $el = findWithAssert('.doesnt-exist'); // throws error
* ```
*
* @method findWithAssert
* @param {String} selector jQuery selector string for finding an element within
* the DOM
* @return {Object} jQuery object representing the results of the query
* @throws {Error} throws error if jQuery object returned has a length of 0
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
    .fillIn('#password', username)
    .click('.submit')

    return wait();
  });

  @method wait
  @param {Object} value The value to be returned.
  @return {RSVP.Promise}
*/
asyncHelper('wait', wait);
asyncHelper('andThen', andThen);


if (Ember.FEATURES.isEnabled('ember-testing-routing-helpers')){
  /**
    Returns the currently active route name.

    Example:

    ```javascript
    function validateRouteName(){
      equal(currentRouteName(), 'some.path', "correct route was transitioned into.");
    }

    visit('/some/path').then(validateRouteName)
    ```

    @method currentRouteName
    @return {Object} The name of the currently active route.
  */
  helper('currentRouteName', currentRouteName);

  /**
    Returns the current path.

    Example:

    ```javascript
    function validateURL(){
      equal(currentPath(), 'some.path.index', "correct path was transitioned into.");
    }

    click('#some-link-id').then(validateURL);
    ```

    @method currentPath
    @return {Object} The currently active path.
  */
  helper('currentPath', currentPath);

  /**
    Returns the current URL.

    Example:

    ```javascript
    function validateURL(){
      equal(currentURL(), '/some/path', "correct URL was transitioned into.");
    }

    click('#some-link-id').then(validateURL);
    ```

    @method currentURL
    @return {Object} The currently active URL.
  */
  helper('currentURL', currentURL);
}

if (Ember.FEATURES.isEnabled('ember-testing-triggerEvent-helper')) {
  /**
    Triggers the given event on the element identified by the provided selector.

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
   @param {String} type The event type to be triggered.
   @param {String} options The options to be passed to jQuery.Event.
   @return {RSVP.Promise}
  */
  asyncHelper('triggerEvent', triggerEvent);
}
