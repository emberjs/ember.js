// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

// The TreeItemObserver is tested based on the common use cases.

var root, content, flattened, delegate, obs, length, extra;

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


module("SC.TreeItemObserver - Flat Array Use Case", {
  setup: function() {
    content = "1 2 3 4 5".w().map(function(x) {
      return TestObject.create({ title: x });
    });

    root = TestObject.create({
      title: "ROOT",
      children: content,
      isExpanded: YES
    });

    flattened = content.slice();

    delegate = Delegate.create();

    extra = TestObject.create({ title: "EXTRA" });

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
  equals(obs.get('length'), 5, 'should have length of array on create');
});

test("length after replace", function() {
  equals(obs.get('length'), 5, 'precond - should have length of array on create');

  SC.run(function() { content.replace(2,1, [extra]); }); // replace
  equals(obs.get('length'), 5, 'length should not change');
});

test("length after insert", function() {
  equals(obs.get('length'), 5, 'precond - should have length of array on create');

  SC.run(function() { content.insertAt(2, extra); });
  equals(obs.get('length'), 6, 'length should change');
});

test("length after remove", function() {
  equals(obs.get('length'), 5, 'precond - should have length of array on create');

  SC.run(function() { content.removeAt(2); });
  equals(obs.get('length'), 4, 'length should change');
});

// ..........................................................
// OBJECT AT
//

test("objectAt on create", function() {
  verifyObjectAt(obs, flattened, "on create");
});

test("objectAt after replace", function() {

  verifyObjectAt(obs, flattened, "PRECOND"); // verify initial state

  SC.run(function() { content.replace(2,1, [extra]); }); // replace
  flattened[2] = extra;

  var change = SC.IndexSet.create(2);
  verifyObjectAt(obs, flattened, change, "on create");
});

test("objectAt after insert", function() {
  verifyObjectAt(obs, flattened, "PRECOND"); // verify initial state

  SC.run(function() { content.insertAt(2,extra); }); // replace
  flattened.insertAt(2, extra);

  var change = SC.IndexSet.create(2, flattened.length-2);
  verifyObjectAt(obs, flattened, change, "after insert");
});

test("objectAt after remove", function() {
  verifyObjectAt(obs, flattened, "PRECOND"); // verify initial state

  SC.run(function() { content.removeAt(2); }); // replace
  flattened.removeAt(2);


  var change = SC.IndexSet.create(2, flattened.length-1);
  verifyObjectAt(obs, flattened, change, "after remove");
});

// ..........................................................
// MODIFYING OBSERVER -> MODEL
//

test("adding an object to end", function() {

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

test("removing object at end", function() {

  var expected = content.slice();

  SC.run(function() { obs.popObject(); });
  flattened.popObject();
  expected.popObject();

  // verify round trip
  var change = SC.IndexSet.create(flattened.length,1);
  verifyObjectAt(obs, flattened, change, 'after removing object');

  // verify content change
  same(content, expected, 'content should have new extra item');
});

test("adding an object to start", function() {

  var expected = content.slice();

  SC.run(function() { obs.insertAt(0, extra); });
  flattened.insertAt(0, extra);
  expected.insertAt(0, extra);

  // verify round trip
  var change = SC.IndexSet.create(0, flattened.length);
  verifyObjectAt(obs, flattened, change, 'after pushing object');

  // verify content change
  same(content, expected, 'content should have new extra item');
});

test("remove an object to start", function() {

  var expected = content.slice();

  SC.run(function() { obs.removeAt(0); });
  flattened.removeAt(0);
  expected.removeAt(0);

  // verify round trip
  var change = SC.IndexSet.create(0, flattened.length+1);
  verifyObjectAt(obs, flattened, change, 'after removing object');

  // verify content change
  same(content, expected, 'content should have new extra item');
});

test("adding object in middle", function() {

  var expected = content.slice();

  SC.run(function() { obs.insertAt(2, extra); });
  flattened.insertAt(2, extra);
  expected.insertAt(2, extra);

  // verify round trip
  var change = SC.IndexSet.create(2, flattened.length-2);
  verifyObjectAt(obs, flattened, change, 'after adding object');

  // verify content change
  same(content, expected, 'content should have new extra item');
});

test("removing object in middle", function() {

  var expected = content.slice();

  SC.run(function() { obs.removeAt(2); });
  flattened.removeAt(2);
  expected.removeAt(2);

  // verify round trip
  var change = SC.IndexSet.create(2, flattened.length-1);
  verifyObjectAt(obs, flattened, change, 'after removing object');

  // verify content change
  same(content, expected, 'content should have new extra item');
});

test("replace object in middle", function() {

  var expected = content.slice();

  SC.run(function() { obs.replace(2, 1, [extra]); });
  flattened.replace(2, 1, [extra]);
  expected.replace(2, 1, [extra]);

  // verify round trip
  var change = SC.IndexSet.create(2, 1);
  verifyObjectAt(obs, flattened, change, 'after replacing object');

  // verify content change
  same(content, expected, 'content should have new extra item');
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
  same(obs.contentGroupIndexes(null, obs), SC.IndexSet.EMPTY, 'contentGroupIndexes should be an empty set');

  var idx, len = obs.get('length');
  for(idx=0;idx<len;idx++) {
    equals(obs.contentIndexIsGroup(null, obs, idx), NO, 'obs.contentIndexIsGroup(null, obs, %@) should be NO'.fmt(idx));
  }
});

test("contentIndexOutlineLevel", function() {
  var idx, len = obs.get('length');
  for(idx=0;idx<len;idx++) {
    equals(obs.contentIndexOutlineLevel(null, obs, idx), 0, 'obs.contentIndexOutlineLevel(null, obs, %@)'.fmt(idx));
  }
});

test("contentIndexDisclosureState", function() {
  var idx, len = obs.get('length');
  for(idx=0;idx<len;idx++) {
    equals(obs.contentIndexDisclosureState(null, obs, idx), SC.LEAF_NODE, 'obs.contentIndexDisclosureState(null, obs, %@) should eql SC.LEAF_NODE'.fmt(idx));
  }
});

