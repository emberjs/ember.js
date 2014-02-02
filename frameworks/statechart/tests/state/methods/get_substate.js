// ==========================================================================
// SC Unit Test
// ==========================================================================
/*globals SC */

var sc, root;

module("SC.State: getSubstate method Tests", {
  
  setup: function() {
    
    sc = SC.Statechart.create({
      
      initialState: 'foo',
    
      foo: SC.State.design({
        
        initialSubstate: 'a',
        
        a: SC.State.design({
          initialSubstate: 'a1',
          a1: SC.State.design(),
          z: SC.State.design()
        }),
        
        b: SC.State.design({
          initialSubstate: 'b1',
          b1: SC.State.design(),
          z: SC.State.design()
        })
        
      }),
      
      bar: SC.State.design({
        
        initialSubstate: 'x',
        
        x: SC.State.design({
          initialSubstate: 'x1',
          x1: SC.State.design(),
          z: SC.State.design()
        }),
        
        y: SC.State.design({
          initialSubstate: 'y1',
          y1: SC.State.design(),
          z: SC.State.design()
        })
        
      }),
      
      x: SC.State.design({
        
        initialSubstate: 'a',
        
        a: SC.State.design({
          initialSubstate: 'a1',
          a1: SC.State.design(),
          z: SC.State.design()
        }),
        
        b: SC.State.design({
          initialSubstate: 'b1',
          b1: SC.State.design(),
          z: SC.State.design()
        })
        
      })
      
    });
    
    sc.initStatechart();
    root = sc.get('rootState');
  },
  
  teardown: function() {
    sc = root = null;
  }
  
});

test("get immediate substates from root state", function() {
  var state;
  
  state = root.getSubstate('foo');
  equals(state.get('fullPath'), 'foo', "should return state foo for 'foo'");
  
  state = root.getSubstate('this.foo');
  equals(state.get('fullPath'), 'foo', "should return state foo for 'this.foo'");
  
  state = root.getSubstate('bar');
  equals(state.get('fullPath'), 'bar', "should return state bar for 'bar'");
  
  state = root.getSubstate('this.bar');
  equals(state.get('fullPath'), 'bar', "should return state bar for 'this.bar'");
  
  console.log('expecting error message...');
  state = root.getSubstate('x');
  ok(!state, "should not return state for 'x'");
  
  state = root.getSubstate('this.x');
  equals(state.get('fullPath'), 'x', "should return state x for 'this.x'");
});

test("get immediate substates from foo state", function() {
  var foo = root.getSubstate('foo'), 
      state;
  
  state = foo.getSubstate('a');
  equals(state.get('fullPath'), 'foo.a', "should return state A for 'a'");
  
  state = foo.getSubstate('this.a');
  equals(state.get('fullPath'), 'foo.a', "should return state A for 'this.a'");
  
  state = foo.getSubstate('b');
  equals(state.get('fullPath'), 'foo.b', "should return state bar for 'b'");
  
  state = foo.getSubstate('this.b');
  equals(state.get('fullPath'), 'foo.b', "should return state bar for 'this.b'");
  
  state = foo.getSubstate('mah');
  ok(!state, "should not return state for 'mah'");
  
  state = foo.getSubstate('foo');
  ok(!state, "should not return state for 'foo'");
});

test("get immediate substates from bar state", function() {
  var bar = root.getSubstate('bar'), 
      state;
  
  state = bar.getSubstate('x');
  equals(state.get('name'), 'x', "should return state X for 'x'");
  
  state = bar.getSubstate('this.x');
  equals(state.get('name'), 'x', "should return state X for 'this.x'");
  
  state = bar.getSubstate('y');
  equals(state.get('name'), 'y', "should return state Y for 'y'");
  
  state = bar.getSubstate('this.y');
  equals(state.get('name'), 'y', "should return state Y for 'this.y'");
  
  state = bar.getSubstate('mah');
  ok(!state, "should not return state for 'mah'");
  
  state = bar.getSubstate('bar');
  ok(!state, "should not return state for 'bar'");
});

