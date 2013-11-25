var Router, App, AppView, templates, router, container, originalTemplates;
var get = Ember.get, set = Ember.set;

function bootApplication(url) {
  router = container.lookup('router:main');
  if(url) { router.location.setURL(url); }
  Ember.run(App, 'advanceReadiness');
}

function compile(string) {
  return Ember.Handlebars.compile(string);
}

function handleURL(path) {
  return Ember.run(function() {
    return router.handleURL(path).then(function(value) {
      ok(true, 'url: `' + path + '` was handled');
      return value;
    }, function(reason) {
      ok(false, 'failed to visit:`' + path + '` reason: `' + QUnit.jsDump.parse(reason));
      throw reason;
    });
  });
}

function handleURLAborts(path) {
  Ember.run(function() {
    router.handleURL(path).then(function(value) {
      ok(false, 'url: `' + path + '` was NOT to be handled');
    }, function(reason) {
      ok(reason && reason.message === "TransitionAborted",  'url: `' + path + '` was to be aborted');
    });
  });
}

function shouldNotHappen(error) {
  console.error(error.stack);
  ok(false, "this .then handler should not be called: " + error.message);
}

function handleURLRejectsWith(path, expectedReason) {
  Ember.run(function() {
    router.handleURL(path).then(function(value) {
      ok(false, 'expected handleURLing: `' + path + '` to fail');
    }, function(reason) {
      equal(expectedReason, reason);
    });
  });
}
