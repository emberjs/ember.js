// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            portions copyright @2011 Apple Inc.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================
/*global ok, test, equals, module */

var view, del, content ;

module("SC.CollectionView.itemViewForContentIndex", {
  setup: function() {
    content = "a b c".w().map(function(x) {
      return SC.Object.create({ title: x });
    });

    del = {
      fixture: {
        isEnabled: YES,
        isSelected: YES,
        outlineLevel: 3,
        disclosureState: SC.LEAF_NODE
      },

      contentIndexIsEnabled: function() {
        return this.fixture.isEnabled;
      },

      contentIndexIsSelected: function() {
        return this.fixture.isSelected;
      },

      contentIndexOutlineLevel: function() {
        return this.fixture.outlineLevel;
      },

      contentIndexDisclosureState: function() {
        return this.fixture.disclosureState ;
      }
    };

    // NOTE: delegate methods above are added here.
    SC.run(function () {
    view = SC.CollectionView.create(del, {
      content: content,

      layoutForContentIndex: function(contentIndex) {
        return this.fixtureLayout ;
      },

      fixtureLayout: { left: 0, right: 0, top:0, bottom: 0 },

      groupExampleView: SC.View.extend(), // custom for testing

        exampleView: SC.View.extend({
          isReusable: false
        }), // custom for testing

      testAsGroup: NO,

      contentIndexIsGroup: function() { return this.testAsGroup; },

      contentGroupIndexes: function() {
        if (this.testAsGroup) {
          return SC.IndexSet.create(0, this.get('length'));
        } else return null ;
      },

      fixtureNowShowing: SC.IndexSet.create(0,3),

      computeNowShowing: function() {
        return this.fixtureNowShowing;
      }

    });
    });

    // add in delegate mixin
    del = SC.mixin({}, SC.CollectionContent, del);

  }
});

function shouldMatchFixture(itemView, fixture) {
  var key;
  for(key in fixture) {
    if (!fixture.hasOwnProperty(key)) continue;
    equals(itemView.get(key), fixture[key], 'itemView.%@ should match delegate value'.fmt(key));
  }
}

test("creating basic item view", function() {
  var itemView = view.itemViewForContentIndex(1);

  // should use exampleView
  ok(itemView, 'should return itemView');
  ok(itemView.kindOf(view.exampleView), 'itemView %@ should be kindOf %@'.fmt(itemView, view.exampleView));

  // set added properties
  equals(itemView.get('content'), content.objectAt(1), 'itemView.content should be set to content item');
  equals(itemView.get('contentIndex'), 1, 'itemView.contentIndex should be set');
  equals(itemView.get('owner'), view, 'itemView.owner should be collection view');
  equals(itemView.get('displayDelegate'), view, 'itemView.displayDelegate should be collection view');
  equals(itemView.get('parentView'), view, 'itemView.parentView should be collection view');

  // test data from delegate
  shouldMatchFixture(itemView, view.fixture);
});

test("isLast property", function () {
  view.isVisibleInWindow = true;

  var itemView = view.itemViewForContentIndex(1);
  equals(itemView.get('isLast'), false, 'itemView.isLast should be false');

  itemView = view.itemViewForContentIndex(2);
  equals(itemView.get('isLast'), true, 'itemView.isLast should be true');

  SC.run(function () {
    view.beginPropertyChanges();
    view.get('content').pushObject(SC.Object.create({ title: 'd' }));
    view.set('fixtureNowShowing', SC.IndexSet.create(0, 4));
    view.endPropertyChanges();
  });

  itemView = view.itemViewForContentIndex(3);
  equals(itemView.get('isLast'), true, 'itemView.isLast should be true');

  itemView = view.itemViewForContentIndex(2);
  equals(itemView.get('isLast'), false, 'itemView.isLast for previous last item should be false');
});

test("returning item from cache", function() {

  var itemView1 = view.itemViewForContentIndex(1);
  ok(itemView1, 'precond - first call returns an item view');

  var itemView2 = view.itemViewForContentIndex(1);
  equals(itemView2, itemView1, 'retrieving multiple times should same instance');

  // Test internal case
  var itemView3 = view.itemViewForContentIndex(1, YES);
  ok(itemView1 !== itemView3, 'itemViewForContentIndex(1, YES) should return new item even if it is already cached actual :%@'.fmt(itemView3));

  var itemView4 = view.itemViewForContentIndex(1, NO);
  equals(itemView4, itemView3, 'itemViewForContentIndex(1) [no reload] should return newly cached item after recache');

});

