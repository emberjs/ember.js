module("Ember.Controller");


test("should respond to events defined in its prototype", function() {
  var controller = Ember.Controller.extend({
    actionFired: false,
    myAction: function(){
      this.set('actionFired', true);
    }
  }).create();

  controller.send('myAction');
  equal(controller.get('actionFired'), true, "action fired");
});
