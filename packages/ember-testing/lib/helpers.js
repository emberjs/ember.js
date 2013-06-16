require('ember-testing/test');

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
  Ember.run($el, 'click');
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
    throw("Element " + selector + " not found.");
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

      Ember.run(resolve, value);
    }, 10);
  });

  return buildChainObject(app, promise);
}

/**
 Builds an object that contains
 all helper methods. This object will be
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

function chain(app, promise, fn) {
  return function() {
    var args = arguments, chainedPromise;
    chainedPromise = promise.then(function() {
      return fn.apply(null, args);
    });
    return buildChainObject(app, chainedPromise);
  };
}

// expose these methods as test helpers
helper('visit', visit);
helper('click', click);
helper('fillIn', fillIn);
helper('find', find);
helper('findWithAssert', findWithAssert);
helper('wait', wait);
