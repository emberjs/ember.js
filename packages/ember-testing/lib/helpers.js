/*globals EMBER_APP_BEING_TESTED */

var Promise = Ember.RSVP.Promise,
    pendingAjaxRequests = 0;

function visit(url) {
  var promise = new Promise();
  Ember.run(EMBER_APP_BEING_TESTED, EMBER_APP_BEING_TESTED.handleURL, url);
  wait(promise, promise.resolve);
  return promise;
}

function click(selector) {
  var promise = new Promise();
  Ember.run(function() {
    Ember.$(selector).click();
  });
  wait(promise, promise.resolve);
  return promise;
}

function fillIn(selector, text) {
  var promise = new Promise();
  var $el = find(selector);
  Ember.run(function() {
    $el.val(text);
  });

  wait(promise, promise.resolve);
  return promise;
}

function find(selector) {
  return Ember.$('.ember-application').find(selector);
}

function wait(target, method) {
  if (!method) {
    method = target;
    target = null;
  }
  stop();
  var watcher = setInterval(function() {
    var routerIsLoading = EMBER_APP_BEING_TESTED.__container__.lookup('router:main').router.isLoading;
    if (routerIsLoading) { return; }
    if (pendingAjaxRequests) { return; }
    if (Ember.run.hasScheduledTimers() || Ember.run.currentRunLoop) { return; }
    clearInterval(watcher);
    start();
    Ember.run(target, method);
  }, 200);
}

Ember.Application.reopen({
  setupForTesting: function() {
    this.deferReadiness();

    this.Router.reopen({
      location: 'none'
    });

    window.EMBER_APP_BEING_TESTED = this;
  },

  injectTestHelpers: function() {
    Ember.$.ajaxStart(function() {
      pendingAjaxRequests++;
    });

    Ember.$.ajaxStop(function() {
      pendingAjaxRequests--;
    });

    window.visit = visit;
    window.click = click;
    window.fillIn = fillIn;
    window.find = find;
  }
});