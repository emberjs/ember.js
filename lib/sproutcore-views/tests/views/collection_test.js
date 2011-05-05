// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================
module("SC.CollectionView");

test("should render a view for each item in its content array", function() {
  var view = SC.CollectionView.create({
    content: [1, 2, 3, 4]
  });

  view.createElement();
  equals(view.$('div').length, 4);
});

test("should render the emptyView if content array is empty", function() {
  var view = SC.CollectionView.create({
    content: [],

    emptyView: SC.View.extend({
      render: function(buf) {
        buf.push("OY SORRY GUVNAH NO NEWS TODAY EH");
      }
    })
  });

  view.createElement();

  ok(view.$().find(':contains("OY SORRY GUVNAH")').length, "displays empty view");
});

test("should allow custom item views by setting itemViewClass", function() {
  var passedContents = [];
  var view = SC.CollectionView.create({
    content: ['foo', 'bar', 'baz'],

    itemViewClass: SC.View.extend({
      render: function(buf) {
        passedContents.push(this.get('content'));
        buf.push(this.get('content'));
      }
    })
  });

  view.createElement();
  ok(passedContents.isEqual(['foo', 'bar', 'baz']), "sets the content property on each item view");

  passedContents.forEach(function(item) {
    equals(view.$(':contains("'+item+'")').length, 1);
  });
});

test("should insert a new item in DOM when an item is added to the content array", function() {
  var content = ['foo', 'bar', 'baz'];

  var view = SC.CollectionView.create({
    content: content,

    itemViewClass: SC.View.extend({
      render: function(buf) {
        buf.push(this.get('content'));
      }
    })
  });

  view.createElement();

  content.forEach(function(item) {
    equals(view.$(':contains("'+item+'")').length, 1, "precond - generates pre-existing items");
  });

  content.insertAt(1, 'quux');
  equals(view.$(':nth-child(2)').text(), 'quux');
});

test("should remove an item from DOM when an item is removed from the content array", function() {
  var content = ['foo', 'bar', 'baz'];

  var view = SC.CollectionView.create({
    content: content,

    itemViewClass: SC.View.extend({
      render: function(buf) {
        buf.push(this.get('content'));
      }
    })
  });

  view.createElement();

  content.forEach(function(item) {
    equals(view.$(':contains("'+item+'")').length, 1, "precond - generates pre-existing items");
  });

  content.removeAt(1);
  content.forEach(function(item, idx) {
    equals(view.$(':nth-child(%@)'.fmt(idx+1)).text(), item);
  });
});
