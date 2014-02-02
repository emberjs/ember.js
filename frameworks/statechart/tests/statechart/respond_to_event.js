// ==========================================================================
// SC.Statechart Unit Test
// ==========================================================================
/*globals SC statechart */

var statechart, TestState, root, stateA, stateB, stateC, stateD, stateE, stateF, stateX, stateY, stateZ;

// ..........................................................
// CONTENT CHANGING
// 

module("SC.Statechart: - Respond to Events Tests", {
  setup: function() {
    
    TestState = SC.State.extend({
      returnValue: null,
      handledEvent: NO,
      
      handleEvent: function() {
        this.set('handledEvent', YES);
        return this.get('returnValue');
      },
      
      reset: function() {
        this.set('returnValue', null);
        this.set('handledEvent', NO);
      }
    });
    
    statechart = SC.Statechart.create({
      
      someFunctionInvoked: NO,
      someFunctionReturnValue: null,
      
      someFunction: function() {
        this.set('someFunctionInvoked', YES);
        return this.get('someFunctionReturnValue');
      },
      
      rootState: TestState.design({
        
        eventA: function(sender, context) {
          return this.handleEvent();
        },
        
        eventHandler: function(event, sender, context) {
          return this.handleEvent();
        }.handleEvents('eventB'),
        
        initialSubstate: 'a',
        
        a: TestState.design({
          foo: function(sender, context) {
            return this.handleEvent();
          }
        }),
        
        b: TestState.design({
          bar: function(sender, context) { 
            return this.handleEvent();
          },
          
          eventHandler: function(event, sender, context) {
            return this.handleEvent();
          }.handleEvents('frozen', 'canuck')
        }),
        
        c: TestState.design({
          eventHandlerA: function(event, sender, context) {
            return this.handleEvent();
          }.handleEvents('yes'),
          
          eventHandlerB: function(event, sender, context) {
            return this.handleEvent();
          }.handleEvents(/^num/i)
        }),
        
        d: TestState.design({
          unknownEvent: function(event, sender, context) {
            return this.handleEvent();
          }
        }),
        
        e: TestState.design({
          eventHandler: function(event,sender, context) {
            return this.handleEvent();
          }.handleEvents('plus', 'minus'),
          
          initialSubstate: 'f',
          
          f: TestState.design({
            foo: function(sender, context) {
              return this.handleEvent();
            }
          })
        }),
        
        z: TestState.design({
          blue: function(sender, context) {
            return this.handleEvent();
          },
          
          substatesAreConcurrent: YES,
          
          x: TestState.design({
            yellow: function(sender, context) {
              return this.handleEvent();
            }
          }),
          
          y: TestState.design({
            orange: function(sender,context) {
              return this.handleEvent();
            }
          })
        })
        
      })
      
    });
    
    statechart.initStatechart();
    root = statechart.get('rootState');
    stateA = statechart.getState('a');
    stateB = statechart.getState('b');
    stateC = statechart.getState('c');
    stateD = statechart.getState('d');
    stateE = statechart.getState('e');
    stateF = statechart.getState('f');
    stateX = statechart.getState('x');
    stateY = statechart.getState('y');
    stateZ = statechart.getState('z');
  },
  
  teardown: function() {
    statechart = TestState = root = null;
    stateA = stateB = stateC = stateD = stateE = stateF = stateX = stateY = stateZ = null;
  }
});

test("check state A", function() {
  ok(stateA.respondsToEvent('foo'), 'state A should respond to event foo');
  ok(!stateA.respondsToEvent('foox'), 'state A should not respond to event foox');
  ok(!stateA.respondsToEvent('eventA'), 'state A should not respond to event eventA');
  ok(!stateA.respondsToEvent('eventB'), 'state A should not respond to event eventB');
  
  ok(stateA.get('isCurrentState'), 'state A is current state');
  
  ok(statechart.respondsTo('foo'), 'statechart should respond to foo');
  ok(statechart.respondsTo('eventA'), 'statechart should respond to eventA');
  ok(statechart.respondsTo('eventB'), 'statechart should respond to eventB');
  ok(!statechart.respondsTo('foox'), 'statechart should respond to foox');
  ok(!statechart.respondsTo('eventC'), 'statechart should respond to eventC');
});

