// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

// The TreeItemObserver is tested based on the common use cases.

var content, delegate, obs, flattened, extra, extrachild, extranested, root;

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

module("SC.TreeItemObserver - Outline Use Case", {
  setup: function() {
    content = [
      TestObject.create({
        title: "A",
        isExpanded: YES,
        outline: 0,

        children: [
          TestObject.create({ title: "A.i", outline: 1 }),

          TestObject.create({ title: "A.ii",
            outline: 1,
            isExpanded: NO,
            children: [
              TestObject.create({ title: "A.ii.1", outline: 2 }),
              TestObject.create({ title: "A.ii.2", outline: 2 }),
              TestObject.create({ title: "A.ii.3", outline: 2 })]
          }),

          TestObject.create({ title: "A.iii", outline: 1 })]
      }),

      TestObject.create({
        title: "B",
        isExpanded: YES,
        outline: 0,
        children: [
          TestObject.create({ title: "B.i",
            isExpanded: YES,
            outline: 1,
            children: [
              TestObject.create({ title: "B.i.1", outline: 2 }),
              TestObject.create({ title: "B.i.2", outline: 2 }),
              TestObject.create({ title: "B.i.3", outline: 2 })]
          }),

          TestObject.create({ title: "B.ii", outline: 1 }),
          TestObject.create({ title: "B.iii", outline: 1 })]
      }),

      TestObject.create({
        outline: 0,
        title: "C"
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
      children: "0 1".w().map(function(x) {
        return TestObject.create({ title: "EXTRA.%@".fmt(x) });
      })
    });

    extranested = TestObject.create({
      title: "EXTRA",
      isExpanded: YES,

      children: [
        TestObject.create({ title: "EXTRA.i" }),
        TestObject.create({
          title: "EXTRA.ii",
          isExpanded: YES,
          children: "0 1 2".w().map(function(x) {
            return TestObject.create({ title: "EXTRA.ii.%@".fmt(x) });
          })
        }),
        TestObject.create({ title: "EXTRA.ii" })]
    });

    flattened = [
      content[0],
      content[0].children[0],
      content[0].children[1],
      content[0].children[2],
      content[1],
      content[1].children[0],
      content[1].children[0].children[0],
      content[1].children[0].children[1],
      content[1].children[0].children[2],
      content[1].children[1],
      content[1].children[2],
      content[2]];

    delegate = Delegate.create();

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
// CHANGING MODEL LAYER CONTENT - NESTED LEVEL
//

test("pushing object to group", function() {
  var base = content[1].children[0].children;
  SC.run(function() { base.pushObject(extra); });
  flattened.insertAt(9, extra);

  // changed reflect nearest top-level group
  var change = SC.IndexSet.create(4, flattened.length-4);
  verifyObjectAt(obs, flattened, change, "after pushing");
});

test("popping object from nested", function() {
  var base = content[1].children[0].children;
  SC.run(function() { base.popObject(); });
  flattened.removeAt(8);

  // changed reflect nearest top-level group
  var change = SC.IndexSet.create(4, flattened.length-3);
  verifyObjectAt(obs, flattened, change, "after popping");
});

test("inserting object in middle of nested", function() {
  var base = content[1].children[0].children;
  SC.run(function() { base.insertAt(1,extra); });
  flattened.insertAt(7, extra);

  // changed reflect nearest top-level group
  var change = SC.IndexSet.create(4, flattened.length-4);
  verifyObjectAt(obs, flattened, change, "after insert");
});

test("replacing object in nested", function() {
  var base = content[1].children[0].children;
  SC.run(function() { base.replace(1,1, [extra]); });
  flattened.replace(7, 1, [extra]);

  // changed reflect nearest top-level group
  var change = SC.IndexSet.create(4, flattened.length-5);
  verifyObjectAt(obs, flattened, change, "after replacing");
});

test("removing object in gorup", function() {
  var base = content[1].children[0].children;
  SC.run(function() { base.removeAt(1); });
  flattened.removeAt(7);

  // changed reflect nearest top-level group
  var change = SC.IndexSet.create(4, flattened.length-3);
  verifyObjectAt(obs, flattened, change, "after removing");
});

test("replacing nested children array", function() {
  var children = extrachild.children;
  var base = content[1].children[0];
  SC.run(function() { base.set('children', children); });
  flattened.replace(6,3,children);

  // changed reflect nearest top-level group
  var change = SC.IndexSet.create(4, flattened.length-3);
  verifyObjectAt(obs, flattened, change, "after replace children array");
});

test("changing expansion property on nested", function() {
  var base = content[1].children[0];
  SC.run(function() { base.set('isExpanded', NO); });
  flattened.removeAt(6,3);

  // changed reflect nearest top-level group
  var change = SC.IndexSet.create(4, flattened.length-1);
  verifyObjectAt(obs, flattened, change, "after removing");
});

test("changing expansion property on top level", function() {
  var base = content[1];
  SC.run(function() { base.set('isExpanded', NO); });
  flattened.removeAt(5,6);

  // changed reflect nearest top-level group
  var change = SC.IndexSet.create(4, 8);
  verifyObjectAt(obs, flattened, change, "after removing");
});

// ..........................................................
// MODIFYING OBSERVER -> MODEL, NESTED-LEVEL
//

test("adding regular item to end of nested group", function() {

  var base     = content[1].children[0].children,
      expected = base.slice();

  SC.run(function() {
    obs.replace(9, 0, [extra], SC.DROP_AFTER);
  });
  flattened.replace(9, 0, [extra]);
  expected.pushObject(extra);

  // verify round trip - change covers effected group
  var change = SC.IndexSet.create(4, flattened.length-4);
  verifyObjectAt(obs, flattened, change, 'after pushing object');

  // verify content change
  same(base, expected, 'content.children should change');
});

test("adding regular item after nested group", function() {

  var base     = content[1].children,
      expected = base.slice();

  SC.run(function() {
    obs.replace(9, 0, [extra], SC.DROP_BEFORE);
  });
  flattened.replace(9, 0, [extra]);
  expected.insertAt(1, extra);

  // verify round trip - change covers effected group
  var change = SC.IndexSet.create(4, flattened.length-4);
  verifyObjectAt(obs, flattened, change, 'after pushing object');

  // verify content change
  same(base, expected, 'content.children should change');
});

test("removing regular item to end of nested", function() {

  var base     = content[1].children[0].children,
      expected = base.slice();

  SC.run(function() {
    obs.removeAt(8);
  });
  flattened.removeAt(8);
  expected.popObject();

  // verify round trip - change covers effected group
  var change = SC.IndexSet.create(4, flattened.length-3);
  verifyObjectAt(obs, flattened, change, 'after removing object');

  // verify content change
  same(base, expected, 'content.children should change');
});

test("adding regular item to beginning of nested", function() {

  var base     = content[1].children[0].children,
      expected = base.slice();

  SC.run(function() { obs.insertAt(6, extra); });
  flattened.insertAt(6, extra);
  expected.insertAt(0, extra);

  // verify round trip
  var change = SC.IndexSet.create(4,flattened.length-4);
  verifyObjectAt(obs, flattened, change, 'after pushing object - should have item');

  // verify content change
  same(base, expected, 'content should have new extra item');
});

test("removing regular item to beginning", function() {

  var base     = content[1].children[0].children,
      expected = base.slice();

  SC.run(function() { obs.removeAt(6); });
  flattened.removeAt(6);
  expected.removeAt(0);

  // verify round trip
  var change = SC.IndexSet.create(4,flattened.length-3);
  verifyObjectAt(obs, flattened, change, 'after pushing object - should have item');

  // verify content change
  same(base, expected, 'content should have new extra item');
});

test("adding regular item to middle", function() {

  var base     = content[1].children[0].children,
      expected = base.slice();

  SC.run(function() { obs.insertAt(7, extra); });
  flattened.insertAt(7, extra);
  expected.insertAt(1, extra);

  // verify round trip
  var change = SC.IndexSet.create(4,flattened.length-4);
  verifyObjectAt(obs, flattened, change, 'after adding object');

  // verify content change
  same(base, expected, 'content should have new extra item');
});

test("removing regular item to middle", function() {

  var base     = content[1].children[0].children,
      expected = base.slice();

  SC.run(function() { obs.removeAt(7); });
  flattened.removeAt(7);
  expected.removeAt(1);

  // verify round trip
  var change = SC.IndexSet.create(4,flattened.length-3);
  verifyObjectAt(obs, flattened, change, 'after adding object');

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

  var set = SC.IndexSet.create(0).add(4);
  same(obs.contentGroupIndexes(null, obs), set, 'contentGroupIndexes should cover just top level group items');

  var idx, len = obs.get('length');
  for(idx=0;idx<len;idx++) {
    equals(obs.contentIndexIsGroup(null, obs, idx), set.contains(idx), 'obs.contentIndexIsGroup(null, obs, %@) (%@)'.fmt(idx, flattened[idx]));
  }
});

test("contentIndexOutlineLevel", function() {
  var idx, len = obs.get('length');
  for(idx=0;idx<len;idx++) {
    var expected = flattened[idx].outline;

    equals(obs.contentIndexOutlineLevel(null, obs, idx), expected, 'obs.contentIndexOutlineLevel(null, obs, %@) (%@)'.fmt(idx, flattened[idx]));
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

    equals(obs.contentIndexDisclosureState(null, obs, idx), expected, 'obs.contentIndexDisclosureState(null, obs, %@) (%@) should eql %@'.fmt(idx,flattened[idx], str));
  }
});

// ..........................................................
// SPECIAL CASES
//

test("moving nested item from one parent to another", function() {
  var parent1 = content[1].children[0].children;
  var parent2 = content[0].children;
  var item    = parent1[1];

  SC.run(function() {
    parent1.removeObject(item);
    parent2.insertAt(0, item);
  });

  flattened.removeObject(item);
  flattened.insertAt(flattened.indexOf(content[0])+1, item);

  var change = SC.IndexSet.create(0, flattened.length);
  verifyObjectAt(obs, flattened, change, "after moving");
});

