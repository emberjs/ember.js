// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

/*globals throws should_throw*/

var content, controller, extra;

var TestObject = SC.Object.extend({
  title: "test",  
  xFactor: "THETA",
  toString: function() { return "TestObject(%@)".fmt(this.get("title")); }
});


// ..........................................................
// EMPTY SET
// 

module("SC.ArrayController - enum_case - EMPTY SET", {
  setup: function() {
    content = SC.Set.create();
    controller = SC.ArrayController.create({ 
      content: content, orderBy: "title" 
    });
    extra = TestObject.create({ title: "FOO", xFactor: "ZED" });
  },
  
  teardown: function() {
    controller.destroy();
  }
});

test("state properties", function() {
  equals(controller.get("hasContent"), YES, 'c.hasContent');
  equals(controller.get("canRemoveContent"), YES, "c.canRemoveContent");
  equals(controller.get("canReorderContent"), NO, "c.canReorderContent");
  equals(controller.get("canAddContent"), YES, "c.canAddContent");
});

// addObject should append to end of array + notify observers on Array itself
test("addObject", function() {
  var callCount = 0;
  controller.addObserver('[]', function() { callCount++; });
  
  SC.run(function() { controller.addObject(extra); });
  
  var expected = SC.Set.create().add(extra);
  same(content, expected, 'addObject(extra) should work');
  equals(callCount, 1, 'should notify observer that content has changed');
  equals(content.get('length'), 1, 'should update length of controller');
});

test("removeObject", function() {
  var callCount = 0;
  controller.addObserver('[]', function() { callCount++; });
  
  SC.run(function() { controller.removeObject(extra); });
  
  same(content, SC.Set.create(), 'removeObject(extra) should have no effect');
  equals(callCount, 0, 'should not notify observer since content did not change');
});

test("basic array READ operations", function() {
  equals(controller.get("length"), 0, 'length should be empty');
  equals(controller.objectAt(0), undefined, "objectAt() should return undefined");
});

test("basic array WRITE operations", function() {
  var callCount = 0;
  controller.addObserver('[]', function() { callCount++; });

  should_throw(function() {
    controller.replace(0,1,[extra]);
  }, Error, "calling replace on an enumerable should throw");
});

test("arrangedObjects", function() {
  equals(controller.get("arrangedObjects"), controller, 'c.arrangedObjects should return receiver');
});

// ..........................................................
// NON-EMPTY SET
// 

module("SC.ArrayController - enum_case - NON-EMPTY SET", {
  setup: function() {
    content = SC.Set.create();
    "1 2 3 4 5".w().forEach(function(x) {
      content.add(TestObject.create({ title: x, xFactor: (5-x) }));
    });
    
    controller = SC.ArrayController.create({ 
      content: content, orderBy: "title" 
    });
    extra = TestObject.create({ title: "FOO", xFactor: 0 });
  },
  
  teardown: function() {
    controller.destroy();
  }
});

test("state properties", function() {
  equals(controller.get("hasContent"), YES, 'c.hasContent');
  equals(controller.get("canRemoveContent"), YES, "c.canRemoveContent");
  equals(controller.get("canReorderContent"), NO, "c.canReorderContent");
  equals(controller.get("canAddContent"), YES, "c.canAddContent");
});

// addObject should regenerate ordered + notify observers on Array itself
test("addObject", function() {
  var expected = content.copy();
  expected.add(extra);
  
  var callCount = 0;
  controller.addObserver('[]', function() { callCount++; });
  
  SC.run(function() { controller.addObject(extra); });
  
  same(content, expected, 'addObject(extra) should work');
  equals(callCount, 1, 'should notify observer that content has changed');
  equals(content.get('length'), expected.length, 'should update length of controller');
  
  var idx, len = controller.get('length');
  expected = SC.A(expected).sort(function(a,b) { 
    return SC.compare(a.get('title'), b.get('title')); 
  });

  for(idx=0;idx<len;idx++) {
    equals(controller.objectAt(idx), expected[idx], "controller.objectAt(%@) should be match ordered array %@".fmt(idx,idx));
  }
  
});

test("removeObject", function() {
  var expected = content.copy(), obj = expected.pop();
  
  var callCount = 0;
  controller.addObserver('[]', function() { callCount++; });
  
  equals(controller.get('length'), content.get('length'), 'precond - controller should have same length as content to start');
  
  SC.run(function() { controller.removeObject(obj); });
  
  same(content, expected, 'removeObject(extra) should remove object');
  equals(callCount, 1, 'should notify observer that content has changed');
  equals(content.get('length'), expected.length, 'should update length of content');
  equals(controller.get('length'), expected.length, 'should update length of controller as well');
  
  var idx, len = controller.get('length');
  expected = SC.A(expected).sort(function(a,b) { 
    return SC.compare(a.get('title'), b.get('title')); 
  });

  for(idx=0;idx<len;idx++) {
    equals(controller.objectAt(idx), expected[idx], "controller.objectAt(%@) should be match ordered array %@".fmt(idx,idx));
  }
});

test("basic array READ operations", function() {
  equals(controller.get("length"), content.length, 'length should be empty');
  
  var expected = SC.A(content).sort(function(a,b) { 
    return SC.compare(a.get('title'), b.get('title')); 
  });
  var loc = expected.length+1; // verify 1 past end as well

  while(--loc>=0) {
    equals(controller.objectAt(loc), expected[loc], "objectAt(%@) should return same value at content[%@]".fmt(loc, loc));
  }
});

test("basic array WRITE operations", function() {
  var callCount = 0;
  controller.addObserver('[]', function() { callCount++; });

  should_throw(function() {
    controller.replace(0,1,[extra]);
  }, Error, "calling replace on an enumerable should throw");
});

test("arrangedObjects", function() {
  equals(controller.get("arrangedObjects"), controller, 'c.arrangedObjects should return receiver');
});


test("modifying orderBy should build order", function() {
  
  var cnt = 0 ;
  controller.addObserver('[]', this, function() { cnt++; });
  same(controller.getEach('title'), '1 2 3 4 5'.w(), 'initially should be ordered by title');
  
  cnt = 0;
  controller.set('orderBy', 'xFactor');
  equals(cnt, 1, 'should have fired observer on enumerable');
  same(controller.getEach('title'), '5 4 3 2 1'.w(), 'should be ordered reverse');
});

// ..........................................................
// ADD SPECIAL CASES HERE
// 

