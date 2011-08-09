// ==========================================================================
// Project:  SproutCore Runtime
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

/*
  NOTE: This test is adapted from the 1.x series of unit tests.  The tests
  are the same except for places where we intend to break the API we instead
  validate that we warn the developer appropriately.
  
  CHANGES FROM 1.6:

  * All calls to SC.run.sync() were changed to 
    SC.run.sync()
    
  * Bindings no longer accept a root object as their second param.  Instead 
    our test binding objects were put under a single object they could 
    originate from.
  
  * tests that inspected internal properties were removed.
  
  * converted foo.get/foo.set to use SC.get/SC.set
  
  * Removed tests for SC.Binding.isConnected.  Since binding instances are now
    shared this property no longer makes sense.
    
  * Changed call calls for obj.bind(...) to SC.bind(obj, ...);
  
  * Changed all calls to sc_super() to this._super()
  
  * Changed all calls to disconnect() to pass the root object.
  
  * removed calls to SC.Binding.destroy() as that method is no longer useful
    (or defined)
    
  * changed use of T_STRING to 'string'
*/

var get = SC.get, set = SC.set;

// ========================================================================
// SC.Binding Tests
// ========================================================================
/*globals TestNamespace */

var fromObject, toObject, binding, Bon1, bon2, root ; // global variables

module("basic object binding", {

  setup: function() {
    fromObject = SC.Object.create({ value: 'start' }) ;
    toObject = SC.Object.create({ value: 'end' }) ;
    root = { fromObject: fromObject, toObject: toObject };
    binding = SC.bind(root, 'toObject.value', 'fromObject.value');
    SC.run.sync() ; // actually sets up up the connection
  }
});

test("binding should have synced on connect", function() {
  equals(get(toObject, "value"), "start", "toObject.value should match fromObject.value");
});

test("fromObject change should propogate to toObject only after flush", function() {
  set(fromObject, "value", "change") ;
  equals(get(toObject, "value"), "start") ;
  SC.run.sync() ;
  equals(get(toObject, "value"), "change") ;
});

test("toObject change should propogate to fromObject only after flush", function() {
  set(toObject, "value", "change") ;
  equals(get(fromObject, "value"), "start") ;
  SC.run.sync() ;
  equals(get(fromObject, "value"), "change") ;
});

test("suspended observing during bindings", function() {

  // setup special binding
  fromObject = SC.Object.create({
    value1: 'value1',
    value2: 'value2'
  });

  toObject = SC.Object.create({
    value1: 'value1',
    value2: 'value2',

    callCount: 0,

    observer: function() {
      equals(get(this, 'value1'), 'CHANGED', 'value1 when observer fires');
      equals(get(this, 'value2'), 'CHANGED', 'value2 when observer fires');
      this.callCount++;
    }.observes('value1', 'value2')
  });

  var root = { fromObject: fromObject, toObject: toObject };
  SC.bind(root, 'toObject.value1', 'fromObject.value1');
  SC.bind(root, 'toObject.value2', 'fromObject.value2');

  // change both value1 + value2, then  flush bindings.  observer should only
  // fire after bindings are done flushing.
  set(fromObject, 'value1', 'CHANGED');
  set(fromObject, 'value2', 'CHANGED');
  SC.run.sync();

  equals(toObject.callCount, 2, 'should call observer twice');
});

test("binding disconnection actually works", function() {
  binding.disconnect(root);
  set(fromObject, 'value', 'change');
  SC.run.sync();
  equals(get(toObject, 'value'), 'start');
});

// ..........................................................
// one way binding
// 

module("one way binding", {

  setup: function() {
    fromObject = SC.Object.create({ value: 'start' }) ;
    toObject = SC.Object.create({ value: 'end' }) ;
    root = { fromObject: fromObject, toObject: toObject };
    binding = SC.oneWay(root, 'toObject.value', 'fromObject.value');
    SC.run.sync() ; // actually sets up up the connection
  }

});

test("fromObject change should propogate after flush", function() {
  set(fromObject, "value", "change") ;
  equals(get(toObject, "value"), "start") ;
  SC.run.sync() ;
  equals(get(toObject, "value"), "change") ;
});

test("toObject change should NOT propogate", function() {
  set(toObject, "value", "change") ;
  equals(get(fromObject, "value"), "start") ;
  SC.run.sync() ;
  equals(get(fromObject, "value"), "start") ;
});

