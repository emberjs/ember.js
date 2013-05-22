require('ember-testing/test');

var get = Ember.get,
    helper = Ember.Test.registerHelper,
    pendingAjaxRequests = 0;


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
  return Ember.Test.promise(function(resolve) {
    Ember.Test.adapter.asyncStart();
    var watcher = setInterval(function() {
      var routerIsLoading = app.__container__.lookup('router:main').router.isLoading;
      if (routerIsLoading) { return; }
      if (pendingAjaxRequests) { return; }
      if (Ember.run.hasScheduledTimers() || Ember.run.currentRunLoop) { return; }
      clearInterval(watcher);
      Ember.Test.adapter.asyncEnd();
      Ember.run(function() {
        resolve(value);
      });
    }, 10);
  });
}

// expose these methods as test helpers
helper('visit', visit);
helper('click', click);
helper('fillIn', fillIn);
helper('find', find);
helper('wait', wait);
