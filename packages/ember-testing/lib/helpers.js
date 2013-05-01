require('ember-testing/test');

var Promise = Ember.RSVP.Promise,
    get = Ember.get,
    helper = Ember.Test.registerHelper;

function visit(app, url) {
  Ember.run(app, app.handleURL, url);
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
  return new Promise(function(resolve) {
    stop();
    var watcher = setInterval(function() {
      var routerIsLoading = app.__container__.lookup('router:main').router.isLoading;
      if (routerIsLoading) { return; }
      if (Ember.Test.pendingAjaxRequests) { return; }
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