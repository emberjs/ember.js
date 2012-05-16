var locationObject;

module("Ember.Location, hash style", {
  setup: function() {
    locationObject = Ember.Location.create({
      style: 'hash'
    });
    locationObject.setURL("/");

    // make sure the onhashchange event fires
    stop();
    setTimeout(start, 1);
  },

  teardown: function() {
    window.location.hash = "";
    locationObject.destroy();
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
