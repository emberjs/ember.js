// ==========================================================================
// SC.State Unit Test
// ==========================================================================
/*globals SC externalState1 externalState2 */

var state, params, context;

module("SC.StateRouteHandlerContext: retry Method Tests", {
  
  setup: function() { 
  
    params = { };
    
    state = SC.Object.create({

      info: {},

      handler: function(params) {
        this.info.handler = {
          params: params
        };
      }

    });
    
    context = SC.StateRouteHandlerContext.create({
      
      state: state,
      
      params: params
      
    });
    
  },
  
  teardown: function() { 
    params = state = context = null;
  }

});

test("Invoke retry with context's handler property assigned a function value", function() {

  context.set('handler', state.handler);
  context.retry();
  
  var info = state.info;
  
  ok(info.handler, "state's handler method was invoked");
  equals(info.handler.params, params, "state's handler was provided params");

});

test("Invoke retry with context's handler property assigned a string value", function() {

  context.set('handler', 'handler');
  context.retry();
  
  var info = state.info;
  
  ok(info.handler, "state's handler method was invoked");
  equals(info.handler.params, params, "state's handler was provided params");

});