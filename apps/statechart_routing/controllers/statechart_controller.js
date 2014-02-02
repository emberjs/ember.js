/*globals Test */

Test.statechartController = SC.Object.create(SC.StatechartDelegate, {
  
  lastRouteContext: null,
  
  statechartShouldStateHandleTriggeredRoute: function(statechart, state, context) {
    return Test.loginController.get('loggedIn');
  },
  
  statechartStateCancelledHandlingTriggeredRoute: function(statechart, state, context) {
    this.set('lastRouteContext', context);
    SC.routes.set('location', null);
    statechart.gotoState('loggedOutState');
  }
  
});