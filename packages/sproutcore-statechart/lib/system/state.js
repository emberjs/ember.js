// ==========================================================================
// Project:   SC.Statechart - A Statechart Framework for SproutCore
// Copyright: ©2010, 2011 Michael Cohen, and contributors.
//            Portions @2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================
/*globals SC */

var get = SC.get, set = SC.set, getPath = SC.getPath, slice = Array.prototype.slice;

/**
  @class

  Represents a state within a statechart. 
  
  The statechart actively manages all states belonging to it. When a state is created, 
  it immediately registers itself with it parent states. 
  
  You do not create an instance of a state itself. The statechart manager will go through its 
  state heirarchy and create the states itself.

  For more information on using statecharts, see SC.StatechartManager.

  @author Michael Cohen
  @extends SC.Object
*/
SC.State = SC.Object.extend(
  /** @lends SC.State.prototype */ {

  /**
    The name of the state
    
    @property {String}
  */
  stateName: null,
   
  /**
    This state's parent state. Managed by the statechart
    
    @property {State}
  */
  parentState: null,
  
  /**
    This state's history state. Can be null. Managed by the statechart.
    
    @property {State}
  */
  historyState: null,
  
  /**
    Used to indicate the initial substate of this state to enter into. 
    
    You assign the value with the name of the state. Upon creation of 
    the state, the statechart will automatically change the property 
    to be a corresponding state object
    
    The substate is only to be this state's immediate substates. If
    no initial substate is assigned then this states initial substate
    will be an instance of an empty state (SC.EmptyState).
    
    Note that a statechart's root state must always have an explicity
    initial substate value assigned else an error will be thrown.
    
    @property {String|State}
  */
  initialSubstate: null,
  
  /**
    Used to indicates if this state's immediate substates are to be
    concurrent (orthogonal) to each other. 
    
    @property {Boolean}
  */
  substatesAreConcurrent: false,
  
  /**
    The immediate substates of this state. Managed by the statechart.
    
    @property {Array}
  */
  substates: null,
  
  /**
    The statechart that this state belongs to. Assigned by the owning
    statechart.
  
    @property {Statechart}
  */
  statechart: null,
  
  /**
    Indicates if this state has been initialized by the statechart
    
    @propety {Boolean}
  */
  stateIsInitialized: false,
  
  /**
    An array of this state's current substates. Managed by the statechart
    
    @propety {Array}
  */
  currentSubstates: null,
  
  /** 
    An array of this state's substates that are currently entered. Managed by
    the statechart.
    
    @property {Array}
  */
  enteredSubstates: null,
  
  /** 
    Indicates if this state should trace actions. Useful for debugging
    purposes. Managed by the statechart.
  
    @see SC.StatechartManager#trace
  
    @property {Boolean}
  */
  trace: function() {
    var key = getPath(this, 'statechart.statechartTraceKey');
    return getPath(this, 'statechart.%@'.fmt(key));
  }.property().cacheable(),
  
  /** 
    Indicates who the owner is of this state. If not set on the statechart
    then the owner is the statechart, otherwise it is the assigned
    object. Managed by the statechart.
    
    @see SC.StatechartManager#owner
  
    @property {SC.Object}
  */
  owner: function() {
    var sc = get(this, 'statechart'),
        key = sc ? get(sc, 'statechartOwnerKey') : null,
        owner = sc ? get(sc, key) : null;
    return owner ? owner : sc;
  }.property().cacheable(),
  
  init: function() {
    this._registeredActionHandlers = {};
    this._registeredStringActionHandlers = {};
    this._registeredRegExpActionHandlers = [];
    this._registeredStateObserveHandlers = {};

    // Setting up observes this way is faster then using .observes,
    // which adds a noticable increase in initialization time.
    var statechart = get(this, 'statechart'),
        ownerKey = statechart ? get(statechart, 'statechartOwnerKey') : null,
        traceKey = statechart ? get(statechart, 'statechartTraceKey') : null;

    if (statechart) {
      statechart.addObserver(ownerKey, this, '_statechartOwnerDidChange');
      statechart.addObserver(traceKey, this, '_statechartTraceDidChange');
    }
  },
  
  destroy: function() {
    var sc = get(this, 'statechart'),
        ownerKey = sc ? get(sc, 'statechartOwnerKey') : null,
        traceKey = sc ? get(sc, 'statechartTraceKey') : null;

    if (sc) {
      SC.removeObserver(sc, ownerKey, this, '_statechartOwnerDidChange');
      SC.removeObserver(sc, traceKey, this, '_statechartTraceDidChange');
    }

    var substates = get(this, 'substates');
    if (substates) {
      substates.forEach(function(state) {
        state.destroy();
      });
    }
    
    this._teardownAllStateObserveHandlers();

    set(this, 'substates', null);
    set(this, 'currentSubstates', null);
    set(this, 'enteredSubstates', null);
    set(this, 'parentState', null);
    set(this, 'historyState', null);
    set(this, 'initialSubstate', null);
    set(this, 'statechart', null);

    this.notifyPropertyChange('trace');
    this.notifyPropertyChange('owner');
    
    this._registeredActionHandlers = null;
    this._registeredStringActionHandlers = null;
    this._registeredRegExpActionHandlers = null;
    this._registeredStateObserveHandlers = null;

    this._super();
  },

  /**
    Used to initialize this state. To only be called by the owning statechart.
  */
  initState: function() {
    if (get(this, 'stateIsInitialized')) return;
    
    this._registerWithParentStates();
    
    var key = null, 
        value = null,
        state = null,
        substates = [],
        matchedInitialSubstate = NO,
        initialSubstate = get(this, 'initialSubstate'),
        substatesAreConcurrent = get(this, 'substatesAreConcurrent'),
        statechart = get(this, 'statechart'),
        i = 0,
        len = 0,
        valueIsFunc = NO,
        historyState = null;
            
    if (SC.HistoryState.detect(initialSubstate) && initialSubstate.isClass) {
      historyState = this.createHistoryState(initialSubstate, { parentState: this, statechart: statechart });
      set(this, 'initialSubstate', historyState);
      
      if (SC.none(get(historyState, 'defaultState'))) {
        this.stateLogError("Initial substate is invalid. History state requires the name of a default state to be set");
        set(this, 'initialSubstate', null);
        historyState = null;
      }
    }

    // Iterate through all this state's substates, if any, create them, and then initialize
    // them. This causes a recursive process.
    for (key in this) {
      value = this[key];
      valueIsFunc = SC.typeOf(value) === "function";

      if (valueIsFunc && value.isActionHandler) {
        this._registerActionHandler(key, value);
        continue;
      }
      
      if (valueIsFunc && value.isStateObserveHandler) {
        this._registerStateObserveHandler(key, value);
        continue;
      }
      
      if (valueIsFunc && value.statePlugin) {
        value = value.apply(this);
      }
      if (key === "a") { debugger; }
      if (SC.State.detect(value) && value.isClass && this[key] !== this.constructor) {
        state = this.createSubstate(value, { stateName: key, parentState: this, statechart: statechart });
        substates.push(state);
        this[key] = state;
        state.initState();
        if (key === initialSubstate) {
          set(this, 'initialSubstate', state);
          matchedInitialSubstate = YES;
        } else if (historyState && get(historyState, 'defaultState') === key) {
          set(historyState, 'defaultState', state);
          matchedInitialSubstate = YES;
        }
      }
    }
    
    if (!SC.none(initialSubstate) && !matchedInitialSubstate) {
      this.stateLogError("Unable to set initial substate %@ since it did not match any of state's %@ substates".fmt(initialSubstate, this));
    }
    
    if (substates.length === 0) {
      if (!SC.none(initialSubstate)) {
        this.stateLogWarning("Unable to make %@ an initial substate since state %@ has no substates".fmt(initialSubstate, this));
      }
    } 
    else if (substates.length > 0) {
      if (SC.none(initialSubstate) && !substatesAreConcurrent) {
        state = this.createEmptyState({ parentState: this, statechart: statechart });
        set(this, 'initialSubstate', state);
        substates.push(state);
        this[get(state, 'stateName')] = state;
        state.initState();
        this.stateLogWarning("state %@ has no initial substate defined. Will default to using an empty state as initial substate".fmt(this));
      } 
      else if (!SC.none(initialSubstate) && substatesAreConcurrent) {
        set(this, 'initialSubstate', null);
        this.stateLogWarning("Can not use %@ as initial substate since substates are all concurrent for state %@".fmt(initialSubstate, this));
      }
    }
    
    set(this, 'substates', substates);
    set(this, 'currentSubstates', []);
    set(this, 'enteredSubstates', []);
    set(this, 'stateIsInitialized', YES);
  },
  
  /**
    creates a substate for this state
  */
  createSubstate: function(state, attrs) {
    return state.create(attrs);
  },
  
  /**
    Create a history state for this state
  */
  createHistoryState: function(state, attrs) {
    return state.create(attrs);
  },
  
  /**
    Create an empty state for this state's initial substate
  */
  createEmptyState: function(attrs) {
    return SC.EmptyState.create(attrs);
  },
  
  /** @private 
  
    Registers action handlers with this state. Action handlers are special
    functions on the state that are intended to handle more than one action. This
    compared to basic functions that only respond to a single action that reflects
    the name of the method.
  */
  _registerActionHandler: function(name, handler) {
    var actions = handler.actions,
        action = null,
        len = actions.length,
        i = 0;
        
    this._registeredActionHandlers[name] = handler;
    
    for (; i < len; i += 1) {
      action = actions[i];
      
      if (SC.typeOf(action) === "string") {
        this._registeredStringActionHandlers[action] = {
          name: name,
          handler: handler
        };
        continue;
      }
      
      if (action instanceof RegExp) {
        this._registeredRegExpActionHandlers.push({
          name: name,
          handler: handler,
          regexp: action
        });
        continue;
      }
      
      this.stateLogError("Invalid action %@ for action handler %@ in state %@".fmt(action, name, this));
    }
  },
  
  /** @private 
  
    Registers state observe handlers with this state. State observe handlers behave just like
    when you apply observes() on a method but will only be active when the state is currently 
    entered, otherwise the handlers are inactive until the next time the state is entered
  */
  _registerStateObserveHandler: function(name, handler) {
    var i = 0, 
        args = handler.args, 
        len = args.length, 
        arg, validHandlers = YES;
    
    for (; i < len; i += 1) {
      arg = args[i];
      if (SC.typeOf(arg) !== "string" || SC.empty(arg)) { 
        this.stateLogError("Invalid argument %@ for state observe handler %@ in state %@".fmt(arg, name, this));
        validHandlers = NO;
      }
    }
    
    if (!validHandlers) return;
    
    this._registeredStateObserveHandlers[name] = handler.args;
  },
  
  /** @private
    Will traverse up through this state's parent states to register
    this state with them.
  */
  _registerWithParentStates: function() {
    this._registerSubstate(this);
    var parent = get(this, 'parentState');
    while (!SC.none(parent)) {
      parent._registerSubstate(this);
      parent = get(parent, 'parentState');
    }
  },
  
  /** @private
    Will register a given state as a substate of this state
  */
  _registerSubstate: function(state) {
    var path = state.pathRelativeTo(this);
    if (SC.none(path)) return; 
    
    // Create special private member variables to help
    // keep track of substates and access them.
    if (SC.none(this._registeredSubstatePaths)) {
      this._registeredSubstatePaths = {};
      this._registeredSubstates = [];
    }
    
    this._registeredSubstates.push(state);
    
    // Keep track of states based on their relative path
    // to this state. 
    var regPaths = this._registeredSubstatePaths;
    if (regPaths[get(state, 'stateName')] === undefined) {
      regPaths[get(state, 'stateName')] = { __ki_paths__: [] };
    }
    
    var paths = regPaths[get(state, 'stateName')];
    paths[path] = state;
    paths.__ki_paths__.push(path);
  },
  
  /**
    Will generate path for a given state that is relative to this state. It is
    required that the given state is a substate of this state.
    
    If the heirarchy of the given state to this state is the following:
    A > B > C, where A is this state and C is the given state, then the 
    relative path generated will be "B.C"
  */
  pathRelativeTo: function(state) {
    var path = get(this, 'stateName'),
        parent = get(this, 'parentState');
    
    while (!SC.none(parent) && parent !== state) {
      path = "%@.%@".fmt(get(parent, 'stateName'), path);
      parent = get(parent, 'parentState');
    }
    
    if (parent !== state && state !== this) {
      this.stateLogError('Can not generate relative path from %@ since it not a parent state of %@'.fmt(state, this));
      return null;
    }
    
    return path;
  },
  
  /**
    Used to get a substate of this state that matches a given value. 
    
    If the value is a state object, then the value will be returned if it is indeed 
    a substate of this state, otherwise null is returned. 
    
    If the given value is a string, then the string is assumed to be a path to a substate. 
    The value is then parsed to find the closes match. If there is no match then null 
    is returned. If there is more than one match then null is return and an error 
    is generated indicating ambiguity of the given value. 
    
    Note that when the value is a string, it is assumed to be a path relative to this 
    state; not the root state of the statechart.
  */
  getSubstate: function(value) {
    var valueType = SC.typeOf(value);
    
    // If the value is an object then just check if the value is 
    // a registered substate of this state, and if so return it. 
    if (value instanceof SC.State) {
      return this._registeredSubstates.indexOf(value) > -1 ? value : null;
    }
    
    if (valueType !== "string") {
      this.stateLogError("Can not find matching subtype. value must be an object or string: %@".fmt(value));
      return null;
    }
    
    // The value is a string. Therefore treat the value as a relative path to 
    // a substate of this state.
    
    // Extract that last part of the string. Ex. 'foo' => 'foo', 'foo.bar' => 'bar'
    var matches = value.match(/(^|\.)(\w+)$/);
    if (!matches) return null;

    // Get all the paths related to the matched value. If no paths then return null.
    var paths = this._registeredSubstatePaths[matches[2]];
    if (SC.none(paths)) return null;
    
    // Do a quick check to see if there is a path that exactly matches the given
    // value, and if so return the corresponding state
    var state = paths[value];
    if (!SC.none(state)) return state;
    
    // No exact match found. If the value given is a basic string with no ".", then check
    // if there is only one path containing that string. If so, return it. If there is
    // more than one path then it is ambiguous as to what state is trying to be reached.
    if (matches[1] === "") {
      if (paths.__ki_paths__.length === 1) {
        state = paths[paths.__ki_paths__[0]];
      } else if (paths.__ki_paths__.length > 1) {
        var msg = 'Can not find substate matching %@ in state %@. Ambiguous with the following: %@';
        this.stateLogError(msg.fmt(value, this, paths.__ki_paths__));
      }
    }
    
    return state;
  },
  
  /**
    Used to go to a state in the statechart either directly from this state if it is a current state,
    or from one of this state's current substates.
    
    Note that if the value given is a string, it will be assumed to be a path to a state. The path
    will be relative to the statechart's root state; not relative to this state.
    
    Method can be called in the following ways: 
    
        // With one argument
        gotoState(<state>)
      
        // With two arguments
        gotoState(<state>, <hash>)
    
    Where <state> is either a string or a SC.State object and <hash> is a regular JS hash object.
    
    @param state {SC.State|String} the state to go to
    @param context {Hash} Optional. context object that will be supplied to all states that are
           exited and entered during the state transition process
  */
  gotoState: function(state, context) {
    var fromState = null;
    
    if (get(this, 'isCurrentState')) {
      fromState = this;
    } else if (get(this, 'hasCurrentSubstates')) {
      fromState = get(this, 'currentSubstates')[0];
    }
    
    get(this, 'statechart').gotoState(state, fromState, context);
  },
  
  /**
    Used to go to a given state's history state in the statechart either directly from this state if it
    is a current state or from one of this state's current substates. 
    
    Note that if the value given is a string, it will be assumed to be a path to a state. The path
    will be relative to the statechart's root state; not relative to this state.
    
    Method can be called in the following ways:
    
        // With one argument
        gotoHistoryState(<state>)
    
        // With two arguments
        gotoHistoryState(<state>, <boolean | hash>)
    
        // With three arguments
        gotoHistoryState(<state>, <boolean>, <hash>)
    
    Where <state> is either a string or a SC.State object and <hash> is a regular JS hash object.
    
    @param state {SC.State|String} the state whose history state to go to
    @param recusive {Boolean} Optional. Indicates whether to follow history states recusively starting
           from the given state
    @param context {Hash} Optional. context object that will be supplied to all states that are exited
           entered during the state transition process
  */
  gotoHistoryState: function(state, recursive, context) {
    var fromState = null;
    
    if (get(this, 'isCurrentState')) {
      fromState = this;
    } else if (get(this, 'hasCurrentSubstates')) {
      fromState = get(this, 'currentSubstates')[0];
    }
    
    get(this, 'statechart').gotoHistoryState(state, fromState, recursive, context);
  },
  
  /**
    Resumes an active goto state transition process that has been suspended.
  */
  resumeGotoState: function() {
    get(this, 'statechart').resumeGotoState();
  },
  
  /**
    Used to check if a given state is a current substate of this state. Mainly used in cases
    when this state is a concurrent state.
    
    @param state {State|String} either a state object or the name of a state
    @returns {Boolean} true is the given state is a current substate, otherwise false is returned
  */
  stateIsCurrentSubstate: function(state) {
    if (SC.typeOf(state) === "string") state = get(this, 'statechart').getState(state);
    var current = get(this, 'currentSubstates');
    return !!current && current.indexOf(state) >= 0;
  }, 
  
  /**
    Used to check if a given state is a substate of this state that is currently entered. 
    
    @param state {State|String} either a state object of the name of a state
    @returns {Boolean} true if the given state is a entered substate, otherwise false is returned
  */
  stateIsEnteredSubstate: function(state) {
    if (SC.typeOf(state) === "string") state = get(this, 'statechart').getState(state);
    var entered = get(this, 'enteredSubstates');
    return !!entered && entered.indexOf(state) >= 0;
  },
  
  /**
    Indicates if this state is the root state of the statechart.
    
    @property {Boolean}
  */
  isRootState: function() {
    return getPath(this, 'statechart.rootState') === this;
  }.property(),
  
  /**
    Indicates if this state is a current state of the statechart.
    
    @property {Boolean} 
  */
  isCurrentState: function() {
    return this.stateIsCurrentSubstate(this);
  }.property('currentSubstates').cacheable(),
  
  /**
    Indicates if this state is a concurrent state
    
    @property {Boolean}
  */
  isConcurrentState: function() {
    return getPath(this, 'parentState.substatesAreConcurrent');
  }.property(),
  
  /**
    Indicates if this state is a currently entered state. 
    
    A state is currently entered if during a state transition process the
    state's enterState method was invoked, but only after its exitState method 
    was called, if at all.
  */
  isEnteredState: function() {
    return this.stateIsEnteredSubstate(this);
  }.property('enteredSubstates').cacheable(),
  
  /**
    Indicate if this state has any substates
    
    @propety {Boolean}
  */
  hasSubstates: function() {
    return getPath(this, 'substates.length') > 0;
  }.property('substates'),
  
  /**
    Indicates if this state has any current substates
  */
  hasCurrentSubstates: function() {
    var current = get(this, 'currentSubstates');
    return !!current && get(current, 'length') > 0;
  }.property('currentSubstates').cacheable(),
  
  /**
    Indicates if this state has any currently entered substates
  */
  hasEnteredSubstates: function() {
    var entered = get(this, 'enteredSubstates');
    return !!entered  && get(entered, 'length') > 0;
  }.property('enteredSubstates').cacheable(),
  
  /**
    Used to re-enter this state. Call this only when the state a current state of
    the statechart.  
  */
  reenter: function() {
    var statechart = get(this, 'statechart');
    if (get(this, 'isCurrentState')) {
      statechart.gotoState(this);
    } else {
       SC.Logger.error('Can not re-enter state %@ since it is not a current state in the statechart'.fmt(this));
    }
  },
  
  /**
    Called by the statechart to allow a state to try and handle the given action. If the
    action is handled by the state then YES is returned, otherwise NO.
    
    There is a particular order in how an action is handled by a state:
    
     1. Basic function whose name matches the action
     2. Registered action handler that is associated with an action represented as a string
     3. Registered action handler that is associated with actions matching a regular expression
     4. The unknownAction function
      
    Use of action handlers that are associated with actions matching a regular expression may
    incur a performance hit, so they should be used sparingly.
    
    The unknownAction function is only invoked if the state has it, otherwise it is skipped. Note that
    you should be careful when using unknownAction since it can be either abused or cause unexpected
    behavior.
    
    Example of a state using all four action handling techniques:
    
        SC.State.extend({
      
          // Basic function handling action 'foo'
          foo: function(arg1, arg2) { ... },
        
          // action handler that handles 'frozen' and 'canuck'
          actionHandlerA: function(action, arg1, arg2) {
            ...
          }.handleAction('frozen', 'canuck'),
        
          // action handler that handles actions matching the regular expression /num\d/
          //   ex. num1, num2
          actionHandlerB: function(action, arg1, arg2) {
            ...
          }.handleAction(/num\d/),
        
          // Handle any action that was not handled by some other
          // method on the state
          unknownAction: function(action, arg1, arg2) {
        
          }
      
        });
  */
  tryToHandleAction: function(action, arg1, arg2) {

    var trace = get(this, 'trace');

    // First check if the name of the action is the same as a registered action handler. If so,
    // then do not handle the action.
    if (this._registeredActionHandlers[action]) {
      this.stateLogWarning("state %@ can not handle action %@ since it is a registered action handler".fmt(this, action));
      return NO;
    }    
    
    if (this._registeredStateObserveHandlers[action]) {
      this.stateLogWarning("state %@ can not handle action %@ since it is a registered state observe handler".fmt(this, action));
      return NO;
    }
    
    // Now begin by trying a basic method on the state to respond to the action
    if (SC.typeOf(this[action]) === "function") {
      if (trace) this.stateLogTrace("will handle action %@".fmt(action));
      return (this[action](arg1, arg2) !== NO);
    }
    
    // Try an action handler that is associated with an action represented as a string
    var handler = this._registeredStringActionHandlers[action];
    if (handler) {
      if (trace) this.stateLogTrace("%@ will handle action %@".fmt(handler.name, action));
      return (handler.handler.call(this, action, arg1, arg2) !== NO);
    }
    
    // Try an action handler that is associated with actions matching a regular expression
    
    var len = this._registeredRegExpActionHandlers.length,
        i = 0;
        
    for (; i < len; i += 1) {
      handler = this._registeredRegExpActionHandlers[i];
      if (action.match(handler.regexp)) {
        if (trace) this.stateLogTrace("%@ will handle action %@".fmt(handler.name, action));
        return (handler.handler.call(this, action, arg1, arg2) !== NO);
      }
    }
    
    // Final attempt. If the state has an unknownAction function then invoke it to 
    // handle the action
    if (SC.typeOf(this['unknownAction']) === "function") {
      if (trace) this.stateLogTrace("unknownAction will handle action %@".fmt(action));
      return (this.unknownAction(action, arg1, arg2) !== NO);
    }
    
    // Nothing was able to handle the given action for this state
    return NO;
  },
  
  /**
    Called whenever this state is to be entered during a state transition process. This 
    is useful when you want the state to perform some initial set up procedures. 
    
    If when entering the state you want to perform some kind of asynchronous action, such
    as an animation or fetching remote data, then you need to return an asynchronous 
    action, which is done like so:
    
        enterState: function() {
          return this.performAsync('foo');
        }
    
    After returning an action to be performed asynchronously, the statechart will suspend
    the active state transition process. In order to resume the process, you must call
    this state's resumeGotoState method or the statechart's resumeGotoState. If no asynchronous 
    action is to be perform, then nothing needs to be returned.
    
    When the enterState method is called, an optional context value may be supplied if
    one was provided to the gotoState method.
    
    @param context {Hash} Optional value if one was supplied to gotoState when invoked
  */
  enterState: function(context) { },
  
  /**
    Notification called just before enterState is invoked. 
    
    Note: This is intended to be used by the owning statechart but it can be overridden if 
    you need to do something special.
    
    @see #enterState
  */
  stateWillBecomeEntered: function() { },
  
  /**
    Notification called just after enterState is invoked. 
    
    Note: This is intended to be used by the owning statechart but it can be overridden if 
    you need to do something special.
    
    @see #enterState
  */
  stateDidBecomeEntered: function() { 
    this._setupAllStateObserveHandlers();
  },
  
  /**
    Called whenever this state is to be exited during a state transition process. This is 
    useful when you want the state to peform some clean up procedures.
    
    If when exiting the state you want to perform some kind of asynchronous action, such
    as an animation or fetching remote data, then you need to return an asynchronous 
    action, which is done like so:
    
        exitState: function() {
          return this.performAsync('foo');
        }
    
    After returning an action to be performed asynchronously, the statechart will suspend
    the active state transition process. In order to resume the process, you must call
    this state's resumeGotoState method or the statechart's resumeGotoState. If no asynchronous 
    action is to be perform, then nothing needs to be returned.
    
    When the exitState method is called, an optional context value may be supplied if
    one was provided to the gotoState method.
    
    @param context {Hash} Optional value if one was supplied to gotoState when invoked
  */
  exitState: function(context) { },
  
  /**
    Notification called just before exitState is invoked. 
    
    Note: This is intended to be used by the owning statechart but it can be overridden 
    if you need to do something special.
    
    @see #exitState
  */
  stateWillBecomeExited: function() { 
    this._teardownAllStateObserveHandlers();
  },
  
  /**
    Notification called just after exitState is invoked. 
    
    Note: This is intended to be used by the owning statechart but it can be overridden 
    if you need to do something special.
    
    @see #exitState
  */
  stateDidBecomeExited: function() { },
  
  /** @private 
  
    Used to setup all the state observer handlers. Should be done when
    the state has been entered.
  */
  _setupAllStateObserveHandlers: function() {
    this._configureAllStateObserveHandlers('addObserver');
  },
  
  /** @private 
  
    Used to teardown all the state observer handlers. Should be done when
    the state is being exited.
  */
  _teardownAllStateObserveHandlers: function() {
    this._configureAllStateObserveHandlers('removeObserver');
  },
  
  /** @private 
  
    Primary method used to either add or remove this state as an observer
    based on all the state observe handlers that have been registered with
    this state.
    
    Note: The code to add and remove the state as an observer has been
    taken from the observerable mixin and made slightly more generic. However,
    having this code in two different places is not ideal, but for now this
    will have to do. In the future the code should be refactored so that
    there is one common function that both the observerable mixin and the 
    statechart framework use.  
  */
  _configureAllStateObserveHandlers: function(action) {
    var key, values, path, observer, i, tuple;

    for (key in this._registeredStateObserveHandlers) {
      values = this._registeredStateObserveHandlers[key];
      for (i = 0; i < values.length; i += 1) {
        path = values[i]; observer = key;
        tuple = SC.normalizeTuple(this, path);
        SC[action](tuple[0], tuple[1], this, observer);
      }
    }
  },
  
  /**
    Call when an asynchronous action need to be performed when either entering or exiting
    a state.
    
    @see enterState
    @see exitState
  */
  performAsync: function(func, arg1, arg2) {
    return SC.Async.perform(func, arg1, arg2);
  },
  
  /** @override
  
    Returns YES if this state can respond to the given action, otherwise
    NO is returned
  
    @param action {String} the value to check
    @returns {Boolean}
  */
  respondsToAction: function(action) {
    if (this._registeredActionHandlers[action]) return false;
    if (SC.typeOf(this[action]) === "function") return true;
    if (this._registeredStringActionHandlers[action]) return true;
    if (this._registeredStateObserveHandlers[action]) return false;
    
    var len = this._registeredRegExpActionHandlers.length,
        i = 0,
        handler;
        
    for (; i < len; i += 1) {
      handler = this._registeredRegExpActionHandlers[i];
      if (action.match(handler.regexp)) return true;
    }
    
    return SC.typeOf(this['unknownAction']) === "function";
  },
  
  /**
    Returns the path for this state relative to the statechart's
    root state. 
    
    The path is a dot-notation string representing the path from
    this state to the statechart's root state, but without including
    the root state in the path. For instance, if the name of this
    state if "foo" and the parent state's name is "bar" where bar's
    parent state is the root state, then the full path is "bar.foo"
  
    @property {String}
  */
  fullPath: function() {
    var root = getPath(this, 'statechart.rootState');
    if (!root) return get(this, 'stateName');
    return this.pathRelativeTo(root);
  }.property('stateName', 'parentState').cacheable(),
  
  // toString: function() {
    // var className = this._super();
    // return "%@<%@, %@>".fmt(className, get(this, 'fullPath'), SC.guidFor(this));
  // },
  
  /** @private */
  _statechartTraceDidChange: function() {
    this.notifyPropertyChange('trace');
  },
  
  /** @private */
  _statechartOwnerDidChange: function() {
    this.notifyPropertyChange('owner');
  },
  
  /** 
    Used to log a state trace message
  */
  stateLogTrace: function(msg) {
    var sc = get(this, 'statechart');
    sc.statechartLogTrace("%@: %@".fmt(this, msg));
  },

  /** 
    Used to log a state warning message
  */
  stateLogWarning: function(msg) {
    var sc = get(this, 'statechart');
    sc.statechartLogWarning(msg);
  },
  
  /** 
    Used to log a state error message
  */
  stateLogError: function(msg) {
    var sc = get(this, 'statechart');
    sc.statechartLogError(msg);
  }

});

