// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            portions copyright @2011 Apple Inc.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

/*global module test htmlbody ok equals same stop start */
(function() {
  var pane = SC.ControlTestPane.design()
  .add("empty", SC.DateFieldView, {
    hint: "dd/mm/yyyy",
    value: ''
  })

  .add("with value", SC.DateFieldView, {
    hint: "dd/mm/yyyy",
    value: SC.DateTime.create({ day: 1, month: 1, year: 2010 })
  })

  .add("disabled - empty", SC.DateFieldView, {
    hint: "dd/mm/yyyy",
    value: null,
    isEnabled: NO
  })

  .add("disabled - with value", SC.DateFieldView, {
    hint: "dd/mm/yyyy",
    value: SC.DateTime.create({ day: 1, month: 1, year: 2010 }),
    isEnabled: NO
  })

  .add("date & time - empty", SC.DateFieldView, {
    hint: "dd/mm/yyyy hh:mm AM/PM",
    value: null,
    showTime: YES
  })

  .add("date & time - with value", SC.DateFieldView, {
    hint: "dd/mm/yyyy hh:mm AM/PM",
    value: SC.DateTime.create({ day: 1, month: 1, year: 2010, hour: 10, minute: 20 }),
    showTime: YES
  })

  .add("time - disabled - empty", SC.DateFieldView, {
    hint: "hh:mm AM/PM",
    value: null,
    showTime: YES,
    showDate: NO,
    isEnabled: NO
  })

  .add("time - disabled - with value", SC.DateFieldView, {
    hint: "hh:mm AM/PM",
    value: SC.DateTime.create({ hour: 10, minute: 20 }),
    showTime: YES,
    showDate: NO,
    isEnabled: NO
  })

  .add("empty - no hint on focus", SC.DateFieldView, {
    hint: "dd/mm/yyyy",
    value: '',
    hintOnFocus: NO
  })

  .add("empty - disabled - no hint on focus", SC.DateFieldView, {
    hint: "dd/mm/yyyy",
    value: '',
    isEnabled: NO,
    hintOnFocus: NO
  });


// ..........................................................
// VERIFY STANDARD STATES
//
pane.verifyEmpty = function verifyEmpty(view, expectedHint) {
  var input = view.$('input');
  var layer = view.$();

  ok(!layer.hasClass('not-empty'), 'layer should not have not-empty class');
  if(SC.browser.isWebkit || (SC.browser.isMozilla &&
      SC.browser.compare(SC.browser.engineVersion, '2.0') >= 0)) { equals(input.val(), '', 'input should have empty value'); }
  else { equals(input.val(), expectedHint, 'input should have empty value'); }

  if (expectedHint) {
    var hint = (view.get('hintOnFocus') ? view.$('.hint') : view.$('.sc-hint'));

    if (hint.length===1) {
      hint = hint.text();
    } else {
      hint = view.$('input');
      hint = hint.attr('placeholder');
    }
    equals(hint, expectedHint, 'hint span should have expected hint');
  }
};

pane.verifyNotEmpty = function verifyNotEmpty(view, expectedValue, expectedHint) {
  var input = view.$('input');
  var layer = view.$();

  ok(layer.hasClass('not-empty'), 'layer should have not-empty class');
  equals(input.val(), expectedValue, 'input should have value');

  if (expectedHint) {
    var hint = (view.get('hintOnFocus') ? view.$('.hint') : view.$('.sc-hint'));

    if (hint.length===1) {
      hint = hint.text();
    } else {
      hint = view.$('input');
      hint = hint.attr('placeholder');
    }
    equals(hint, expectedHint, 'hint span should have expected hint');
  }
};

pane.verifyDisabled = function verifyDisabled(view, isDisabled) {
  var layer = view.$();
  var input = view.$('input');

  if (isDisabled) {
    ok(layer.hasClass('disabled'), 'layer should have disabled class');
    ok(input.attr('disabled'), 'input should have disabled attr');
  } else {
    ok(!layer.hasClass('disabled'), 'layer should not have disabled class');
    ok(!input.attr('disabled'), 'input should not have disabled attr');
  }
};


// ..........................................................
// TEST INITIAL STATES
//

module('SC.DateFieldView ui', pane.standardSetup());

test("empty", function() {
   var view = pane.view('empty');
   pane.verifyEmpty(view, 'dd/mm/yyyy');
   pane.verifyDisabled(view, NO);
});

test("with value", function() {
  var view = pane.view('with value');
  pane.verifyNotEmpty(view, '01/01/2010', 'dd/mm/yyyy');
  pane.verifyDisabled(view, NO);
});

test("disabled - empty", function() {
  var view = pane.view('disabled - empty');
  pane.verifyEmpty(view, 'dd/mm/yyyy');
  pane.verifyDisabled(view, YES);
});

test("disabled - with value", function() {
  var view = pane.view('disabled - with value');
  pane.verifyNotEmpty(view, '01/01/2010', 'dd/mm/yyyy');
  pane.verifyDisabled(view, YES);
});

test("date & time - empty", function() {
   var view = pane.view('date & time - empty');
   pane.verifyEmpty(view, 'dd/mm/yyyy hh:mm AM/PM');
   pane.verifyDisabled(view, NO);
});

test("date & time - with value", function() {
  var view = pane.view('date & time - with value');
  pane.verifyNotEmpty(view, '01/01/2010 10:20 AM', 'dd/mm/yyyy hh:mm AM/PM');
  pane.verifyDisabled(view, NO);
});

test("time - disabled - empty", function() {
  var view = pane.view('time - disabled - empty');
  pane.verifyEmpty(view, 'hh:mm AM/PM');
  pane.verifyDisabled(view, YES);
});

test("time - disabled - with value", function() {
  var view = pane.view('time - disabled - with value');
  pane.verifyNotEmpty(view, '10:20 AM', 'hh:mm AM/PM');
  pane.verifyDisabled(view, YES);
});

test("empty - no hint on focus", function() {
   var view = pane.view('empty - no hint on focus');
   pane.verifyEmpty(view, 'dd/mm/yyyy');
   pane.verifyDisabled(view, NO);
});

test("empty - disabled - no hint on focus", function() {
   var view = pane.view('empty - disabled - no hint on focus');
   pane.verifyEmpty(view, 'dd/mm/yyyy');
   pane.verifyDisabled(view, YES);
});

// ..........................................................
// TEST CHANGING VIEWS
//

test("changing value from empty -> value", function() {
  var view = pane.view('empty');

  // test changing value updates like it should
  SC.RunLoop.begin();
  view.set('value', SC.DateTime.create({ day: 1, month: 1, year: 2010 }));
  SC.RunLoop.end();
  pane.verifyNotEmpty(view, '01/01/2010', 'dd/mm/yyyy');
});

test("disabling view", function() {
  var view = pane.view('empty');

  // test changing enabled state updates like it should
  SC.RunLoop.begin();
  view.set('isEnabled', NO);
  SC.RunLoop.end();
  pane.verifyDisabled(view, YES);
});

test("changing value to null", function() {
  var view = pane.view('with value');

  // test changing value updates like it should
  SC.RunLoop.begin();
  view.set('value', null);
  SC.RunLoop.end();
  equals(view.get('fieldValue'), null, 'should have empty fieldValue');
  pane.verifyEmpty(view, 'dd/mm/yyyy');
});

test("enabling disabled view", function() {
  var view = pane.view('disabled - empty');

  // test changing enabled state updates like it should
  SC.RunLoop.begin();
  view.set('isEnabled', YES);
  SC.RunLoop.end();
  pane.verifyDisabled(view, NO);
});

// ..........................................................
// TEST SELECTION SUPPORT
//

test("Setting the selection to a null value should fail", function() {
  var view = pane.view('with value');
  var fieldElement = view.$input()[0];
  fieldElement.size = 10;     // Avoid Firefox 3.5 issue

  var thrownException = null;
  try {
    view.set('selection', null);
  } catch(e) {
    thrownException = e.message;
  }
  ok(thrownException.indexOf !== undefined, 'an exception should have been thrown');
  if (thrownException.indexOf !== undefined) {
    ok(thrownException.indexOf('must specify an SC.TextSelection instance') !== -1, 'the exception should be about not specifying an SC.TextSelection instance');
  }
});

test("Setting the selection to a non-SC.TextSelection value should fail", function() {
  var view = pane.view('with value');
  var fieldElement = view.$input()[0];
  fieldElement.size = 10;     // Avoid Firefox 3.5 issue

  var thrownException = null;
  try {
    view.set('selection', {start: 0, end: 0});
  } catch(e) {
    thrownException = e.message;
  }
  ok(thrownException.indexOf !== undefined, 'an exception should have been thrown');
  if (thrownException.indexOf !== undefined) {
    ok(thrownException.indexOf('must specify an SC.TextSelection instance') !== -1, 'the exception should be about not specifying an SC.TextSelection instance');
  }
});

test("Setting and then getting back the selection", function() {
  var view = pane.view('with value');
  var fieldElement = view.$input()[0];
  fieldElement.focus();
  fieldElement.size = 10;     // Avoid Firefox 3.5 issue

  var newSelection = SC.TextSelection.create({start:2, end:5});
  view.set('selection', newSelection);

  var fetchedSelection = view.get('selection');
  ok(fetchedSelection.get('start') === 2, 'the selection should start at index 2');
  ok(fetchedSelection.get('end') === 5, 'the selection should end at index 4');
  ok(fetchedSelection.get('length') === 3, 'the selection should have length 3');
});

// ..........................................................
// TEST ACCESSORY VIEWS
//

test("Adding left accessory view", function() {
  var view = pane.view('with value');

  // test adding accessory view adds the view like it should
  SC.RunLoop.begin();
  var accessoryView = SC.View.create({
    layout:  { top:1, left:2, width:16, height:16 }
  });
  view.set('leftAccessoryView', accessoryView);
  SC.RunLoop.end();

  ok(view.get('leftAccessoryView') === accessoryView, 'left accessory view should be set to ' + accessoryView.toString());
  ok(view.get('childViews').length === 1, 'there should only be one child view');
  ok(view.get('childViews')[0] === accessoryView, 'first child view should be set to ' + accessoryView.toString());


  // The hint and padding elements should automatically have their 'left'
  // values set to the accessory view's offset + width
  // (18 = 2 left offset + 16 width)
  var paddingElement = view.$('.padding')[0];
  ok(paddingElement.style.left === '18px', 'padding element should get 18px left');

  // Test removing the accessory view.
  SC.RunLoop.begin();
  view.set('leftAccessoryView', null);
  SC.RunLoop.end();
  ok(view.get('childViews').length === 0, 'after removing the left accessory view there should be no child views left');
  ok(!paddingElement.style.left, 'after removing the left accessory view the padding element should have no left style');
});

test("Adding right accessory view", function() {
  var view = pane.view('with value');

  // test adding accessory view adds the view like it should
  SC.RunLoop.begin();
  var accessoryView = SC.View.create({
    layout:  { top:1, right:3, width:17, height:16 }
  });
  view.set('rightAccessoryView', accessoryView);
  SC.RunLoop.end();

  ok(view.get('rightAccessoryView') === accessoryView, 'right accessory view should be set to ' + accessoryView.toString());
  ok(view.get('childViews').length === 1, 'there should only be one child view');
  ok(view.get('childViews')[0] === accessoryView, 'first child view should be set to ' + accessoryView.toString());


  // The hint and padding elements should automatically have their 'right'
  // values set to the accessory view's offset + width
  // (20 = 3 right offset + 17 width)
  var paddingElement = view.$('.padding')[0];
  ok(paddingElement.style.right === '20px', 'padding element should get 20px right');


  // If a right accessory view is set with only 'left' (and not 'right')
  // defined in its layout, 'left' should be cleared out and 'right' should
  // be set to 0.
  SC.RunLoop.begin();
  accessoryView = SC.View.create({
    layout:  { top:1, left:2, width:16, height:16 }
  });
  view.set('rightAccessoryView', accessoryView);
  SC.RunLoop.end();

  equals(view.get('rightAccessoryView').get('layout').left, null, "right accessory view created with 'left' rather than 'right' in layout should have layout.left");
  equals(view.get('rightAccessoryView').get('layout').right, 0, "right accessory view created with 'left' rather than 'right' in layout should have layout.right");


  // Test removing the accessory view.
  SC.RunLoop.begin();
  view.set('rightAccessoryView', null);
  SC.RunLoop.end();
  ok(view.get('childViews').length === 0, 'after removing the right accessory view there should be no child views left');
  ok(!paddingElement.style.right, 'after removing the right accessory view the padding element should have no right style');
});

test("Adding both left and right accessory views", function() {
  var view = pane.view('with value');

  // test adding accessory view adds the view like it should
  SC.RunLoop.begin();
  var leftAccessoryView = SC.View.create({
    layout:  { top:1, left:2, width:16, height:16 }
  });
  view.set('leftAccessoryView', leftAccessoryView);
  var rightAccessoryView = SC.View.create({
    layout:  { top:1, right:3, width:17, height:16 }
  });
  view.set('rightAccessoryView', rightAccessoryView);
  SC.RunLoop.end();

  ok(view.get('childViews').length === 2, 'we should have two child views since we added both a left and a right accessory view');


  // The hint and padding elements should automatically have their 'left' and
  // 'right' values set to the accessory views' offset + width
  //   *  left:   18 = 2 left offset + 16 width)
  //   *  right:  20 = 3 left offset + 17 width)
  var paddingElement = view.$('.padding')[0];
  ok(paddingElement.style.left === '18px', 'padding element should get 18px left');
  ok(paddingElement.style.right === '20px', 'padding element should get 20px right');


  // Test removing the accessory views.
  SC.RunLoop.begin();
  view.set('rightAccessoryView', null);
  SC.RunLoop.end();
  ok(view.get('childViews').length === 1, 'after removing the right accessory view there should be one child view left (the left accessory view)');
  ok(!paddingElement.style.right, 'after removing the right accessory view the padding element should have no right style');
  SC.RunLoop.begin();
  view.set('leftAccessoryView', null);
  SC.RunLoop.end();
  ok(view.get('childViews').length === 0, 'after removing both accessory views there should be no child views left');
  ok(!paddingElement.style.left, 'after removing the left accessory view the padding element should have no left style');
});



// ..........................................................
// TEST EVENTS
//
/*
test("focus and blurring text field", function() {
  var view = pane.view('with value');
  var input = view.$('input');

  // attempt to focus...
  SC.Event.trigger(input, 'focus');

  // verify editing state changed...
  ok(view.get('isEditing'), 'view.isEditing should be YES');
  ok(view.$().hasClass('focus'), 'view layer should have focus class');

  // simulate typing a letter
  //SC.Event.trigger(input, 'keydown');
  SC.Event.trigger(input, 'right');
  SC.Event.trigger(input, SC.Event.KEY_DOWN);
  //SC.Event.trigger(input, 'keyup');
  //input.val('f');
  SC.Event.trigger(input, 'change');

  var selection = view.get('selection');
  console.log("Current selection:  %@".fmt(selection));

  // wait a little bit to let text field propagate changes
  stop();

  setTimeout(function() {
    start();

    equals(view.get('value'), '02/01/2010', 'view should have new value');
    equals(view.get('fieldValue'), '02/01/2010', 'view should have new value');

    // attempt to blur...
    SC.Event.trigger(input, 'blur');

    // verify editing state changed...
    ok(!view.get('isEditing'), 'view.isEditing should be NO');
    ok(!view.$().hasClass('focus'), 'view layer should NOT have focus class');
  }, 100);

});

test("editing a field should not change the cursor position", function() {
  var textField = pane.view('empty');
  var input = textField.$('input');
  input.val('John Doe');
  textField.set('selection', SC.TextSelection.create({start:2, end:3}));
  SC.Event.trigger(input, 'change');

  ok(input.val() === 'John Doe', 'input value should be \'John Doe\'');
  var selection = textField.get('selection');
  console.log("Selection:  %@".fmt(selection));
  ok(selection.get('start') == 2 && selection.get('end') == 3, 'cursor position should be unchanged');
});
*/
})();
