// ==========================================================================
// SC Unit Test
// ==========================================================================
/*globals SC */

var sc, root, stateFoo, stateBar, stateA, stateB, stateX, stateY, stateA1, stateA2, stateB1, stateB2, stateX1, stateX2, stateY1, stateY2;

module("SC.State: findFirstRelativeCurrentState method Tests (without concurrent states)", {
  
  setup: function() {
    
    sc = SC.Statechart.create({
      
      initialState: 'foo',
    
      foo: SC.State.design({
        
        substatesAreConcurrent: YES,
        
        a: SC.State.design({
          initialSubstate: 'a1',
          a1: SC.State.design(),
          a2: SC.State.design()
        }),
        
        b: SC.State.design({
          initialSubstate: 'b1',
          b1: SC.State.design(),
          b2: SC.State.design()
        })
        
      }),
      
      bar: SC.State.design({
        
        substatesAreConcurrent: YES,
        
        x: SC.State.design({
          initialSubstate: 'x1',
          x1: SC.State.design(),
          x2: SC.State.design()
        }),
        
        y: SC.State.design({
          initialSubstate: 'y1',
          y1: SC.State.design(),
          y2: SC.State.design()
        })
        
      })
      
    });
    
    sc.initStatechart();
    
    root = sc.get('rootState');
    stateFoo = sc.getState('foo');
    stateBar = sc.getState('bar');
    stateA = sc.getState('a');
    stateB = sc.getState('b');
    stateX = sc.getState('x');
    stateY = sc.getState('y');
    stateA1 = sc.getState('a1');
    stateA2 = sc.getState('a2');
    stateB1 = sc.getState('b1');
    stateB2 = sc.getState('b2');
    stateX1 = sc.getState('x1');
    stateX2 = sc.getState('x2');
    stateY1 = sc.getState('y1');
    stateY2 = sc.getState('y2');
  },
  
  teardown: function() {
    sc = root = stateFoo = stateBar = null;
    stateA = stateB = stateX = stateY = null;
    stateA1 = stateA2 = stateB1 = stateB2 = null;
    stateX1 = stateX2 = stateY1 = stateY2 = null;
  }
  
});

test("check using state A1 with state foo entered", function() {
  equals(stateA1.findFirstRelativeCurrentState(), stateA1, "state should return state A1");
});

test("check using state A2 with state foo entered", function() {
  equals(stateA2.findFirstRelativeCurrentState(), stateA1, "state should return state A1");
});

test("check using state A with state foo entered", function() {
  equals(stateA.findFirstRelativeCurrentState(), stateA1, "state should return state A1");
});

test("check using state Foo with state foo entered", function() {
  var result;

  ok(stateFoo.get('isEnteredState'), 'state foo should be entered');
  ok(stateA.get('isEnteredState'), 'state a should be entered');
  ok(stateB.get('isEnteredState'), 'state b should be entered');
  ok(stateA1.get('isCurrentState'), 'state a1 should be entered');
  ok(stateB1.get('isCurrentState'), 'state b1 should be entered');
  
  result = stateFoo.findFirstRelativeCurrentState();
  ok([stateA1, stateB1].indexOf(result) >= 0, "state should return either state A1 or B1 without anchor");
  
  equals(stateFoo.findFirstRelativeCurrentState(stateA), stateA1, "state should return A1 with anchor state A");
  equals(stateFoo.findFirstRelativeCurrentState('a'), stateA1, "state should return A1 with anchor state 'a'");
  equals(stateFoo.findFirstRelativeCurrentState(stateA1), stateA1, "state should return A1 with anchor state A1");
  equals(stateFoo.findFirstRelativeCurrentState('a1'), stateA1, "state should return A1 with anchor state 'a1'");
  equals(stateFoo.findFirstRelativeCurrentState('a.a1'), stateA1, "state should return A1 with anchor state 'a.a1'");
  equals(stateFoo.findFirstRelativeCurrentState(stateA2), stateA1, "state should return A1 with anchor state A2");
  equals(stateFoo.findFirstRelativeCurrentState('a2'), stateA1, "state should return A1 with anchor state 'a2'");
  equals(stateFoo.findFirstRelativeCurrentState('a.a2'), stateA1, "state should return A1 with anchor state 'a.a2'");

  equals(stateFoo.findFirstRelativeCurrentState(stateB), stateB1, "state should return B1 with anchor state B");
  equals(stateFoo.findFirstRelativeCurrentState('b'), stateB1, "state should return B1 with anchor state 'b'");
  equals(stateFoo.findFirstRelativeCurrentState(stateB1), stateB1, "state should return B1 with anchor state B1");
  equals(stateFoo.findFirstRelativeCurrentState('b1'), stateB1, "state should return B1 with anchor state 'b1'");
  equals(stateFoo.findFirstRelativeCurrentState('b.b1'), stateB1, "state should return B1 with anchor state 'b.b1'");
  equals(stateFoo.findFirstRelativeCurrentState(stateB2), stateB1, "state should return B1 with anchor state B2");
  equals(stateFoo.findFirstRelativeCurrentState('b2'), stateB1, "state should return B1 with anchor state 'b2'");
  equals(stateFoo.findFirstRelativeCurrentState('b.b2'), stateB1, "state should return B1 with anchor state 'b.b2'");
});

