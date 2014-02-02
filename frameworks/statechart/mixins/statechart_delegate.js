// ==========================================================================
// Project:   SC.Statechart - A Statechart Framework for SproutCore
// Copyright: ©2010, 2011 Michael Cohen, and contributors.
//            Portions @2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

/*globals SC */

/**
  @class
  
  Apply to objects that are to represent a delegate for a SC.Statechart object.
  When assigned to a statechart, the statechart and its associated states will
  use the delegate in order to make various decisions.
  
  @see SC.Statechart#delegate 

  @author Michael Cohen
*/

SC.StatechartDelegate = /** @scope SC.StatechartDelegate.prototype */ {
  
  // Walk like a duck
  isStatechartDelegate: YES,
  
  // Route Handling Management
  
  /**
    Called to update the application's current location. 
    
    The location provided is dependent upon the application's underlying
    routing mechanism.
    
    @param {SC.StatechartManager} statechart the statechart
    @param {String|Hash} location the new location 
    @param {SC.State} state the state requesting the location update
  */
  statechartUpdateLocationForState: function(statechart, location, state) {
    SC.routes.set('location', location);
  },
  
  /**
    Called to acquire the application's current location.
    
    @param {SC.StatechartManager} statechart the statechart
    @param {SC.State} state the state requesting the location
    @returns {String} the location 
  */
  statechartAcquireLocationForState: function(statechart, state) {
    return SC.routes.get('location');
  },
  
  /**
    Used to bind a state's handler to a route. When the application's location
    matches the given route, the state's handler is to be invoked. 
    
    The statechart and states remain completely independent of how the underlying 
    routing mechanism works thereby providing a looser coupling and more flexibility 
    in how routing is to work. Given this flexiblity, it is important that a route
    assigned (using the {@link SC.State#representRoute} property) to a state strictly 
    conforms to the underlying routing mechanism's criteria in order for the given 
    handler to be properly invoked.
    
    By default the {@link SC.routes} mechanism is used to bind the state's handler with
    the given route.
    
    @param {SC.StatechartManager} statechart the statechart
    @param {SC.State} state the state to bind the route to
    @param {String|Hash} route the route that is to be bound to the state
    @param {Function|String} handler the method on the state to be invoked when the route
      gets triggered.
      
    @see SC.State#representRoute
  */
  statechartBindStateToRoute: function(statechart, state, route, handler) {
    SC.routes.add(route, state, handler);
  },
  
  /**
    Invoked by a state that has been notified to handle a triggered route. The state
    asks if it should go ahead an actually handle the triggered route. If no then
    the state's handler will no longer continue and finish by calling this delegate's
    `statechartStateCancelledHandlingTriggeredRoute` method. If yes then the state will 
    continue with handling the triggered route.
    
    By default `YES` is returned.
    
    @param {SC.StatechartManager} statechart the statechart
    @param {SC.State} state the state making the request
    @param {SC.StateRouteHandlerContext} routeContext contextual information about the handling 
      of a route
    
    @see #statechartStateCancelledHandlingTriggeredRoute
  */
  statechartShouldStateHandleTriggeredRoute: function(statechart, state, context) {
    return YES;
  },
  
  /**
    Invoked by a state that has been informed by the delegate to not handle a triggered route.
    Used this for any additional clean up or processing that you may wish to perform.
    
    @param {SC.StatechartManager} statechart the statechart
    @param {SC.State} state the state making the request
    @param {SC.StateRouteHandlerContext} routeContext contextual information about the handling 
      of a route
    
    @see #statechartShouldStateHandleTriggeredRoute
  */
  statechartStateCancelledHandlingTriggeredRoute: function(statechart, state, context) { }
  
};