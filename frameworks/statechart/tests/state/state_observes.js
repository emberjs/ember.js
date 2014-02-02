// ==========================================================================
// SC.State Unit Test
// ==========================================================================
/*globals SC obj1 obj2 obj3 */

window.obj1 = null;
window.obj2 = null;
window.obj3 = null;
var statechart1, statechart2, TestState;
var stateA, stateB, stateC, stateD;

module("SC.Statechart: stateObserves Tests", {
	
  setup: function() {

    obj1 = SC.Object.create({
      foo: 'abc'
    });
    
    obj2 = SC.Object.create({
      bar: 'xyz'
    });
    
    obj3 = SC.Object.create({
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
		
      stateA: TestState.design({
        
        testProp: null,
        
        testProp2: obj3,
        
        testPropChanged: function(target, key) {
          this.notifyStateObserveHandlerInvoked('testPropChanged', target, key);
        }.stateObserves('testProp'),
        
        testProp2Changed: function(target, key) {
          this.notifyStateObserveHandlerInvoked('testProp2Changed', target, key);
        }.stateObserves('.testProp2.mah'),
        
    	  fooChanged: function(target, key) {
          this.notifyStateObserveHandlerInvoked('fooChanged', target, key);
    		}.stateObserves('obj1.foo'),
    		
    		barChanged: function(target, key) {
    		  this.notifyStateObserveHandlerInvoked('barChanged', target, key);
    		}.stateObserves('obj2.bar')
        
      }),
      
      stateB: TestState.design()
		
    });
    
    stateA = statechart1.getState('stateA');
    stateB = statechart1.getState('stateB');
    
    statechart2 = SC.Statechart.create({
      
      autoInitStatechart: YES,
      
      initialState: 'stateC',
      
      stateC: TestState.design({
      
        mahChanged: function(target, key) {
          this.notifyStateObserveHandlerInvoked('mahChanged', target, key);
        }.stateObserves('obj1.foo', 'obj2.bar')
        
      }),
      
      stateD: TestState.design()
      
    });
    
    stateC = statechart2.getState('stateC');
    stateD = statechart2.getState('stateD');

  },
  
  teardown: function() {
    window.obj1 = undefined;
    window.obj2 = undefined;
    window.obj3 = undefined;
    statechart1 = statechart2 = null;
    stateA = stateB = stateC = stateD = null;
    TestState = null;
  }

});

test("check state observe handlers when obj1's foo is changed", function() {
  ok(!stateA.fooChangedInvoked, "state A's fooChanged should not be invoked");
  ok(!stateA.barChangedInvoked, "state A's barChanged should not be invoked");
  ok(!stateC.mahChangedInvoked, "state C's mahChanged should not be invoked");
  ok(obj1.hasObserverFor('foo'), "obj1 should have observers for property foo");
  
  obj1.set('foo', 100);
  
  ok(stateA.fooChangedInvoked, "state A's fooChanged should be invoked");
  equals(stateA.fooChangedInvoked.target, obj1, "target should be obj1");
  equals(stateA.fooChangedInvoked.key, 'foo', "key should be foo");
  
  ok(!stateA.barChangedInvoked, "state A's barChanged should not be invoked");
  
  ok(stateC.mahChangedInvoked, "state C's mahChanged should be invoked");
  equals(stateC.mahChangedInvoked.target, obj1, "target should be obj1");
  equals(stateC.mahChangedInvoked.key, 'foo', "key should be foo");
});

test("check state observe handlers when obj2's bar is changed", function() {
  ok(!stateA.fooChangedInvoked, "state A's fooChanged should not be invoked");
  ok(!stateA.barChangedInvoked, "state A's barChanged should not be invoked");
  ok(!stateC.mahChangedInvoked, "state C's mahChanged should not be invoked");
  ok(obj2.hasObserverFor('bar'), "obj2 should have observers for property bar");
  
  obj2.notifyPropertyChange('bar');
  
  ok(!stateA.fooChangedInvoked, "state A's fooChanged should not be invoked");
  
  ok(stateA.barChangedInvoked, "state A's barChanged should be invoked");
  equals(stateA.barChangedInvoked.target, obj2, "target should be obj2");
  equals(stateA.barChangedInvoked.key, 'bar', "key should be bar");
  
  ok(stateC.mahChangedInvoked, "state C's mahChanged should be invoked");
  equals(stateC.mahChangedInvoked.target, obj2, "target should be obj1");
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
  ok(!stateA.hasObserverFor('testProp2'), "state A should have observers for property testProp2");
  ok(stateA.get('testProp2').hasObserverFor('mah'), "state A's testProp2 should have observers for property mah");
  
  stateA.notifyPropertyChange('testProp2');
  
  ok(!stateA.testProp2ChangedInvoked, "state A's testProp2Changed should not be invoked");
  
  stateA.get('testProp2').notifyPropertyChange('mah');
  
  ok(stateA.testProp2ChangedInvoked, "state A's testProp2Changed should be invoked");
  equals(stateA.testProp2ChangedInvoked.target, obj3, "target should be obj3");
  equals(stateA.testProp2ChangedInvoked.key, 'mah', "key should be mah");
});