test("get substates from root using full paths", function() {
  var state;
  
  state = root.getSubstate('foo.a');
  equals(state.get('name'), 'a', "should return state A for 'foo.a'");
  
  state = root.getSubstate('foo.b');
  equals(state.get('name'), 'b', "should return state B for 'foo.b'");
  
  state = root.getSubstate('foo.mah');
  ok(!state, "should not return state for 'foo.mah'");
  
  state = root.getSubstate('foo.a.a1');
  equals(state.get('name'), 'a1', "should return state A1 for 'foo.a.a1'");
  
  state = root.getSubstate('foo.a.z');
  equals(state.get('fullPath'), 'foo.a.z', "should return first Z state for 'foo.a.z'");
  
  state = root.getSubstate('foo.b.b1');
  equals(state.get('name'), 'b1', "should return state B1 for 'foo.b.b1'");
  
  state = root.getSubstate('foo.b.z');
  equals(state.get('fullPath'), 'foo.b.z', "should return second Z state for 'foo.b.z'");
  
  state = root.getSubstate('bar.x');
  equals(state.get('name'), 'x', "should return state X for 'bar.x'");
  
  state = root.getSubstate('bar.y');
  equals(state.get('name'), 'y', "should return state Y for 'bar.y'");
  
  state = root.getSubstate('bar.mah');
  ok(!state, "should not return state for 'bar.mah'");
  
  state = root.getSubstate('bar.x.x1');
  equals(state.get('name'), 'x1', "should return state X1 for 'foo.x.x1'");
  
  state = root.getSubstate('bar.x.z');
  equals(state.get('fullPath'), 'bar.x.z', "should return third Z state for 'bar.x.z'");
  
  state = root.getSubstate('bar.y.y1');
  equals(state.get('name'), 'y1', "should return state Y1 for 'foo.y.y1'");
  
  state = root.getSubstate('bar.y.z');
  equals(state.get('fullPath'), 'bar.y.z', "should return forth Z state for 'bar.y.z'");
  
  state = root.getSubstate('x.a');
  equals(state.get('fullPath'), 'x.a', "should return state A for 'x.a'");
  
  state = root.getSubstate('x.b');
  equals(state.get('fullPath'), 'x.b', "should return state B for 'x.b'");
  
  state = root.getSubstate('x.a.a1');
  equals(state.get('fullPath'), 'x.a.a1', "should return state A1 for 'x.a.a1'");
  
  state = root.getSubstate('x.a.z');
  equals(state.get('fullPath'), 'x.a.z', "should return state Z for 'x.a.z'");
  
  state = root.getSubstate('x.b.b1');
  equals(state.get('fullPath'), 'x.b.b1', "should return state B1 for 'x.b.b1'");
  
  state = root.getSubstate('x.b.z');
  equals(state.get('fullPath'), 'x.b.z', "should return state Z for 'x.b.z'");
});

test("get substates from foo state using full paths", function() {
  var foo = root.getSubstate('foo'),
      state;
  
  state = foo.getSubstate('a.a1');
  equals(state.get('fullPath'), 'foo.a.a1', "should return state A1 for 'a.a1'");
  
  state = foo.getSubstate('this.a.a1');
  equals(state.get('fullPath'), 'foo.a.a1', "should return state A1 for 'this.a.a1'");
  
  state = foo.getSubstate('a.z');
  equals(state.get('fullPath'), 'foo.a.z', "should return state A1 for 'a.z'");
  
  state = foo.getSubstate('this.a.z');
  equals(state.get('fullPath'), 'foo.a.z', "should return state A1 for 'a.z'");
  
  state = foo.getSubstate('mah.z');
  ok(!state, "should not return state for 'mah.z'");
  
  state = foo.getSubstate('foo.a');
  ok(!state, "should not return state for 'foo.a'");
});

