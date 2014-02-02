// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            portions copyright @2011 Apple Inc.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

/*global module, test, ok, equals */

var pane, view, view2, view3, view4;
var appleURL = sc_static('images/sproutcore-512.png'); // 'http://photos4.meetupstatic.com/photos/event/4/6/9/9/600_4518073.jpeg';

module("SC.ScrollView", {
  setup: function () {
    SC.run(function () {
      pane = SC.MainPane.create({
        childViews: [
          SC.ScrollView.extend({
            contentView: SC.ImageView.design({ value: appleURL, layout: { height: 4000, width: 4000 }})
          }),
          SC.ScrollView.extend({
            contentView: SC.ImageView.design({ value: appleURL, layout: { height: 2000, width: 2000 }})
          }),
          SC.ScrollView.extend({
            layout: { height: 400, width: 400 },
            contentView: SC.View.design({
              layout: { height: 500, width: 500 },
              childViews: [
                SC.ScrollView.design({
                  layout: { height: 200, width: 200, centerX: 0, centerY: 0 },
                  contentView: SC.ImageView.design({ value: appleURL, layout: { height: 300, width: 300 }})
                })
              ]
            })
          })
        ],

        expectedVertLine: function (line) {
          var ret = view.get('verticalLineScroll') * line;
          var alt = view.get('maximumVerticalScrollOffset');
          ret = (ret > alt) ? alt : ret;

          return ret;
        },

        expectedHorzLine: function (line) {
          var ret = view.get('horizontalLineScroll') * line;
          var alt = view.get('maximumHorizontalScrollOffset');
          ret = (ret > alt) ? alt : ret;

          return ret;
        },

        expectedVertPage: function (page) {
          var ret = view.get('verticalPageScroll') * page;
          var alt = view.get('maximumVerticalScrollOffset');
          ret = (ret > alt) ? alt : ret;

          return ret;
        },

        expectedHorzPage: function (page) {
          var ret = view.get('horizontalPageScroll') * page;
          var alt = view.get('maximumHorizontalScrollOffset');
          ret = (ret > alt) ? alt : ret;

          return ret;
        }
      });

      pane.append(); // make sure there is a layer...
    });

    view = pane.childViews[0];
    view.get('containerView').get('frame').height = 100;
    view.get('containerView').get('frame').width = 100;

    view2 = pane.childViews[1];
    view2.get('containerView').get('frame').height = 100;
    view2.get('containerView').get('frame').width = 100;

    view3 = pane.childViews[2];
    view4 = view3.get('contentView').get('childViews')[0];
  },

  teardown: function () {
    SC.run(function () {
      pane.destroy();
    });
    pane = view = null;
  }
});



test("Scrolling to a certain co-ordinate of the container view", function () {
  equals(view.get('horizontalScrollOffset'), 0, "Initial horizontal offset must be zero");
  equals(view.get('verticalScrollOffset'), 0, "Initial vertical offset must be zero");

  SC.run(function () {
    view.scrollTo(100, 100);
    equals(view.get('horizontalScrollOffset'), 100, "After scrolling to 100, horizontal offset must be");
    equals(view.get('verticalScrollOffset'), 100, "After scrolling to 100, vertical offset must be");
  });

  SC.run(function () {
    view.scrollTo(5000, 5000);
    equals(view.get('horizontalScrollOffset'), view.get('maximumHorizontalScrollOffset'), "After scrolling to 400, horizontal offset must be maximum");
    equals(view.get('verticalScrollOffset'), view.get('maximumVerticalScrollOffset'), "After scrolling to 400, vertical offset must be maximum");
  });
});

test("Scrolling relative to the current possition of the container view", function () {
  equals(view.get('horizontalScrollOffset'), 0, "Initial horizontal offset must be zero");
  equals(view.get('verticalScrollOffset'), 0, "Initial vertical offset must be zero");

  SC.run(function () {
    view.scrollBy(100, 100);
    equals(view.get('horizontalScrollOffset'), 100, "After scrolling by 100, horizontal offset must be");
    equals(view.get('verticalScrollOffset'), 100, "After scrolling by 100, vertical offset must be");
  });

  SC.run(function () {
    view.scrollBy(100, 100);
    equals(view.get('horizontalScrollOffset'), 200, "After scrolling by 100, horizontal offset must be");
    equals(view.get('verticalScrollOffset'), 200, "After scrolling by 100, vertical offset must be");
  });

  SC.run(function () {
    view.scrollBy(5000, 5000);
    equals(view.get('horizontalScrollOffset'), view.get('maximumHorizontalScrollOffset'), "After scrolling by 400, horizontal offset must be maximum");
    equals(view.get('verticalScrollOffset'), view.get('maximumVerticalScrollOffset'), "After scrolling by 400, vertical offset must be maximum");
  });
});

