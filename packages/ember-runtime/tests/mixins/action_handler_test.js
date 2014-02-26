test("passing a function for the actions hash triggers an assertion", function() {
  expect(1);

  var controller = Ember.Controller.extend({
    actions: function(){}
  });

  expectAssertion(function(){
    Ember.run(function(){
      controller.create();
    });
  });
});

test("can use targetObject if target is not present in the case of components - GH-4430", function(){

  expect(1);

  var targetObject = Ember.Controller.create();

  var Controller = Ember.Controller.extend({
    targetObject: Ember.computed('target', '_targetObject', function(){
      var target;
      if (target = this.get('target')){
        return target;
      }
      return this.get('_targetObject');
    })
  });

  var controller = Controller.create();

  Ember.run(function(){
    controller.set('_targetObject', targetObject);
  });

  targetObject.send = function(){
    ok(true, "Uses targetObject if target not present");
  };

  Ember.run(function(){
    controller.send('openADialog');
  });

});
