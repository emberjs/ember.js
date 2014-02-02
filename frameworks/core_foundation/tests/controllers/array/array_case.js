// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

/*globals throws */

var content, controller, extra;

var TestObject = SC.Object.extend({
  title: "test",
  toString: function() { return "TestObject(%@)".fmt(this.get("title")); }
});

var ComplexTestObject = SC.Object.extend({
  firstName: null,
  lastName: null,
  toString: function() { return "TestObject(%@ %@)".fmt(this.get("firstName"), this.get('lastName')); }
});

// ..........................................................
// EMPTY
//

module("SC.ArrayController - array_case - EMPTY", {
  setup: function() {
    content = [];
    controller = SC.ArrayController.create({ content: content });
    extra = TestObject.create({ title: "FOO" });
  },

  teardown: function() {
    controller.destroy();
  }
});

test("state properties", function() {
  equals(controller.get("hasContent"), YES, 'c.hasContent');
  equals(controller.get("canRemoveContent"), YES, "c.canRemoveContent");
  equals(controller.get("canReorderContent"), YES, "c.canReorderContent");
  equals(controller.get("canAddContent"), YES, "c.canAddContent");
});

// addObject should append to end of array + notify observers on Array itself
test("addObject", function() {
  var callCount = 0;
  controller.addObserver('[]', function() { callCount++; });

  SC.run(function() { controller.addObject(extra); });

  same(content, [extra], 'addObject(extra) should work');
  equals(callCount, 1, 'should notify observer that content has changed');
  equals(content.get('length'), 1, 'should update length of controller');
});

test("removeObject", function() {
  var callCount = 0;
  controller.addObserver('[]', function() { callCount++; });

  SC.run(function() { controller.removeObject(extra); });

  same(content, [], 'removeObject(extra) should have no effect');
  equals(callCount, 0, 'should not notify observer since content did not change');
});

test("basic array READ operations", function() {
  equals(controller.get("length"), 0, 'length should be empty');
  equals(controller.objectAt(0), undefined, "objectAt() should return undefined");
});

test("basic array WRITE operations", function() {
  var callCount = 0;
  controller.addObserver('[]', function() { callCount++; });

  controller.replace(0,1,[extra]);

  same(content, [extra], 'should modify content');
  equals(callCount, 1, 'should notify observer that content has changed');
  equals(content.get('length'), 1, 'should update length of controller');
});

test("arrangedObjects", function() {
  equals(controller.get("arrangedObjects"), controller, 'c.arrangedObjects should return receiver');
});


// ..........................................................
// NON-EMPTY ARRAY
//

module("SC.ArrayController - array_case - NON-EMPTY", {
  setup: function() {
    content = "1 2 3 4 5".w().map(function(x) {
      return TestObject.create({ title: x });
    });

    controller = SC.ArrayController.create({ content: content });
    extra = TestObject.create({ title: "FOO" });
  },

  teardown: function() {
    controller.destroy();
  }
});

test("state properties", function() {
  equals(controller.get("hasContent"), YES, 'c.hasContent');
  equals(controller.get("canRemoveContent"), YES, "c.canRemoveContent");
  equals(controller.get("canReorderContent"), YES, "c.canReorderContent");
  equals(controller.get("canAddContent"), YES, "c.canAddContent");
});

// addObject should append to end of array + notify observers on Array itself
test("addObject", function() {
  var expected = content.slice();
  expected.push(extra);

  var callCount = 0;
  controller.addObserver('[]', function() { callCount++; });

  SC.run(function() { controller.addObject(extra); });

  same(content, expected, 'addObject(extra) should work');
  equals(callCount, 1, 'should notify observer that content has changed');
  equals(content.get('length'), expected.length, 'should update length of controller');
});

test("removeObject", function() {
  var expected = content.slice(), obj = expected[3];
  expected.removeObject(obj);

  var callCount = 0;
  controller.addObserver('[]', function() { callCount++; });

  SC.run(function() { controller.removeObject(obj); });

  same(content, expected, 'removeObject(extra) should remove object');
  equals(callCount, 1, 'should notify observer that content has changed');
  equals(content.get('length'), expected.length, 'should update length of controller');
});

test("basic array READ operations", function() {
  equals(controller.get("length"), content.length, 'length should be empty');

  var loc = content.length+1; // verify 1 past end as well
  while(--loc>=0) {
    equals(controller.objectAt(loc), content[loc], "objectAt(%@) should return same value at content[%@]".fmt(loc, loc));
  }
});

test("basic array WRITE operations", function() {
  var expected = content.slice();
  expected.replace(3,1,[extra]);

  var callCount = 0;
  controller.addObserver('[]', function() { callCount++; });

  controller.replace(3,1,[extra]);

  same(content, expected, 'should modify content');
  equals(callCount, 1, 'should notify observer that content has changed');
  equals(content.get('length'), expected.length, 'should update length of controller');
});

