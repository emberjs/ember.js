// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

// The TreeItemObserver is tested based on the common use cases.
/*globals throws should_throw*/

var content, delegate, flattened, obs, extra, extrachild, root;

// default delegate class.  Does the bare minimum for tree item to function
var Delegate = SC.Object.extend(SC.TreeItemContent, {

  treeItemChildrenKey: "children",
  treeItemIsExpandedKey: "isExpanded",

  // This method is used to record range change info

  rangeIndexes: null,
  rangeCallCount: 0,

  rangeDidChange: function(array, objects, key, indexes) {
    this.rangeCallCount++;
    this.rangeIndexes = indexes.frozenCopy();
  }

});

var TestObject = SC.Object.extend({
  toString: function() { return "TestObject(%@)".fmt(this.get('title')); }
});

/**
  Verifies that the passed observer object has the proper content.  This will
  iterate over the passed expected array, calling objectAt() on the observer
  to verify that it matches.  If you passed the expected index set, it will
  also verify that the range observer on the observer was fire with the
  matching set of indexes.

  Finally, pass an optional description.
*/
function verifyObjectAt(obs, expected, eindexes, desc) {
  var idx, len = expected.get('length'), actual;

  // eindexes is optional
  if (desc === undefined) {
    desc = eindexes;
    eindexes = undefined;
  }

  equals(obs.get('length'), len, "%@ - length should match".fmt(desc));
  for(idx=0;idx<len;idx++) {
    actual = obs.objectAt(idx);
    equals(actual, expected[idx], "%@ - observer.objectAt(%@) should match expected".fmt(desc, idx));
  }

  if (eindexes !== undefined) {
    if (eindexes) {
      ok(delegate.rangeCallCount>0, 'range observer should be called (actual callCount=%@)'.fmt(delegate.rangeCallCount));
    } else {
      ok(delegate.rangeCallCount===0, 'range observer should NOT be called (actual callCount=%@)'.fmt(delegate.rangeCallCount));
    }

    same(delegate.rangeIndexes, eindexes, 'range observer should be called with expected indexes');
  }

}


module("SC.TreeItemObserver - Group Use Case", {
  setup: function() {
    content = [
      TestObject.create({
        isGroup: YES,
        title: "A",
        isExpanded: YES,
        outline: 0,
        children: "0 1 2 3 4".w().map(function(x) {
          return TestObject.create({
            title: "A.%@".fmt(x), outline: 1
          });
        })
      }),

      TestObject.create({
        isGroup: YES,
        title: "B",
        isExpanded: YES,
        outline: 0,
        children: "0 1 2 3 4".w().map(function(x) {
          return TestObject.create({
            title: "B.%@".fmt(x), outline: 1
          });
        })
      }),

      TestObject.create({
        isGroup: YES,
        title: "C",
        isExpanded: NO,
        outline: 0,
        children: "0 1 2 3 4".w().map(function(x) {
          return TestObject.create({
            title: "C.%@".fmt(x), outline: 1
          });
        })
      })];

    root = TestObject.create({
      title: "ROOT",
      children: content,
      isExpanded: YES
    });


    extra = TestObject.create({ title: "EXTRA" });

    extrachild = TestObject.create({
      title: "EXTRA",
      isExpanded: YES,
      children: "0 1 2".w().map(function(x) {
        return TestObject.create({ title: "EXTRA.%@".fmt(x) });
      })
    });

    flattened = [
      content[0],             // 0
      content[0].children[0], // 1
      content[0].children[1], // 2
      content[0].children[2], // 3
      content[0].children[3], // 4
      content[0].children[4], // 5
      content[1],             // 6
      content[1].children[0], // 7
      content[1].children[1], // 8
      content[1].children[2], // 9
      content[1].children[3], // 10
      content[1].children[4], // 11
      content[2]];            // 12

    delegate = Delegate.create();

    // create root observer
    obs = SC.TreeItemObserver.create({ delegate: delegate, item: root });
    obs.addRangeObserver(null, delegate, delegate.rangeDidChange);
  },

  teardown: function() {
    if (obs) obs.destroy(); // cleanup
    content = delegate = obs = null ;
  }
});


// ..........................................................
// LENGTH
//

test("length on create", function() {
  equals(obs.get('length'), flattened.length, 'should have length of array on create');
});


