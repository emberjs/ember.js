// ==========================================================================
// SC.State Unit Test
// ==========================================================================
/*globals SC Obj1 Obj2 Obj3 */

window.Obj1 = null;
window.Obj2 = null;
window.Obj3 = null;
var statechart1, statechart2, TestState;
var stateA, stateB, stateC, stateD;

module("SC.Statechart: stateObserves Tests", {
	
  setup: function() {

    Obj1 = SC.Object.create({
      foo: 'abc'
    });
    
    Obj2 = SC.Object.create({
      bar: 'xyz'
    });
    
    Obj3 = SC.Object.create({
      mah: 123
    });
    
    TestState = SC.State.extend({
      
      notifyStateObserveHandlerInvoked: function(handler, target, key) {
        this['%@Invoked'.fmt(handler)] = {
          target: target,
          key: key
        };
      }
      
    });

    statechart1 = SC.Statechart.create({
		
		  autoInitStatechart: YES,
		  
		  initialState: 'stateA',
		
      stateA: TestState.extend({
        
        testProp: null,
        
        testProp2: Obj3,
        
        testPropChanged: function(target, key) {
          this.notifyStateObserveHandlerInvoked('testPropChanged', target, key);
        }.stateObserves('testProp'),
        
        testProp2Changed: function(target, key) {
          this.notifyStateObserveHandlerInvoked('testProp2Changed', target, key);
        }.stateObserves('.testProp2.mah'),
        
    	  fooChanged: function(target, key) {
          this.notifyStateObserveHandlerInvoked('fooChanged', target, key);
    		}.stateObserves('Obj1.foo'),
    		
    		barChanged: function(target, key) {
    		  this.notifyStateObserveHandlerInvoked('barChanged', target, key);
    		}.stateObserves('Obj2.bar')
        
      }),
      
      stateB: TestState.extend()
		
    });
    
    stateA = statechart1.getState('stateA');
    stateB = statechart1.getState('stateB');
    
    statechart2 = SC.Statechart.create({
      
      autoInitStatechart: YES,
      
      initialState: 'stateC',
      
      stateC: TestState.extend({
      
        mahChanged: function(target, key) {
          this.notifyStateObserveHandlerInvoked('mahChanged', target, key);
        }.stateObserves('Obj1.foo', 'Obj2.bar')
        
      }),
      
      stateD: TestState.extend()
      
    });
    
    stateC = statechart2.getState('stateC');
    stateD = statechart2.getState('stateD');

  },
  
  teardown: function() {
    window.Obj1 = undefined;
    window.Obj2 = undefined;
    window.Obj3 = undefined;
    statechart1 = statechart2 = null;
    stateA = stateB = stateC = stateD = null;
    TestState = null;
  }

});

test("check state observe handlers when Obj1's foo is changed", function() {
  ok(!stateA.fooChangedInvoked, "state A's fooChanged should not be invoked");
  ok(!stateA.barChangedInvoked, "state A's barChanged should not be invoked");
  ok(!stateC.mahChangedInvoked, "state C's mahChanged should not be invoked");
  ok(Obj1.hasObserverFor('foo'), "Obj1 should have observers for property foo");
  
  Obj1.set('foo', 100);
  
  ok(stateA.fooChangedInvoked, "state A's fooChanged should be invoked");
  equals(stateA.fooChangedInvoked.target, Obj1, "target should be Obj1");
  equals(stateA.fooChangedInvoked.key, 'foo', "key should be foo");
  
  ok(!stateA.barChangedInvoked, "state A's barChanged should not be invoked");
  
  ok(stateC.mahChangedInvoked, "state C's mahChanged should be invoked");
  equals(stateC.mahChangedInvoked.target, Obj1, "target should be Obj1");
  equals(stateC.mahChangedInvoked.key, 'foo', "key should be foo");
});

test("check state observe handlers when Obj2's bar is changed", function() {
  ok(!stateA.fooChangedInvoked, "state A's fooChanged should not be invoked");
  ok(!stateA.barChangedInvoked, "state A's barChanged should not be invoked");
  ok(!stateC.mahChangedInvoked, "state C's mahChanged should not be invoked");
  ok(Obj2.hasObserverFor('bar'), "Obj2 should have observers for property bar");
  
  Obj2.notifyPropertyChange('bar');
  
  ok(!stateA.fooChangedInvoked, "state A's fooChanged should not be invoked");
  
  ok(stateA.barChangedInvoked, "state A's barChanged should be invoked");
  equals(stateA.barChangedInvoked.target, Obj2, "target should be Obj2");
  equals(stateA.barChangedInvoked.key, 'bar', "key should be bar");
  
  ok(stateC.mahChangedInvoked, "state C's mahChanged should be invoked");
  equals(stateC.mahChangedInvoked.target, Obj2, "target should be Obj1");
  equals(stateC.mahChangedInvoked.key, 'bar', "key should be bar");
});

