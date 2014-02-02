// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

/*global module test htmlbody ok equals same stop start */

(function() {
  var pane = SC.ControlTestPane.design()
  .add("with valid value", SC.View.extend(SC.Validatable), {
    value: SC.Object.create({ data: 'here is some data' })
  })

  .add("with error value", SC.View.extend(SC.Validatable), {
    value: SC.Error.create({ errorValue: 'bad data', message: 'Input is bad' })
  });

pane.verifyInvalid = function(view, isInvalid) {
  var layer = view.$();
  if (isInvalid) {
    ok(layer.hasClass('invalid'), 'layer should have invalid class');
  }
  else {
    ok(!layer.hasClass('invalid'), 'layer should not have invalid class');
  }
};


// ..........................................................
// TEST INITIAL STATES
//

module('SC.Validatable ui', pane.standardSetup());

test("with valid value", function() {
  var view = pane.view('with valid value');
  pane.verifyInvalid(view, NO);
});

test("with invalid value", function() {
  var view = pane.view('with error value');
  pane.verifyInvalid(view, YES);
});


// ..........................................................
// TEST CHANGING VIEWS
//

test("changing from invalid to valid", function() {
  var view = pane.view('with error value');

  SC.RunLoop.begin();
  view.set('value', 'not an SC.Error instance');
  SC.RunLoop.end();

  pane.verifyInvalid(view, NO);
});

test("changing from valid to invalid", function() {
  var view = pane.view('with valid value');

  SC.RunLoop.begin();
  view.set('value', SC.Error.create());
  SC.RunLoop.end();

  pane.verifyInvalid(view, YES);
});

})();
