var locationObject;
var lastKnownLocation;

module("Ember.Location, hash implementation", {
  setup: function() {
    locationObject = Ember.Location.create({
      implementation: 'hash'
    });
    locationObject.setURL("/");

    // make sure the onhashchange event fires
    stop();
    setTimeout(start, 1);
  },

  teardown: function() {
    window.location.hash = "";
    Ember.run(function(){
      locationObject.destroy();
    });
  }
});

test("it is possible to get the current URL", function() {
  equal(locationObject.getURL(), "/", "the initial URL is '/'");
  equal(window.location.hash, "#/", "the initial hash is '#/'");
});

test("it is possible to set the current URL", function() {
  locationObject.setURL("/foo");
  equal(locationObject.getURL(), "/foo", "the updated URL is '/'");
  equal(window.location.hash, "#/foo", "the updated hash is '#/foo'");
});

test("if the hash changes, the onUpdateURL callback is invoked", function() {
  expect(1);

  locationObject.onUpdateURL(function(url) {
    start();

    equal(url, '/foo/bar', "the callback is invoked with the URL");
  });

  window.location.hash = "#/foo/bar";
  stop();
});

test("if the URL is set, it doesn't trigger the hashchange event", function() {
  expect(1);

  stop();
  var count = 0;

  setTimeout(function() {
    start();
    equal(count, 0, "The update callback was not called");
  }, 100);

  locationObject.onUpdateURL(function(url) {
    count++;
  });

  locationObject.setURL('/avoid/triggering');
});

module("Ember.Location, history implementation", {
  setup: function() {
    lastKnownLocation = window.location.pathname + window.location.search;
    locationObject = Ember.Location.create({
      implementation: 'history'
    });

    locationObject.setURL('/');

    stop();
    setTimeout(start, 1);
  },

  teardown: function() {
    window.history.pushState(null, null, lastKnownLocation);
    Ember.run(function() {
      locationObject.destroy();
    });
  }
});

test("it is possible to get the current URL", function() {
  equal(locationObject.getURL(), "/", "the initial URL is '/'");
  equal(window.location.pathname, "/", "the initial pathname is '/'");
});

test("it is possible to set the current URL", function() {
  locationObject.setURL("/foo");
  equal(locationObject.getURL(), "/foo", "the updated URL is '/foo'");
});

test("if the URL is set, it doesn't trigger the popstate event", function() {
  expect(1);

  stop();
  var count = 0;

  setTimeout(function() {
    start();
    equal(count, 0, "The update callback was not called");
  }, 100);

  locationObject.onUpdateURL(function(url) {
    count++;
  });

  locationObject.setURL('/avoid/triggering');
});

test("if history is used, it triggers the popstate event", function() {
  expect(1);

  stop();
  var count = 0;

  setTimeout(function() {
    start();
    equal(count, 1, "The update callback was not called");
  }, 300);

  locationObject.onUpdateURL(function(url) {
    count++;
  });

  window.history.back();
});
