/*globals EMBER_APP_BEING_TESTED */

var defer = Ember.RSVP.defer,
    pendingAjaxRequests = 0,
    originalFind;

function visit(url) {
  var deferred = defer();
  Ember.run(EMBER_APP_BEING_TESTED, EMBER_APP_BEING_TESTED.handleURL, url);
  wait(deferred, deferred.resolve);
  return deferred.promise;
}

function click(selector) {
  var deferred = defer();
  Ember.run(function() {
    Ember.$(selector).click();
  });
  wait(deferred, deferred.resolve);
  return deferred.promise;
}

function fillIn(selector, text) {
  var deferred = defer();
  var $el = find(selector);
  Ember.run(function() {
    $el.val(text);
  });

  wait(deferred, deferred.resolve);
  return deferred.promise;
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
  }, 10);
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
    Ember.$(document).ajaxStart(function() {
      pendingAjaxRequests++;
    });

    Ember.$(document).ajaxStop(function() {
      pendingAjaxRequests--;
    });

    window.visit = visit;
    window.click = click;
    window.fillIn = fillIn;
    originalFind = window.find;
    window.find = find;
  },

  removeTestHelpers: function() {
    window.visit = null;
    window.click = null;
    window.fillIn = null;
    window.find = originalFind;
  }
});