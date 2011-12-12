// ==========================================================================
// Project:   Ember - JavaScript Application Framework
// Copyright: ©2006-2011 Apple Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

var set = Ember.set, get = Ember.get;

module("Ember.View nearest view helpers");

test("collectionView should return the nearest collection view", function() {
  var itemViewChild;

  var view = Ember.CollectionView.create({
    content: Ember.A([1, 2, 3]),
    isARealCollection: true,

    itemViewClass: Ember.View.extend({
      render: function(buffer) {
        this.appendChild(Ember.View.create());
      }
    })
  });

  Ember.run(function() {
    view.appendTo('#qunit-fixture');
  });

  itemViewChild = view.get('childViews')[0].get('childViews')[0];
  equals(itemViewChild.getPath('collectionView.isARealCollection'), true, "finds collection view in the hierarchy");
});

test("itemView should return the nearest child of a collection view", function() {
  var itemViewChild;

  var view = Ember.CollectionView.create({
    content: Ember.A([1, 2, 3]),

    itemViewClass: Ember.View.extend({
      isAnItemView: true,

      render: function(buffer) {
        this.appendChild(Ember.View.create());
      }
    })
  });

  Ember.run(function() {
    view.appendTo('#qunit-fixture');
  });

  itemViewChild = view.get('childViews')[0].get('childViews')[0];
  equals(itemViewChild.getPath('itemView.isAnItemView'), true, "finds item view in the hierarchy");
});

test("itemView should return the nearest child of a collection view", function() {
  var itemViewChild;

  var view = Ember.CollectionView.create({
    content: Ember.A([1, 2, 3]),

    itemViewClass: Ember.View.extend({
      isAnItemView: true,

      render: function(buffer) {
        this.appendChild(Ember.View.create());
      }
    })
  });

  Ember.run(function() {
    view.appendTo('#qunit-fixture');
  });

  itemViewChild = view.get('childViews')[0].get('childViews')[0];
  equals(itemViewChild.getPath('contentView.isAnItemView'), true, "finds a view with a content property in the hierarchy");
});

test("nearestWithProperty should search immediate parent", function(){
  var childView;

  var view = Ember.View.create({
    myProp: true,

    render: function(buffer) {
      this.appendChild(Ember.View.create());
    }
  });

  Ember.run(function() {
    view.appendTo('#qunit-fixture');
  });

  childView = view.get('childViews')[0];
  equals(childView.nearestWithProperty('myProp'), view);

});

