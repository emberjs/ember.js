// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2013 7x7 Software, Inc.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

/*global module, test, equals, ok, start, stop */

var view,
  pane;

/** Test the SC.View states. */
module("SC.View Transition States", {

  setup: function () {
    view = SC.View.create();
    pane = SC.Pane.create({
      layout: { width: 400, height: 400 }
    });
  },

  teardown: function () {
    view.destroy();
    pane.destroy();
    view = pane = null;
  }

});

/** */
// test("Reversing SHOWING to HIDDEN: FADE_IN", function () {
//   stop(2000);

//   view.set('isVisible', false);
//   SC.run(function () {
//     pane.appendChild(view);
//     pane.append();
//   });

//   // Test assumption.
//   equals(view.get('isVisible'), false, "The isVisible property of the view is");
//   ok(view.$().hasClass('sc-hidden'), "The view has sc-hidden class name.");
//   equals(view.$().css('opacity'), '1', "The view's opacity is");

//   view.set('transitionShow', SC.View.FADE_IN);
//   SC.run(function () {
//     view.set('isVisible', true);
//   });
//   equals(view.$().css('opacity'), '0', "The view's opacity is");

//   setTimeout(function () {
//     var jqEl = view.$();

//     // Test assumption.
//     equals(view.get('isVisible'), true, "The isVisible property of the view is");
//     ok(!jqEl.hasClass('sc-hidden'), "The view doesn't have sc-hidden class name.");
//     ok(jqEl.css('opacity') > 0, "The view's opacity is not 0.");
//     ok(jqEl.css('opacity') < 1, "The view's opacity is not 1.");

//     SC.run(function () {
//       view.set('isVisible', false);
//     });

//     jqEl = view.$();
//     equals(view.get('isVisible'), false, "The isVisible property of the view is");
//     ok(jqEl.hasClass('sc-hidden'), "The view has sc-hidden class name.");
//     equals(jqEl.css('opacity'), '1', "The view's opacity is");

//     start();
//   }, 200);
// });

/** */
test("Reversing SHOWING to HIDING: FADE_IN & FADE_OUT", function () {
  stop(2000);

  view.set('isVisible', false);
  SC.run(function () {
    pane.appendChild(view);
    pane.append();
  });

  // Test assumption.
  equals(view.get('isVisible'), false, "The isVisible property of the view is");
  ok(view.$().hasClass('sc-hidden'), "The view has sc-hidden class name.");
  equals(view.$().css('opacity'), '1', "The view's opacity is");

  view.set('transitionShow', SC.View.FADE_IN);
  view.set('transitionHide', SC.View.FADE_OUT);
  SC.run(function () {
    view.set('isVisible', true);
  });
  equals(view.$().css('opacity'), '0', "The view's opacity is");

  setTimeout(function () {
    var jqEl = view.$();

    // Test assumption.
    equals(view.get('isVisible'), true, "The isVisible property of the view is");
    ok(!jqEl.hasClass('sc-hidden'), "The view doesn't have sc-hidden class name.");
    ok(jqEl.css('opacity') > 0, "The view's opacity is not 0.");
    ok(jqEl.css('opacity') < 1, "The view's opacity is not 1.");

    SC.run(function () {
      view.set('isVisible', false);
    });

    jqEl = view.$();
    equals(view.get('isVisible'), false, "The isVisible property of the view is");
    ok(!jqEl.hasClass('sc-hidden'), "The view doesn't have sc-hidden class name.");
    ok(jqEl.css('opacity') > 0, "The view's opacity is not 0 still.");
    equals(view.$().css('opacity'), '1', "The view's opacity is");
  }, 200);

  setTimeout(function () {
    var jqEl = view.$();

    // Test assumption.
    equals(view.get('isVisible'), false, "The isVisible property of the view is");
    ok(!jqEl.hasClass('sc-hidden'), "The view doesn't have sc-hidden class name.");
    ok(jqEl.css('opacity') > 0, "The view's opacity is not 0.");
    ok(jqEl.css('opacity') < 1, "The view's opacity is not 1.");
  }, 400);

  setTimeout(function () {
    var jqEl = view.$();

    SC.RunLoop.begin().end();
    // Test assumption.
    equals(view.get('isVisible'), false, "The isVisible property of the view is");
    ok(jqEl.hasClass('sc-hidden'), "The view has sc-hidden class name.");
    ok(view._layoutStyleNeedsUpdate, "The view's layout needs update");

    start();
  }, 1500);
});


