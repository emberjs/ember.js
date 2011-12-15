// ==========================================================================
// Project:  Ember Runtime
// Copyright: ©2011 Strobe Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================
/*globals testBoth */

require('ember-runtime/~tests/props_helper');
require('ember-runtime/~tests/suites/array');

/*
  Implement a basic fake mutable array.  This validates that any non-native
  enumerable can impl this API.
*/
var TestArray = Ember.Object.extend(Ember.Array, {

  _content: null,

  init: function(ary) {
    this._content = ary || [];
  },

  // some methods to modify the array so we can test changes.  Note that
  // arrays can be modified even if they don't implement MutableArray.  The
  // MutableArray is just a standard API for mutation but not required.
  addObject: function(obj) {
    var idx = this._content.length;
    this.arrayContentWillChange(idx, 0, 1);
    this._content.push(obj);
    this.arrayContentDidChange(idx, 0, 1);
  },

  removeFirst: function(idx) {
    this.arrayContentWillChange(0, 1, 0);
    this._content.shift();
    this.arrayContentDidChange(0, 1, 0);
  },

  objectAt: function(idx) {
    return this._content[idx];
  },

  length: Ember.computed(function() {
    return this._content.length;
  }).property('[]').cacheable(),

  slice: function() {
    return this._content.slice();
  }

});


Ember.ArrayTests.extend({

  name: 'Basic Mutable Array',

  newObject: function(ary) {
    ary = ary ? ary.slice() : this.newFixture(3);
    return new TestArray(ary);
  },

  // allows for testing of the basic enumerable after an internal mutation
  mutate: function(obj) {
    obj.addObject(this.getFixture(1)[0]);
  },

  toArray: function(obj) {
    return obj.slice();
  }

}).run();

// ..........................................................
// CONTENT DID CHANGE
//

var DummyArray = Ember.Object.extend(Ember.Array, {
  nextObject: function() {},
  length: 0,
  objectAt: function(idx) { return 'ITEM-'+idx; }
});

var obj, observer;


// ..........................................................
// NOTIFY ARRAY OBSERVERS
//

module('mixins/array/arrayContent[Will|Did]Change');

test('should notify observers of []', function() {

  obj = DummyArray.create({
    _count: 0,
    enumerablePropertyDidChange: Ember.observer(function() {
      this._count++;
    }, '[]')
  });

  equals(obj._count, 0, 'should not have invoked yet');

  obj.arrayContentWillChange(0, 1, 1);
  obj.arrayContentDidChange(0, 1, 1);

  equals(obj._count, 1, 'should have invoked');

});

// ..........................................................
// NOTIFY CHANGES TO LENGTH
//

module('notify observers of length', {
  setup: function() {
    obj = DummyArray.create({
      _after: 0,
      lengthDidChange: Ember.observer(function() {
        this._after++;
      }, 'length')

    });

    equals(obj._after, 0, 'should not have fired yet');
  },

  teardown: function() {
    obj = null;
  }
});

test('should notify observers when call with no params', function() {
  obj.arrayContentWillChange();
  equals(obj._after, 0);

  obj.arrayContentDidChange();
  equals(obj._after, 1);
});

// API variation that included items only
test('should not notify when passed lengths are same', function() {
  obj.arrayContentWillChange(0, 1, 1);
  equals(obj._after, 0);

  obj.arrayContentDidChange(0, 1, 1);
  equals(obj._after, 0);
});

test('should notify when passed lengths are different', function() {
  obj.arrayContentWillChange(0, 1, 2);
  equals(obj._after, 0);

  obj.arrayContentDidChange(0, 1, 2);
  equals(obj._after, 1);
});


// ..........................................................
// NOTIFY ARRAY OBSERVER
//

module('notify array observers', {
  setup: function() {
    obj = DummyArray.create();

    observer = Ember.Object.create({
      _before: null,
      _after: null,

      arrayWillChange: function() {
        equals(this._before, null); // should only call once
        this._before = Array.prototype.slice.call(arguments);
      },

      arrayDidChange: function() {
        equals(this._after, null); // should only call once
        this._after = Array.prototype.slice.call(arguments);
      }
    });

    obj.addArrayObserver(observer);
  },

  teardown: function() {
    obj = observer = null;
  }
});

test('should notify enumerable observers when called with no params', function() {
  obj.arrayContentWillChange();
  same(observer._before, [obj, 0, -1, -1]);

  obj.arrayContentDidChange();
  same(observer._after, [obj, 0, -1, -1]);
});

// API variation that included items only
test('should notify when called with same length items', function() {
  obj.arrayContentWillChange(0, 1, 1);
  same(observer._before, [obj, 0, 1, 1]);

  obj.arrayContentDidChange(0, 1, 1);
  same(observer._after, [obj, 0, 1, 1]);
});

test('should notify when called with diff length items', function() {
  obj.arrayContentWillChange(0, 2, 1);
  same(observer._before, [obj, 0, 2, 1]);

  obj.arrayContentDidChange(0, 2, 1);
  same(observer._after, [obj, 0, 2, 1]);
});

test('removing enumerable observer should disable', function() {
  obj.removeArrayObserver(observer);
  obj.arrayContentWillChange();
  same(observer._before, null);

  obj.arrayContentDidChange();
  same(observer._after, null);
});