// ..........................................................
// OBJECT AT
//

test("objectAt on create", function() {
  verifyObjectAt(obs, flattened, null, "on create");
});

// ..........................................................
// CHANGING MODEL LAYER CONTENT - TOP LEVEL/NO CHILDREN
//

test("pushing object to top level with no children", function() {

  SC.run(function() { content.pushObject(extra); });
  flattened.pushObject(extra);

  var change = SC.IndexSet.create(flattened.length-1);
  verifyObjectAt(obs, flattened, change, "after pushing top level object");
});

test("popping object to top level with no children", function() {
  SC.run(function() { content.popObject(); });
  flattened.popObject();

  var change = SC.IndexSet.create(flattened.length);
  verifyObjectAt(obs, flattened, change, "after popping top level object");
});

test("inserting object in middle of top level with no children", function() {
  SC.run(function() { content.insertAt(2,extra); });
  flattened.insertAt(12, extra);

  var change = SC.IndexSet.create(12,flattened.length-12);
  verifyObjectAt(obs, flattened, change, "after pushing top level object");
});

test("replacing object at top level with no children", function() {
  SC.run(function() { content.replace(2,1, [extra]); });
  flattened.replace(12, 1, [extra]);

  var change = SC.IndexSet.create(12);
  verifyObjectAt(obs, flattened, change, "after pushing top level object");
});

test("removing object at top level with no children", function() {
  SC.run(function() { content.removeAt(2); });
  flattened.removeAt(12);

  var change = SC.IndexSet.create(12, flattened.length-11);
  verifyObjectAt(obs, flattened, change,"after pushing top level object");
});

// ..........................................................
// CHANGING MODEL LAYER CONTENT - GROUP LEVEL
//

test("pushing object to group", function() {
  var base = content[1].children;
  SC.run(function() { base.pushObject(extra); });
  flattened.insertAt(12, extra);

  // changed reflect nearest top-level group
  var change = SC.IndexSet.create(6, flattened.length-6);
  verifyObjectAt(obs, flattened, change, "after pushing");
});

test("popping object from group", function() {
  var base = content[1].children;
  SC.run(function() { base.popObject(); });
  flattened.removeAt(11);

  // changed reflect nearest top-level group
  var change = SC.IndexSet.create(6, flattened.length-5);
  verifyObjectAt(obs, flattened, change, "after popping");
});

test("inserting object in middle of group", function() {
  var base = content[1].children;
  SC.run(function() { base.insertAt(2,extra); });
  flattened.insertAt(9, extra);

  // changed reflect nearest top-level group
  var change = SC.IndexSet.create(6, flattened.length-6);
  verifyObjectAt(obs, flattened, change, "after insert");
});

test("replacing object in group", function() {
  var base = content[1].children;
  SC.run(function() { base.replace(2,1, [extra]); });
  flattened.replace(9, 1, [extra]);

  // changed reflect nearest top-level group
  var change = SC.IndexSet.create(6, flattened.length-7);
  verifyObjectAt(obs, flattened, change, "after replacing");
});

test("removing object in gorup", function() {
  var base = content[1].children;
  SC.run(function() { base.removeAt(2); });
  flattened.removeAt(9);

  // changed reflect nearest top-level group
  var change = SC.IndexSet.create(6, flattened.length-5);
  verifyObjectAt(obs, flattened, change, "after removing");
});

test("replacing group children array", function() {
  var children = extrachild.children;
  SC.run(function() { content[1].set('children', children); });
  flattened.replace(7,5,children);

  // changed reflect nearest top-level group
  var change = SC.IndexSet.create(6, flattened.length-4);
  verifyObjectAt(obs, flattened, change, "after removing");
});

test("changing expansion property on group", function() {
  SC.run(function() { content[1].set('isExpanded', NO); });
  flattened.removeAt(7,5);

  // changed reflect nearest top-level group
  var change = SC.IndexSet.create(6, flattened.length-1);
  verifyObjectAt(obs, flattened, change, "after removing");
});

// ..........................................................
// CHANGING MODEL LAYER CONTENT - TOP LEVEL, W CHILDREN, NOT EXPANDED
//