/** */
test("Reversing HIDING to SHOWN: FADE_OUT", function () {
  stop(2000);

  SC.run(function () {
    pane.appendChild(view);
    pane.append();
  });

  // Test assumption.
  equals(view.get('isVisible'), true, "The isVisible property of the view is");
  ok(!view.$().hasClass('sc-hidden'), "The view doesn't have sc-hidden class name.");
  equals(view.$().css('opacity'), '1', "The view's opacity is");

  view.set('transitionHide', SC.View.FADE_OUT);
  SC.run(function () {
    view.set('isVisible', false);
  });
  equals(view.$().css('opacity'), '1', "The view's opacity is");

  // Fading out.
  setTimeout(function () {
    var jqEl = view.$();

    // Test assumption.
    equals(view.get('isVisible'), false, "The isVisible property of the view is");
    ok(!jqEl.hasClass('sc-hidden'), "The view doesn't have sc-hidden class name.");
    ok(jqEl.css('opacity') > 0, "The view's opacity is not 0.");
    ok(jqEl.css('opacity') < 1, "The view's opacity is not 1.");

    // Cancel fading out.
    SC.run(function () {
      view.set('isVisible', true);
    });

    jqEl = view.$();
    equals(view.get('isVisible'), true, "The isVisible property of the view is");
    ok(!jqEl.hasClass('sc-hidden'), "The view doesn't have sc-hidden class name.");
    equals(jqEl.css('opacity'), '1', "The view's opacity is now");

    start();
  }, 200);
});


/** */
test("Reversing HIDING to SHOWING: FADE_IN & FADE_OUT", function () {
  stop(2000);

  SC.run(function () {
    pane.appendChild(view);
    pane.append();
  });

  // Test assumption.
  equals(view.get('isVisible'), true, "The isVisible property of the view is");
  ok(!view.$().hasClass('sc-hidden'), "The view doesn't have sc-hidden class name.");
  equals(view.$().css('opacity'), '1', "The view's opacity is");

  view.set('transitionShow', SC.View.FADE_IN);
  view.set('transitionHide', SC.View.FADE_OUT);
  SC.run(function () {
    view.set('isVisible', false);
  });
  equals(view.$().css('opacity'), '1', "The view's opacity is");

  setTimeout(function () {
    var jqEl = view.$();

    // Test assumption.
    equals(view.get('isVisible'), false, "The isVisible property of the view is");
    ok(!jqEl.hasClass('sc-hidden'), "The view doesn't have sc-hidden class name.");
    ok(jqEl.css('opacity') > 0, "The view's opacity is not 0.");
    ok(jqEl.css('opacity') < 1, "The view's opacity is not 1.");

    // Cancel fading out.
    SC.run(function () {
      view.set('isVisible', true);
    });

    jqEl = view.$();
    equals(view.get('isVisible'), true, "The isVisible property of the view is");
    ok(!jqEl.hasClass('sc-hidden'), "The view doesn't have sc-hidden class name.");
    equals(view.$().css('opacity'), '0', "The view's opacity is");
  }, 200);

  setTimeout(function () {
    var jqEl = view.$();

    // Test assumption.
    equals(view.get('isVisible'), true, "The isVisible property of the view is");
    ok(!jqEl.hasClass('sc-hidden'), "The view doesn't have sc-hidden class name.");
    equals(jqEl.css('opacity'), '1', "The view's opacity is now");

    start();
  }, 1000);
});