// ..........................................................
// NOTIFY ENUMERABLE OBSERVER
//

module('notify enumerable observers as well', {
  setup: function() {
    obj = DummyArray.create();

    observer = Ember.Object.create({
      _before: null,
      _after: null,

      enumerableWillChange: function() {
        equals(this._before, null); // should only call once
        this._before = Array.prototype.slice.call(arguments);
      },

      enumerableDidChange: function() {
        equals(this._after, null); // should only call once
        this._after = Array.prototype.slice.call(arguments);
      }
    });

    obj.addEnumerableObserver(observer);
  },

  teardown: function() {
    obj = observer = null;
  }
});

test('should notify enumerable observers when called with no params', function() {
  obj.arrayContentWillChange();
  same(observer._before, [obj, null, null], 'before');

  obj.arrayContentDidChange();
  same(observer._after, [obj, null, null], 'after');
});

// API variation that included items only
test('should notify when called with same length items', function() {
  obj.arrayContentWillChange(0, 1, 1);
  same(observer._before, [obj, ['ITEM-0'], 1], 'before');

  obj.arrayContentDidChange(0, 1, 1);
  same(observer._after, [obj, 1, ['ITEM-0']], 'after');
});

test('should notify when called with diff length items', function() {
  obj.arrayContentWillChange(0, 2, 1);
  same(observer._before, [obj, ['ITEM-0', 'ITEM-1'], 1], 'before');

  obj.arrayContentDidChange(0, 2, 1);
  same(observer._after, [obj, 2, ['ITEM-0']], 'after');
});

test('removing enumerable observer should disable', function() {
  obj.removeEnumerableObserver(observer);
  obj.arrayContentWillChange();
  same(observer._before, null, 'before');

  obj.arrayContentDidChange();
  same(observer._after, null, 'after');
});

// ..........................................................
// @each
//

var ary;

module('Ember.Array.@each support', {
  setup: function() {
    ary = new TestArray([
      { isDone: true,  desc: 'Todo 1' },
      { isDone: false, desc: 'Todo 2' },
      { isDone: true,  desc: 'Todo 3' },
      { isDone: false, desc: 'Todo 4' }
    ]);
  },

  teardown: function() {
    ary = null;
  }
});

test('adding an object should notify (@each)', function() {

  var get = Ember.get, set = Ember.set;
  var called = 0;

  var observerObject = Ember.Object.create({
    wasCalled: function() {
      called++;
    }
  });

  // Ember.get(ary, '@each');
  Ember.addObserver(ary, '@each', observerObject, 'wasCalled');

  ary.addObject(Ember.Object.create({
    desc: "foo",
    isDone: false
  }));

  equals(called, 1, "calls observer when object is pushed");

});

test('adding an object should notify (@each.isDone)', function() {

  var get = Ember.get, set = Ember.set;
  var called = 0;

  var observerObject = Ember.Object.create({
    wasCalled: function() {
      called++;
    }
  });

  Ember.addObserver(ary, '@each.isDone', observerObject, 'wasCalled');

  ary.addObject(Ember.Object.create({
    desc: "foo",
    isDone: false
  }));

  equals(called, 1, "calls observer when object is pushed");

});

test('modifying the array should also indicate the isDone prop itself has changed', function() {
  // NOTE: we never actually get the '@each.isDone' property here.  This is
  // important because it tests the case where we don't have an isDone
  // EachArray materialized but just want to know when the property has
  // changed.

  var get = Ember.get, set = Ember.set;
  var each = get(ary, '@each');
  var count = 0;

  Ember.addObserver(each, 'isDone', function() { count++; });

  count = 0;
  var item = ary.objectAt(2);
  set(item, 'isDone', !get(item, 'isDone'));
  equals(count, 1, '@each.isDone should have notified');
});


testBoth("should be clear caches for computed properties that have dependent keys on arrays that are changed after object initialization", function(get, set) {
  var obj = Ember.Object.create({
    init: function() {
      set(this, 'resources', Ember.A());
    },

    common: Ember.computed(function() {
      return get(get(this, 'resources').objectAt(0), 'common');
    }).property('resources.@each.common').cacheable()
  });

  get(obj, 'resources').pushObject(Ember.Object.create({ common: "HI!" }));
  equals("HI!", get(obj, 'common'));

  set(get(obj, 'resources').objectAt(0), 'common', "BYE!");
  equals("BYE!", get(obj, 'common'));
});

testBoth("observers that contain @each in the path should fire only once the first time they are accessed", function(get, set) {
  count = 0;

  var obj = Ember.Object.create({
    init: function() {
      // Observer fires once when resources changes
      set(this, 'resources', Ember.A());
    },

    commonDidChange: Ember.observer(function() {
      count++;
    }, 'resources.@each.common')
  });

  // Observer fires second time when new object is added
  get(obj, 'resources').pushObject(Ember.Object.create({ common: "HI!" }));
  // Observer fires third time when property on an object is changed
  set(get(obj, 'resources').objectAt(0), 'common', "BYE!");

  equals(count, 3, "observers should only be called once");
});
