module("Ember.Routable");

test("it should have its updateRoute method called when it is entered", function() {
  var locationStub = { };

  expect(2);

  var state = Ember.Route.create({
    route: 'foo',
    updateRoute: function(manager, location) {
      ok(true, "updateRoute was called");
      strictEqual(location, locationStub);
    }
  });

  var router = Ember.Router.create({
    location: locationStub,
    root: Ember.Route.create({
      ready: function(manager) {
        manager.transitionTo('initial');
      },

      initial: state
    })
  });

  router.send('ready');
});

test("a RouteMatcher matches routes", function() {
  var match;

  var matcher = Ember._RouteMatcher.create({
    route: "foo"
  });

  match = matcher.match('foo');
  equal(match.remaining, "");
  equal(match.hash, null);

  match = matcher.match('foo/bar');
  equal(match.remaining, "/bar");
  equal(match.hash, null);

  match = matcher.match('bar');
  equal(match, undefined);
});

test("a RouteMatcher matches routes with dynamic segments", function() {
  var match;

  var matcher = Ember._RouteMatcher.create({
    route: "foo/:id/:name/:ok_tom"
  });

  match = matcher.match('foo/bar/baz/sigh');
  equal(match.remaining, "");
  deepEqual(match.hash, {"id": "bar", "name": "baz", "ok_tom": "sigh"});

  match = matcher.match('foo/bar/baz/common/bro');
  equal(match.remaining, "/bro");
  deepEqual(match.hash, {"id": "bar", "name": "baz", "ok_tom": "common"});

  match = matcher.match('foo/bar');
  equal(match, undefined);
});

test("a RouteMatcher generates routes with dynamic segments", function() {
  var url;

  var matcher = Ember._RouteMatcher.create({
    route: "foo/:id/:first_name"
  });

  url = matcher.generate({ id: 1, first_name: "Yehuda" });
  equal(url, "foo/1/Yehuda");
});

test("route repeatedly descends into a nested hierarchy", function() {
  var state = Ember.Route.create({
    fooChild: Ember.Route.create({
      route: 'foo',

      barChild: Ember.Route.create({
        route: 'bar',

        bazChild: Ember.Route.create({
          route: 'baz'
        })
      })
    })
  });

  var router = Ember.Router.create({
    location: 'none',
    root: state
  });

  router.route("/foo/bar/baz");

  equal(router.get('currentState.path'), 'root.fooChild.barChild.bazChild');
});

test("when you descend into a state, the route is set", function() {
  var state = Ember.Route.create({
    ready: function(manager) {
      manager.transitionTo('fooChild.barChild.bazChild');
    },

    fooChild: Ember.Route.create({
      route: 'foo',

      barChild: Ember.Route.create({
        route: 'bar',

        bazChild: Ember.Route.create({
          route: 'baz'
        })
      })
    })
  });

  var count = 0;

  var router = Ember.Router.create({
    root: state,
    location: {
      setURL: function(url) {
        if (count === 0) {
          equal(url, '/foo/bar/baz', "The current URL should be passed in");
          count++;
        } else {
          ok(false, "Should not get here");
        }
      }
    }
  });

  router.send('ready');
});

test("when you descend into a state, the route is set even when child states (not routes) are present", function() {
  var state = Ember.Route.create({
    ready: function(manager) {
      manager.transitionTo('fooChild.barChild.bazChild');
    },

    fooChild: Ember.Route.create({
      route: 'foo',

      barChild: Ember.Route.create({
        route: 'bar',

        bazChild: Ember.Route.create({
          route: 'baz',

          basicState: Ember.State.create()
        })
      })
    })
  });

  var count = 0;

  var router = Ember.Router.create({
    root: state,
    location: {
      setURL: function(url) {
        if (count === 0) {
          equal(url, '/foo/bar/baz', "The current URL should be passed in");
          count++;
        } else {
          ok(false, "Should not get here");
        }
      }
    }
  });

  router.send('ready');
});

var router;
var Post = {
  find: function(id) {
    return { isPerson: true, id: parseInt(id, 10) };
  }
};

var setURL;
var locationMock = {
  setURL: function(url) {
    setURL = url;
  }
};

module("Routing Serialization and Deserialization", {
  setup: function() {
    router = Ember.Router.create({
      location: locationMock,
      root: Ember.Route.create({
        ready: function(manager, post) {
          manager.transitionTo('post.show', { post: post });
        },

        showIndex: function(manager) {
          manager.transitionTo('post.index');
        },

        post: Ember.Route.create({
          route: '/posts',

          index: Ember.Route.create({
            route: '/',

            showPost: function(manager, post) {
              manager.transitionTo('post.show', { post: post });
            }
          }),

          show: Ember.Route.create({
            route: "/:post_id",

            connectOutlets: function(manager, context) {
              equal(context.post.id, 2, "should be the same value regardless of entry point");
            },

            deserialize: function(manager, params) {
              return { post: Post.find(params['post_id']) };
            },

            serialize: function(manager, hash) {
              return { post_id: hash.post.id };
            },

            showIndex: function(manager) {
              manager.transitionTo('index');
            }
          })
        })
      })
    });
  }
});

