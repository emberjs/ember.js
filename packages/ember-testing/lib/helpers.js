/*globals EMBER_APP_BEING_TESTED */

var Promise = Ember.RSVP.Promise,
    pendingAjaxRequests = 0,
    originalFind;

function visit(url) {
  Ember.run(EMBER_APP_BEING_TESTED, EMBER_APP_BEING_TESTED.handleURL, url);
  return wait();
}

function click(selector) {
  Ember.run(function() {
    Ember.$(selector).click();
  });
  return wait();
}

function fillIn(selector, text) {
  var $el = find(selector);
  Ember.run(function() {
    $el.val(text);
  });
  return wait();
}

function find(selector) {
  return Ember.$('.ember-application').find(selector);
}

function wait(value) {
  return new Promise(function(resolve) {
    stop();
    var watcher = setInterval(function() {
      var routerIsLoading = EMBER_APP_BEING_TESTED.__container__.lookup('router:main').router.isLoading;
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
    window.wait = wait;
  },

  removeTestHelpers: function() {
    window.visit = null;
    window.click = null;
    window.fillIn = null;
    window.find = originalFind;
    window.wait = null;
  }
});
