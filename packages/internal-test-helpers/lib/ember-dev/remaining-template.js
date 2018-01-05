/* globals QUnit */

var RemainingTemplateAssert = function(env){
  this.env = env;
};

RemainingTemplateAssert.prototype = {
  reset: function(){},
  inject: function(){},
  assert: function(){
    if (this.env.Ember && this.env.Ember.TEMPLATES) {
      var templateNames = [], name;
      for (name in this.env.Ember.TEMPLATES) {
        if (this.env.Ember.TEMPLATES[name] != null) {
          templateNames.push(name);
        }
      }

      if (templateNames.length > 0) {
        QUnit.deepEqual(templateNames, [], "Ember.TEMPLATES should be empty");
        this.env.Ember.TEMPLATES = {};
      }
    }
  },
  restore: function(){}
};

export default RemainingTemplateAssert;