test("pushing object to top level with children, not expanded", function() {
  extrachild.set('isExpanded', NO);
  SC.run(function() { content.pushObject(extrachild); });
  flattened.pushObject(extrachild);
  verifyObjectAt(obs, flattened, "after pushing top level object");
});

test("inserting object in middle of top level with children, not expanded", function() {
  extrachild.set('isExpanded', NO);
  SC.run(function() { content.insertAt(2,extrachild); });
  flattened.insertAt(12, extrachild);
  verifyObjectAt(obs, flattened, "after pushing top level object");
});

// ..........................................................
// CHANGING MODEL LAYER CONTENT - TOP LEVEL/CHILDREN/EXPANDED
//

test("pushing object to top level with children", function() {
  SC.run(function() { content.pushObject(extrachild); });
  flattened.replace(flattened.length,0,[extrachild]);
  flattened.replace(flattened.length,0,extrachild.children);

  verifyObjectAt(obs, flattened, "after pushing top level object");
});

test("popping object at top level with children", function() {
  SC.run(function() {
    content.popObject(); // first one has no children
    content.popObject(); // second one has children
  });

  flattened.length=6; // truncate
  verifyObjectAt(obs, flattened, "after popping top level object");
});

test("inserting object in middle of top level with children", function() {
  SC.run(function() { content.insertAt(2,extrachild); });
  flattened.replace(12,0,[extrachild]);
  flattened.replace(13,0,extrachild.children);
  verifyObjectAt(obs, flattened, "after pushing top level object");
});

test("inserting object in middle of top level between items with children", function() {
  SC.run(function() { content.insertAt(1,extrachild); });
  flattened.replace(6,0,[extrachild]);
  flattened.replace(7,0,extrachild.children);
  verifyObjectAt(obs, flattened, "after pushing top level object");
});

test("replacing object at top level with no children => children", function() {
  SC.run(function() { content.replace(2,1, [extrachild]); });
  flattened.replace(12,1,[extrachild]);
  flattened.replace(13,0,extrachild.children);
  verifyObjectAt(obs, flattened, "after inserting top level object");
});

test("replacing object at top level with children => children", function() {
  SC.run(function() { content.replace(1,1, [extrachild]); });
  flattened.replace(6,6,[extrachild]);
  flattened.replace(7,0,extrachild.children);
  verifyObjectAt(obs, flattened, "after replacing top level object");
});

test("removing object at top level with children", function() {
  SC.run(function() { content.removeAt(1); });
  flattened.replace(6,6,null);
  verifyObjectAt(obs, flattened, "after removing top level object");
});

// ..........................................................
// MODIFYING OBSERVER -> MODEL, TOP-LEVEL
//

test("adding an group to end", function() {
  var expected = content.slice();

  SC.run(function() { obs.pushObject(extrachild); });
  flattened.pushObject(extrachild);
  flattened.replace(flattened.length, 0, extrachild.children);
  expected.pushObject(extrachild);

  // verify round trip
  var change = SC.IndexSet.create(flattened.length-4,4);
  verifyObjectAt(obs, flattened, change, 'after pushing object - should have item and its children');

  // verify content change
  same(content, expected, 'content should have new extra item');
});

test("adding regular item to end", function() {

  var expected = content.slice();

  SC.run(function() { obs.pushObject(extra); });
  flattened.pushObject(extra);
  expected.pushObject(extra);

  // verify round trip
  var change = SC.IndexSet.create(flattened.length-1,1);
  verifyObjectAt(obs, flattened, change, 'after pushing object');

  // verify content change
  same(content, expected, 'content should have new extra item');
});

test("adding an group to beginning", function() {

  var expected = content.slice();

  SC.run(function() { obs.insertAt(0, extrachild); });
  flattened.insertAt(0, extrachild);
  flattened.replace(1, 0, extrachild.children);
  expected.insertAt(0,extrachild);

  // verify round trip
  var change = SC.IndexSet.create(0,flattened.length);
  verifyObjectAt(obs, flattened, change, 'after pushing object - should have item and its children');

  // verify content change
  same(content, expected, 'content should have new extra item');
});

test("adding regular item to beginning", function() {

  var expected = content.slice();

  SC.run(function() { obs.insertAt(0, extra); });
  flattened.insertAt(0, extra);
  expected.insertAt(0, extra);

  // verify round trip
  var change = SC.IndexSet.create(0,flattened.length);
  verifyObjectAt(obs, flattened, change, 'after pushing object');

  // verify content change
  same(content, expected, 'content should have new extra item');
});