var first, second, third, binding1, binding2 ; // global variables

// ..........................................................
// chained binding
// 

module("chained binding", {

  setup: function() {
    first = SC.Object.create({ output: 'first' }) ;

    second = SC.Object.create({
      input: 'second',
      output: 'second',

      inputDidChange: function() {
        set(this, "output", get(this, "input")) ;
      }.observes("input")
    }) ;

    third = SC.Object.create({ input: "third" }) ;

    root = { first: first, second: second, third: third };
    binding1 = SC.bind(root, 'second.input', 'first.output');
    binding2 = SC.bind(root, 'second.output', 'third.input');
    SC.run.sync() ; // actually sets up up the connection
  }

});

test("changing first output should propograte to third after flush", function() {
  set(first, "output", "change") ;
  equals("change", get(first, "output"), "first.output") ;
  ok("change" !== get(third, "input"), "third.input") ;

  var didChange = YES;
  while(didChange) didChange = SC.run.sync() ;

  equals("change", get(first, "output"), "first.output") ;
  equals("change", get(second, "input"), "second.input") ;
  equals("change", get(second, "output"), "second.output") ;
  equals("change", get(third,"input"), "third.input") ;
});

// ..........................................................
// Custom Binding
// 

module("Custom Binding", {

  setup: function() {
	Bon1 = SC.Object.extend({
		value1: "hi",
		value2: 83,
		array1: []
	});

	bon2 = SC.Object.create({
		val1: "hello",
		val2: 25,
		arr: [1,2,3,4]
	});

	TestNamespace = {
      bon2: bon2,
      Bon1: Bon1
    } ;
  },

  teardown: function() {
    Bon1 = bon2 = TestNamespace  = null;
  }
});

test("Binding value1 such that it will recieve only single values", function() {
	var bon1 = Bon1.create({
		value1Binding: SC.Binding.single("TestNamespace.bon2.val1"),
		array1Binding: SC.Binding.single("TestNamespace.bon2.arr")
	});
	SC.run.sync();
	var a = [23,31,12,21];
	set(bon2, "arr", a);
	set(bon2, "val1","changed");
	SC.run.sync();
	equals(get(bon2, "val1"),get(bon1, "value1"));
	equals("@@MULT@@",get(bon1, "array1"));
});

test("Single binding using notEmpty function.", function() {
  // This should raise an exception for SC 1.x developers who are using
  // the old syntax.
  raises(function() {
    var bond = Bon1.create ({
      array1Binding: SC.Binding.single("TestNamespace.bon2.arr").notEmpty(null,'(EMPTY)')
    });
  });
});

test("Binding with transforms, function to check the type of value", function() {
	var jon = Bon1.create({
		value1Binding: SC.Binding.transform({
      to: function(val1) {
        return (SC.typeOf(val1) == 'string')? val1 : "";
      }
    }).from("TestNamespace.bon2.val1")
	});
	SC.run.sync();
	set(bon2, "val1","changed");
	SC.run.sync();
	equals(get(jon, "value1"), get(bon2, "val1"));
});

test("two bindings to the same value should sync in the order they are initialized", function() {

  SC.RunLoop.begin();

  var a = SC.Object.create({
    foo: "bar"
  });

  var b = SC.Object.create({
    foo: "baz",
    fooBinding: "a.foo",

    a: a,
    
    C: SC.Object.extend({
      foo: "bee",
      fooBinding: "owner.foo"
    }),

    init: function() {
      this._super();
      set(this, 'c', this.C.create({ owner: this }));
    }

  });

  SC.RunLoop.end();

  equals(get(a, 'foo'), "bar", 'a.foo should not change');
  equals(get(b, 'foo'), "bar", 'a.foo should propogate up to b.foo');
  equals(get(b.c, 'foo'), "bar", 'a.foo should propogate up to b.c.foo');
});

// ..........................................................
// AND BINDING
// 

module("AND binding", {

  setup: function() {
    // temporarily set up two source objects in the SC namespace so we can
    // use property paths to access them
    SC.set(SC, 'testControllerA', SC.Object.create({ value: NO }));
    SC.set(SC, 'testControllerB', SC.Object.create({ value: NO }));

    toObject = SC.Object.create({
      value: null,
      valueBinding: SC.Binding.and('SC.testControllerA.value', 'SC.testControllerB.value')
    });
  },

  teardown: function() {
    set(SC, 'testControllerA', null);
    set(SC, 'testControllerB', null);
  }

});

