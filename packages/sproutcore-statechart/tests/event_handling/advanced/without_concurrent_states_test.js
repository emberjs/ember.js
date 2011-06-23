// ==========================================================================
// SC.Statechart Unit Test
// ==========================================================================
/*globals SC */

var statechart1 = null;
var statechart2 = null;
var statechart3 = null;
var statechart4 = null;
var TestState = null;

module("Ki.Statechart: No Concurrent States - Advanced Action Handling Tests", {
  setup: function() {
    
    TestState = SC.State.extend({
      action: null,
      sender: null,
      context: null,
      handler: null,
      
      _handledAction: function(handler, action, sender, context) {
        this.set('handler', handler);
        this.set('action', action);
        this.set('sender', sender);
        this.set('context', context);
      },
      
      reset: function() {
        this.set('handler', null);
        this.set('action', null);
        this.set('sender', null);
        this.set('context', null);
      }
    });

    statechart1 = SC.Statechart.create({
      
      rootState: TestState.extend({
      
        foo: function(sender, context) {
          this._handledAction('foo', null, sender, context);
        },
        
        actionHandlerA: function(action, sender, context) {
          this._handledAction('actionHandlerA', action, sender, context);
        }.handleActions('plus', 'minus', 'mulitply', 'divide'),
        
        actionHandlerB: function(action, sender, context) {
          this._handledAction('actionHandlerB', action, sender, context);
        }.handleActions(/num\d/),
        
        unknownAction: function(action, sender, context) {
          this._handledAction('unknownAction', action, sender, context);
        }
        
      })
      
    });
    
    statechart2 = SC.Statechart.create({
      
      rootState: TestState.extend({
        
        foo: function(sender, context) {
          this._handledAction('foo', null, sender, context);
        }
        
      })
      
    });
    
    statechart3 = SC.Statechart.create({
      
      rootState: TestState.extend({
        
        actionHandlerA: function(action, sender, context) {
          this._handledAction('actionHandlerA', action, sender, context);
        }.handleActions(/num\d/, 'decimal'),
        
        actionHandlerB: function(action, sender, context) {
          this._handledAction('actionHandlerB', action, sender, context);
        }.handleActions(/foo/, /bar/)
        
      })
      
    });
    
    statechart4 = SC.Statechart.create({
      
      rootState: TestState.extend({
        
        initialSubstate: 'a',
        
        foo: function(sender, context) {
          this._handledAction('foo', null, sender, context);
        },
        
        actionHandlerRoot: function(action, sender, context) {
          this._handledAction('actionHandlerRoot', action, sender, context);
        }.handleActions('yes', 'no'),
        
        unknownAction: function(action, sender, context) {
          this._handledAction('unknownAction', action, sender, context);
        },
        
        a: TestState.extend({
          
          initialSubstate: 'b',
          
          bar: function(sender, context) {
            this._handledAction('bar', null, sender, context);
          },
          
          actionHandlerA: function(action, sender, context) {
            this._handledAction('actionHandlerA', action, sender, context);
          }.handleActions('frozen', 'canuck'),
          
          b: TestState.extend({
            
            cat: function(sender, context) {
              this._handledAction('cat', null, sender, context);
            },
            
            actionHandlerB: function(action, sender, context) {
              this._handledAction('actionHandlerB', action, sender, context);
            }.handleActions(/apple/, /orange/)
            
          })
          
        })
        
      })
      
    });
    
    statechart1.initStatechart();
    statechart2.initStatechart();
    statechart3.initStatechart();
    statechart4.initStatechart();
  },
  
  teardown: function() {
    statechart1.destroy();
    statechart2.destroy();
    statechart3.destroy();
    statechart4.destroy();
    statechart1 = null;
    statechart2 = null;
    statechart3 = null;
    statechart4 = null;
  }
});

test("check statechart1 action handling", function() {
  var state = statechart1.get('rootState'),
      sender = SC.Object.create(),
      context = SC.Object.create();
  
  state.reset();
  statechart1.sendAction('foo', sender, context);
  equals(state.get('handler'), 'foo', 'action handler should be foo');
  equals(state.get('action'), null, 'action should be null');
  equals(state.get('sender'), sender, 'sender should be sender object');
  equals(state.get('context'), context, 'context should be context object');
  
  state.reset();
  statechart1.sendAction('plus', sender, context);
  equals(state.get('handler'), 'actionHandlerA', 'action handler should be actionHandlerA');
  equals(state.get('action'), 'plus', 'action should be plus');
  equals(state.get('sender'), sender, 'sender should be sender object');
  equals(state.get('context'), context, 'context should be context object');
  
  state.reset();
  statechart1.sendAction('divide', sender, context);
  equals(state.get('handler'), 'actionHandlerA', 'action handler should be actionHandlerA');
  equals(state.get('action'), 'divide', 'action should be divide');
  equals(state.get('sender'), sender, 'sender should be sender object');
  equals(state.get('context'), context, 'context should be context object');
  
  state.reset();
  statechart1.sendAction('num1', sender, context);
  equals(state.get('handler'), 'actionHandlerB', 'action handler should be actionHandlerB');
  equals(state.get('action'), 'num1', 'action should be num1');
  equals(state.get('sender'), sender, 'sender should be sender object');
  equals(state.get('context'), context, 'context should be context object');
  
  state.reset();
  statechart1.sendAction('bar', sender, context);
  equals(state.get('handler'), 'unknownAction', 'action handler should be unknownAction');
  equals(state.get('action'), 'bar', 'action should be bar');
  equals(state.get('sender'), sender, 'sender should be sender object');
  equals(state.get('context'), context, 'context should be context object');
});