test("arrangedObjects", function() {
  equals(controller.get("arrangedObjects"), controller, 'c.arrangedObjects should return receiver');
});


test("The computed properties firstObject, firstSelectableObject & lastObject should update when content changes.", function(){
  equals(controller.get('firstObject'), content[0], 'first object should be the first object in content');
  equals(controller.get('firstSelectableObject'), content[0], 'first selectable object should be the first object in content');
  equals(controller.get('lastObject'), content[4], 'lastObject should be the last object in content');

  // Reorder the content
  var newObject = TestObject.create({ title: "BLAH" });
  controller.set('content', [newObject]);

  equals(controller.get('firstObject'), newObject, 'first object should be the new first object in content');
  equals(controller.get('firstSelectableObject'), newObject, 'first selectable object should be the new first object in content');
  equals(controller.get('lastObject'), newObject, 'lastObject should be the new last object in content');
});

test("The computed properties firstObject, firstSelectableObject & lastObject should update when content items change.", function(){
  equals(controller.get('firstObject'), content[0], 'first object should be the first object in content');
  equals(controller.get('firstSelectableObject'), content[0], 'first selectable object should be the first object in content');
  equals(controller.get('lastObject'), content[4], 'lastObject should be the last object in content');

  // Change the items.
  var newObject = TestObject.create({ title: "BLAH" });
  controller.replace(0, 5, [newObject]);

  equals(controller.get('firstObject'), newObject, 'first object should be the new first object in content');
  equals(controller.get('firstSelectableObject'), newObject, 'first selectable object should be the new first object in content');
  equals(controller.get('lastObject'), newObject, 'lastObject should be the new last object in content');
});

// ..........................................................
// orderBy
//

test("array orderBy using String", function(){
  var testController = SC.ArrayController.create({
    content: content,
    orderBy: 'title ASC'
  });

  equals(testController.get('firstSelectableObject'), content[0], 'first selectable object should be the first object in arrangedObjects');
  equals(testController.get('lastObject'), content[4], 'lastObject should be the last object in content');

  // Reorder the content
  testController.set('orderBy', 'title DESC');

  equals(testController.get('firstSelectableObject'), content[4], 'first selectable object should be the first object in arrangedObjects (changed order)');
  equals(testController.get('lastObject'), content[0], 'lastObject should be the first object in content (changed order)');
});


test("array orderBy using Array", function(){
  var complexContent,
      familyNames = "Keating Zane Alberts Keating Keating".w(),
      givenNames = "Travis Harold Brian Alvin Peter".w(),
      testController;

  complexContent = familyNames.map(function(x, i) {
    return ComplexTestObject.create({ lastName: x, firstName: givenNames.objectAt(i) });
  });

  testController = SC.ArrayController.create({
    content: complexContent
  });

  equals(testController.get('firstSelectableObject'), complexContent[0], 'first selectable object should be the first object in arrangedObjects');

  // Reorder the content
  testController.set('orderBy', ['lastName', 'firstName']); // Brian Alberts, Alvin Keating, Peter Keating, Travis Keating, Harold Zane
  equals(testController.get('firstSelectableObject'), complexContent[2], 'first selectable object should be the first object in arrangedObjects (changed order)');
  equals(testController.objectAt(1), complexContent[3], 'fourth content object should be the second object in arrangedObjects (changed order)');

  // Reorder the content
  testController.set('orderBy', ['lastName', 'firstName DESC']); // Brian Alberts, Travis Keating, Peter Keating, Alvin Keating,Harold Zane
  equals(testController.objectAt(3), complexContent[3], 'fourth content object should be the fourth object in arrangedObjects (changed order)');

});

test("array orderBy using function", function(){
  var testFunc = function(a,b){
    if(a.get('title') > b.get('title')) return -1;
    else if (a.get('title') == b.get('title')) return 0;
    else return 1;
  };
  var expected = content.slice();
  expected.sort(testFunc);

  var testController = SC.ArrayController.create({
    content: content,
    orderBy: testFunc
  });
  same(testController.get('arrangedObjects').toArray(), expected, 'arrangedObjects should be sortable by a custom function');
});

test("verify length is correct in arrayObserver didChange method when orderBy is set", function () {
  content = [];
  controller = SC.ArrayController.create({
    content: content,
    orderBy: 'i haz your content!'
  });
  expect(2);

  controller.addArrayObservers({
    willChange: function () {
      equals(this.get('length'), 0, 'length should be 0');
    },

    didChange: function () {
      equals(this.get('length'), 1, 'length should be 1');
    }
  });

  content.pushObject(":{");
});

test("verify range observers fire correctly when object added at different sorted index than absolute index", function() {
  content = [ TestObject.create({ value: 1 }), TestObject.create({ value: 2 }) ];
  controller = SC.ArrayController.create({
    content: content,
    orderBy: 'value ASC'
  });
  var callCount = 0;
  controller.addRangeObserver(SC.IndexSet.create(0, 2), null, function() { callCount++; });
  controller.content.pushObject(TestObject.create({ value: 0 }));
  ok(callCount === 1, "Range observer should have fired based on inclusion in the sorted range rather than the raw content range.");
});

