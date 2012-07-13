module("Ember.View - context property");

if (Ember.VIEW_PRESERVES_CONTEXT) {
  test("setting a controller on a inner view should change it context", function() {
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
  });
} else {
  test("context defaults to current view", function() {
    var innerView = Ember.View.create();
    var middleView = Ember.ContainerView.create();
    var outerView = Ember.ContainerView.create();

    Ember.run(function() {
      outerView.appendTo('#qunit-fixture');
    });

    Ember.run(function () {
      outerView.set('currentView', middleView);
    });

    Ember.run(function () {
      middleView.set('currentView', innerView);
    });

    // assert
    equal(outerView.get('context'), outerView, 'outer context correct');
    equal(middleView.get('context'), middleView, 'middle context correct');
    equal(innerView.get('context'), innerView, 'inner context correct');
  });
}