test("should invoke the deserialize method on a state when it is entered via a URL", function() {
  expect(1);

  router.route('/posts/2');
});

test("should invoke the serialize method on a state when it is entered programmatically (initially deep)", function() {
  expect(3);

  router.send('ready', Post.find(2));
  equal(setURL, '/posts/2', "The post is serialized");

  router.send('showIndex');
  equal(setURL, '/posts');
});

test("should invoke the serialize method on a state when it is entered programmatically (initially shallow)", function() {
  expect(3);

  router.send('showIndex');
  equal(setURL, '/posts', "The post is serialized");

  router.send('showPost', Post.find(2));
  equal(setURL, '/posts/2');
});

var url, firstPost, firstUser;

module("default serialize and deserialize with modelType", {
  setup: function() {
    window.TestApp = Ember.Namespace.create();
    window.TestApp.Post = Ember.Object.extend();
    window.TestApp.Post.find = function(id) {
      if (id === "1") { return firstPost; }
    };

    window.TestApp.User = Ember.Object.extend();
    window.TestApp.User.find = function(id) {
      if (id === "1") { return firstUser; }
    };

    firstPost = window.TestApp.Post.create({ id: 1 });
    firstUser = window.TestApp.User.create({ id: 1 });

    router = Ember.Router.create({
      location: {
        setURL: function(passedURL) {
          url = passedURL;
        }
      },

      root: Ember.Route.extend({
        post: Ember.Route.extend({
          route: '/posts/:post_id',
          modelType: 'TestApp.Post',

          connectOutlets: function(router, post) {
            equal(post, firstPost, "the post should have deserialized correctly");
          }
        }),

        user: Ember.Route.extend({
          route: '/users/:user_id',
          modelType: window.TestApp.User,

          connectOutlets: function(router, user) {
            equal(user, firstUser, "the post should have deserialized correctly");
          }
        })
      })
    });
  },

  teardown: function() {
    window.TestApp = undefined;
  }
});

test("should use a specified String `modelType` in the default `serialize`", function() {
  router.transitionTo('post', firstPost);
  equal(url, "/posts/1");
});

test("should use a specified String `modelType` in the default `deserialize`", function() {
  expect(1);

  router.route("/posts/1");
});

test("should use a specified class `modelType` in the default `serialize`", function() {
  router.transitionTo('user', firstUser);
  equal(url, "/users/1");
});

test("should use a specified class `modelType` in the default `deserialize`", function() {
  expect(1);

  router.route("/users/1");
});

var postSuccessCallback, postFailureCallback,
    userSuccessCallback, userFailureCallback,
    connectedUser, connectedPost, connectedChild, connectedOther,
    isLoading, userLoaded;

module("modelType with promise", {
  setup: function() {
    window.TestApp = Ember.Namespace.create();

    window.TestApp.User = Ember.Object.extend({
      then: function(success, failure) {
        userLoaded = true;
        userSuccessCallback = success;
        userFailureCallback = failure;
      }
    });
    window.TestApp.User.find = function(id) {
      if (id === "1") {
        return firstUser;
      }
    };

    window.TestApp.Post = Ember.Object.extend({
      then: function(success, failure) {
        postSuccessCallback = success;
        postFailureCallback = failure;
      }
    });
    window.TestApp.Post.find = function(id) {
      // Simulate dependency on user
      if (!userLoaded) { return; }
      if (id === "1") { return firstPost; }
    };

    firstUser = window.TestApp.User.create({ id: 1 });
    firstPost = window.TestApp.Post.create({ id: 1 });

    router = Ember.Router.create({
      location: {
        setURL: function(passedURL) {
          url = passedURL;
        }
      },

      root: Ember.Route.extend({
        users: Ember.Route.extend({
          route: '/users',

          user: Ember.Route.extend({
            route: '/:user_id',
            modelType: 'TestApp.User',

            connectOutlets: function(router, obj) {
              connectedUser = obj;
            },

            posts: Ember.Route.extend({
              route: '/posts',

              post: Ember.Route.extend({
                route: '/:post_id',
                modelType: 'TestApp.Post',

                connectOutlets: function(router, obj) {
                  connectedPost = obj;
                },

                show: Ember.Route.extend({
                  route: '/',

                  connectOutlets: function(router) {
                    connectedChild = true;
                  }
                })
              })
            })
          })
        }),

        other: Ember.Route.extend({
          route: '/other',

          connectOutlets: function() {
            connectedOther = true;
          }
        }),

        loading: Ember.State.extend({
          connectOutlets: function() {
            isLoading = true;
          },

          exit: function() {
            isLoading = false;
          }
        })
      })
    });
  },

  teardown: function() {
    window.TestApp = undefined;
    postSuccessCallback = postFailureCallback = undefined;
    userSuccessCallback = userFailureCallback = undefined;
    connectedUser = connectedPost = connectedChild = connectedOther = undefined;
    isLoading = userLoaded = undefined;
  }
});

