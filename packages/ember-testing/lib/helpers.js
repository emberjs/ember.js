/*globals EMBER_APP_BEING_TESTED */

var Promise = Ember.RSVP.Promise,
    pendingAjaxRequests = 0,
    originalFind,
    slice = [].slice,
    get = Ember.get;

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

function curry(app, fn) {
  return function() {
    var args = slice.call(arguments);
    args.unshift(app);
    return fn.apply(app, args);
  };
}

Ember.Application.reopen({
  setupForTesting: function() {
    this.deferReadiness();

    this.Router.reopen({
      location: 'none'
    });
  },

  injectTestHelpers: function() {
    Ember.$(document).ajaxStart(function() {
      pendingAjaxRequests++;
    });

    Ember.$(document).ajaxStop(function() {
      pendingAjaxRequests--;
    });

    // todo do this safer.
    window.visit  = curry(this, visit);
    window.click  = curry(this, click);
    window.fillIn = curry(this, fillIn);
    originalFind = window.find;
    window.find   = curry(this, find);
    window.wait   = curry(this, wait);
  },

  removeTestHelpers: function() {
    window.visit = null;
    window.click = null;
    window.fillIn = null;
    window.wait = null;
    window.find = originalFind;
  }
});
