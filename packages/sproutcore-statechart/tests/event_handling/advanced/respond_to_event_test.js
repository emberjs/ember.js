// ==========================================================================
// SC.Statechart Unit Test
// ==========================================================================
/*globals SC statechart */

var statechart, TestState, root, stateA, stateB, stateC, stateD, stateE, stateF, stateX, stateY, stateZ;

// ..........................................................
// CONTENT CHANGING
// 

module("SC.Statechart: - Respond to Actions Tests", {
  setup: function() {
    TestState = SC.State.extend({
      returnValue: null,
      handledAction: NO,
      
      handleAction: function() {
        this.set('handledAction', YES);
        return this.get('returnValue');
      },
      
      reset: function() {
        this.set('returnValue', null);
        this.set('handledAction', NO);
      }
    });
    
    statechart = SC.Statechart.create({
      
      someFunctionInvoked: NO,
      someFunctionReturnValue: null,
      
      someFunction: function() {
        this.set('someFunctionInvoked', YES);
        return this.get('someFunctionReturnValue');
      },
      
      rootState: TestState.extend({
        
        actionA: function(sender, context) {
          return this.handleAction();
        },
        
        actionHandler: function(action, sender, context) {
          return this.handleAction();
        }.handleActions('actionB'),
        
        initialSubstate: 'a',
        
        a: TestState.extend({
          foo: function(sender, context) {
            return this.handleAction();
          }
        }),
        
        b: TestState.extend({
          bar: function(sender, context) { 
            return this.handleAction();
          },
          
          actionHandler: function(action, sender, context) {
            return this.handleAction();
          }.handleActions('frozen', 'canuck')
        }),
        
        c: TestState.extend({
          actionHandlerA: function(action, sender, context) {
            return this.handleAction();
          }.handleActions('yes'),
          
          actionHandlerB: function(action, sender, context) {
            return this.handleAction();
          }.handleActions(/^num/i)
        }),
        
        d: TestState.extend({
          unknownAction: function(action, sender, context) {
            return this.handleAction();
          }
        }),
        
        e: TestState.extend({
          actionHandler: function(action,sender, context) {
            return this.handleAction();
          }.handleActions('plus', 'minus'),
          
          initialSubstate: 'f',
          
          f: TestState.extend({
            foo: function(sender, context) {
              return this.handleAction();
            }
          })
        }),
        
        z: TestState.extend({
          blue: function(sender, context) {
            return this.handleAction();
          },
          
          substatesAreConcurrent: YES,
          
          x: TestState.extend({
            yellow: function(sender, context) {
              return this.handleAction();
            }
          }),
          
          y: TestState.extend({
            orange: function(sender,context) {
              return this.handleAction();
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
  ok(stateA.respondsToAction('foo'), 'state A should respond to action foo');
  ok(!stateA.respondsToAction('foox'), 'state A should not respond to action foox');
  ok(!stateA.respondsToAction('actionA'), 'state A should not respond to action actionA');
  ok(!stateA.respondsToAction('actionB'), 'state A should not respond to action actionB');
  
  ok(stateA.get('isCurrentState'), 'state A is current state');
  
  ok(statechart.respondsTo('foo'), 'statechart should respond to foo');
  ok(statechart.respondsTo('actionA'), 'statechart should respond to actionA');
  ok(statechart.respondsTo('actionB'), 'statechart should respond to actionB');
  ok(!statechart.respondsTo('foox'), 'statechart should respond to foox');
  ok(!statechart.respondsTo('actionC'), 'statechart should respond to actionC');
});

test("check state B", function() {
  ok(stateB.respondsToAction('bar'), 'state B should respond to action bar');
  ok(stateB.respondsToAction('frozen'), 'state B should respond to action frozen');
  ok(stateB.respondsToAction('canuck'), 'state B should respond to action canuck');
  ok(!stateB.respondsToAction('canuckx'), 'state B should not respond to action canuckx');
  ok(!stateB.respondsToAction('barx'), 'state B should not respond to action barx');
  ok(!stateB.respondsToAction('actionA'), 'state B should not respond to action actionA');
  ok(!stateB.respondsToAction('actionB'), 'state B should not respond to action actionB');

  ok(!statechart.respondsTo('bar'), 'statechart should not respond to bar');
  ok(!statechart.respondsTo('frozen'), 'statechart should not respond to frozen');
  ok(!statechart.respondsTo('canuck'), 'statechart should not respond to canuck');
  
  statechart.gotoState(stateB);
  ok(stateB.get('isCurrentState'), 'state B is current state');
  
  ok(statechart.respondsTo('bar'), 'statechart should respond to bar');
  ok(statechart.respondsTo('frozen'), 'statechart should respond to frozen');
  ok(statechart.respondsTo('canuck'), 'statechart should respond to canuck');
  ok(statechart.respondsTo('actionA'), 'statechart should respond to actionA');
  ok(statechart.respondsTo('actionB'), 'statechart should respond to actionB');
  ok(!statechart.respondsTo('canuckx'), 'statechart should not respond to canuckx');
  ok(!statechart.respondsTo('barx'), 'statechart should not respond to foox');
  ok(!statechart.respondsTo('actionC'), 'statechart should not respond to actionC');
});

test("check state C", function() {
  ok(stateC.respondsToAction('yes'), 'state C should respond to action yes');
  ok(stateC.respondsToAction('num1'), 'state C should respond to action num1');
  ok(stateC.respondsToAction('num2'), 'state C should respond to action num2');
  ok(!stateC.respondsToAction('no'), 'state C should not respond to action no');
  ok(!stateC.respondsToAction('xnum1'), 'state C should not respond to action xnum1');
  ok(!stateC.respondsToAction('actionA'), 'state C should not respond to action actionA');
  ok(!stateC.respondsToAction('actionB'), 'state C should not respond to action actionB');

  ok(!statechart.respondsTo('yes'), 'statechart should not respond to action yes');
  ok(!statechart.respondsTo('num1'), 'statechart should not respond to action num1');
  ok(!statechart.respondsTo('num2'), 'statechart should not respond to action num2');
  
  statechart.gotoState(stateC);
  ok(stateC.get('isCurrentState'), 'state C is current state');
  
  ok(statechart.respondsTo('yes'), 'statechart should respond to action yes');
  ok(statechart.respondsTo('num1'), 'statechart should respond to action num1');
  ok(statechart.respondsTo('num2'), 'statechart should respond to action num2');
  ok(statechart.respondsTo('actionA'), 'statechart should respond to action actionA');
  ok(statechart.respondsTo('actionB'), 'statechart should respond to action actionB');
  ok(!statechart.respondsTo('no'), 'statechart should not respond to action no');
  ok(!statechart.respondsTo('xnum1'), 'statechart should not respond to action xnum1');
  ok(!statechart.respondsTo('actionC'), 'statechart should not respond to action actionC');
});

test("check state D", function() {
  ok(stateD.respondsToAction('foo'), 'state D should respond to action foo');
  ok(stateD.respondsToAction('xyz'), 'state D should respond to action xyz');
  ok(stateD.respondsToAction('actionA'), 'state D should respond to action actionA');
  ok(stateD.respondsToAction('actionB'), 'state D should respond to action actionB');
  
  statechart.gotoState(stateD);
  ok(stateD.get('isCurrentState'), 'state D is current state');
  
  ok(statechart.respondsTo('foo'), 'statechart should respond to action foo');
  ok(statechart.respondsTo('xyz'), 'statechart should respond to action xyz');
  ok(statechart.respondsTo('actionA'), 'statechart should respond to action actionA');
  ok(statechart.respondsTo('actionB'), 'statechart should respond to action actionB');
  ok(statechart.respondsTo('actionC'), 'statechart should respond to action actionC');
});

test("check states E and F", function() {
  ok(stateE.respondsToAction('plus'), 'state E should respond to action plus');
  ok(stateE.respondsToAction('minus'), 'state E should respond to action minus');
  ok(!stateE.respondsToAction('actionA'), 'state E should not respond to action actionA');
  ok(!stateE.respondsToAction('actionB'), 'state E should not respond to action actionB');
  
  ok(stateF.respondsToAction('foo'), 'state F should respond to action foo');
  ok(!stateF.respondsToAction('plus'), 'state F should not respond to action plus');
  ok(!stateF.respondsToAction('minus'), 'state F should not respond to action minus');

  ok(!statechart.respondsTo('plus'), 'statechart should not respond to action plus');
  ok(!statechart.respondsTo('minus'), 'statechart should not respond to action minus');
  
  statechart.gotoState(stateE);
  ok(!stateE.get('isCurrentState'), 'state E is not current state');
  ok(stateF.get('isCurrentState'), 'state F is current state');
  
  ok(statechart.respondsTo('foo'), 'statechart should respond to action foo');
  ok(statechart.respondsTo('plus'), 'statechart should respond to action plus');
  ok(statechart.respondsTo('minus'), 'statechart should respond to action minus');
  ok(statechart.respondsTo('actionA'), 'statechart should respond to action actionA');
  ok(statechart.respondsTo('actionB'), 'statechart should respond to action actionB');
  ok(!statechart.respondsTo('foox'), 'statechart should respond to action foox');
  ok(!statechart.respondsTo('actionC'), 'statechart should not respond to action actionC');
});

test("check states X, Y and Z", function() {
  ok(stateZ.respondsToAction('blue'), 'state Z should respond to action blue');
  ok(!stateZ.respondsToAction('yellow'), 'state Z should not respond to action yellow');
  ok(!stateZ.respondsToAction('orange'), 'state Z should not respond to action orange');
  
  ok(!stateX.respondsToAction('blue'), 'state X should not respond to action blue');
  ok(stateX.respondsToAction('yellow'), 'state X should respond to action yellow');
  ok(!stateX.respondsToAction('orange'), 'state X should not respond to action orange');
  
  ok(!stateY.respondsToAction('blue'), 'state Y should not respond to action blue');
  ok(!stateY.respondsToAction('foo'), 'state Y should respond to action yellow');
  ok(stateY.respondsToAction('orange'), 'state Y should not respond to action orange');

  ok(!statechart.respondsTo('blue'), 'statechart should not respond to action blue');
  ok(!statechart.respondsTo('yellow'), 'statechart should not respond to action yellow');
  ok(!statechart.respondsTo('orange'), 'statechart should not respond to action orange');
  
  statechart.gotoState(stateZ);
  ok(!stateZ.get('isCurrentState'), 'state Z is not current state');
  ok(stateX.get('isCurrentState'), 'state X is current state');
  ok(stateY.get('isCurrentState'), 'state Y is current state');
  
  ok(statechart.respondsTo('blue'), 'statechart should respond to action blue');
  ok(statechart.respondsTo('yellow'), 'statechart should respond to action yellow');
  ok(statechart.respondsTo('orange'), 'statechart should respond to action orange');
  ok(statechart.respondsTo('actionA'), 'statechart should respond to action actionA');
  ok(statechart.respondsTo('actionB'), 'statechart should respond to action actionB');
  ok(!statechart.respondsTo('bluex'), 'statechart should not respond to action bluex');
  ok(!statechart.respondsTo('yellowx'), 'statechart should not respond to action yellowx');
  ok(!statechart.respondsTo('orangex'), 'statechart should not respond to action orangex');
  ok(!statechart.respondsTo('actionC'), 'statechart should not respond to action actionC');
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
  ok(stateA.get('handledAction'), 'state A did handle action foo');
  ok(!root.get('handledAction'), 'root not did handle action foo');
  
  stateA.reset();
  stateA.set('returnValue', NO);
  
  ok(!statechart.tryToPerform('foo'), 'statechart should not perform foo');
  ok(stateA.get('handledAction'), 'state A did handle action foo');
  ok(!root.get('handledAction'), 'root did not handle action foo');
});

test("try to perform 'foox' on statechart -- current state A", function() {
  ok(!statechart.tryToPerform('foox'), 'statechart should perform foo');
  ok(!stateA.get('handledAction'), 'state A did handle action foo');
  ok(!root.get('handledAction'), 'root not did handle action foo');
});

test("try to perform 'actionA' on statechart -- current state A", function() {
  ok(statechart.tryToPerform('actionA'), 'statechart should perform actionA');
  ok(!stateA.get('handledAction'), 'state A did not handle action actionA');
  ok(root.get('handledAction'), 'root did handle action actionA');
  
  root.reset();
  root.set('returnValue', NO);
  stateA.reset();
  
  ok(!statechart.tryToPerform('actionA'), 'statechart should not perform actionA');
  ok(!stateA.get('handledAction'), 'state A did not handle action actionA');
  ok(root.get('handledAction'), 'root did handle action actionA');
});

test("try to perform 'yes' on statechart -- current state C", function() {
  statechart.gotoState(stateC);
  
  ok(stateC.get('isCurrentState'), 'state C should be current state');
  
  ok(statechart.tryToPerform('yes'), 'statechart should perform yes');
  ok(stateC.get('handledAction'), 'state C did handle action yes');
  ok(!root.get('handledAction'), 'root not did handle action yes');
  
  stateC.reset();
  stateC.set('returnValue', NO);
  
  ok(!statechart.tryToPerform('yes'), 'statechart should not perform yes');
  ok(stateC.get('handledAction'), 'state C did handle action yes');
  ok(!root.get('handledAction'), 'root did not handle action yes');
});

test("try to perform 'num1' on statechart -- current state C", function() {
  statechart.gotoState(stateC);
  
  ok(stateC.get('isCurrentState'), 'state C should be current state');
  
  ok(statechart.tryToPerform('num1'), 'statechart should perform num1');
  ok(stateC.get('handledAction'), 'state C did handle action num1');
  ok(!root.get('handledAction'), 'root not did handle action num1');
  
  stateC.reset();
  stateC.set('returnValue', NO);
  
  ok(!statechart.tryToPerform('num1'), 'statechart should not perform num1');
  ok(stateC.get('handledAction'), 'state C did handle action num1');
  ok(!root.get('handledAction'), 'root did not handle action num1');
});

test("try to perform 'abc' on statechart -- current state D", function() {
  statechart.gotoState(stateD);
  
  ok(stateD.get('isCurrentState'), 'state D should be current state');
  
  ok(statechart.tryToPerform('abc'), 'statechart should perform abc');
  ok(stateD.get('handledAction'), 'state D did handle action abc');
  ok(!root.get('handledAction'), 'root not did handle action abc');
  
  stateD.reset();
  stateD.set('returnValue', NO);
  
  ok(!statechart.tryToPerform('abc'), 'statechart should not perform abc');
  ok(stateD.get('handledAction'), 'state D did handle action abc');
  ok(!root.get('handledAction'), 'root did not handle action abc');
});

test("try to perform 'yellow' on statechart -- current states X and Y", function() {
  statechart.gotoState(stateZ);
  
  ok(stateX.get('isCurrentState'), 'state X should be current state');
  ok(stateY.get('isCurrentState'), 'state Y should be current state');
  
  ok(statechart.tryToPerform('yellow'), 'statechart should perform yellow');
  ok(stateX.get('handledAction'), 'state X did handle action yellow');
  ok(!stateY.get('handledAction'), 'state Y did not handle action yellow');
  ok(!stateZ.get('handledAction'), 'state Z did not handle action yellow');
  ok(!root.get('handledAction'), 'root not did handle action yellow');
  
  stateX.reset();
  stateX.set('returnValue', NO);
  
  ok(!statechart.tryToPerform('yellow'), 'statechart should not perform yellow');
  ok(stateX.get('handledAction'), 'state X did handle action yellow');
  ok(!stateY.get('handledAction'), 'state Y did not handle action yellow');
  ok(!stateZ.get('handledAction'), 'state Z did not handle action yellow');
  ok(!root.get('handledAction'), 'root not did handle action yellow');
});