// ==========================================================================
// Project:   Ember - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

require("ember-views/views/states/default");
require("ember-views/views/states/pre_render");
require("ember-views/views/states/in_buffer");
require("ember-views/views/states/in_dom");
require("ember-views/views/states/destroyed");

var get = Ember.get, set = Ember.set, getPath = Ember.getPath, fmt = Ember.String.fmt;

/** @private */
Ember.View.RenderStateManager = Ember.StateManager.extend({
  /** @private (nodoc) - overrides Ember.StateManager.send to allow for sending of multiple args*/
  send: function(){
    // arguments[0] is the event name
    // arguments[1] is the context
    // arguments[2..] are rest args
    var args = [].slice.call(arguments,0);
    args.splice(1, 0, get(this,'currentState'));
    return this.sendRecursively.apply(this, args);
  },
  
  /** @private (nodoc) - overrides Ember.StateManager.sendRecursively to allow for sending of multiple args*/
  sendRecursively: function(event, currentState, context) {
    // arguments[2..] are rest args that can be passed to actions
    var args = [].slice.call(arguments,0);
    var log = this.enableLogging;
  
    var action = currentState[event];
  
    // Test to see if the action is a method that
    // can be invoked. Don't blindly check just for
    // existence, because it is possible the state
    // manager has a child state of the given name,
    // and we should still raise an exception in that
    // case.
    if (typeof action === 'function') {
      if (log) { console.log(fmt("STATEMANAGER: Sending event '%@' to state %@.", [event, get(currentState, 'path')])); }
      
      // remove event and currentState from the args
      // and move `this` to the first argument position.
      args.splice(0, 2, this);
      
      return action.apply(currentState, args);
    } else {
      var parentState = get(currentState, 'parentState');
      if (parentState) {
        // replace the currentState argument with the parentState
        args[1] = parentState;
        return this.sendRecursively.apply(this, args);
      } else if (get(this, 'errorOnUnhandledEvent')) {
        throw new Ember.Error(this.toString() + " could not respond to event " + event + " in state " + getPath(this, 'currentState.path') + ".");
      }
    }
  },
  initialState: '_default.preRender',
  '_default': Ember.View.states.DefaultState.create({
    preRender: Ember.View.states.PreRenderState.create(),
    hasElement: Ember.View.states.HasElementState.create({
      inDOM: Ember.View.states.InDomState.create()
    }),
    inBuffer: Ember.View.states.InBufferState.create(),
    destroyed: Ember.View.states.DestroyedState.create()
  })
});