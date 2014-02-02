// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

/*globals Forms module test ok equals same stop start */
var pane = SC.Pane.create();
module("Forms - Form Row", {
  setup: function() {
    pane.append();
  },

  teardown: function() {
    pane.remove();
  }
});

// - binds content
// - sets contentValueKey, respecting _singleField

test("Binds content to child views", function() {
  SC.RunLoop.begin();
  var test = SC.FormRowView.create({
    childViews: 'a b'.w(),
    a: SC.View.create(),
    b: SC.View.create({ content: "HI" })
  });
  var content = SC.Object.create();
  test.set('content', content);
  SC.RunLoop.end();

  equals(test.a.get('content'), content, "Content was set on view without content");
  equals(test.b.get('content'), "HI", "Content stayed the same on view with content");
});

test("Sets contentValueKey on children", function() {
  SC.RunLoop.begin();
  var test = SC.FormRowView.create({
    childViews: 'a b'.w(),
    a: SC.View.create(),
    b: SC.View.create({ contentValueKey: "HI" })
  });
  SC.RunLoop.end();

  equals(test.a.get('contentValueKey'), 'a', "contentValueKey was set on the view without one");
  equals(test.b.get('contentValueKey'), "HI", "contentValueKey was not set on view with one");
});

test("Sets contentValueKey to own key for _singleField", function() {
  SC.RunLoop.begin();
  var test = SC.FormRowView.create({
    formKey: "theFormKey",
    childViews: '_singleField'.w(),
    _singleField: SC.View.create()
  });
  SC.RunLoop.end();

  equals(test._singleField.get('contentValueKey'), 'theFormKey', "contentValueKey is set to row's formKey if the view is a _singleField");
});

test("Measuring label width", function() {
  SC.RunLoop.begin();
  var row = SC.FormRowView.create({
    label: "Hi"
  });
  pane.appendChild(row);
  SC.RunLoop.end();

  var size = row.get('rowLabelMeasuredSize');
  ok(size > 0, "Size should not be 0");

  SC.RunLoop.begin();
  row.set('label', "Hiyo!");
  SC.RunLoop.end();

  var newSize = row.get('rowLabelMeasuredSize');
  ok(newSize > size, "Size grew when label text did");
});

test("Creating Form Rows", function() {
  var ret = SC.FormRowView.row("the label", SC.View.extend({
    aProperty: YES
  }), { extendedRow: YES });
  
  ret = SC.FormRowView.create(ret);

  equals(ret.extendedRow, YES, "Row was extended");
  equals(ret._singleField.get('aProperty'), YES, "Property was defined on field");
  equals(ret.get('label'), "the label");

  ret = SC.FormRowView.row(SC.View.extend({ aProperty: YES }), { extendedRow: YES });
  ret = SC.FormRowView.create(ret);

  equals(ret.extendedRow, YES, "Row was extended");
  equals(ret._singleField.get('aProperty'), YES, "Property was defined on field");
});
