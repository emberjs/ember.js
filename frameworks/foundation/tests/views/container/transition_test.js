// ==========================================================================
// Project:   SproutCore
// Copyright: @2012 7x7 Software, Inc.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================
/*global module, test, ok, equals*/


var containerView,
  pane,
  view1, view2;

module("SC.ContainerView Transitions", {
  setup: function () {
    SC.run(function () {
      view1 = SC.View.create({
        toString: function () { return 'View 1'; }
      });

      view2 = SC.View.create({
        toString: function () { return 'View 2'; }
      });

      containerView = SC.ContainerView.create({
        nowShowing: view1
      });

      pane = SC.Pane.create({
        layout: { width: 200, height: 200, left: 0, top: 0 },
        childViews: [containerView]
      }).append();
    });

    SC.run(function () {
      containerView.awake();
    });
  },

  teardown: function () {
    pane.remove();
    containerView = pane = view1 = view2 = null;
  }
});


test("Test assumptions on the initial state of the container and views.", function () {
  ok(!containerView.get('isTransitioning'), "Container view should not indicate that it is transitioning.");
  ok(containerView.get('childViews').contains(view1), "View 1 should be a child view of container.");
  ok(!containerView.get('childViews').contains(view2), "View 2 should not be a child view of container.");
});


test("Test that the default transition (null) simply swaps the views.", function () {
  containerView.set('nowShowing', view2);

  equals(containerView.get('contentView'), view2, "Container's contentView should be");
  ok(!containerView.get('childViews').contains(view1), "View 1 should no longer be a child view of container.");
});

test("Test that the isTransitioning property of container view updates accordingly.", function () {
  // Pause the test execution.
  window.stop(2000);

  SC.run(function () {
    containerView.set('transitionSwap', SC.ContainerView.PUSH);
    containerView.set('nowShowing', view2);
  });

  ok(containerView.get('isTransitioning'), "Container view should indicate that it is transitioning.");

  setTimeout(function () {
    ok(!containerView.get('isTransitioning'), "Container view should not indicate that it is transitioning.");

    window.start();
  }, 1000);
});

test("Test changing nowShowing while the container is already transitioning with pre-initialized views: DISSOLVE.", function () {
  // Pause the test execution.
  window.stop(2000);

  SC.run(function () {
    containerView.set('transitionSwap', SC.ContainerView.DISSOLVE);
    containerView.set('nowShowing', view2);
  });

  setTimeout(function () {
    SC.run(function () {
      containerView.set('nowShowing', view1);
    });
  }, 100);

  setTimeout(function () {
    SC.run(function () {
      containerView.set('nowShowing', view2);
    });
  }, 150);

  setTimeout(function () {
    ok(!containerView.get('isTransitioning'), "Container view should not indicate that it is transitioning.");

    window.start();
  }, 1500);
});

test("Test changing nowShowing while the container is already transitioning with pre-initialized views: MOVE_IN.", function () {
  // Pause the test execution.
  window.stop(2000);

  SC.run(function () {
    containerView.set('transitionSwap', SC.ContainerView.MOVE_IN);
    containerView.set('nowShowing', view2);
  });

  setTimeout(function () {
    SC.run(function () {
      containerView.set('nowShowing', view1);
    });
  }, 100);

  setTimeout(function () {
    SC.run(function () {
      containerView.set('nowShowing', view2);
    });
  }, 150);

  setTimeout(function () {
    ok(!containerView.get('isTransitioning'), "Container view should not indicate that it is transitioning.");

    window.start();
  }, 1500);
});


test("Test changing nowShowing while the container is already transitioning with pre-initialized views: REVEAL.", function () {
  // Pause the test execution.
  window.stop(2000);

  SC.run(function () {
    containerView.set('transitionSwap', SC.ContainerView.REVEAL);
    containerView.set('nowShowing', view2);
  });

  setTimeout(function () {
    SC.run(function () {
      containerView.set('nowShowing', view1);
    });
  }, 100);

  setTimeout(function () {
    SC.run(function () {
      containerView.set('nowShowing', view2);
    });
  }, 150);

  setTimeout(function () {
    ok(!containerView.get('isTransitioning'), "Container view should not indicate that it is transitioning.");

    window.start();
  }, 1500);
});