test("Scrolling through line by line", function () {
  var line = 3;
  equals(view.get('horizontalScrollOffset'), 0, "Initial horizontal offset must be zero");
  equals(view.get('verticalScrollOffset'), 0, "Initial vertical offset must be zero");
  SC.run(function () {
    view.scrollDownLine(line);
  });
  equals(view.get('horizontalScrollOffset'), 0, "After scrolling down by lines, horizontal offset is unchanged");
  equals(view.get('verticalScrollOffset'), pane.expectedVertLine(line), "After scrolling down by lines, vertical offset must be");
  SC.run(function () {
    view.scrollUpLine(line);
  });
});

test("maximumHorizontalScrollOffset() returns the maximum horizontal scroll dimension", function () {
  var old_horizontalScrollOffset = 2;
  var old_verticalScrollOffset = 2;

  SC.run(function () {
    view2.set('horizontalScrollOffset', old_horizontalScrollOffset);
    view2.set('verticalScrollOffset', old_verticalScrollOffset);
    view2.scrollBy(5000, 0);
    equals(view2.get('horizontalScrollOffset'), 1900, 'maximum y coordinate should be 1900');
  });


  SC.run(function () {
    view2.set('horizontalScrollOffset', old_horizontalScrollOffset);
    view2.set('verticalScrollOffset', old_verticalScrollOffset);
    view2.scrollBy(-5000, 0);
    equals(view2.get('horizontalScrollOffset'), 0, 'minimum y coordinate should be 0');
  });

});

test("maximumVerticalScrollOffset() returns the maximum vertical scroll dimension", function () {
  var old_horizontalScrollOffset = 2;
  var old_verticalScrollOffset = 2;

  SC.run(function () {
    view2.set('horizontalScrollOffset', old_horizontalScrollOffset);
    view2.set('verticalScrollOffset', old_verticalScrollOffset);
    view2.scrollBy(0, 5000);
    equals(view2.get('verticalScrollOffset'), 1900, 'maximum coordinate should be 1900');
  });

  SC.run(function () {
    view2.set('horizontalScrollOffset', old_horizontalScrollOffset);
    view2.set('verticalScrollOffset', old_verticalScrollOffset);
    view2.scrollBy(0, -5000);
  });
  equals(view2.get('verticalScrollOffset'), 0, 'The minimum y coordinate should be 0');

});


test("Mouse wheel events should only be captured if the scroll can scroll in the direction (both TOP-LEFT).", function () {
  // FIRST GROUP: everything scrolled all the way to the top left
  SC.run(function () {
    view3.scrollTo(0, 0);
    view4.scrollTo(0, 0);
  });

  // Scrolling further left is not captured by either scroll view
  ok(!view3.mouseWheel({ wheelDeltaX: -10, wheelDeltaY: 0 }), 'The inner scroll view should not capture the mousewheel event since it cannot scroll further.');
  ok(!view4.mouseWheel({ wheelDeltaX: -10, wheelDeltaY: 0 }), 'The outer scroll view should not capture the mousewheel event since it cannot scroll further.');

  // Scrolling further up is not captured by either scroll view
  ok(!view3.mouseWheel({ wheelDeltaX: 0, wheelDeltaY: -10 }), 'The inner scroll view should not capture the mousewheel event since it cannot scroll further.');
  ok(!view4.mouseWheel({ wheelDeltaX: 0, wheelDeltaY: -10 }), 'The outer scroll view should not capture the mousewheel event since it cannot scroll further.');

  // Scrolling down is captured by the target scroll view
  ok(view3.mouseWheel({ wheelDeltaX: 10, wheelDeltaY: 0 }), 'The inner scroll view should capture the mousewheel event since it can scroll further.');
  ok(view4.mouseWheel({ wheelDeltaX: 10, wheelDeltaY: 0 }), 'The outer scroll view should capture the mousewheel event since it can scroll further.');

  // Scrolling right is captured by the target scroll view
  ok(view3.mouseWheel({ wheelDeltaX: 0, wheelDeltaY: 10 }), 'The inner scroll view should capture the mousewheel event since it can scroll further.');
  ok(view4.mouseWheel({ wheelDeltaX: 0, wheelDeltaY: 10 }), 'The outer scroll view should capture the mousewheel event since it can scroll further.');
});