// ..........................................................
// ADD SPECIAL CASES HERE
//

test("verify rangeObserver fires when content is deleted", function() {

  content = "1 2 3 4 5".w().map(function(x) {
    return TestObject.create({ title: x });
  });

  controller = SC.ArrayController.create({ content: content });

  var cnt = 0,
      observer = SC.Object.create({ method: function() { cnt++; } });

  controller.addRangeObserver(SC.IndexSet.create(0,2), observer, observer.method);

  SC.RunLoop.begin();
  content.replace(0, content.length, []);
  SC.RunLoop.end();

  equals(cnt, 1, 'range observer should have fired once');
});

test("should invalidate computed property once per changed key", function() {
  var setCalls = 0;
  var getCalls = 0;

  window.peopleController = SC.ArrayController.create({
    foo: YES,
    content: [SC.Object.create({name:'Juan'}),
              SC.Object.create({name:'Camilo'}),
              SC.Object.create({name:'Pinzon'}),
              SC.Object.create({name:'Señor'}),
              SC.Object.create({name:'Daaaaaale'})],

    fullNames: function(key, value) {
      if (value !== undefined) {
        setCalls++;
        this.setEach('name', value);
      } else {
        getCalls++;
      }

      return this.getEach('name').join(' ');
    }.property('@each.name')
  });

  try {
    var peopleWatcher = SC.Object.create({
      namesBinding: 'peopleController.fullNames'
    });

    SC.run();
    SC.run(function() { peopleWatcher.set('names', 'foo bar baz'); });
    equals(setCalls, 1, "calls set once");
    // equals(getCalls, 3, "calls get three times");
    // TODO: Figure out what the right number is. Recent optimizations have reduced
    // it significantly, but we can't get it below 7.
  } finally {
    window.peopleController = undefined;
  }

});


module("SC.ArrayController - dependent keys with @each");

test("should invalidate property when property on any enumerable changes", function() {
  var inventory = [];
  var recomputed = 0;

  for (var idx = 0; idx < 20; idx++) {
    inventory.pushObject(SC.Object.create({
      price: 5
    }));
  }
  var restaurant = SC.ArrayController.create({
    content: inventory,

    totalCost: function() {
      recomputed++;
      return inventory.reduce(function(prev, item) {
        return prev+item.get('price');
      }, 0);
    }.property('@each.price').cacheable()
  });

  equals(restaurant.get('totalCost'), 100, "precond - computes cost of all items");
  inventory[0].set('price', 6);

  equals(restaurant.get('totalCost'), 101, "recalculates after dependent key on an enumerable item changes");
  inventory[19].set('price', 6);

  equals(restaurant.get('totalCost'), 102, "recalculates after dependent key on a different item changes");
  inventory.pushObject(SC.Object.create({
    price: 5
  }));
  equals(restaurant.get('totalCost'), 107, "recalculates after adding an item to the enumerable");

  var item = inventory.popObject();
  equals(restaurant.get('totalCost'), 102, "recalculates after removing an item from the enumerable");

  recomputed = 0;
  item.set('price', 0);
  equals(recomputed, 0, "does not recalculate after changing key on removed item");
});

test("should invalidate property when property of array item changes after content has changed", function() {
  var inventory = [];
  var recomputed = 0;

  for (var idx = 0; idx < 20; idx++) {
    inventory.pushObject(SC.Object.create({
      price: 5
    }));
  }
  var restaurant = SC.ArrayController.create({
    content: [],

    totalCost: function() {
      recomputed++;
      return inventory.reduce(function(prev, item) {
        return prev+item.get('price');
      }, 0);
    }.property('@each.price').cacheable()
  });

  restaurant.set('content', inventory);

  equals(restaurant.get('totalCost'), 100, "precond - computes cost of all items");
  inventory[0].set('price', 6);

  equals(restaurant.get('totalCost'), 101, "recalculates after dependent key on an enumerable item changes");
  inventory[19].set('price', 6);

  equals(restaurant.get('totalCost'), 102, "recalculates after dependent key on a different item changes");
  inventory.pushObject(SC.Object.create({
    price: 5
  }));
  equals(restaurant.get('totalCost'), 107, "recalculates after adding an item to the enumerable");

  var item = inventory.popObject();
  equals(restaurant.get('totalCost'), 102, "recalculates after removing an item from the enumerable");

  recomputed = 0;
  item.set('price', 0);
  equals(recomputed, 0, "does not recalculate after changing key on removed item");
});

// ..........................................................
// VERIFY SC.ARRAY COMPLIANCE
//

SC.ArraySuite.generate("SC.ArrayController", {
  newObject: function(amt) {
    if (amt === undefined || typeof amt === SC.T_NUMBER) {
      amt = this.expected(amt);
    }
    return SC.ArrayController.create({ content: amt });
  }
});
