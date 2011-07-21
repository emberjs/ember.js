// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

var set = SC.set, get = SC.get;
var view;

module("SC.CollectionView", {
  setup: function() {
    SC.CollectionView.CONTAINER_MAP.del = 'em';
  },
  teardown: function() {
    delete SC.CollectionView.CONTAINER_MAP.del;
    if (view) { view.destroy(); }
  }
});

test("should render a view for each item in its content array", function() {
  view = SC.CollectionView.create({
    content: [1, 2, 3, 4]
  });

  SC.run(function() {
    view.append();
  });
  equals(view.$('div').length, 4);
});

test("should render the emptyView if content array is empty (view class)", function() {
  view = SC.CollectionView.create({
    tagName: 'del',
    content: [],

    emptyView: SC.View.extend({
      tagName: 'kbd',
      render: function(buf) {
        buf.push("OY SORRY GUVNAH NO NEWS TODAY EH");
      }
    })
  });

  SC.run(function() {
    view.append();
  });

  ok(view.$().find('kbd:contains("OY SORRY GUVNAH")').length, "displays empty view");
});

test("should render the emptyView if content array is empty (view instance)", function() {
  view = SC.CollectionView.create({
    tagName: 'del',
    content: [],

    emptyView: SC.View.create({
      tagName: 'kbd',
      render: function(buf) {
        buf.push("OY SORRY GUVNAH NO NEWS TODAY EH");
      }
    })
  });

  SC.run(function() {
    view.append();
  });

  ok(view.$().find('kbd:contains("OY SORRY GUVNAH")').length, "displays empty view");
});

test("should be able to override the tag name of itemViewClass even if tag is in default mapping", function() {
  view = SC.CollectionView.create({
    tagName: 'del',
    content: ['NEWS GUVNAH'],

    itemViewClass: SC.View.extend({
      tagName: 'kbd',
      render: function(buf) {
        buf.push(get(this, 'content'));
      }
    })
  });

  SC.run(function() {
    view.append();
  });

  ok(view.$().find('kbd:contains("NEWS GUVNAH")').length, "displays the item view with proper tag name");
});

test("should allow custom item views by setting itemViewClass", function() {
  var passedContents = [];
  view = SC.CollectionView.create({
    content: ['foo', 'bar', 'baz'],

    itemViewClass: SC.View.extend({
      render: function(buf) {
        passedContents.push(get(this, 'content'));
        buf.push(get(this, 'content'));
      }
    })
  });

  SC.run(function() {
    view.append();
  });

  same(passedContents, ['foo', 'bar', 'baz'], "sets the content property on each item view");

  passedContents.forEach(function(item) {
    equals(view.$(':contains("'+item+'")').length, 1);
  });
});

test("should insert a new item in DOM when an item is added to the content array", function() {
  var content = ['foo', 'bar', 'baz'];

  view = SC.CollectionView.create({
    content: content,

    itemViewClass: SC.View.extend({
      render: function(buf) {
        buf.push(get(this, 'content'));
      }
    })
  });

  SC.run(function() {
    view.append();
  });

  content.forEach(function(item) {
    equals(view.$(':contains("'+item+'")').length, 1, "precond - generates pre-existing items");
  });

  SC.run(function() {
    content.insertAt(1, 'quux');
  });

  equals(view.$(':nth-child(2)').text(), 'quux');
});

test("should remove an item from DOM when an item is removed from the content array", function() {
  var content = ['foo', 'bar', 'baz'];

  view = SC.CollectionView.create({
    content: content,

    itemViewClass: SC.View.extend({
      render: function(buf) {
        buf.push(get(this, 'content'));
      }
    })
  });

  SC.run(function() {
    view.append();
  });

  content.forEach(function(item) {
    equals(view.$(':contains("'+item+'")').length, 1, "precond - generates pre-existing items");
  });

  SC.run(function() {
    content.removeAt(1);
  });

  content.forEach(function(item, idx) {
    equals(view.$(':nth-child(%@)'.fmt(idx+1)).text(), item);
  });
});

test("should allow changes to content object before layer is created", function() {
  view = SC.CollectionView.create({
    content: null
  });

  set(view, 'content', []);
  set(view, 'content', [1, 2, 3]);
  set(view, 'content', [1, 2]);

  SC.run(function() {
    view.append();
  });

  ok(view.$().children().length);
});

test("should allow changing content property to be null", function() {
  view = SC.CollectionView.create({
    content: [1, 2, 3],

    emptyView: SC.View.extend({
      template: function() { return "(empty)"; }
    })
  });

  SC.run(function() {
    view.append();
  });

  equals(view.$().children().length, 3, "precond - creates three elements");

  SC.run(function() {
    set(view, 'content', null);
  });

  equals(view.$().children().text(), "(empty)", "should display empty view");
});

test("should allow items to access to the CollectionView's current index in the content array", function() {
  view = SC.CollectionView.create({
    content: ['zero', 'one', 'two'],
    itemViewClass: SC.View.extend({
      render: function(buf) {
        buf.push(get(this, 'contentIndex'));
      }
    })
  });

  SC.run(function() {
    view.append();
  });

  same(view.$(':nth-child(1)').text(), "0");
  same(view.$(':nth-child(2)').text(), "1");
  same(view.$(':nth-child(3)').text(), "2");
});