/**
  Use this when you want to plug-in a state into a statechart. This is beneficial
  in cases where you split your statechart's states up into multiple files and
  don't want to fuss with the sc_require construct.
  
  Example:
  
      MyApp.statechart = SC.Statechart.create({
        rootState: SC.State.extend({
          initialSubstate: 'a',
          a: SC.State.plugin('path.to.a.state.class'),
          b: SC.State.plugin('path.to.another.state.class')
        })
      });
    
  You can also supply hashes the plugin feature in order to enhance a state or
  implement required functionality:

      SomeMixin = { ... };

      stateA: SC.State.plugin('path.to.state', SomeMixin, { ... })

  @param value {String} property path to a state class
  @param args {Hash,...} Optional. Hash objects to be added to the created state
*/
SC.State.plugin = function(value) {
  var args = slice.call(arguments); args.shift();
  var func = function() {
    var klass = SC.getPath(window, value);
    if (!klass) {
      console.error('SC.State.plugin: Unable to determine path %@'.fmt(value));
      return undefined;
    }
    if (!klass.isClass || (klass.isInstance && !(klass instanceof SC.State))) {
      console.error('SC.State.plugin: Unable to extend. %@ must be a class extending from SC.State'.fmt(value));
      return undefined;
    }
    return klass.extend.apply(klass, args);
  };
  func.statePlugin = YES;
  return func;
};
