// ==========================================================================
// Project:  SproutCore Runtime
// Copyright: ©2011 Strobe Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

require('sproutcore-runtime/~tests/suites/enumerable');

/*
  Implement a basic fake enumerable.  This validates that any non-native
  enumerable can impl this API.
*/
var TestEnumerable = SC.Object.extend(SC.Enumerable, {

  _content: null,
  
  init: function(ary) {
    this._content = ary || [];
  },

  addObject: function(obj) {
    if (this._content.indexOf(obj)>=0) return this;
    this._content.push(obj);    
    this.enumerableContentDidChange();
  },
  
  nextObject: function(idx) {
    return idx >= SC.get(this, 'length') ? undefined : this._content[idx];
  },
  
  length: SC.computed(function() {
    return this._content.length;
  }).property('[]').cacheable(),
  
  slice: function() {
    return this._content.slice();
  }
  
});


SC.EnumerableTests.extend({
  
  name: 'Basic Enumerable',
    
  newObject: function(ary) {
    ary = ary ? ary.slice() : this.newFixture(3);
    return new TestEnumerable(ary);
  },
  
  // allows for testing of the basic enumerable after an internal mutation
  mutate: function(obj) {
    obj.addObject(obj._content.length+1);
  },
  
  toArray: function(obj) {
    return obj.slice();
  }
  
}).run();

// ..........................................................
// CONTENT DID CHANGE
// 

var DummyEnum = SC.Object.extend(SC.Enumerable, {
  nextObject: function() {},
  length: 0
});

var obj, observer;

// ..........................................................
// NOTIFY ENUMERABLE PROPERTY
// 

module('mixins/enumerable/enumerableContentDidChange');

test('should notify observers of []', function() {

  var obj = SC.Object.create(SC.Enumerable, {
    nextObject: function() {}, // avoid exceptions
    
    _count: 0,
    enumerablePropertyDidChange: SC.observer(function() {
      this._count++;
    }, '[]')
  });
  
  equals(obj._count, 0, 'should not have invoked yet');
  obj.enumerableContentWillChange();
  obj.enumerableContentDidChange();
  equals(obj._count, 1, 'should have invoked');
  
});

// ..........................................................
// NOTIFY CHANGES TO LENGTH
// 

module('notify observers of length', {
  setup: function() {
    obj = DummyEnum.create({
      _after: 0,
      lengthDidChange: SC.observer(function() {
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
  obj.enumerableContentWillChange();
  equals(obj._after, 0);
  
  obj.enumerableContentDidChange();
  equals(obj._after, 1);
});

// API variation that included items only
test('should not notify when passed arrays of same length', function() {
  var added = ['foo'], removed = ['bar'];
  obj.enumerableContentWillChange(removed, added);
  equals(obj._after, 0);
  
  obj.enumerableContentDidChange(removed, added);
  equals(obj._after, 0);
});

test('should notify when passed arrays of different length', function() {
  var added = ['foo'], removed = ['bar', 'baz'];
  obj.enumerableContentWillChange(removed, added);
  equals(obj._after, 0);
  
  obj.enumerableContentDidChange(removed, added);
  equals(obj._after, 1);
});

// API variation passes indexes only
test('should not notify when passed with indexes', function() {
  obj.enumerableContentWillChange(1, 1);
  equals(obj._after, 0);
  
  obj.enumerableContentDidChange(1, 1);
  equals(obj._after, 0);
});

test('should notify when passed old index API with delta', function() {
  obj.enumerableContentWillChange(1, 2);
  equals(obj._after, 0);
  
  obj.enumerableContentDidChange(1, 2);
  equals(obj._after, 1);
});


// ..........................................................
// NOTIFY ENUMERABLE OBSERVER
// 

module('notify enumerable observers', {
  setup: function() {
    obj = DummyEnum.create();
    
    observer = SC.Object.create({
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
  obj.enumerableContentWillChange();
  same(observer._before, [obj, null, null]);

  obj.enumerableContentDidChange();
  same(observer._after, [obj, null, null]);
});

// API variation that included items only
test('should notify when called with same length items', function() {
  var added = ['foo'], removed = ['bar'];
  obj.enumerableContentWillChange(removed, added);
  same(observer._before, [obj, removed, added]);

  obj.enumerableContentDidChange(removed, added);
  same(observer._after, [obj, removed, added]);
});

test('should notify when called with diff length items', function() {
  var added = ['foo', 'baz'], removed = ['bar'];
  obj.enumerableContentWillChange(removed, added);
  same(observer._before, [obj, removed, added]);

  obj.enumerableContentDidChange(removed, added);
  same(observer._after, [obj, removed, added]);
});

test('should not notify when passed with indexes only', function() {
  obj.enumerableContentWillChange(1, 2);
  same(observer._before, [obj, 1, 2]);

  obj.enumerableContentDidChange(1, 2);
  same(observer._after, [obj, 1, 2]);
});

test('removing enumerable observer should disable', function() {
  obj.removeEnumerableObserver(observer);
  obj.enumerableContentWillChange();
  same(observer._before, null);

  obj.enumerableContentDidChange();
  same(observer._after, null);
});




