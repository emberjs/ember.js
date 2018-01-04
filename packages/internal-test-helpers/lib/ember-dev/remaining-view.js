/* globals QUnit */

var RemainingViewAssert = function(env){
  this.env = env;
};

RemainingViewAssert.prototype = {
  reset: function(){},
  inject: function(){},
  assert: function(){
    if (this.env.Ember && this.env.Ember.View) {
      var viewIds = [], id;
      for (id in this.env.Ember.View.views) {
        if (this.env.Ember.View.views[id] != null) {
          viewIds.push(id);
        }
      }

      if (viewIds.length > 0) {
        QUnit.deepEqual(viewIds, [], "Ember.View.views should be empty");
        this.env.Ember.View.views = [];
      }
    }
  },
  restore: function(){}
};

export default RemainingViewAssert;
