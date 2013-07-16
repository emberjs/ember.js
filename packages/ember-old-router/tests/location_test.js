var locationObject;

module("Ember.Location, hash implementation", {
  setup: function() {
    locationObject = Ember.Location.create({
      implementation: 'hash'
    });
    locationObject.setURL("/");

    // make sure the onhashchange event fires
    stop();
    // There are weird issues in FF 3.6 if we pass start itself as the parameter
    setTimeout(function() { start(); }, 1);
  },

  teardown: function() {
    window.location.hash = "";
    Ember.run(function() {
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
  stop();

  locationObject.onUpdateURL(function(url) {
    start();

    equal(url, '/foo/bar', "the callback is invoked with the URL");
  });

  window.location.hash = "#/foo/bar";
});

test("if the URL is set, it doesn't trigger the hashchange event", function() {
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

    var setHistory = function(obj, path) {
      obj.set('history', { state: { path: path } });
    };

    Ember.HistoryLocation.reopen({
      initState: function() {
        setHistory(this, window.location.pathname);
      },

      replaceState: function(path) {
        setHistory(this, path);
      },

      pushState: function(path) {
        setHistory(this, path);
      }
    });

    locationObject = Ember.Location.create({
      implementation: 'history'
    });

    stop();
    setTimeout(start, 1);
  },

  teardown: function() {
    Ember.run(function() {
      locationObject.destroy();
    });
  }
});

test("it sets the initial state", function() {
  equal(locationObject.getState().path, window.location.pathname, "the initial state is set");
});

test("it is possible to get the current URL", function() {
  equal(locationObject.getURL(), window.location.pathname, "current URL is set");
});

test("it is possible to set the current URL", function() {
  var setPath;

  locationObject.pushState = function(path) {
    setPath = path;
  };

  locationObject.setURL("/foo");
  equal(setPath, "/foo", "the updated URL is '/foo'");
});

test("if the URL is set, it doesn't trigger the popstate event", function() {
  expect(1);

  stop();
  var count = 0;
  locationObject.pushState = function(data, title, path) {};

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

test("doesn't push a state if path has not changed", function() {
  expect(1);
  stop();

  var count = 0;
  locationObject.pushState = function() {
    count++;
  };

  setTimeout(function() {
    start();
    equal(count, 0, "pushState should not have been called");
  }, 100);

  locationObject.setURL(window.location.pathname);
});

test("it calls pushState if state.path is different than given path", function() {
  expect(1);
  stop();

  var count = 0;

  locationObject.pushState = function() {
    count++;
  };

  setTimeout(function() {
    start();
    equal(count, 1, "pushState should have been called");
  }, 100);

  locationObject.setURL('/test');
});

test("it handles an empty path as root", function() {
  equal(locationObject.formatURL(''), '/', "The formatted url is '/'");
});

test("formatURL properly appends to rootURL", function() {
  locationObject.set('rootURL', '/test');
  equal(locationObject.formatURL('/foo'), '/test/foo', "The formatted url is '/test/foo'");
});

test("it prepends rootURL to path", function() {
  var setPath;

  locationObject.pushState = function(path) {
    setPath = path;
  };

  locationObject.set('rootURL', '/test');
  locationObject.setURL("/foo");

  equal(setPath, '/test/foo', "The updated url is '/test/foot'");
});