test("adding an group to middle", function() {

  var expected = content.slice();

  SC.run(function() { obs.replace(6, 0, extrachild); });
  flattened.insertAt(6, extrachild);
  flattened.replace(7, 0, extrachild.children);
  expected.insertAt(1,extrachild);

  // verify round trip
  var change = SC.IndexSet.create(6,flattened.length-6);
  verifyObjectAt(obs, flattened, change, 'after pushing object - should have item and its children');

  // verify content change
  same(content, expected, 'content should have new extra item');
});

test("adding regular item to middle", function() {

  var expected = content.slice();

  SC.run(function() { obs.insertAt(6, extra); });
  flattened.insertAt(6, extra);
  expected.insertAt(1, extra);

  // verify round trip
  var change = SC.IndexSet.create(6,flattened.length-6);
  verifyObjectAt(obs, flattened, change, 'after pushing object');

  // verify content change
  same(content, expected, 'content should have new extra item');
});

test("removing a group item", function() {

  var expected = content.slice();

  SC.run(function() { obs.removeAt(6); });
  flattened.removeAt(6,6);
  expected.removeAt(1);

  // verify round trip
  var change = SC.IndexSet.create(6,flattened.length);
  verifyObjectAt(obs, flattened, change, 'after removing object - should remove children');

  // verify content change
  same(content, expected, 'content should have removed item');
});

test("removing entire group", function() {

  var expected = content.slice();

  // note: select entire group here...
  SC.run(function() { obs.removeAt(6,6); });
  flattened.removeAt(6,6);
  expected.removeAt(1);

  // verify round trip
  var change = SC.IndexSet.create(6,flattened.length);
  verifyObjectAt(obs, flattened, change, 'after removing object - should remove children');

  // verify content change
  same(content, expected, 'content should have removed item');
});

test("removing partial group", function() {

  var expected = content.slice();

  // note: select entire group here...
  should_throw(function() {
    obs.removeAt(3,6);
  }, Error, "should throw error when trying to remove uneven boundaries");

  // verify no change
  var change = null;
  verifyObjectAt(obs, flattened, change, 'after removing object - should remove children');

  // verify content change
  same(content, expected, 'content should have removed item');
});

test("removing group header and some of the children", function() {

  var expected = content.slice();

  // note: select entire group here...
  should_throw(function() {
    obs.removeAt(6, 3);
  }, Error, "should throw error when trying to remove uneven boundaries");

  // verify no change
  var change = null;
  verifyObjectAt(obs, flattened, change, 'after removing object - should remove children');

  // verify content change
  same(content, expected, 'content should have removed item');
});

// ..........................................................
// MODIFYING OBSERVER -> MODEL, GROUP-LEVEL
//

test("adding regular item to end of group", function() {

  var expected = content[0].children.slice();

  SC.run(function() {
    obs.replace(6, 0, [extra], SC.DROP_AFTER);
  });
  flattened.replace(6, 0, [extra]);
  expected.pushObject(extra);

  // verify round trip - change covers effected group
  var change = SC.IndexSet.create(0, flattened.length);
  verifyObjectAt(obs, flattened, change, 'after pushing object');

  // verify content change
  same(content[0].children, expected, 'content.children should change');
});

test("removing regular item to end of group", function() {

  var base     = content[0].children,
      expected = base.slice();

  SC.run(function() {
    obs.removeAt(5);
  });
  flattened.removeAt(5);
  expected.popObject();

  // verify round trip - change covers effected group
  var change = SC.IndexSet.create(0, flattened.length+1);
  verifyObjectAt(obs, flattened, change, 'after removing object');

  // verify content change
  same(base, expected, 'content.children should change');
});

test("adding regular item to beginning", function() {

  var base     = content[0].children,
      expected = base.slice();

  SC.run(function() { obs.insertAt(1, extra); });
  flattened.insertAt(1, extra);
  expected.insertAt(0, extra);

  // verify round trip
  var change = SC.IndexSet.create(0,flattened.length);
  verifyObjectAt(obs, flattened, change, 'after pushing object - should have item');

  // verify content change
  same(base, expected, 'content should have new extra item');
});

