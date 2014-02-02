// ==========================================================================
// SC.Statechart Unit Test
// ==========================================================================
/*globals SC */

var Obj, obj, async, func;

// ..........................................................
// CONTENT CHANGING
// 

module("SC.Async Tests", {
  setup: function() {
    Obj = SC.Object.extend({
      fooInvoked: NO,
      arg1: null,
      arg2: null,

      foo: function(arg1, arg2) {
        this.set('fooInvoked', YES);
        this.set('arg1', arg1);
        this.set('arg2', arg2);
      }
    });
  },
  
  teardown: function() {
    Obj = obj = async = func = null;
  }
});

test("test async - SC.Async.perform('foo')", function() {
  async = SC.Async.perform('foo');
  equals(SC.kindOf(async, SC.Async), YES);
  equals(async.get('func'), 'foo');
  equals(async.get('arg1'), null);
  equals(async.get('arg2'), null);
  
  obj = Obj.create();
  async.tryToPerform(obj);
  equals(obj.get('fooInvoked'), YES);
  equals(obj.get('arg1'), null);
  equals(obj.get('arg2'), null);
});

test("test async - SC.Async.perform('foo', 'hello', 'world')", function() {  
  async = SC.Async.perform('foo', 'hello', 'world');
  equals(async.get('func'), 'foo');
  equals(async.get('arg1'), 'hello');
  equals(async.get('arg2'), 'world');
  
  obj = Obj.create();
  async.tryToPerform(obj);
  equals(obj.get('fooInvoked'), YES);
  equals(obj.get('arg1'), 'hello');
  equals(obj.get('arg2'), 'world');
});

test("test async - SC.Async.perform(function() { ... })", function() {    
  func = function() { this.foo(); };
  async = SC.Async.perform(func);
  equals(async.get('func'), func);
  equals(async.get('arg1'), null);
  equals(async.get('arg2'), null);
  
  obj = Obj.create();
  async.tryToPerform(obj);
  equals(obj.get('fooInvoked'), YES);
  equals(obj.get('arg1'), null);
  equals(obj.get('arg2'), null);
});
  
test("test async - SC.Async.perform(function() { ... }, 'aaa', 'bbb')", function() {  
  func = function(arg1, arg2) { this.foo(arg1, arg2); };
  async = SC.Async.perform(func, 'aaa', 'bbb');
  equals(async.get('func'), func);
  equals(async.get('arg1'), 'aaa');
  equals(async.get('arg2'), 'bbb');
  
  obj = Obj.create();
  async.tryToPerform(obj);
  equals(obj.get('fooInvoked'), YES);
  equals(obj.get('arg1'), 'aaa');
  equals(obj.get('arg2'), 'bbb');
});

test("test async - SC.Async.perform('bar')", function() {  
  async = SC.Async.perform('bar');
  equals(async.get('func'), 'bar');
  
  obj = Obj.create();
  async.tryToPerform(obj);
  equals(obj.get('fooInvoked'), NO);
});