test("check state B", function() {
  ok(stateB.respondsToEvent('bar'), 'state B should respond to event bar');
  ok(stateB.respondsToEvent('frozen'), 'state B should respond to event frozen');
  ok(stateB.respondsToEvent('canuck'), 'state B should respond to event canuck');
  ok(!stateB.respondsToEvent('canuckx'), 'state B should not respond to event canuckx');
  ok(!stateB.respondsToEvent('barx'), 'state B should not respond to event barx');
  ok(!stateB.respondsToEvent('eventA'), 'state B should not respond to event eventA');
  ok(!stateB.respondsToEvent('eventB'), 'state B should not respond to event eventB');

  ok(!statechart.respondsTo('bar'), 'statechart should not respond to bar');
  ok(!statechart.respondsTo('frozen'), 'statechart should not respond to frozen');
  ok(!statechart.respondsTo('canuck'), 'statechart should not respond to canuck');
  
  statechart.gotoState(stateB);
  ok(stateB.get('isCurrentState'), 'state B is current state');
  
  ok(statechart.respondsTo('bar'), 'statechart should respond to bar');
  ok(statechart.respondsTo('frozen'), 'statechart should respond to frozen');
  ok(statechart.respondsTo('canuck'), 'statechart should respond to canuck');
  ok(statechart.respondsTo('eventA'), 'statechart should respond to eventA');
  ok(statechart.respondsTo('eventB'), 'statechart should respond to eventB');
  ok(!statechart.respondsTo('canuckx'), 'statechart should not respond to canuckx');
  ok(!statechart.respondsTo('barx'), 'statechart should not respond to foox');
  ok(!statechart.respondsTo('eventC'), 'statechart should not respond to eventC');
});

test("check state C", function() {
  ok(stateC.respondsToEvent('yes'), 'state C should respond to event yes');
  ok(stateC.respondsToEvent('num1'), 'state C should respond to event num1');
  ok(stateC.respondsToEvent('num2'), 'state C should respond to event num2');
  ok(!stateC.respondsToEvent('no'), 'state C should not respond to event no');
  ok(!stateC.respondsToEvent('xnum1'), 'state C should not respond to event xnum1');
  ok(!stateC.respondsToEvent('eventA'), 'state C should not respond to event eventA');
  ok(!stateC.respondsToEvent('eventB'), 'state C should not respond to event eventB');

  ok(!statechart.respondsTo('yes'), 'statechart should not respond to event yes');
  ok(!statechart.respondsTo('num1'), 'statechart should not respond to event num1');
  ok(!statechart.respondsTo('num2'), 'statechart should not respond to event num2');
  
  statechart.gotoState(stateC);
  ok(stateC.get('isCurrentState'), 'state C is current state');
  
  ok(statechart.respondsTo('yes'), 'statechart should respond to event yes');
  ok(statechart.respondsTo('num1'), 'statechart should respond to event num1');
  ok(statechart.respondsTo('num2'), 'statechart should respond to event num2');
  ok(statechart.respondsTo('eventA'), 'statechart should respond to event eventA');
  ok(statechart.respondsTo('eventB'), 'statechart should respond to event eventB');
  ok(!statechart.respondsTo('no'), 'statechart should not respond to event no');
  ok(!statechart.respondsTo('xnum1'), 'statechart should not respond to event xnum1');
  ok(!statechart.respondsTo('eventC'), 'statechart should not respond to event eventC');
});

test("check state D", function() {
  ok(stateD.respondsToEvent('foo'), 'state D should respond to event foo');
  ok(stateD.respondsToEvent('xyz'), 'state D should respond to event xyz');
  ok(stateD.respondsToEvent('eventA'), 'state D should respond to event eventA');
  ok(stateD.respondsToEvent('eventB'), 'state D should respond to event eventB');
  
  statechart.gotoState(stateD);
  ok(stateD.get('isCurrentState'), 'state D is current state');
  
  ok(statechart.respondsTo('foo'), 'statechart should respond to event foo');
  ok(statechart.respondsTo('xyz'), 'statechart should respond to event xyz');
  ok(statechart.respondsTo('eventA'), 'statechart should respond to event eventA');
  ok(statechart.respondsTo('eventB'), 'statechart should respond to event eventB');
  ok(statechart.respondsTo('eventC'), 'statechart should respond to event eventC');
});

test("check states E and F", function() {
  ok(stateE.respondsToEvent('plus'), 'state E should respond to event plus');
  ok(stateE.respondsToEvent('minus'), 'state E should respond to event minus');
  ok(!stateE.respondsToEvent('eventA'), 'state E should not respond to event eventA');
  ok(!stateE.respondsToEvent('eventB'), 'state E should not respond to event eventB');
  
  ok(stateF.respondsToEvent('foo'), 'state F should respond to event foo');
  ok(!stateF.respondsToEvent('plus'), 'state F should not respond to event plus');
  ok(!stateF.respondsToEvent('minus'), 'state F should not respond to event minus');

  ok(!statechart.respondsTo('plus'), 'statechart should not respond to event plus');
  ok(!statechart.respondsTo('minus'), 'statechart should not respond to event minus');
  
  statechart.gotoState(stateE);
  ok(!stateE.get('isCurrentState'), 'state E is not current state');
  ok(stateF.get('isCurrentState'), 'state F is current state');
  
  ok(statechart.respondsTo('foo'), 'statechart should respond to event foo');
  ok(statechart.respondsTo('plus'), 'statechart should respond to event plus');
  ok(statechart.respondsTo('minus'), 'statechart should respond to event minus');
  ok(statechart.respondsTo('eventA'), 'statechart should respond to event eventA');
  ok(statechart.respondsTo('eventB'), 'statechart should respond to event eventB');
  ok(!statechart.respondsTo('foox'), 'statechart should respond to event foox');
  ok(!statechart.respondsTo('eventC'), 'statechart should not respond to event eventC');
});

