module("Ember.View - context property");

test("setting a controller on a inner view should change it context", function() {
  var App = {};
  var a = { name: 'a' };
  var b = { name: 'b' };

  var InnerView = Ember.View.extend({
    render: function(buffer) {
      buffer.push('inner: ');
      buffer.push(this.getPath('context.name'));
    }
  });

  var innerView = null;
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
    innerView = InnerView.create();
    innerView.set('controller', b);
    middleView.set('currentView', innerView);
  });

  // assert
  equal(outerView.get('context'), a, 'outer context correct');
  equal(middleView.get('context'), a, 'middle context correct');
  equal(innerView.get('context'), b, 'inner context correct');
});

