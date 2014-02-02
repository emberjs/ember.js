// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            portions copyright @2011 Apple Inc.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

/*global module test htmlbody ok equals same stop start */

var booleanObjects = [
  { n: 'False', v: NO },
  { n: 'True', v: YES }
];

var integerObjects = [
  { n: 'Zero', v: 0 },
  { n: 'One', v: 1 },
  { n: 'Two', v: 2 }
];

var pane = SC.ControlTestPane.design()
    .add("basic", SC.SelectFieldView, {
       objects:["1","2","3","4","5"]
    })

    .add("disabled", SC.SelectFieldView, {
      isEnabled: NO, objects:["1","2","3","4","5"]
    })

    .add("Not Selected", SC.SelectFieldView, {
      isSelected: NO, objects:["1","2","3","4","5"]
    })

    .add("Not Visible", SC.SelectFieldView, {
      isVisible: NO, objects:["1","2","3","4","5"]
    })

    .add("sortedStringOptions", SC.SelectFieldView, {
      objects:["Apple","Sproutcore 1.0","Development","Charles"],
  useStaticLayout: YES,
      layout: { width: 'auto', right: 'auto' }
    })
      .add("unSortedStringOptions", SC.SelectFieldView, {
        objects:["Apple","Sproutcore 1.0","Development","Charles"],
    useStaticLayout: YES,
    disableSort: YES,
        layout: { width: 'auto', right: 'auto' }
      })

    .add("Width 150 Right 0", SC.SelectFieldView, {
      objects: [1,6,11,2,8],
      useStaticLayout: YES,
      layout: { width: '150', right: '0' }
    })
    .add("redraw", SC.SelectFieldView, {
      useStaticLayout: YES,
      layout: { width: '150', right: '0' }
    })
    .add("selectBoolean", SC.SelectFieldView, {
      objects: booleanObjects,
      nameKey: 'n',
      valueKey: 'v',
      disableSort: YES
    })
    .add("selectInteger", SC.SelectFieldView, {
      objects: integerObjects,
      nameKey: 'n',
      valueKey: 'v',
      disableSort: YES
    });


// ..........................................................
// TEST VIEWS
//

module('SC.SelectFieldView ui', {
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
  var view = pane.view('basic');
  ok(!view.$().hasClass('disabled'), 'should not have disabled class');
  ok(!view.$().hasClass('sel'), 'should not have sel class');
});

test("disabled", function() {
  var view = pane.view('disabled');
  ok(view.$().hasClass('disabled'), 'should have disabled class');
});

test("Not Selected", function() {
  var view = pane.view('Not Selected');
  ok(!view.$().hasClass('disabled'), 'should not have disabled class');
  ok(!view.$().hasClass('sel'), 'should not have sel class');
});

test("Not Visible", function() {
  var view = pane.view('Not Visible');
  ok(!view.$().hasClass('disabled'), 'should not have disabled class');
  ok(!view.$().hasClass('sel'), 'should not have sel class');
});

test("sortedStringOptions", function() {
   var view = pane.view('sortedStringOptions');
   equals(null,view.get('sortKey'), 'sortkey not specified');
});

test("Width 150 Right 0", function() {
  var view = pane.view('Width 150 Right 0');
  ok(!view.$().hasClass('disabled'), 'should not have disabled class');
  ok(!view.$().hasClass('sel'), 'should not have sel class');
});

test("Check that by setting the value the selection actually changes", function() {
  var view = pane.view('Width 150 Right 0');
  SC.RunLoop.begin();
  view.set('value',2);
  SC.RunLoop.end();
  equals(view.getFieldValue(), 2, 'the field value should change to 2');
});

test("redraw", function(){
  var view = pane.view('redraw');
  ok(view.get('objects').length === 0, "objects should be empty");
  SC.RunLoop.begin();
  view.set('objects', [1,6,11,2,8]);
  SC.RunLoop.end();
  ok(view.$('option').length === 5, "options length should be 5");
});

test("selectFalse", function(){
  var view = pane.view('selectBoolean');
  SC.RunLoop.begin();
  view.set('value', NO);
  SC.RunLoop.end();
  equals(view.getFieldValue(), NO, 'the field values should change to False')
});

test("selectTrue", function(){
  var view = pane.view('selectBoolean');
  SC.RunLoop.begin();
  view.set('value', YES);
  SC.RunLoop.end();
  equals(view.getFieldValue(), YES, 'the field values should change to False')
});

test("selectZero", function(){
  var view = pane.view('selectInteger');
  SC.RunLoop.begin();
  view.set('value', 0);
  SC.RunLoop.end();
  equals(view.getFieldValue(), 0, 'the field values should change to False')
});

test("selectOne", function(){
  var view = pane.view('selectInteger');
  SC.RunLoop.begin();
  view.set('value', 1);
  SC.RunLoop.end();
  equals(view.getFieldValue(), 1, 'the field values should change to False')
});

test("selectTwo", function(){
  var view = pane.view('selectInteger');
  SC.RunLoop.begin();
  view.set('value', 2);
  SC.RunLoop.end();
  equals(view.getFieldValue(), 2, 'the field values should change to False')
});