test("check states X, Y and Z", function() {
  ok(stateZ.respondsToEvent('blue'), 'state Z should respond to event blue');
  ok(!stateZ.respondsToEvent('yellow'), 'state Z should not respond to event yellow');
  ok(!stateZ.respondsToEvent('orange'), 'state Z should not respond to event orange');
  
  ok(!stateX.respondsToEvent('blue'), 'state X should not respond to event blue');
  ok(stateX.respondsToEvent('yellow'), 'state X should respond to event yellow');
  ok(!stateX.respondsToEvent('orange'), 'state X should not respond to event orange');
  
  ok(!stateY.respondsToEvent('blue'), 'state Y should not respond to event blue');
  ok(!stateY.respondsToEvent('foo'), 'state Y should respond to event yellow');
  ok(stateY.respondsToEvent('orange'), 'state Y should not respond to event orange');

  ok(!statechart.respondsTo('blue'), 'statechart should not respond to event blue');
  ok(!statechart.respondsTo('yellow'), 'statechart should not respond to event yellow');
  ok(!statechart.respondsTo('orange'), 'statechart should not respond to event orange');
  
  statechart.gotoState(stateZ);
  ok(!stateZ.get('isCurrentState'), 'state Z is not current state');
  ok(stateX.get('isCurrentState'), 'state X is current state');
  ok(stateY.get('isCurrentState'), 'state Y is current state');
  
  ok(statechart.respondsTo('blue'), 'statechart should respond to event blue');
  ok(statechart.respondsTo('yellow'), 'statechart should respond to event yellow');
  ok(statechart.respondsTo('orange'), 'statechart should respond to event orange');
  ok(statechart.respondsTo('eventA'), 'statechart should respond to event eventA');
  ok(statechart.respondsTo('eventB'), 'statechart should respond to event eventB');
  ok(!statechart.respondsTo('bluex'), 'statechart should not respond to event bluex');
  ok(!statechart.respondsTo('yellowx'), 'statechart should not respond to event yellowx');
  ok(!statechart.respondsTo('orangex'), 'statechart should not respond to event orangex');
  ok(!statechart.respondsTo('eventC'), 'statechart should not respond to event eventC');
});

test("try to perform 'someFunction' on statechart -- current states A", function() {  
  ok(statechart.respondsTo('someFunction'), 'statechart should respond to someFunction');
  ok(!statechart.get('someFunctionInvoked'), 'someFunctionInvoked should be false');
  ok(statechart.tryToPerform('someFunction'), 'statechart should perform someFunction');
  ok(statechart.get('someFunctionInvoked'), 'someFunctionInvoked should be true');
  
  statechart.set('someFunctionInvoked', NO);
  statechart.set('someFunctionReturnValue', NO);
  
  ok(statechart.respondsTo('someFunction'), 'statechart should respond to someFunction');
  ok(!statechart.tryToPerform('someFunction'), 'statechart should perform someFunction');
  ok(statechart.get('someFunctionInvoked'), 'someFunctionInvoked should be true');
});

test("try to perform 'foo' on statechart -- current state A", function() {
  ok(statechart.tryToPerform('foo'), 'statechart should perform foo');
  ok(stateA.get('handledEvent'), 'state A did handle event foo');
  ok(!root.get('handledEvent'), 'root not did handle event foo');
  
  stateA.reset();
  stateA.set('returnValue', NO);
  
  ok(!statechart.tryToPerform('foo'), 'statechart should not perform foo');
  ok(stateA.get('handledEvent'), 'state A did handle event foo');
  ok(!root.get('handledEvent'), 'root did not handle event foo');
});

test("try to perform 'foox' on statechart -- current state A", function() {
  ok(!statechart.tryToPerform('foox'), 'statechart should perform foo');
  ok(!stateA.get('handledEvent'), 'state A did handle event foo');
  ok(!root.get('handledEvent'), 'root not did handle event foo');
});