test("get umambiguous substates from foo state using state names", function() {
  var state,
      foo = root.getSubstate('foo');
      
  state = foo.getSubstate('a1');
  equals(state.get('fullPath'), 'foo.a.a1', "should return state A1 for 'a1'");
  
  state = foo.getSubstate('b1');
  equals(state.get('fullPath'), 'foo.b.b1', "should return state A1 for 'b1'");
});

test("get umambiguous substates from foo state using state names", function() {
  var state,
      foo = root.getSubstate('foo');
      
  state = foo.getSubstate('a1');
  equals(state.get('fullPath'), 'foo.a.a1', "should return state A1 for 'a1'");
  
  state = foo.getSubstate('b1');
  equals(state.get('fullPath'), 'foo.b.b1', "should return state A1 for 'b1'");
});

test("get z substates from foo state", function() {
  var state,
      foo = root.getSubstate('foo'),
      callbackState, callbackKeys;
  
  console.log('expecting a console error message...');
  state = foo.getSubstate('z');
  ok(!state, "should return null for 'z'");
  
  state = foo.getSubstate('a~z');
  equals(state.get('fullPath'), 'foo.a.z', "should return state for 'a~z'");
  
  state = foo.getSubstate('b~z');
  equals(state.get('fullPath'), 'foo.b.z', "should return state for 'b~z'");
  
  state = root.getSubstate('foo.a~z');
  equals(state.get('fullPath'), 'foo.a.z', "should return state for 'foo.a~z'");
  
  state = root.getSubstate('foo.b~z');
  equals(state.get('fullPath'), 'foo.b.z', "should return state for 'foo.b~z'");
});

test("get z substate from y state", function() {
  var state,
      foo = root.getSubstate('y');
  
  state = root.getSubstate('y.z');
  equals(state.get('fullPath'), 'bar.y.z', "should return state for 'y.z'");
});

test("get a1 substates from root state", function() {
  var state;
  
  console.log('expecting a console error message...');
  state = root.getSubstate('a1');
  ok(!state, "should return null for 'a1'");
  
  state = root.getSubstate('foo~a1');
  equals(state.get('fullPath'), 'foo.a.a1', "should return state for 'foo~a1'");
  
  state = root.getSubstate('foo~a.a1');
  equals(state.get('fullPath'), 'foo.a.a1', "should return state for 'foo~a.a1'");
  
  state = root.getSubstate('x~a1');
  equals(state.get('fullPath'), 'x.a.a1', "should return state for 'x~a1'");
  
  state = root.getSubstate('x~a.a1');
  equals(state.get('fullPath'), 'x.a.a1', "should return state for 'x~a.a1'");
});

test("get non-existing substate 'abc' with using callback", function() {
  var result, cbState, cbValue, cbKeys; 
  
  result = root.getSubstate('abc', function(state, value, keys) {
    cbState = state;
    cbValue = value;
    cbKeys = keys;
  });
  
  ok(!result, "should not return result for 'abc'");
  equals(cbState, root, "callback state arg should be root state");
  equals(cbValue, 'abc', "callback value arg should be 'abc'");
  ok(!cbKeys, "callback keys arg should be none");
});

test("get ambiguous substate 'x' substate with using callback", function() {
  var result, cbState, cbValue, cbKeys; 
  
  result = root.getSubstate('x', function(state, value, keys) {
    cbState = state;
    cbValue = value;
    cbKeys = keys;
  });
  console.log(cbKeys);
  ok(!result, "should not return result for 'x'");
  equals(cbState, root, "callback state arg should be root state");
  equals(cbValue, 'x', "callback value arg should be 'x'");
  equals(cbKeys.length, 2, "callback keys arg should be array with length 2");
  ok(cbKeys.indexOf('x') >= 0, "callback keys arg should contain value 'x'");
  ok(cbKeys.indexOf('bar.x') >= 0, "callback keys arg should contain value 'bar.x'");
});