test("check statechart2 action handling", function() {
  var state = statechart2.get('rootState'),
      sender = SC.Object.create(),
      context = SC.Object.create();
  
  state.reset();
  statechart2.sendAction('foo', sender, context);
  equals(state.get('handler'), 'foo', 'action handler should be foo');
  equals(state.get('action'), null, 'action should be null');
  equals(state.get('sender'), sender, 'sender should be sender object');
  equals(state.get('context'), context, 'context should be context object');
  
  state.reset();
  statechart2.sendAction('bar', sender, context);
  equals(state.get('handler'), null, 'action handler should be null');
  equals(state.get('action'), null, 'action should be null');
  equals(state.get('sender'), null, 'sender should be sender null');
  equals(state.get('context'), null, 'context should be context null');
});

test("check statechart3 action handling", function() {
  var state = statechart3.get('rootState');
  
  state.reset();
  statechart3.sendAction('num2');
  equals(state.get('handler'), 'actionHandlerA', 'action handler should be actionHandlerA');
  equals(state.get('action'), 'num2', 'action should be num2');
  
  state.reset();
  statechart3.sendAction('decimal');
  equals(state.get('handler'), 'actionHandlerA', 'action handler should be actionHandlerA');
  equals(state.get('action'), 'decimal', 'action should be decimal');
  
  state.reset();
  statechart3.sendAction('foo');
  equals(state.get('handler'), 'actionHandlerB', 'action handler should be actionHandlerB');
  equals(state.get('action'), 'foo', 'action should be foo');
  
  state.reset();
  statechart3.sendAction('bar');
  equals(state.get('handler'), 'actionHandlerB', 'action handler should be actionHandlerB');
  equals(state.get('action'), 'bar', 'action should be bar');
});

test("check statechart4 action handling", function() {
  var root = statechart4.get('rootState'),
      stateA = statechart4.getState('a'),
      stateB = statechart4.getState('b');
  
  root.reset(); stateA.reset(); stateB.reset();
  statechart4.sendAction('foo');
  equals(root.get('handler'), 'foo', 'root state action handler should be foo');
  equals(root.get('action'), null, 'root state action should be null');
  equals(stateA.get('handler'), null, 'state A action handler should be null');
  equals(stateA.get('action'), null, 'state A action should be null');
  equals(stateB.get('handler'), null, 'state B action handler should be null');
  equals(stateB.get('action'), null, 'state B action should be null');
  
  root.reset(); stateA.reset(); stateB.reset();
  statechart4.sendAction('yes');
  equals(root.get('handler'), 'actionHandlerRoot', 'root state action handler should be actionHandlerRoot');
  equals(root.get('action'), 'yes', 'root state action should be yes');
  equals(stateA.get('handler'), null, 'state A action handler should be null');
  equals(stateA.get('action'), null, 'state A action should be null');
  equals(stateB.get('handler'), null, 'state B action handler should be null');
  equals(stateB.get('action'), null, 'state B action should be null');
  
  root.reset(); stateA.reset(); stateB.reset();
  statechart4.sendAction('xyz');
  equals(root.get('handler'), 'unknownAction', 'root state action handler should be unknownAction');
  equals(root.get('action'), 'xyz', 'root state action should be xyz');
  equals(stateA.get('handler'), null, 'state A action handler should be null');
  equals(stateA.get('action'), null, 'state A action should be null');
  equals(stateB.get('handler'), null, 'state B action handler should be null');
  equals(stateB.get('action'), null, 'state B action should be null');
  
  root.reset(); stateA.reset(); stateB.reset();
  statechart4.sendAction('bar');
  equals(root.get('handler'), null, 'root state action handler should be null');
  equals(root.get('action'), null, 'root state action should be null');
  equals(stateA.get('handler'), 'bar', 'state A action handler should be bar');
  equals(stateA.get('action'), null, 'state A action should be null');
  equals(stateB.get('handler'), null, 'state B action handler should be null');
  equals(stateB.get('action'), null, 'state B action should be null');
  
  root.reset(); stateA.reset(); stateB.reset();
  statechart4.sendAction('canuck');
  equals(root.get('handler'), null, 'root state action handler should be null');
  equals(root.get('action'), null, 'root state action should be null');
  equals(stateA.get('handler'), 'actionHandlerA', 'state A action handler should be actionHandlerA');
  equals(stateA.get('action'), 'canuck', 'state A action should be canuck');
  equals(stateB.get('handler'), null, 'state B action handler should be null');
  equals(stateB.get('action'), null, 'state B action should be null');
  
  root.reset(); stateA.reset(); stateB.reset();
  statechart4.sendAction('cat');
  equals(root.get('handler'), null, 'root state action handler should be null');
  equals(root.get('action'), null, 'root state action should be null');
  equals(stateA.get('handler'), null, 'state A action handler should be null');
  equals(stateA.get('action'), null, 'state A action should be null');
  equals(stateB.get('handler'), 'cat', 'state B action handler should be cat');
  equals(stateB.get('action'), null, 'state B action should be null');
  
  root.reset(); stateA.reset(); stateB.reset();
  statechart4.sendAction('orange');
  equals(root.get('handler'), null, 'root state action handler should be null');
  equals(root.get('action'), null, 'root state action should be null');
  equals(stateA.get('handler'), null, 'state A action handler should be null');
  equals(stateA.get('action'), null, 'state A action should be null');
  equals(stateB.get('handler'), 'actionHandlerB', 'state B action handler should be actionHandlerB');
  equals(stateB.get('action'), 'orange', 'state B action should be orange');
});