test("removing regular item to beginning", function() {

  var base     = content[0].children,
      expected = base.slice();

  SC.run(function() { obs.removeAt(1); });
  flattened.removeAt(1);
  expected.removeAt(0);

  // verify round trip
  var change = SC.IndexSet.create(0,flattened.length+1);
  verifyObjectAt(obs, flattened, change, 'after pushing object - should have item');

  // verify content change
  same(base, expected, 'content should have new extra item');
});

test("adding regular item to middle", function() {

  var base     = content[0].children,
      expected = base.slice();

  SC.run(function() { obs.insertAt(3, extra); });
  flattened.insertAt(3, extra);
  expected.insertAt(2, extra);

  // verify round trip
  var change = SC.IndexSet.create(0,flattened.length);
  verifyObjectAt(obs, flattened, change, 'after adding object');

  // verify content change
  same(base, expected, 'content should have new extra item');
});

test("removing regular item to middle", function() {

  var base     = content[0].children,
      expected = base.slice();

  SC.run(function() { obs.removeAt(3); });
  flattened.removeAt(3);
  expected.removeAt(2);

  // verify round trip
  var change = SC.IndexSet.create(0,flattened.length+1);
  verifyObjectAt(obs, flattened, change, 'after adding object');

  // verify content change
  same(base, expected, 'content should have new extra item');
});

test("replacing regular items in middle", function() {

  var base     = content[0].children,
      expected = base.slice();

  SC.run(function() { obs.replace(3, 3, [extra]); });
  flattened.replace(3, 3, [extra]);
  expected.replace(2, 3, [extra]);

  // verify round trip
  var change = SC.IndexSet.create(0,flattened.length+2);
  verifyObjectAt(obs, flattened, change, 'after replacing object');

  // verify content change
  same(base, expected, 'content should have new extra item');
});

// ..........................................................
// SC.COLLECTION CONTENT SUPPORT
//

test("contentGroupIndexes - not grouped", function() {
  equals(delegate.get('treeItemIsGrouped'), NO, 'precond - delegate.treeItemIsGrouped == NO');
  equals(obs.contentGroupIndexes(null, obs), null, 'contentGroupIndexes should be null');

  var idx, len = obs.get('length');
  for(idx=0;idx<len;idx++) {
    equals(obs.contentIndexIsGroup(null, obs, idx), NO, 'obs.contentIndexIsGroup(null, obs, %@) should be NO'.fmt(idx));
  }
});

test("contentGroupIndexes - grouped", function() {
  delegate.set('treeItemIsGrouped', YES);
  equals(delegate.get('treeItemIsGrouped'), YES, 'precond - delegate.treeItemIsGrouped == YES');

  var set = SC.IndexSet.create(0).add(6).add(12);
  same(obs.contentGroupIndexes(null, obs), set, 'contentGroupIndexes should cover just top leve items');

  var idx, len = obs.get('length');
  for(idx=0;idx<len;idx++) {
    equals(obs.contentIndexIsGroup(null, obs, idx), set.contains(idx), 'obs.contentIndexIsGroup(null, obs, %@)'.fmt(idx));
  }
});

test("contentIndexOutlineLevel", function() {
  var idx, len = obs.get('length');
  for(idx=0;idx<len;idx++) {
    var expected = flattened[idx].outline;

    equals(obs.contentIndexOutlineLevel(null, obs, idx), expected, 'obs.contentIndexOutlineLevel(null, obs, %@)'.fmt(idx));
  }
});

test("contentIndexDisclosureState", function() {
  var idx, len = obs.get('length');
  for(idx=0;idx<len;idx++) {
    var expected = flattened[idx].isExpanded;
    expected = (expected === NO) ? SC.BRANCH_CLOSED : (expected ? SC.BRANCH_OPEN : SC.LEAF_NODE);

    var str ;
    switch(expected) {
      case SC.BRANCH_CLOSED:
        str = "SC.BRANCH_CLOSED";
        break;
      case SC.BRANCH_OPEN:
        str = "SC.BRANCH_OPEN";
        break;
      default:
         str = "SC.LEAF_NODE";
         break;
    }

    equals(obs.contentIndexDisclosureState(null, obs, idx), expected, 'obs.contentIndexDisclosureState(null, obs, %@) should eql %@'.fmt(idx,str));
  }
});
