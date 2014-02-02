// ==========================================================================
// Project:   SC.Statechart - A Statechart Framework for SproutCore
// Copyright: ©2010, 2011 Michael Cohen, and contributors.
//            Portions @2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

/*globals SC */

/**
  Extends the JS Function object with the handleEvents method that
  will provide more advanced event handling capabilities when constructing
  your statechart's states.
  
  By default, when you add a method to a state, the state will react to 
  events that matches a method's name, like so:
  
  {{{
  
    state = SC.State.extend({
    
      // Will be invoked when a event named "foo" is sent to this state
      foo: function(event, sender, context) { ... }
    
    })
  
  }}}
  
  In some situations, it may be advantageous to use one method that can react to 
  multiple events instead of having multiple methods that essentially all do the
  same thing. In order to set a method to handle more than one event you use
  the handleEvents method which can be supplied a list of string and/or regular
  expressions. The following example demonstrates the use of handleEvents:
  
  {{{
  
    state = SC.State.extend({
    
      eventHandlerA: function(event, sender, context) {
      
      }.handleEvents('foo', 'bar'),
      
      eventHandlerB: function(event, sender, context) {
      
      }.handleEvents(/num\d/, 'decimal')
    
    })
  
  }}}
  
  Whenever events 'foo' and 'bar' are sent to the state, the method eventHandlerA
  will be invoked. When there is an event that matches the regular expression
  /num\d/ or the event is 'decimal' then eventHandlerB is invoked. In both 
  cases, the name of the event will be supplied to the event handler. 
  
  It should be noted that the use of regular expressions may impact performance
  since that statechart will not be able to fully optimize the event handling logic based
  on its use. Therefore the use of regular expression should be used sparingly. 
  
  @param {(String|RegExp)...} args
*/
Function.prototype.handleEvents = function() {
  this.isEventHandler = YES;
  this.events = arguments;
  return this;
};

/**
  Extends the JS Function object with the stateObserves method that will
  create a state observe handler on a given state object. 
  
  Use a stateObserves() instead of the common observes() method when you want a 
  state to observer changes to some property on the state itself or some other 
  object. 
  
  Any method on the state that has stateObserves is considered a state observe
  handler and behaves just like when you use observes() on a method, but with an
  important difference. When you apply stateObserves to a method on a state, those
  methods will be active *only* when the state is entered, otherwise those methods
  will be inactive. This removes the need for you having to explicitly call
  addObserver and removeObserver. As an example:
  
  {{{
  
    state = SC.State.extend({
    
      foo: null,
      
      user: null,
    
      observeHandlerA: function(target, key) {
        
      }.stateObserves('MyApp.someController.status'),
      
      observeHandlerB: function(target, key) {
      
      }.stateObserves('foo'),
      
      observeHandlerC: function(target, key) {
      
      }.stateObserves('.user.name', '.user.salary')
    
    })
  
  }}}
  
  Above, state has three state observe handlers: observeHandlerA, observeHandlerB, and
  observeHandlerC. When state is entered, the state will automatically add itself as
  an observer for all of its registered state observe handlers. Therefore when
  foo changes, observeHandlerB will be invoked, and when MyApp.someController's status
  changes then observeHandlerA will be invoked. The moment that state is exited then
  the state will automatically remove itself as an observer for all of its registered
  state observe handlers. Therefore none of the state observe handlers will be
  invoked until the next time the state is entered. 
  
  @param {String...} args
*/
Function.prototype.stateObserves = function() {
  this.isStateObserveHandler = YES;
  this.args = SC.A(arguments);
  return this;
};