test("check using root state with state foo entered", function() {
  var result;
  
  result = root.findFirstRelativeCurrentState();
  ok([stateA1, stateB1].indexOf(result) >= 0, "state should return either state A1 or B1 without anchor");

  result = root.findFirstRelativeCurrentState(stateFoo); 
  ok([stateA1, stateB1].indexOf(result) >= 0, "state should return either state A1 or B1 with anchor state Foo");

  result = root.findFirstRelativeCurrentState(stateBar);
  ok([stateA1, stateB1].indexOf(result) >= 0, "state should return either state A1 or B1 with anchor state Bar");
 
  equals(root.findFirstRelativeCurrentState(stateA), stateA1, "state should return state A1 with anchor state A");
  equals(root.findFirstRelativeCurrentState('a'), stateA1, "state should return state A1 with anchor state 'a'");
  equals(root.findFirstRelativeCurrentState('foo.a'), stateA1, "state should return state A1 with anchor state 'foo.a'");
 
  equals(root.findFirstRelativeCurrentState(stateB), stateB1, "state should return state B1 with anchor state B");
  equals(root.findFirstRelativeCurrentState('b'), stateB1, "state should return state B1 with anchor state 'b'");
  equals(root.findFirstRelativeCurrentState('foo.b'), stateB1, "state should return state B1 with anchor state 'foo.b'");

  result = root.findFirstRelativeCurrentState(stateX);
  ok([stateA1, stateB1].indexOf(result) >= 0, "state should return state either state A1 or B1 with anchor state X");

  result = root.findFirstRelativeCurrentState(stateY);
  ok([stateA1, stateB1].indexOf(result) >= 0, "state should return state either state A1 or B1 with anchor state Y");
});

test("check using root state with state bar entered", function() {
  var result;
  
  sc.gotoState('bar');
  
  result = root.findFirstRelativeCurrentState();
  ok([stateX1, stateY1].indexOf(result) >= 0, "state should return either state X1 or Y1 without anchor");
  
  result = root.findFirstRelativeCurrentState(stateFoo);
  ok(root.findFirstRelativeCurrentState(stateFoo), "state should return either state X1 or Y1 with anchor state Foo");

  result = root.findFirstRelativeCurrentState(stateBar);
  ok([stateX1, stateY1].indexOf(result) >= 0, "state should return either state X1 or Y1 with anchor state Bar");
 
  equals(root.findFirstRelativeCurrentState(stateX), stateX1, "state should return state X1 with anchor state X");
  equals(root.findFirstRelativeCurrentState('x'), stateX1, "state should return state X1 with anchor state 'x'");
  equals(root.findFirstRelativeCurrentState('bar.x'), stateX1, "state should return state X1 with anchor state 'bar.x'");
 
  equals(root.findFirstRelativeCurrentState(stateY), stateY1, "state should return state Y1 with anchor state Y");
  equals(root.findFirstRelativeCurrentState('y'), stateY1, "state should return state Y1 with anchor state 'y'");
  equals(root.findFirstRelativeCurrentState('bar.y'), stateY1, "state should return state Y1 with anchor state 'bar.y'");
 
  result = root.findFirstRelativeCurrentState(stateA);
  ok([stateX1, stateY1].indexOf(result) >= 0, "state should return either state X1 or Y1 with anchor state A");
  
  result = root.findFirstRelativeCurrentState(stateB);
  ok([stateX1, stateY1].indexOf(result) >= 0, "state should return either state X1 or Y1 with anchor state B");
});