test("try to perform 'eventA' on statechart -- current state A", function() {
  ok(statechart.tryToPerform('eventA'), 'statechart should perform eventA');
  ok(!stateA.get('handledEvent'), 'state A did not handle event eventA');
  ok(root.get('handledEvent'), 'root did handle event eventA');
  
  root.reset();
  root.set('returnValue', NO);
  stateA.reset();
  
  ok(!statechart.tryToPerform('eventA'), 'statechart should not perform eventA');
  ok(!stateA.get('handledEvent'), 'state A did not handle event eventA');
  ok(root.get('handledEvent'), 'root did handle event eventA');
});

test("try to perform 'yes' on statechart -- current state C", function() {
  statechart.gotoState(stateC);
  
  ok(stateC.get('isCurrentState'), 'state C should be current state');
  
  ok(statechart.tryToPerform('yes'), 'statechart should perform yes');
  ok(stateC.get('handledEvent'), 'state C did handle event yes');
  ok(!root.get('handledEvent'), 'root not did handle event yes');
  
  stateC.reset();
  stateC.set('returnValue', NO);
  
  ok(!statechart.tryToPerform('yes'), 'statechart should not perform yes');
  ok(stateC.get('handledEvent'), 'state C did handle event yes');
  ok(!root.get('handledEvent'), 'root did not handle event yes');
});

test("try to perform 'num1' on statechart -- current state C", function() {
  statechart.gotoState(stateC);
  
  ok(stateC.get('isCurrentState'), 'state C should be current state');
  
  ok(statechart.tryToPerform('num1'), 'statechart should perform num1');
  ok(stateC.get('handledEvent'), 'state C did handle event num1');
  ok(!root.get('handledEvent'), 'root not did handle event num1');
  
  stateC.reset();
  stateC.set('returnValue', NO);
  
  ok(!statechart.tryToPerform('num1'), 'statechart should not perform num1');
  ok(stateC.get('handledEvent'), 'state C did handle event num1');
  ok(!root.get('handledEvent'), 'root did not handle event num1');
});

test("try to perform 'abc' on statechart -- current state D", function() {
  statechart.gotoState(stateD);
  
  ok(stateD.get('isCurrentState'), 'state D should be current state');
  
  ok(statechart.tryToPerform('abc'), 'statechart should perform abc');
  ok(stateD.get('handledEvent'), 'state D did handle event abc');
  ok(!root.get('handledEvent'), 'root not did handle event abc');
  
  stateD.reset();
  stateD.set('returnValue', NO);
  
  ok(!statechart.tryToPerform('abc'), 'statechart should not perform abc');
  ok(stateD.get('handledEvent'), 'state D did handle event abc');
  ok(!root.get('handledEvent'), 'root did not handle event abc');
});

test("try to perform 'yellow' on statechart -- current states X and Y", function() {
  statechart.gotoState(stateZ);
  
  ok(stateX.get('isCurrentState'), 'state X should be current state');
  ok(stateY.get('isCurrentState'), 'state Y should be current state');
  
  ok(statechart.tryToPerform('yellow'), 'statechart should perform yellow');
  ok(stateX.get('handledEvent'), 'state X did handle event yellow');
  ok(!stateY.get('handledEvent'), 'state Y did not handle event yellow');
  ok(!stateZ.get('handledEvent'), 'state Z did not handle event yellow');
  ok(!root.get('handledEvent'), 'root not did handle event yellow');
  
  stateX.reset();
  stateX.set('returnValue', NO);
  
  ok(!statechart.tryToPerform('yellow'), 'statechart should not perform yellow');
  ok(stateX.get('handledEvent'), 'state X did handle event yellow');
  ok(!stateY.get('handledEvent'), 'state Y did not handle event yellow');
  ok(!stateZ.get('handledEvent'), 'state Z did not handle event yellow');
  ok(!root.get('handledEvent'), 'root not did handle event yellow');
});

test("Check destroyed statechart does not respond to events", function() {
  ok(statechart.respondsTo('foo'), 'statechart should respond to foo before destroyed');
  ok(statechart.respondsTo('eventA'), 'statechart should respond to eventA before destroyed');
  ok(statechart.respondsTo('eventB'), 'statechart should respond to eventB before destroyed');
  ok(!statechart.respondsTo('foox'), 'statechart should not respond to foox before destroyed');
  ok(!statechart.respondsTo('eventC'), 'statechart should not respond to eventC before destroyed');

  statechart.destroy();

  ok(!statechart.respondsTo('foo'), 'statechart should not respond to foo after destroyed');
  ok(!statechart.respondsTo('eventA'), 'statechart should not respond to eventA after destroyed');
  ok(!statechart.respondsTo('eventB'), 'statechart should not respond to eventB after destroyed');
  ok(!statechart.respondsTo('foox'), 'statechart should not respond to foox after destroyed');
  ok(!statechart.respondsTo('eventC'), 'statechart should not respond to eventC after destroyed');
});
