// ==========================================================================
// SC Unit Test
// ==========================================================================
/*globals SC */

var sc, root;

module("SC.State: getState method Tests", {
  
  setup: function() {
    
    sc = SC.Statechart.create({
      
      initialState: 'a',
    
      a: SC.State.design({
        
        initialSubstate: 'x',
        
        x: SC.State.design(),
        
        y: SC.State.design(),
        
        foo: SC.State.design()
        
      }),
      
      b: SC.State.design({
        
        initialSubstate: 'x',
        
        x: SC.State.design(),
        
        y: SC.State.design(),
        
        bar: SC.State.design()
        
      }),
      
      c: SC.State.design({
        
        initialSubstate: 'x',
        
        x: SC.State.design(),
        
        z: SC.State.design()
        
      })
      
    });
    
    sc.initStatechart();
    root = sc.get('rootState');
  },
  
  teardown: function() {

  }
  
});

test("get existing, umambiguous states from state Z", function() {
  var state,
      z = root.getSubstate('z');
      
  state = z.getState('z');
  equals(state, z, "should return self for value 'z'");
  
  state = z.getState(z);
  equals(state, z, "should return self for value state Z");
  
  state = z.getState('a');
  equals(state.get('fullPath'), 'a', "should return state for value 'a'");
  equals(z.getState(state).get('fullPath'), 'a', "should return state for state A");
  
  state = z.getState('b');
  equals(state.get('fullPath'), 'b', "should return state for value 'b'");
  
  state = z.getState('c');
  equals(state.get('fullPath'), 'c', "should return state for value 'c'");
  
  state = z.getState('foo');
  equals(state.get('fullPath'), 'a.foo', "should return state for value 'foo'");
  
  state = z.getState('a.foo');
  equals(state.get('fullPath'), 'a.foo', "should return state for value 'a.foo'");
  
  state = z.getState('bar');
  equals(state.get('fullPath'), 'b.bar', "should return state for value 'bar'");
  
  state = z.getState('b.bar');
  equals(state.get('fullPath'), 'b.bar', "should return state for value 'a.bar'");
  
  state = z.getState('a.x');
  equals(state.get('fullPath'), 'a.x', "should return state for value 'a.x'");
  
  state = z.getState('a.y');
  equals(state.get('fullPath'), 'a.y', "should return state for value 'a.y'");
  
  state = z.getState('b.x');
  equals(state.get('fullPath'), 'b.x', "should return state for value 'b.x'");
  
  state = z.getState('b.y');
  equals(state.get('fullPath'), 'b.y', "should return state for value 'b.y'");
  
  state = z.getState('c.x');
  equals(state.get('fullPath'), 'c.x', "should return state for value 'c.x'");
});

test("get state x from sibling states", function() {
  var state,
      foo = root.getSubstate('a.foo'),
      bar = root.getSubstate('b.bar'),
      z = root.getSubstate('c.z');
      
  state = foo.getState('x');
  equals(state.get('fullPath'), 'a.x', "for state foo, should return state a.x for value 'x'");
  
  state = bar.getState('x');
  equals(state.get('fullPath'), 'b.x', "for state bar, should return state b.x for value 'x'");
  
  state = z.getState('x');
  equals(state.get('fullPath'), 'c.x', "for state z, should return state c.x for value 'x'");
});

test("get state x from state a", function() {
  var state,
      a = root.getSubstate('a');
      
  state = a.getState('x');
  equals(state.get('fullPath'), 'a.x', "should return state A.X");
});

test("attempty to get state y from state z", function() {
  var state,
      z = root.getSubstate('c.z');
      
  console.log('expecting to get an error...');
  state = z.getState('y');
  ok(!state, "should not get a state for 'y'");
});