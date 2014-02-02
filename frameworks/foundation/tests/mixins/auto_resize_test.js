// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

/*global module, test, equals,ok */

var view;

/** Test the SC.View states. */
module("SC.AutoResize", {

  setup: function () {
    view = SC.LabelView.create(SC.AutoResize, {
      layout: { left: 0, height: 40 },
      value: "The bottom line, Williams said, is that the internet is “a giant machine designed to give people what they want.” It’s not a utopia. It’s not magical. It’s simply an engine of convenience. Those who can tune that engine well — who solve basic human problems with greater speed and simplicity than those who came before — will profit immensely. Those who lose sight of basic human needs — who want to give people the next great idea — will have problems. “We often think of the internet enables you to do new things,” Williams said. “But people just want to do the same things they’ve always done.”"
    });
  },

  teardown: function () {
    view.destroy();
    view = null;
  }

});

test("Resize with transition plugin - no conflict", function () {
  stop(700);

  var pane = SC.Pane.create({
    layout: { top: 200, left: 0, width: 200, height: 200 }
  });

  view.set('transitionIn', SC.View.SLIDE_IN);

  SC.run(function () {
    pane.appendChild(view);
    equals(view.get('layout').width, 10, 'width is');
    equals(view.get('layout').left, 0, 'left is');
    pane.append();
  });

  setTimeout(function () {
    ok(view.get('layout').width > 2000, 'width is > 2000');
    equals(view.get('layout').left, 0, 'left is');

    pane.destroy();
    pane.remove();

    start();
  }, 500);
});

test("Resize with transition plugin - conflict", function () {
  stop(2000);

  var pane = SC.Pane.create({
    layout: { top: 200, left: 0, width: 200, height: 200 }
  });

  view.set('transitionIn', {
    setup: function (view, options, finalLayout, finalFrame) {
      view.adjust({ width: 100 });
    },

    // Width transition plugin.
    run: function (view, options, finalLayout, finalFrame) {
      view.animate('width', finalFrame.width, { duration: 0.5 }, function (data) {
        this.didTransitionIn();
      });
    }
  });

  SC.run(function () {
    pane.appendChild(view);
    equals(view.get('layout').width, 10, 'width is');
    pane.append();
  });

  setTimeout(function () {
    var jqEl = view.$();

    ok(jqEl.width() > 10, 'width is > 10: %@'.fmt(jqEl.width()));
    ok(jqEl.width() < 3000, 'width is < 3000: %@'.fmt(jqEl.width()));
    ok(view.get('layout').width > 3000, 'layout.width is > 3000: %@'.fmt(view.get('layout').width));
  }, 200);

  setTimeout(function () {
    var jqEl = view.$();
    ok(jqEl.width() > 3000, 'width is > 3000: %@'.fmt(jqEl.width()));
    ok(view.get('layout').width > 3000, 'width is > 3000: %@'.fmt(view.get('layout').width));

    SC.run(function () {
      pane.destroy();
      pane.remove();
    });

    start();
  }, 700);
});


test("Resize with child view layout", function () {
  stop(700);

  var pane, view2;

  SC.run(function () {
    pane = SC.Pane.create({
      childViews: ['a', 'b'],
      layout: { top: 200, left: 0, width: 200, height: 200 },
      childViewLayout: SC.View.HORIZONTAL_STACK,

      a: SC.View.extend({
        layout: { width: 100 }
      }),

      b: SC.View.extend({
        layout: { width: 50 }
      })
    });

    pane.appendChild(view);
    equals(view.get('layout').width, 10, 'width is');
    equals(view.get('layout').left, 0, 'left is');
    pane.append();

    view2 = SC.View.create({
      layout: { width: 100 }
    });
    pane.appendChild(view2);
  });

  setTimeout(function () {
    ok(view.get('layout').width > 2000, 'width is > 2000');
    equals(view.get('layout').left, 150, 'left is');
    ok(view2.get('layout').left > 2000, 'left: %@ is > 2000'.fmt(view2.get('layout').left));

    pane.destroy();
    pane.remove();

    start();
  }, 500);
});
