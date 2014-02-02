// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            portions copyright @2011 Apple Inc.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

/*global module test htmlbody ok equals same stop start */

(function() {
var pane = SC.ControlTestPane.design()
  .add("progress basic", SC.ProgressView, {
    layout: {top:0, bottom:0, left:0, width: 250},
    value: 25,
    minimum: 0,
    maximum: 100
  })
  .add("progress disabled", SC.ProgressView, {
    layout: {top:0, bottom:0, left:0, width: 250},
    value: 0,
    minimum: 0,
    maximum: 100,
    isEnabled: NO
  })
  .add("progress basic value 0", SC.ProgressView, {
    layout: {top:0, bottom:0, left:0, width: 250},
    value: 0,
    minimum: 0,
    maximum: 100
  })
  .add("progress basic value 100", SC.ProgressView, {
    layout: {top:0, bottom:0, left:0, width: 250},
    value: 100,
    minimum: 0,
    maximum: 100
  })
  .add("progress basic max 50", SC.ProgressView, {
    layout: {top:0, bottom:0, left:0, width: 250},
    value: 25,
    minimum: 0,
    maximum: 50
  })
  .add("progress basic min max", SC.ProgressView, {
    layout: {top:0, bottom:0, left:0, width: 250},
    value: 75,
    minimum: 50,
    maximum: 100
  })
  .add("progress aria-role", SC.ProgressView, {
    layout: {top:0, bottom:0, left:0, width: 250},
    value: 10,
    minimum: 0,
    maximum: 50
  })
  .add("progress aria-valuemax", SC.ProgressView, {
    layout: {top:0, bottom:0, left:0, width: 250},
    value: 40,
    minimum: 0,
    maximum: 100
  })
  .add("progress aria-valuemin", SC.ProgressView, {
    layout: {top:0, bottom:0, left:0, width: 250},
    value: 20,
    minimum: 0,
    maximum: 100
  })
  .add("progress aria-valuenow", SC.ProgressView, {
    layout: {top:0, bottom:0, left:0, width: 250},
    value: 40,
    minimum: 0,
    maximum: 100
  })
  .add("progress aria-valuetext", SC.ProgressView, {
    layout: {top:0, bottom:0, left:0, width: 250},
    value: 20,
    minimum: 0,
    maximum: 100
  })
  .add("progress aria-disabled", SC.ProgressView, {
    layout: {top:0, bottom:0, left:0, width: 250},
    value: 50,
    minimum: 0,
    maximum: 100,
    isEnabled: NO
  }).add("progress indeterminate", SC.ProgressView, {
      layout: {top:0, bottom:0, left:0, width: 250},
      isIndeterminate: YES
  });

// ..........................................................
// TEST VIEWS
//
module("SC.ProgressView UI", {
  setup: function(){
    htmlbody('<style> .sc-static-layout { border: 1px red dotted; } </style>');
    pane.standardSetup().setup();
  },
  teardown: function(){
    pane.standardSetup().teardown();
    clearHtmlbody();
  }
});

test("basic", function() {

  var view = pane.view('progress basic');

  ok(!view.$().hasClass('disabled'), 'should NOT have disabled class');
  ok(view.$('.track').length > 0, 'should have track class');
  ok(view.$('.content').length > 0, 'should have content class');
  equals(view.$('.content')[0].style.width, "25%", 'width should be 25%');

  // browsers compute the width after % adjustment differently.  just be close
  var v = (SC.browser.isIE || SC.browser.isMozilla || SC.browser.isChrome) ? 63 : 62;
  equals(view.$('.content').width(), v, 'pixel width ');

});

test("disabled", function() {

  var view = pane.view('progress disabled');

  ok(view.$().hasClass('disabled'), 'should have disabled class');
  ok(view.$('.content').length > 0, 'should have content class');
  equals(view.$('.content')[0].style.width, "0%", 'width should be 0%');
  equals(view.$('.content').width(), 0, 'pixel width ');

});

test("indeterminate", function() {

  var view = pane.view('progress indeterminate');

  ok(!view.$().hasClass('disabled'), 'should NOT have disabled class');
  ok(view.$().hasClass('indeterminate'), 'should have indeterminate class');
  ok(view.$('.content').length > 0, 'should have content class');
  equals(view.$('.content')[0].style.width, "100%", 'width should be 100%');

});

test("basic value 0", function() {

  var view = pane.view('progress basic value 0');

  ok(!view.$().hasClass('disabled'), 'should NOT have disabled class');
  ok(view.$('.content').length > 0, 'should have content class');
  equals(view.$('.content')[0].style.width, "0%", 'width should be 0%');
  equals(view.$('.content').width(), 0, 'pixel width ');

});

test("basic value 100", function() {

  var view = pane.view('progress basic value 100');

  ok(!view.$().hasClass('disabled'), 'should NOT have disabled class');
  ok(view.$('.content').length > 0, 'should have content class');
  equals(view.$('.content')[0].style.width, "100%", 'width should be 100%');
  equals(view.$('.content').width(), 250, 'pixel width ');

  // Check that the sc-complete class is added
  ok(view.$().hasClass('sc-complete'), 'should have sc-complete class');

});

test("basic max 50", function() {

  var view = pane.view('progress basic max 50');

  ok(!view.$().hasClass('disabled'), 'should NOT have disabled class');
  ok(view.$('.content').length > 0, 'should have content class');
  equals(view.$('.content')[0].style.width, "50%", 'width should be 50%');
  equals(view.$('.content').width(), 125, 'pixel width ');

});

test("basic min max", function () {
  var view = pane.view('progress basic min max');

  ok(!view.$().hasClass('disabled'), 'should NOT have disabled class');
  ok(view.$('.content').length > 0, 'should have content class');
  equals(view.$('.content')[0].style.width, "50%", 'width should be 50%');
  equals(view.$('.content').width(), 125, 'pixel width ');
})

// ..........................................................
// TEST CHANGING PROGRESS BARS
//

test("changing value from empty -> value", function() {
  var view = pane.view('progress basic value 0');

  equals(view.$('.content').width(), 0, 'precon - pixel width should be 0');
  SC.RunLoop.begin();
  view.set('value', 50);
  SC.RunLoop.end();
  equals(view.$('.content')[0].style.width, "50%", 'width should be 50%');

  var assertions = function(){
    equals(view.$('.content').width(), 125, 'pixel width ');
    start();
  };

  stop();
  setTimeout(assertions, 200);
});

test("changing value from full -> empty", function() {
  var view = pane.view('progress basic value 100');

  // Check that the sc-complete class is added
  ok(view.$().hasClass('sc-complete'), 'should have sc-complete class');

  equals(view.$('.content').width(), 250, 'precon - pixel width should be 316');
  SC.RunLoop.begin();
  view.set('value', 0);
  SC.RunLoop.end();
  equals(view.$('.content')[0].style.width, "0%", 'width should be 0%');
  var assertions = function(){
    equals(view.$('.content').width(), 0, 'pixel width ');
    start();
  };

  stop();
  setTimeout(assertions, 200);


});


test("changing value from full -> negative number", function() {
  var view = pane.view('progress basic value 100');

  SC.RunLoop.begin();
  view.set('value', 100);
  SC.RunLoop.end();

  // Check that the sc-complete class is added
  ok(view.$().hasClass('sc-complete'), 'should have sc-complete class');

  SC.RunLoop.begin();
  view.set('value', -10);
  SC.RunLoop.end();
  equals(view.$('.content')[0].style.width, "0%", 'width should be 0%');
  var assertions = function(){
    equals(view.$('.content').width(), 0, 'pixel width ');
    start();
  };

  stop();
  setTimeout(assertions, 200);

});

test("changing value to over maximum", function() {
  var view = pane.view('progress basic');

  // browsers compute the width after % adjustment differently.  just be close
  var v = (SC.browser.isIE || SC.browser.isMozilla || SC.browser.isChrome) ? 63 : 62;
  equals(view.$('.content').width(), v, 'precon - pixel width should be fixed');
  SC.RunLoop.begin();
  view.set('value', 110);
  SC.RunLoop.end();
  equals(view.$('.content')[0].style.width, "100%", 'width should be 100%');

  // Check that the sc-complete class is added
  ok(view.$().hasClass('sc-complete'), 'should have sc-complete class');

  var assertions = function(){
    equals(view.$('.content').width(), 250, 'pixel width ');
    start();
  };

  stop();
  setTimeout(assertions, 200);
});

test("changing value to a string", function() {
  var view = pane.view('progress basic');

  SC.RunLoop.begin();
  view.set('value', 25);
  SC.RunLoop.end();

  SC.RunLoop.begin();
  view.set('value', 'aString');
  SC.RunLoop.end();
  equals(view.$('.content')[0].style.width, "0%", 'width should be 0%');
  var assertions = function(){
    equals(view.$('.content').width(), 0, 'pixel width ');
    start();
  };

  stop();
  setTimeout(assertions, 200);
});

test("on indeterminate state animation respects start,stop", function() {

    var view = pane.view('progress indeterminate');

    SC.RunLoop.begin();
    view.set('isRunning', YES);
    SC.RunLoop.end();

    var currentBgPos = view.$('.content .middle').css('background-position');

    var assertionsOnStart = function(){
        ok(view.$().hasClass('indeterminate'), 'should have indeterminate class');
        ok(view.$().hasClass('running'), 'should have running class');

        var newBgPos = view.$('.content .middle').css('background-position');
        if(SC.platform.supportsCSSTransitions) {
            ok((currentBgPos === newBgPos), 'bg pos should NOT have changed on platforms that support css transitions (old was '+currentBgPos+' new is: '+newBgPos+')');
        } else {
            ok(!(currentBgPos === newBgPos), 'bg pos should have changed (old was '+currentBgPos+' new is: '+newBgPos+')');
        }

        SC.RunLoop.begin();
        view.set('isRunning', NO);
        SC.RunLoop.end();

        currentBgPos = view.$('.content .middle').css('background-position');

        var assertionsOnStop = function(){
            newBgPos = view.$('.content .middle').css('background-position');
            ok((currentBgPos === newBgPos), 'after stopping, bg pos should NOT have changed (old was '+currentBgPos+' new is: '+newBgPos+')');

            start();
        };

        setTimeout(assertionsOnStop, 400);
    };

    stop();
    setTimeout(assertionsOnStart, 500);

});

test("Check if aria role is set to progress view", function() {
  var viewElem = pane.view('progress aria-role').$();
  ok(viewElem.attr('role') === 'progressbar', 'aria-role is set to the progress view');
});

test("Check if attribute aria-valuemax is set correctly", function() {
  var viewElem = pane.view('progress aria-valuemax').$();
  equals(viewElem.attr('aria-valuemax'), 100, 'aria-valuemax should be 100');
});

test("Check if attribute aria-valuemin is set correctly", function() {
  var viewElem = pane.view('progress aria-valuemin').$();
  equals(viewElem.attr('aria-valuemin'), 0, 'aria-valuemin should be 0');
});

test("Check if attribute aria-valuenow is set correctly", function() {
  var viewElem = pane.view('progress aria-valuenow').$();
  equals(viewElem.attr('aria-valuenow'), 40, 'aria-valuenow should be 40');
});

test("Check if attribute aria-valuetext is set correctly", function() {
  var viewElem = pane.view('progress aria-valuetext').$();
  equals(viewElem.attr('aria-valuetext'), 20, 'aria-valuetext should be 20');
});

})();
