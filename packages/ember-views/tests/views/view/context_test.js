module("Ember.View - context property");

test("setting a controller on an inner view should change it context", function() {
  var App = {};
  var a = { name: 'a' };
  var b = { name: 'b' };

  var innerView = Ember.View.create();
  var middleView = Ember.ContainerView.create();
  var outerView = App.outerView = Ember.ContainerView.create({
    controller: a
  });

  Ember.run(function() {
    outerView.appendTo('#qunit-fixture');
  });

  Ember.run(function () {
    outerView.set('currentView', middleView);
  });

  Ember.run(function () {
    innerView.set('controller', b);
    middleView.set('currentView', innerView);
  });

  // assert
  equal(outerView.get('context'), a, 'outer context correct');
  equal(middleView.get('context'), a, 'middle context correct');
  equal(innerView.get('context'), b, 'inner context correct');

  Ember.run(function() {
    innerView.destroy();
    middleView.destroy();
    outerView.destroy();
  });
});

