// ==========================================================================
// Project:   Ember - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

var set = Ember.set, get = Ember.get;
var view;

module("Ember.CollectionView", {
  setup: function() {
    Ember.CollectionView.CONTAINER_MAP.del = 'em';
  },
  teardown: function() {
    delete Ember.CollectionView.CONTAINER_MAP.del;
    if (view) { view.destroy(); }
  }
});

test("should render a view for each item in its content array", function() {
  view = Ember.CollectionView.create({
    content: Ember.A([1, 2, 3, 4])
  });

  Ember.run(function() {
    view.append();
  });
  equals(view.$('div').length, 4);
});

test("should render the emptyView if content array is empty (view class)", function() {
  view = Ember.CollectionView.create({
    tagName: 'del',
    content: Ember.A(),

    emptyView: Ember.View.extend({
      tagName: 'kbd',
      render: function(buf) {
        buf.push("OY SORRY GUVNAH NO NEWS TODAY EH");
      }
    })
  });

  Ember.run(function() {
    view.append();
  });

  ok(view.$().find('kbd:contains("OY SORRY GUVNAH")').length, "displays empty view");
});

test("should render the emptyView if content array is empty (view instance)", function() {
  view = Ember.CollectionView.create({
    tagName: 'del',
    content: Ember.A(),

    emptyView: Ember.View.create({
      tagName: 'kbd',
      render: function(buf) {
        buf.push("OY SORRY GUVNAH NO NEWS TODAY EH");
      }
    })
  });

  Ember.run(function() {
    view.append();
  });

  ok(view.$().find('kbd:contains("OY SORRY GUVNAH")').length, "displays empty view");
});

test("should be able to override the tag name of itemViewClass even if tag is in default mapping", function() {
  view = Ember.CollectionView.create({
    tagName: 'del',
    content: Ember.A(['NEWS GUVNAH']),

    itemViewClass: Ember.View.extend({
      tagName: 'kbd',
      render: function(buf) {
        buf.push(get(this, 'content'));
      }
    })
  });

  Ember.run(function() {
    view.append();
  });

  ok(view.$().find('kbd:contains("NEWS GUVNAH")').length, "displays the item view with proper tag name");
});

test("should allow custom item views by setting itemViewClass", function() {
  var passedContents = [];
  view = Ember.CollectionView.create({
    content: Ember.A(['foo', 'bar', 'baz']),

    itemViewClass: Ember.View.extend({
      render: function(buf) {
        passedContents.push(get(this, 'content'));
        buf.push(get(this, 'content'));
      }
    })
  });

  Ember.run(function() {
    view.append();
  });

  same(passedContents, ['foo', 'bar', 'baz'], "sets the content property on each item view");

  passedContents.forEach(function(item) {
    equals(view.$(':contains("'+item+'")').length, 1);
  });
});

test("should insert a new item in DOM when an item is added to the content array", function() {
  var content = Ember.A(['foo', 'bar', 'baz']);

  view = Ember.CollectionView.create({
    content: content,

    itemViewClass: Ember.View.extend({
      render: function(buf) {
        buf.push(get(this, 'content'));
      }
    })
  });

  Ember.run(function() {
    view.append();
  });

  content.forEach(function(item) {
    equals(view.$(':contains("'+item+'")').length, 1, "precond - generates pre-existing items");
  });

  Ember.run(function() {
    content.insertAt(1, 'quux');
  });

  equals(view.$(':nth-child(2)').text(), 'quux');
});

test("should remove an item from DOM when an item is removed from the content array", function() {
  var content = Ember.A(['foo', 'bar', 'baz']);

  view = Ember.CollectionView.create({
    content: content,

    itemViewClass: Ember.View.extend({
      render: function(buf) {
        buf.push(get(this, 'content'));
      }
    })
  });

  Ember.run(function() {
    view.append();
  });

  content.forEach(function(item) {
    equals(view.$(':contains("'+item+'")').length, 1, "precond - generates pre-existing items");
  });

  Ember.run(function() {
    content.removeAt(1);
  });

  content.forEach(function(item, idx) {
    equals(view.$(Ember.String.fmt(':nth-child(%@)', [String(idx+1)])).text(), item);
  });
});

test("should allow changes to content object before layer is created", function() {
  view = Ember.CollectionView.create({
    content: null
  });

  set(view, 'content', Ember.A());
  set(view, 'content', Ember.A([1, 2, 3]));
  set(view, 'content', Ember.A([1, 2]));

  Ember.run(function() {
    view.append();
  });

  ok(view.$().children().length);
});

test("should allow changing content property to be null", function() {
  view = Ember.CollectionView.create({
    content: Ember.A([1, 2, 3]),

    emptyView: Ember.View.extend({
      template: function() { return "(empty)"; }
    })
  });

  Ember.run(function() {
    view.append();
  });

  equals(view.$().children().length, 3, "precond - creates three elements");

  Ember.run(function() {
    set(view, 'content', null);
  });

  equals(view.$().children().text(), "(empty)", "should display empty view");
});

test("should allow items to access to the CollectionView's current index in the content array", function() {
  view = Ember.CollectionView.create({
    content: Ember.A(['zero', 'one', 'two']),
    itemViewClass: Ember.View.extend({
      render: function(buf) {
        buf.push(get(this, 'contentIndex'));
      }
    })
  });

  Ember.run(function() {
    view.append();
  });

  same(view.$(':nth-child(1)').text(), "0");
  same(view.$(':nth-child(2)').text(), "1");
  same(view.$(':nth-child(3)').text(), "2");
});