// Tests support for the addition of designModes to SC.Pane and SC.View.  Since
// SC.CollectionView doesn't use child views and thus doesn't call
// SC.View:insertBefore, it needs to pass the designMode down to its item views
// itself.
test("set designMode on item views", function() {
  var itemView;

  // Initial designMode before creating the item view.
  view.set('designMode', 'small');
  itemView = view.itemViewForContentIndex(1);
  equals(itemView.get('designMode'), 'small', "itemView.designMode should be set to match the current value of the collection");

  // Changes to designMode after creating the item view.
  view.set('designMode', 'large');
  // Note: we have to call this manually as the view is unrendered and not updating its design modes. TODO: Test this naturally.
  view.adjustChildDesignModes('small', 'large');
  equals(itemView.get('designMode'), 'large', "itemView.designMode should be set to match the current value of the collection");
});

// ..........................................................
// ALTERNATE WAYS TO GET AN EXAMPLE VIEW
//

test("contentExampleViewKey is set and content has property", function() {
  var CustomView = SC.View.extend();
  var obj = content.objectAt(1);
  obj.set('foo', CustomView);
  view.set('contentExampleViewKey', 'foo');

  var itemView = view.itemViewForContentIndex(1);
  ok(itemView, 'should return item view');
  ok(itemView.kindOf(CustomView), 'itemView should be custom view specified on object. actual: %@'.fmt(itemView));
});

test("contentExampleViewKey is set and content is null", function() {
  view.set('contentExampleViewKey', 'foo');
  SC.run(function () {
  content.replace(1,1,[null]);
  });

  var itemView = view.itemViewForContentIndex(1);
  ok(itemView, 'should return item view');
  equals(itemView.get('content'), null, 'itemView content should be null');
  ok(itemView.kindOf(view.exampleView), 'itemView should be exampleView (%@). actual: %@'.fmt(view.exampleView, itemView));
});

test("contentExampleViewKey is set and content property is empty", function() {
  view.set('contentExampleViewKey', 'foo');

  var itemView = view.itemViewForContentIndex(1);
  ok(itemView, 'should return item view');
  equals(itemView.get('content'), content.objectAt(1), 'itemView should have content');
  ok(itemView.kindOf(view.exampleView), 'itemView should be exampleView (%@). actual: %@'.fmt(view.exampleView, itemView));
});

// ..........................................................
// GROUP EXAMPLE VIEW
//

test("delegate says content is group", function() {
  view.testAsGroup = YES ;
  var itemView = view.itemViewForContentIndex(1);
  ok(itemView, 'should return itemView');
  ok(itemView.kindOf(view.groupExampleView), 'itemView should be groupExampleView (%@). actual: %@'.fmt(view.groupExampleView, itemView));
  ok(itemView.isGroupView, 'itemView.isGroupView should be YES');
});

test("contentGroupExampleViewKey is set and content has property", function() {
  view.testAsGroup = YES ;

  var CustomView = SC.View.extend();
  var obj = content.objectAt(1);
  obj.set('foo', CustomView);
  view.set('contentGroupExampleViewKey', 'foo');

  var itemView = view.itemViewForContentIndex(1);
  ok(itemView, 'should return item view');
  ok(itemView.kindOf(CustomView), 'itemView should be custom view specified on object. actual: %@'.fmt(itemView));
  ok(itemView.isGroupView, 'itemView.isGroupView should be YES');
});

test("contentGroupExampleViewKey is set and content is null", function() {
  view.testAsGroup = YES ;

  view.set('contentGroupExampleViewKey', 'foo');
  SC.run(function () {
  content.replace(1,1,[null]);
  });

  var itemView = view.itemViewForContentIndex(1);
  ok(itemView, 'should return item view');
  equals(itemView.get('content'), null, 'itemView content should be null');
  ok(itemView.kindOf(view.groupExampleView), 'itemView should be exampleView (%@). actual: %@'.fmt(view.groupExampleView, itemView));
  ok(itemView.isGroupView, 'itemView.isGroupView should be YES');
});

test("contentGroupExampleViewKey is set and content property is empty", function() {
  view.testAsGroup = YES ;

  view.set('contentGroupExampleViewKey', 'foo');

  var itemView = view.itemViewForContentIndex(1);
  ok(itemView, 'should return item view');
  equals(itemView.get('content'), content.objectAt(1), 'itemView should have content');
  ok(itemView.kindOf(view.groupExampleView), 'itemView should be exampleView (%@). actual: %@'.fmt(view.groupExampleView, itemView));
  ok(itemView.isGroupView, 'itemView.isGroupView should be YES');
});

test("_contentGroupIndexes's cache should be properly invalidated", function() {
  view.testAsGroup = YES;

  // force setup of range observers
  view.updateContentRangeObserver();

  ok(view.get('_contentGroupIndexes').isEqual(SC.IndexSet.create(0, 3)), "contentGroupIndexes should have correct initial value");

  SC.run(function () {
  view.get('content').removeAt(2, 1);
  });

  ok(view.get('_contentGroupIndexes').isEqual(SC.IndexSet.create(0, 2)), "contentGroupIndexes should have updated value after deletion");
});