test("Mouse wheel events should only be captured if the scroll can scroll in the direction (both BOTTOM-RIGHT).", function () {
  SC.run(function () {
    view3.scrollTo(114, 114);
    view4.scrollTo(114, 114);
  });

    // Scrolling further right is not captured by either scroll view
  ok(!view3.mouseWheel({ wheelDeltaX: 10, wheelDeltaY: 0 }), 'The inner scroll view should not capture the mousewheel event since it cannot scroll further.');
  ok(!view4.mouseWheel({ wheelDeltaX: 10, wheelDeltaY: 0 }), 'The outer scroll view should not capture the mousewheel event since it cannot scroll further.');

  // Scrolling further down is not captured by either scroll view
  ok(!view3.mouseWheel({ wheelDeltaX: 0, wheelDeltaY: 10 }), 'The inner scroll view should not capture the mousewheel event since it cannot scroll further.');
  ok(!view4.mouseWheel({ wheelDeltaX: 0, wheelDeltaY: 10 }), 'The outer scroll view should not capture the mousewheel event since it cannot scroll further.');

  // Scrolling up is captured by the target scroll view
  ok(view3.mouseWheel({ wheelDeltaX: -10, wheelDeltaY: 0 }), 'The inner scroll view should capture the mousewheel event since it can scroll further.');
  ok(view4.mouseWheel({ wheelDeltaX: -10, wheelDeltaY: 0 }), 'The outer scroll view should capture the mousewheel event since it can scroll further.');

  // Scrolling left is captured by the target scroll view
  ok(view3.mouseWheel({ wheelDeltaX: 0, wheelDeltaY: -10 }), 'The inner scroll view should capture the mousewheel event since it can scroll further.');
  ok(view4.mouseWheel({ wheelDeltaX: 0, wheelDeltaY: -10 }), 'The outer scroll view should capture the mousewheel event since it can scroll further.');
});

test("Mouse wheel events not capturable by the inner scroll should bubble to the outer scroll (scroll right).", function () {
  var elem = view4.get('layer'),
      event;

  SC.run(function () {
    view3.scrollTo(0, 0);
    view4.scrollTo(114, 114);
  });

  window.stop();

  event = SC.Event.simulateEvent(elem, 'mousewheel', { wheelDeltaX: 10, wheelDeltaY: 0 });
  SC.Event.trigger(elem, 'mousewheel', event);

  SC.RunLoop.begin();
  SC.Timer.schedule({ target: this, action: function () {
    equals(view4.get('horizontalScrollOffset'), 114, 'The inner scroll view should still have horizontalScrollOffset');
    equals(view3.get('horizontalScrollOffset'), 10, 'The outer scroll view should now have horizontalScrollOffset');
    window.start();
  }, interval: 200});
  SC.RunLoop.end();
});

test("Mouse wheel events not capturable by the inner scroll should bubble to the outer scroll (scroll down).", function () {
  var elem = view4.get('layer'),
      event;

  SC.run(function () {
    view3.scrollTo(0, 0);
    view4.scrollTo(114, 114);
  });

  window.stop();

  event = SC.Event.simulateEvent(elem, 'mousewheel', { wheelDeltaX: 0, wheelDeltaY: 10 });
  SC.Event.trigger(elem, 'mousewheel', event);

  SC.RunLoop.begin();
  SC.Timer.schedule({ target: this, action: function () {
    equals(view4.get('verticalScrollOffset'), 114, 'The inner scroll view should still have verticalScrollOffset');
    equals(view3.get('verticalScrollOffset'), 10, 'The outer scroll view should now have verticalScrollOffset');
    window.start();
  }, interval: 200});
  SC.RunLoop.end();
});

test("Mouse wheel events not capturable by the inner scroll should bubble to the outer scroll (scroll left).", function () {
  var elem = view4.get('layer'),
      event;

  SC.run(function () {
    view3.scrollTo(114, 114);
    view4.scrollTo(0, 0);

    SC.Timer.schedule({ target: this, action: function () {
      equals(view4.get('horizontalScrollOffset'), 0, 'The inner scroll view should still have horizontalScrollOffset');
      equals(view3.get('horizontalScrollOffset'), 104, 'The outer scroll view should now have horizontalScrollOffset');
      window.start();
    }, interval: 200});
  });

  window.stop();

  event = SC.Event.simulateEvent(elem, 'mousewheel', { wheelDeltaX: -10, wheelDeltaY: 0 });
  SC.Event.trigger(elem, 'mousewheel', event);

});