test("Test changing nowShowing while the container is already transitioning with pre-initialized views: PUSH.", function () {
  // Pause the test execution.
  window.stop(2000);

  SC.run(function () {
    containerView.set('transitionSwap', SC.ContainerView.PUSH);
    containerView.set('nowShowing', view2);
  });

  setTimeout(function () {
    SC.run(function () {
      containerView.set('nowShowing', view1);
    });
  }, 100);

  setTimeout(function () {
    SC.run(function () {
      containerView.set('nowShowing', view2);
    });
  }, 150);

  setTimeout(function () {
    ok(!containerView.get('isTransitioning'), "Container view should not indicate that it is transitioning.");

    window.start();
  }, 1500);
});

test("Test changing nowShowing while the container is already transitioning with pre-initialized views: FADE_COLOR.", function () {
  // Pause the test execution.
  window.stop(2000);

  SC.run(function () {
    containerView.set('transitionSwap', SC.ContainerView.FADE_COLOR);
    containerView.set('nowShowing', view2);
  });

  setTimeout(function () {
    SC.run(function () {
      containerView.set('nowShowing', view1);
    });
  }, 100);

  setTimeout(function () {
    SC.run(function () {
      containerView.set('nowShowing', view2);
    });
  }, 150);

  setTimeout(function () {
    ok(!containerView.get('isTransitioning'), "Container view should not indicate that it is transitioning.");

    window.start();
  }, 1500);
});

test("Test that the container view calls the proper transition plugin methods.", function () {
  var willBuildInToViewCalled = 0,
    buildInToViewCalled = 0,
    buildInDidCancelCalled = 0,
    didBuildInToViewCalled = 0,
    willBuildOutFromViewCalled = 0,
    buildOutFromViewCalled = 0,
    buildOutDidCancelCalled = 0,
    didBuildOutFromViewCalled = 0,
    plugin;

  // Pause the test execution.
  window.stop(2000);

  plugin = {
    willBuildInToView: function () { willBuildInToViewCalled++; },
    buildInToView: function (statechart) {
      buildInToViewCalled++;

      setTimeout(function () {
        statechart.entered();
      }, 200);
    },
    buildInDidCancel: function () { buildInDidCancelCalled++; },
    didBuildInToView: function () { didBuildInToViewCalled++; },
    willBuildOutFromView: function () { willBuildOutFromViewCalled++; },
    buildOutFromView: function (statechart) {
      buildOutFromViewCalled++;

      setTimeout(function () {
        statechart.exited();
      }, 200);
    },
    buildOutDidCancel: function () { buildOutDidCancelCalled++; },
    didBuildOutFromView: function () { didBuildOutFromViewCalled++; }
  };

  containerView.set('transitionSwap', plugin);
  containerView.set('nowShowing', view2);
  equals(willBuildInToViewCalled, 1, "willBuildInToViewCalled() should have been called this many times");
  equals(willBuildOutFromViewCalled, 1, "willBuildOutFromViewCalled() should have been called this many times");
  equals(buildInToViewCalled, 1, "buildInToViewCalled() should have been called this many times");
  equals(buildOutFromViewCalled, 1, "buildOutFromViewCalled() should have been called this many times");
  equals(buildInDidCancelCalled, 0, "buildInDidCancelCalled() should have been called this many times");
  equals(buildOutDidCancelCalled, 0, "buildOutDidCancelCalled() should have been called this many times");
  equals(didBuildInToViewCalled, 0, "didBuildInToViewCalled() should have been called this many times");
  equals(didBuildOutFromViewCalled, 0, "didBuildOutFromViewCalled() should have been called this many times");

  SC.run(function () {
    setTimeout(function () {
      equals(buildInDidCancelCalled, 0, "buildInDidCancelCalled() should have been called this many times");
      equals(buildOutDidCancelCalled, 0, "buildOutDidCancelCalled() should have been called this many times");
      equals(didBuildInToViewCalled, 0, "didBuildInToViewCalled() should have been called this many times");
      equals(didBuildOutFromViewCalled, 0, "didBuildOutFromViewCalled() should have been called this many times");
    }, 100);
  });

  setTimeout(function () {
    equals(buildInDidCancelCalled, 0, "buildInDidCancelCalled() should have been called this many times");
    equals(buildOutDidCancelCalled, 0, "buildOutDidCancelCalled() should have been called this many times");
    equals(didBuildInToViewCalled, 1, "didBuildInToViewCalled() should have been called this many times");
    equals(didBuildOutFromViewCalled, 1, "didBuildOutFromViewCalled() should have been called this many times");

    window.start();
  }, 300);
});
