// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2011 Apple Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

// TODO: Make these unit tests more complete.

var set1, set2, content;
module("SC.SelectionSet.isEqual", {
  setup: function() {
    content = '1 2 3 4 5 6 7 8 9 0'.w();
    set1 = SC.SelectionSet.create();
    set2 = SC.SelectionSet.create();
  }
});

test("set.isEqual(same instance)", function() {
  ok(set1.isEqual(set1), 'same instance should return YES');
});

test("set.isEqual(null)", function() {
  ok(!set1.isEqual(null), 'null should return NO');
});


test("set1.isEqual(set2)", function() {
  ok(set1.isEqual(set2), 'same content should return YES');
  
  set1.add(content, 4,4);
  set2.add(content, 4,4);
  ok(set1.isEqual(set2), 'same content should return YES');

  set1.remove(content, 6);
  set2.remove(content, 6);
  ok(set1.isEqual(set2), 'same content should return YES');

  set1.remove(content, 4,4);
  set2.remove(content, 4,4);
  ok(set1.isEqual(set2), 'same content should return YES');
  
});

test("multiple content objects", function() {
  var content2 = "1 2 3 4 5".w();
  set1.add(content, 4,4).add(content2, 3);
  ok(!set1.isEqual(set2), 'should not be same when set2 is empty');

  set2.add(content2, 3);
  ok(!set1.isEqual(set2), 'should not be same when set2 has only one content');

  set2.add(content,4,4);
  ok(set1.isEqual(set2), 'should not be same when set2 has both content');
  
});

test("set1.isEqual(set2) after set2 is filled and emptied", function() {
  set2.add(content,4,4).remove(content,4,4);
  ok(set1.isEqual(set2), 'same content should return YES');
});