test("should handle promise success", function() {
  ok(!isLoading, 'precond - should not start loading');

  Ember.run(function() {
    router.route('/users/1/posts/1');
  });

  ok(!connectedUser, 'precond - should not connect user immediately');
  ok(!connectedPost, 'precond - should not connect post immediately');
  ok(!connectedChild, 'precond - should not connect child immediately');
  ok(isLoading, 'should be loading');

  Ember.run(function() {
    userSuccessCallback('loadedUser');
  });

  ok(!connectedUser, 'should not connect user until all promises are loaded');
  ok(!connectedPost, 'should not connect post until all promises are loaded');
  ok(!connectedChild, 'should not connect child until all promises are loaded');
  ok(isLoading, 'should still be loading');

  Ember.run(function() {
    postSuccessCallback('loadedPost');
  });

  equal(connectedUser, 'loadedUser', 'should connect user after success callback');
  equal(connectedPost, 'loadedPost', 'should connect post after success callback');
  ok(connectedChild, "should connect child's outlets after success callback");
  ok(!isLoading, 'should not be loading');
});

test("should handle early promise failure", function() {
  router.route('/users/1/posts/1');

  ok(userFailureCallback, 'precond - has failureCallback');

  raises(function() {
    userFailureCallback('failedUser');
  }, "Unable to load record.", "should throw exception on failure");

  ok(!connectedUser, 'should not connect user after early failure');
  ok(!connectedPost, 'should not connect post after early failure');
  ok(!connectedChild, 'should not connect child after early failure');
});

test("should handle late promise failure", function() {
  router.route('/users/1/posts/1');

  userSuccessCallback('loadedUser');

  ok(postFailureCallback, 'precond - has failureCallback');

  raises(function() {
    postFailureCallback('failedPost');
  }, "Unable to load record.", "should throw exception on failure");

  ok(!connectedUser, 'should not connect user after late failure');
  ok(!connectedPost, 'should not connect post after late failure');
  ok(!connectedChild, 'should not connect child after late failure');
});

test("should stop promises if new route is targeted", function() {
  router.route('/users/1/posts/1');

  userSuccessCallback('loadedUser');

  ok(!connectedOther, 'precond - has not yet connected other');

  Ember.run(function() {
    router.route('/other');
  });

  ok(connectedOther, 'should connect other');

  postSuccessCallback('loadedPost');

  ok(!connectedUser, 'should not connect user after reroute');
  ok(!connectedPost, 'should not connect post after reroute');
  ok(!connectedChild, 'should not connect child after reroute');
});

test("should stop promises if transitionTo is called", function() {
  router.route('/users/1/posts/1');

  userSuccessCallback('loadedUser');

  ok(!connectedOther, 'precond - has not yet connected other');

  Ember.run(function() {
    router.transitionTo('other');
  });

  ok(connectedOther, 'should connect other');

  postSuccessCallback('loadedPost');

  ok(!connectedUser, 'should not connect user after reroute');
  ok(!connectedPost, 'should not connect post after reroute');
  ok(!connectedChild, 'should not connect child after reroute');
});

module("default serialize and deserialize without modelType", {
  setup: function() {
    window.TestApp = Ember.Namespace.create();
    window.TestApp.Post = Ember.Object.extend();
    window.TestApp.Post.find = function(id) {
      if (id === "1") { return firstPost; }
    };

    firstPost = window.TestApp.Post.create({ id: 1 });

    router = Ember.Router.create({
      namespace: window.TestApp,

      location: {
        setURL: function(passedURL) {
          url = passedURL;
        }
      },

      root: Ember.Route.extend({
        post: Ember.Route.extend({
          route: '/posts/:post_id',

          connectOutlets: function(router, post) {
            equal(post, firstPost, "the post should have deserialized correctly");
          }
        })
      })
    });
  },

  teardown: function() {
    window.TestApp = undefined;
  }
});



test("should use a specified String `modelType` in the default `serialize`", function() {
  router.transitionTo('post', firstPost);
  equal(url, "/posts/1");
});

test("should use a specified String `modelType` in the default `deserialize`", function() {
  expect(1);

  router.route("/posts/1");
});

module("redirectsTo");