test("change current states and check state observe handlers when objs' property change", function() {
  ok(!stateA.fooChangedInvoked, "state A's fooChanged should not be invoked");
  ok(!stateA.barChangedInvoked, "state A's barChanged should not be invoked");
  ok(!stateA.testPropChangedInvoked, "state A's testPropChanged should not be invoked");
  ok(!stateA.testProp2ChangedInvoked, "state A's testProp2Changed should not be invoked");
  ok(!stateC.mahChangedInvoked, "state C's mahChanged should not be invoked");
  
  statechart1.gotoState('stateB');
  statechart2.gotoState('stateD');
  
  ok(!obj1.hasObserverFor('foo'), "obj1 should not have observers for property foo");
  ok(!obj2.hasObserverFor('bar'), "obj2 should not have observers for property bar");
  ok(!stateA.hasObserverFor('testProp'), "state A should not have observers for property testProp");
  ok(!stateA.get('testProp2').hasObserverFor('mah'), "state A's testProp2 should not have observers for property mah");
  
  obj1.notifyPropertyChange('foo');
  obj2.notifyPropertyChange('bar');
  stateA.notifyPropertyChange('testProp');
  stateA.get('testProp2').notifyPropertyChange('mah');
  
  ok(!stateA.fooChangedInvoked, "state A's fooChanged should not be invoked");
  ok(!stateA.barChangedInvoked, "state A's barChanged should not be invoked");
  ok(!stateA.testPropChangedInvoked, "state A's testPropChanged should not be invoked");
  ok(!stateA.testProp2ChangedInvoked, "state A's testProp2Changed should not be invoked");
  ok(!stateC.mahChangedInvoked, "state C's mahChanged should not be invoked");
  
  statechart1.gotoState('stateA');
  statechart2.gotoState('stateC');
  
  ok(obj1.hasObserverFor('foo'), "obj1 should have observers for property foo");
  ok(obj2.hasObserverFor('bar'), "obj2 should have observers for property bar");
  ok(stateA.hasObserverFor('testProp'), "state A should have observers for property testProp");
  ok(stateA.get('testProp2').hasObserverFor('mah'), "state A's testProp2 should not have observers for property mah");
  
  obj1.notifyPropertyChange('foo');
  obj2.notifyPropertyChange('bar');
  stateA.notifyPropertyChange('testProp');
  stateA.get('testProp2').notifyPropertyChange('mah');
  
  ok(stateA.fooChangedInvoked, "state A's fooChanged should be invoked");
  ok(stateA.barChangedInvoked, "state A's barChanged should be invoked");
  ok(stateA.testPropChangedInvoked, "state A's testPropChanged should be invoked");
  ok(stateA.testProp2ChangedInvoked, "state A's testProp2Changed should be invoked");
  ok(stateC.mahChangedInvoked, "state C's mahChanged should be invoked");
});

test("destroy statecharts and check that objs have not observers", function() {
  ok(obj1.hasObserverFor('foo'), "obj1 should have observers for property foo");
  ok(obj2.hasObserverFor('bar'), "obj2 should have observers for property bar");
  ok(stateA.hasObserverFor('testProp'), "state A should have observers for property testProp");
  ok(stateA.get('testProp2').hasObserverFor('mah'), "state A's testProp2 should have observers for property mah");
  
  statechart1.destroy();
  statechart2.destroy();
  
  ok(!obj1.hasObserverFor('foo'), "obj1 should not have observers for property foo");
  ok(!obj2.hasObserverFor('bar'), "obj2 should not have observers for property bar");
  ok(!stateA.hasObserverFor('testProp'), "state A should not have observers for property testProp");
  ok(!stateA.get('testProp2').hasObserverFor('mah'), "state A's testProp2 should not have observers for property mah");
});