// ..........................................................
// DELEGATE SUPPORT
//

test("consults delegate if set", function() {
  view.fixture = null; //break to make sure this is not used
  view.delegate = del;

  var itemView = view.itemViewForContentIndex(1);
  ok(itemView, 'returns item view');
  shouldMatchFixture(itemView, del.fixture);
});

test("consults content if implements mixin and delegate not set", function() {
  view.fixture = null; //break to make sure this is not used
  view.delegate = null;

  SC.mixin(content, del) ; // add delegate methods to content

  var itemView = view.itemViewForContentIndex(1);
  ok(itemView, 'returns item view');
  shouldMatchFixture(itemView, content.fixture);
});


test("prefers delegate over content if both implement mixin", function() {
  view.fixture = null; //break to make sure this is not used
  view.delegate = del;
  SC.mixin(content, del) ; // add delegate methods to content
  content.fixture = null ; //break

  var itemView = view.itemViewForContentIndex(1);
  ok(itemView, 'returns item view');
  shouldMatchFixture(itemView, del.fixture);
});

// ..........................................................
// SPECIAL CASES
//

test("after making an item visible then invisible again", function() {

  view.isVisibleInWindow = YES ;

  // STEP 1- setup with some nowShowing
  SC.run(function() {
    view.set('fixtureNowShowing', SC.IndexSet.create(1));
    view.notifyPropertyChange('nowShowing');
  });
  equals(view.get('childViews').length, 1, 'precond - should have a child view');

  var itemView = view.itemViewForContentIndex(1);
  equals(itemView.get('parentView'), view, 'itemView has parent view after some nowShowing');

  // STEP 2- setup with NONE visible
  SC.run(function() {
    view.set('fixtureNowShowing', SC.IndexSet.create());
    view.notifyPropertyChange('nowShowing');
  });
  equals(view.get('childViews').length, 0, 'precond - should have no childview');

  itemView = view.itemViewForContentIndex(1);
  equals(itemView.get('parentView'), view, 'itemView has parent view after none visible');


  // STEP 3- go back to nowShowing
  SC.run(function() {
    view.set('fixtureNowShowing', SC.IndexSet.create(1));
    view.notifyPropertyChange('nowShowing');
  });
  equals(view.get('childViews').length, 1, 'precond - should have a child view');

  itemView = view.itemViewForContentIndex(1);
  equals(itemView.get('parentView'), view, 'itemView has parent view after back to some nowShowing');

});

// Editable Item Views.

test("canDeleteContent sets isDeletable on the item views so they can visually indicate it", function () {
  var itemView;

  view.set('canDeleteContent', true);
  itemView = view.itemViewForContentIndex(1);
  equals(itemView.get('isDeletable'), true, 'itemView has isDeletable');

  view.isVisibleInWindow = YES;
  SC.run(function () {
    view.set('isEditable', false);
  });

  view.set('isEditable', false);
  itemView = view.itemViewForContentIndex(1);
  equals(itemView.get('isDeletable'), false, 'itemView has isDeletable');
});


test("canEditContent sets isEditable on the item views so they can visually indicate it", function () {
  var itemView;

  view.set('canEditContent', true);
  itemView = view.itemViewForContentIndex(1);
  equals(itemView.get('isEditable'), true, 'itemView has isEditable');

  view.isVisibleInWindow = YES;
  SC.run(function () {
    view.set('isEditable', false);
  });

  itemView = view.itemViewForContentIndex(1);
  equals(itemView.get('isEditable'), false, 'itemView has isEditable');
});


test("canReorderContent sets isReorderable on the item views so they can visually indicate it", function () {
  var itemView;

  view.set('canReorderContent', true);
  itemView = view.itemViewForContentIndex(1);
  equals(itemView.get('isReorderable'), true, 'itemView has isReorderable');

  view.isVisibleInWindow = YES;
  SC.run(function () {
    view.set('isEditable', false);
  });

  view.set('isEditable', false);
  itemView = view.itemViewForContentIndex(1);
  equals(itemView.get('isReorderable'), false, 'itemView has isReorderable');
});

test("itemViewForContentObject", function() {
  equals(view.itemViewForContentObject(content[0]).getPath('content.title'), 'a', "itemViewForContentObject returns 0th itemView for the 0th content object");

  equals(view.itemViewForContentObject(SC.Object.create()), null, "itemViewForContentObject returns null for a object that is not in in its content");

  var emptyContentCollection;
  SC.run(function() {
    emptyContentCollection = SC.CollectionView.create();
  });

  equals(emptyContentCollection.itemViewForContentObject(content[0]), null, "itemViewForContentObject returns null (without erroring) when it has no content.");

});