test("check state observe handlers when state A's testProp is changed", function() {
  ok(!stateA.testPropChangedInvoked, "state A's testPropChanged should not be invoked");
  ok(stateA.hasObserverFor('testProp'), "state A should have observers for property testProp");
  
  stateA.notifyPropertyChange('testProp');
  
  ok(stateA.testPropChangedInvoked, "state A's testPropChanged should be invoked");
  equals(stateA.testPropChangedInvoked.target, stateA, "target should be stateA");
  equals(stateA.testPropChangedInvoked.key, 'testProp', "key should be testProp");
});

test("check state observe handlers when state A's testProp2.mah is changed", function() {
  ok(!stateA.testProp2ChangedInvoked, "state A's testProp2Changed should not be invoked");
  ok(!stateA.hasObserverFor('testProp2'), "state A should not have observers for property testProp2");
  ok(stateA.get('testProp2').hasObserverFor('mah'), "state A's testProp2 should have observers for property mah");
  
  stateA.notifyPropertyChange('testProp2');
  
  ok(!stateA.testProp2ChangedInvoked, "state A's testProp2Changed should not be invoked");
  
  stateA.get('testProp2').notifyPropertyChange('mah');
  
  ok(stateA.testProp2ChangedInvoked, "state A's testProp2Changed should be invoked");
  equals(stateA.testProp2ChangedInvoked.target, Obj3, "target should be Obj3");
  equals(stateA.testProp2ChangedInvoked.key, 'mah', "key should be mah");
});

test("change current states and check state observe handlers when Objs' property change", function() {
  ok(!stateA.fooChangedInvoked, "state A's fooChanged should not be invoked");
  ok(!stateA.barChangedInvoked, "state A's barChanged should not be invoked");
  ok(!stateA.testPropChangedInvoked, "state A's testPropChanged should not be invoked");
  ok(!stateA.testProp2ChangedInvoked, "state A's testProp2Changed should not be invoked");
  ok(!stateC.mahChangedInvoked, "state C's mahChanged should not be invoked");
  
  statechart1.gotoState('stateB');
  statechart2.gotoState('stateD');
  
  ok(!Obj1.hasObserverFor('foo'), "Obj1 should not have observers for property foo");
  ok(!Obj2.hasObserverFor('bar'), "Obj2 should not have observers for property bar");
  ok(!stateA.hasObserverFor('testProp'), "state A should not have observers for property testProp");
  ok(!stateA.get('testProp2').hasObserverFor('mah'), "state A's testProp2 should not have observers for property mah");
  
  Obj1.notifyPropertyChange('foo');
  Obj2.notifyPropertyChange('bar');
  stateA.notifyPropertyChange('testProp');
  stateA.get('testProp2').notifyPropertyChange('mah');
  
  ok(!stateA.fooChangedInvoked, "state A's fooChanged should not be invoked");
  ok(!stateA.barChangedInvoked, "state A's barChanged should not be invoked");
  ok(!stateA.testPropChangedInvoked, "state A's testPropChanged should not be invoked");
  ok(!stateA.testProp2ChangedInvoked, "state A's testProp2Changed should not be invoked");
  ok(!stateC.mahChangedInvoked, "state C's mahChanged should not be invoked");
  
  statechart1.gotoState('stateA');
  statechart2.gotoState('stateC');
  
  ok(Obj1.hasObserverFor('foo'), "Obj1 should have observers for property foo");
  ok(Obj2.hasObserverFor('bar'), "Obj2 should have observers for property bar");
  ok(stateA.hasObserverFor('testProp'), "state A should have observers for property testProp");
  ok(stateA.get('testProp2').hasObserverFor('mah'), "state A's testProp2 should not have observers for property mah");
  
  Obj1.notifyPropertyChange('foo');
  Obj2.notifyPropertyChange('bar');
  stateA.notifyPropertyChange('testProp');
  stateA.get('testProp2').notifyPropertyChange('mah');
  
  ok(stateA.fooChangedInvoked, "state A's fooChanged should be invoked");
  ok(stateA.barChangedInvoked, "state A's barChanged should be invoked");
  ok(stateA.testPropChangedInvoked, "state A's testPropChanged should be invoked");
  ok(stateA.testProp2ChangedInvoked, "state A's testProp2Changed should be invoked");
  ok(stateC.mahChangedInvoked, "state C's mahChanged should be invoked");
});

test("destroy statecharts and check that Objs have not observers", function() {
  ok(Obj1.hasObserverFor('foo'), "Obj1 should have observers for property foo");
  ok(Obj2.hasObserverFor('bar'), "Obj2 should have observers for property bar");
  ok(stateA.hasObserverFor('testProp'), "state A should have observers for property testProp");
  ok(stateA.get('testProp2').hasObserverFor('mah'), "state A's testProp2 should have observers for property mah");
  
  statechart1.destroy();
  statechart2.destroy();
  
  ok(!Obj1.hasObserverFor('foo'), "Obj1 should not have observers for property foo");
  ok(!Obj2.hasObserverFor('bar'), "Obj2 should not have observers for property bar");
  ok(!stateA.hasObserverFor('testProp'), "state A should not have observers for property testProp");
  ok(!stateA.get('testProp2').hasObserverFor('mah'), "state A's testProp2 should not have observers for property mah");
});

