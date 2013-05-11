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

function click(app, selector) {
  Ember.run(function() {
    app.$(selector).click();
  });
  return wait(app);
}

function fillIn(app, selector, text) {
  var $el = find(app, selector);
  Ember.run(function() {
    $el.val(text);
  });
  return wait(app);
}

function find(app, selector) {
  return app.$(get(app, 'rootElement')).find(selector);
}

function wait(app, value) {
  return Ember.Test.promise(function(resolve) {
    stop();
    var watcher = setInterval(function() {
      var routerIsLoading = app.__container__.lookup('router:main').router.isLoading;
      if (routerIsLoading) { return; }
      if (pendingAjaxRequests) { return; }
      if (Ember.run.hasScheduledTimers() || Ember.run.currentRunLoop) { return; }
      clearInterval(watcher);
      start();
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