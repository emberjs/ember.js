module("Ember.TargetActionSupport");

test("it should not do anything if no target or action are specified", function() {
  expect(1);

  var obj = Ember.Object.create(Ember.TargetActionSupport);

  obj.triggerAction();

  ok(true, "no exception was thrown");
});

test("it should support actions specified as strings", function() {
  expect(1);

  var obj = Ember.Object.create(Ember.TargetActionSupport, {
    target: Ember.Object.create({
      anEvent: function() {
        ok(true, "anEvent method was called");
      }
    }),

    action: 'anEvent'
  });

  obj.triggerAction();
});

test("it should invoke the send() method on objects that implement it", function() {
  expect(1);

  var obj = Ember.Object.create(Ember.TargetActionSupport, {
    target: Ember.Object.create({
      send: function(evt) {
        equals(evt, 'anEvent', "send() method was invoked with correct event name");
      }
    }),

    action: 'anEvent'
  });

  obj.triggerAction();
});

test("it should find targets specified using a property path", function() {
  expect(1);

  window.Test = {};

  Test.targetObj = Ember.Object.create({
    anEvent: function() {
      ok(true, "anEvent method was called on global object");
    }
  });

  var myObj = Ember.Object.create(Ember.TargetActionSupport, {
    target: 'Test.targetObj',
    action: 'anEvent'
  });

  myObj.triggerAction();

  window.Test = undefined;
});

test('it should find top level targets defined as property path', function(){
  expect(1);

  window.TopLevelThing = Ember.Object.create({
    helloWorld: function() {
      ok(true, 'helloWorld called on the top level object');
   }
  });

  var myObj = Ember.Object.create(Ember.TargetActionSupport, {
    target: 'TopLevelThing',
    action: 'helloWorld'
  });

  myObj.triggerAction();

  window.TopLevelThing = undefined;

});

test('it should find Ember.Application as targets', function(){
  expect(1);

  window.MyApp = Ember.Application.create({
    helloWorld: function() {
      ok(true, 'helloWorld called on the application object');
   }
  });

  var myObj = Ember.Object.create(Ember.TargetActionSupport, {
    target: 'MyApp',
    action: 'helloWorld'
  });

  myObj.triggerAction();

  window.MyApp.destroy();
  window.MyApp = undefined;

});