test("toObject.value should be YES if both sources are YES", function() {
  SC.RunLoop.begin();
  set(SC.testControllerA, 'value', YES);
  set(SC.testControllerB, 'value', YES);
  SC.RunLoop.end();

  SC.run.sync();
  equals(get(toObject, 'value'), YES);
});

test("toObject.value should be NO if either source is NO", function() {
  SC.RunLoop.begin();
  set(SC.testControllerA, 'value', YES);
  set(SC.testControllerB, 'value', NO);
  SC.RunLoop.end();

  SC.run.sync();
  equals(get(toObject, 'value'), NO);

  SC.RunLoop.begin();
  set(SC.testControllerA, 'value', YES);
  set(SC.testControllerB, 'value', YES);
  SC.RunLoop.end();

  SC.run.sync();
  equals(get(toObject, 'value'), YES);

  SC.RunLoop.begin();
  set(SC.testControllerA, 'value', NO);
  set(SC.testControllerB, 'value', YES);
  SC.RunLoop.end();

  SC.run.sync();
  equals(get(toObject, 'value'), NO);
});

// ..........................................................
// OR BINDING
// 

module("OR binding", {

  setup: function() {
    // temporarily set up two source objects in the SC namespace so we can
    // use property paths to access them
    SC.set(SC, 'testControllerA', SC.Object.create({ value: NO }));
    SC.set(SC, 'testControllerB', SC.Object.create({ value: null }));

    toObject = SC.Object.create({
      value: null,
      valueBinding: SC.Binding.or('SC.testControllerA.value', 'SC.testControllerB.value')
    });
  },

  teardown: function() {
    set(SC, 'testControllerA', null);
    set(SC, 'testControllerB', null);
  }

});

test("toObject.value should be first value if first value is truthy", function() {
  SC.RunLoop.begin();
  set(SC.testControllerA, 'value', 'first value');
  set(SC.testControllerB, 'value', 'second value');
  SC.RunLoop.end();

  SC.run.sync();
  equals(get(toObject, 'value'), 'first value');
});

test("toObject.value should be second value if first is falsy", function() {
  SC.RunLoop.begin();
  set(SC.testControllerA, 'value', NO);
  set(SC.testControllerB, 'value', 'second value');
  SC.RunLoop.end();

  SC.run.sync();
  equals(get(toObject, 'value'), 'second value');
});

// ..........................................................
// BINDING WITH []
// 

module("Binding with '[]'", {
  setup: function() {
    fromObject = SC.Object.create({ value: [] });
    toObject = SC.Object.create({ value: '' });
    root = { toObject: toObject, fromObject: fromObject };
    
    binding = SC.bind(root, 'toObject.value', 'fromObject.value.[]').transform(function(v) {
      return v ? v.join(',') : '';
    });
  },
  
  teardown: function() {
    root = fromObject = toObject = null;
  }
});

test("Binding refreshes after a couple of items have been pushed in the array", function() {
  get(fromObject, 'value').pushObjects(['foo', 'bar']);
  SC.run.sync();
  equals(get(toObject, 'value'), 'foo,bar');
});


// ..........................................................
// propertyNameBinding with longhand
// 

module("propertyNameBinding with longhand", {
  setup: function(){
    TestNamespace = {
      fromObject: SC.Object.create({
        value: "originalValue"
      }),
      
      toObject: SC.Object.create({
        valueBinding: SC.Binding.from('TestNamespace.fromObject.value'),
        localValue: "originalLocal",
        relativeBinding: SC.Binding.from('.localValue')
      })
    };
    
    SC.run.sync();
  },
  teardown: function(){
    TestNamespace = null;
  }
});

test("works with full path", function(){

  set(TestNamespace.fromObject, 'value', "updatedValue");
  SC.run.sync();
  
  equals(get(TestNamespace.toObject, 'value'), "updatedValue");

  set(TestNamespace.fromObject, 'value', "newerValue");
  SC.run.sync();

  equals(get(TestNamespace.toObject, 'value'), "newerValue");
});

test("works with local path", function(){
  set(TestNamespace.toObject, 'localValue', "updatedValue");
  SC.run.sync();

  equals(get(TestNamespace.toObject, 'relative'), "updatedValue");

  set(TestNamespace.toObject, 'localValue', "newerValue");
  SC.run.sync();

  equals(get(TestNamespace.toObject, 'relative'), "newerValue");
});
