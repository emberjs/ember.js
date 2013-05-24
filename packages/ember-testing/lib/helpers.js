require('ember-testing/test');

var get = Ember.get,
    helper = Ember.Test.registerHelper,
    pendingAjaxRequests = 0,
    countAsync = 0;


Ember.Test.onInjectHelpers(function() {
  Ember.$(document).ajaxStart(function() {
    pendingAjaxRequests++;
  });

  Ember.$(document).ajaxStop(function() {
    pendingAjaxRequests--;
  });
});


function visit(app, url) {
  Ember.run(app, app.handleURL, url);
  app.__container__.lookup('router:main').location.setURL(url);
  return wait(app);
}

function click(app, selector, context) {
  var $el = find(app, selector, context);
  Ember.run(function() {
    app.$(selector).click();
  });
  return wait(app);
}

function fillIn(app, selector, context, text) {
  var $el;
  if (typeof text === 'undefined') {
    text = context;
    context = null;
  }
  $el = find(app, selector, context);
  Ember.run(function() {
    $el.val(text).change();
  });
  return wait(app);
}

function find(app, selector, context) {
  var $el;
  context = context || get(app, 'rootElement');
  $el = app.$(selector, context);
  if ($el.length === 0) {
    throw("Element " + selector + " not found.");
  }
  return $el;
}

function wait(app, value) {
  var promise, obj = {}, helperName;

  promise = Ember.Test.promise(function(resolve) {
    if (++countAsync === 1) {
      Ember.Test.adapter.asyncStart();
    }
    var watcher = setInterval(function() {
      var routerIsLoading = app.__container__.lookup('router:main').router.isLoading;
      if (routerIsLoading) { return; }
      if (pendingAjaxRequests) { return; }
      if (Ember.run.hasScheduledTimers() || Ember.run.currentRunLoop) { return; }
      clearInterval(watcher);
      if (--countAsync === 0) {
        Ember.Test.adapter.asyncEnd();
      }
      Ember.run(function() {
        resolve(value);
      });
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
helper('wait', wait);
