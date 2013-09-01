require('ember-testing/test');

/**
* @module ember
* @submodule ember-testing
*/

var get = Ember.get,
    Test = Ember.Test,
    helper = Test.registerHelper,
    countAsync = 0;

Test.pendingAjaxRequests = 0;

Test.onInjectHelpers(function() {
  Ember.$(document).ajaxStart(function() {
    Test.pendingAjaxRequests++;
  });

  Ember.$(document).ajaxStop(function() {
    Test.pendingAjaxRequests--;
  });
});


function visit(app, url) {
  app.__container__.lookup('router:main').location.setURL(url);
  Ember.run(app, app.handleURL, url);
  return wait(app);
}

function click(app, selector, context) {
  var $el = findWithAssert(app, selector, context);
  Ember.run($el, 'mousedown');

  if ($el.is(':input')) {
    var type = $el.prop('type');
    if (type !== 'checkbox' && type !== 'radio' && type !== 'hidden') {
      Ember.run($el, 'focus');
    }
  }

  Ember.run($el, 'mouseup');
  Ember.run($el, 'click');

  return wait(app);
}

function keyEvent(app, selector, context, type, keyCode) {
  var $el;
  if (typeof keyCode === 'undefined') {
    keyCode = type;
    type = context;
    context = null;
  }
  $el = findWithAssert(app, selector, context);
  var event = Ember.$.Event(type, { keyCode: keyCode });
  Ember.run($el, 'trigger', event);
  return wait(app);
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
    throw new Error("Element " + selector + " not found.");
  }
  return $el;
}

function find(app, selector, context) {
  var $el;
  context = context || get(app, 'rootElement');
  $el = app.$(selector, context);

  return $el;
}

function wait(app, value) {
  var promise;

  promise = Test.promise(function(resolve) {
    if (++countAsync === 1) {
      Test.adapter.asyncStart();
    }
    var watcher = setInterval(function() {
      var routerIsLoading = app.__container__.lookup('router:main').router.isLoading;
      if (routerIsLoading) { return; }
      if (Test.pendingAjaxRequests) { return; }
      if (Ember.run.hasScheduledTimers() || Ember.run.currentRunLoop) { return; }

      clearInterval(watcher);

      if (--countAsync === 0) {
        Test.adapter.asyncEnd();
      }

      Ember.run(null, resolve, value);
    }, 10);
  });

  return buildChainObject(app, promise);
}

/*
 Builds an object that contains all helper methods. This object will be
 returned by helpers and then-promises.

 This allows us to chain helpers:

 ```javascript
  visit('posts/new')
  .click('.add-btn')
  .fillIn('.title', 'Post')
  .click('.submit')
  .then(function() {
    equal('.post-title', 'Post');
  })
  .visit('comments')
  .then(function() {
    equal(find('.comments'),length, 0);
  });
 ```

 @method buildChainObject
 @param {Ember.Application} app
 @param {Ember.RSVP.Promise} promise
 @return {Object} A new object with properties for each
                  of app's helpers to be used for continued
                  method chaining (using promises).
*/
function buildChainObject(app, promise) {
  var helperName, obj = {};
  for(helperName in app.testHelpers) {
    obj[helperName] = chain(app, promise, app.testHelpers[helperName]);
  }
  obj.then = function(fn) {
    var thenPromise = promise.then(fn);
    return buildChainObject(app, thenPromise);
  };
  return obj;
}

/*
  Used in conjunction with buildChainObject to setup a
  continued chain of method calls (with promises)

  @method chain
  @param {Ember.Application} app
  @param {Ember.RSVP.Promise} promise
  @param {Function} fn
*/
function chain(app, promise, fn) {
  return function() {
    var args = arguments, chainedPromise;
    chainedPromise = promise.then(function() {
      return fn.apply(null, args);
    });
    return buildChainObject(app, chainedPromise);
  };
}

/**
* Loads a route, sets up any controllers, and renders any templates associated
* with the route as though a real user had triggered the route change while
* using your app.
*
* Example:
*
* ```
* visit('posts/index').then(function() {
*   // assert something
* });
* ```
*
* @method visit
* @param {String} url the name of the route
* @returns {RSVP.Promise}
*/
helper('visit', visit);

/**
* Clicks an element and triggers any actions triggered by the element's `click`
* event.
*
* Example:
*
* ```
* click('.some-jQuery-selector').then(function() {
*  // assert something
* });
* ```
*
* @method click
* @param {String} selector jQuery selector for finding element on the DOM
* @returns {RSVP.Promise}
*/
helper('click', click);

/**
* Simulates a key event, e.g. `keypress`, `keydown`, `keyup` with the desired keyCode
*
* Example:
*
* ```
* keyEvent('.some-jQuery-selector', 'keypress', 13).then(function() {
*  // assert something
* });
* ```
*
* @method keyEvent
* @param {String} selector jQuery selector for finding element on the DOM
* @param {String} the type of key event, e.g. `keypress`, `keydown`, `keyup`
* @param {Number} the keyCode of the simulated key event
* @returns {RSVP.Promise}
*/
helper('keyEvent', keyEvent);

/**
* Fills in an input element with some text.
*
* Example:
*
* ```
* fillIn('#email', 'you@example.com').then(function() {
*   // assert something
* });
* ```
*
* @method fillIn
* @param {String} selector jQuery selector finding an input element on the DOM
* to fill text with
* @param {String} text text to place inside the input element
* @returns {RSVP.Promise}
*/
helper('fillIn', fillIn);

/**
* Finds an element in the context of the app's container element. A simple alias
* for `app.$(selector)`.
*
* Example:
*
* ```
* var $el = find('.my-selector);
* ```
*
* @method find
* @param {String} selector jQuery string selector for element lookup
* @returns {Object} jQuery object representing the results of the query
*/
helper('find', find);

/**
*
* Like `find`, but throws an error if the element selector returns no results
*
* Example:
*
* ```
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

  ```
  Ember.Test.registerHelper('loginUser', function(app, username, password) {
    visit('secured/path/here')
    .fillIn('#username', username)
    .fillIn('#password', username)
    .click('.submit')

    return wait(app);
  });

  @method wait
  @param {Object} value The value to be returned.
  @return {RSVP.Promise}
  ```
*/
helper('wait', wait);