test("if a leaf state has a redirectsTo, it automatically transitions into that state", function() {
   var router = Ember.Router.create({
     location: 'none',
     root: Ember.Route.create({

       index: Ember.Route.create({
         route: '/',
         redirectsTo: 'someOtherState'
       }),

       someOtherState: Ember.Route.create({
         route: '/other'
       })
     })
  });

  Ember.run(function() {
    router.route("/");
  });

  equal(router.get('currentState.path'), "root.someOtherState");
});

test("you cannot define connectOutlets AND redirectsTo", function() {
  raises(function() {
    Ember.Router.create({
      location: 'none',
      root: Ember.Route.create({
        index: Ember.Route.create({
          route: '/',
          redirectsTo: 'someOtherState',
          connectOutlets: function() {}
        })
      })
    });
  });
});

test("you cannot have a redirectsTo in a non-leaf state", function () {
  raises(function() {
    Ember.Router.create({
      location: 'none',
      root: Ember.Route.create({
        redirectsTo: 'someOtherState',

        index: Ember.Route.create()
      })
    });
  });
});

module("urlFor");

var formatURLArgument = null;
var locationStub = {
  formatURL: function(url) {
    formatURLArgument = url;
    return url;
  },
  setURL: Ember.K
};
var expectURL = function(url) {
  equal(formatURLArgument, url, "should invoke formatURL with URL "+url);
};

test("urlFor returns an absolute route", function() {
  expect(2);

  var router = Ember.Router.create({
    location: locationStub,
    root: Ember.Route.create({
      dashboard: Ember.Route.create({
        route: '/dashboard'
      })
    })
  });

  var url = router.urlFor('root.dashboard');
  equal(url, '/dashboard');
  expectURL('/dashboard');
});

test("urlFor raises an error when route property is not defined", function() {
  var router = Ember.Router.create({
    location: locationStub,
    root: Ember.Route.create({
      dashboard: Ember.Route.create({}) // state without route property
    })
  });

  raises(function (){
    router.urlFor('root.dashboard');
  });
});

test("urlFor supports dynamic segments", function() {
  var router = Ember.Router.create({
    location: locationStub,

    root: Ember.Route.create({
      dashboard: Ember.Route.create({
        route: '/dashboard',

        posts: Ember.Route.create({
          route: '/posts/:post_id'
        })
      })
    })
  });

  var url = router.urlFor('root.dashboard.posts', { post_id: 1 });
  equal(url, "/dashboard/posts/1");
  expectURL('/dashboard/posts/1');
});

test("urlFor supports using the current information for dynamic segments", function() {
  var router = Ember.Router.create({
    location: locationStub,
    namespace: {
      Post: {
        toString: function() { return "Post"; },
        find: function() { return { id: 1 }; }
      }
    },

    root: Ember.Route.create({
      dashboard: Ember.Route.create({
        route: '/dashboard',

        posts: Ember.Route.create({
          route: '/posts/:post_id',

          index: Ember.Route.create({
            route: '/'
          }),

          manage: Ember.Route.create({
            route: '/manage'
          })
        })
      })
    })
  });

  Ember.run(function() {
    router.route('/dashboard/posts/1');
  });

  var url = router.urlFor('root.dashboard.posts.manage');
  equal(url, '/dashboard/posts/1/manage');
  expectURL('/dashboard/posts/1/manage');
});

test("urlFor supports merging the current information for dynamic segments", function() {
  var router = Ember.Router.create({
    location: locationStub,
    namespace: {
      Post: {
        toString: function() { return "Post"; },
        find: function() { return { id: 1 }; }
      },

      Widget: {
        toString: function() { return "Widget"; },
        find: function() { return { id: 2 }; }
      }
    },

    root: Ember.Route.create({
      dashboard: Ember.Route.create({
        route: '/dashboard',

        posts: Ember.Route.create({
          route: '/posts/:post_id',

          index: Ember.Route.create({
            route: '/'
          }),

          manage: Ember.Route.create({
            route: '/manage/:widget_id'
          })
        })
      })
    })
  });

  Ember.run(function() {
    router.route('/dashboard/posts/1');
  });

  var url = router.urlFor('root.dashboard.posts.manage', { widget_id: 2 });
  equal(url, '/dashboard/posts/1/manage/2');
  expectURL('/dashboard/posts/1/manage/2');
});

test("navigateAway is called if the URL changes", function() {
  var navigated = 0;

  var router = Ember.Router.create({
    location: locationStub,
    root: Ember.Route.create({
      index: Ember.Route.create({
        route: '/',

        navigateAway: function(router) {
          navigated++;
        }
      }),

      show: Ember.Route.create({
        route: '/show'
      })
    })
  });

  Ember.run(function() {
    router.route('/');
  });

  equal(router.get('currentState.path'), 'root.index', "The current state is root.index");

  Ember.run(function() {
    router.route('/show');
  });

  equal(router.get('currentState.path'), 'root.show', "The current state is root.index");
  equal(navigated, 1, "The navigateAway method was called");
});