test("Mouse wheel events not capturable by the inner scroll should bubble to the outer scroll (scroll up).", function () {
  var elem = view4.get('layer'),
      event;

  SC.run(function () {
    view3.scrollTo(114, 114);
    view4.scrollTo(0, 0);
  });

  window.stop();

  event = SC.Event.simulateEvent(elem, 'mousewheel', { wheelDeltaX: 0, wheelDeltaY: -10 });
  SC.Event.trigger(elem, 'mousewheel', event);

  SC.RunLoop.begin();
  SC.Timer.schedule({ target: this, action: function () {
    equals(view4.get('verticalScrollOffset'), 0, 'The inner scroll view should still have verticalScrollOffset');
    equals(view3.get('verticalScrollOffset'), 104, 'The outer scroll view should now have verticalScrollOffset');
    window.start();
  }, interval: 200 });
  SC.RunLoop.end();
});

test("Mouse wheel events capturable by the inner scroll should not bubble to the outer scroll (scroll right).", function () {
  var elem = view4.get('layer'),
      event;

  SC.run(function () {
    view3.scrollTo(0, 0);
    view4.scrollTo(0, 0);
  });

  window.stop();

  event = SC.Event.simulateEvent(elem, 'mousewheel', { wheelDeltaX: 10, wheelDeltaY: 0 });
  SC.Event.trigger(elem, 'mousewheel', event);

  SC.RunLoop.begin();
  SC.Timer.schedule({ target: this, action: function () {
    equals(view4.get('horizontalScrollOffset'), 10, 'The inner scroll view should now have horizontalScrollOffset');
    equals(view3.get('horizontalScrollOffset'), 0, 'The outer scroll view should still have horizontalScrollOffset');
    window.start();
  }, interval: 200 });
  SC.RunLoop.end();
});

test("Mouse wheel events capturable by the inner scroll should not bubble to the outer scroll (scroll up).", function () {
  var elem = view4.get('layer'),
      event;

  SC.run(function () {
    view3.scrollTo(114, 114);
    view4.scrollTo(114, 114);
  });

  window.stop();

  event = SC.Event.simulateEvent(elem, 'mousewheel', { wheelDeltaX: 0, wheelDeltaY: -10 });
  SC.Event.trigger(elem, 'mousewheel', event);

  SC.RunLoop.begin();
  SC.Timer.schedule({ target: this, action: function () {
    equals(view4.get('verticalScrollOffset'), 104, 'The inner scroll view should now have verticalScrollOffset');
    equals(view3.get('verticalScrollOffset'), 114, 'The outer scroll view should still have verticalScrollOffset');
    window.start();
  }, interval: 200 });
  SC.RunLoop.end();
});

test("Mouse wheel events capturable by the inner scroll should not bubble to the outer scroll (scroll left).", function () {
  var elem = view4.get('layer'),
      event;

  SC.run(function () {
    view3.scrollTo(114,  114);
    view4.scrollTo(114,  114);
  });

  window.stop();

  event = SC.Event.simulateEvent(elem, 'mousewheel', { wheelDeltaX: -10, wheelDeltaY: 0 });
  SC.Event.trigger(elem, 'mousewheel', event);

  SC.RunLoop.begin();
  SC.Timer.schedule({ target: this, action: function () {
    equals(view4.get('horizontalScrollOffset'), 104, 'The inner scroll view should now have horizontalScrollOffset');
    equals(view3.get('horizontalScrollOffset'), 114, 'The outer scroll view should still have horizontalScrollOffset');
    window.start();
  }, interval: 200 });
  SC.RunLoop.end();
});

test("Mouse wheel events capturable by the inner scroll should not bubble to the outer scroll (scroll down).", function () {
  var elem = view4.get('layer'),
      event;

  SC.run(function () {
    view3.scrollTo(0, 0);
    view4.scrollTo(0, 0);
  });

  window.stop();

  event = SC.Event.simulateEvent(elem, 'mousewheel', { wheelDeltaX: 0, wheelDeltaY: 10 });
  SC.Event.trigger(elem, 'mousewheel', event);

  SC.RunLoop.begin();
  SC.Timer.schedule({ target: this, action: function () {
    equals(view4.get('verticalScrollOffset'), 10, 'The inner scroll view should now have verticalScrollOffset');
    equals(view3.get('verticalScrollOffset'), 0, 'The outer scroll view should still have verticalScrollOffset');
    window.start();
  }, interval: 200 });
  SC.RunLoop.end();
});
