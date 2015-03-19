import run from "ember-metal/run_loop";

import EmberView from "ember-views/views/view";
import ContainerView from "ember-views/views/container_view";

QUnit.module("EmberView - context property");

QUnit.skip("setting a controller on an inner view should change it context", function() {
  var App = {};
  var a = { name: 'a' };
  var b = { name: 'b' };

  var innerView = EmberView.create();
  var middleView = ContainerView.create();
  var outerView = App.outerView = ContainerView.create({
    controller: a
  });

  run(function() {
    outerView.appendTo('#qunit-fixture');
  });

  run(function () {
    outerView.set('currentView', middleView);
  });

  run(function () {
    innerView.set('controller', b);
    middleView.set('currentView', innerView);
  });

  // assert
  equal(outerView.get('context'), a, 'outer context correct');
  equal(middleView.get('context'), a, 'middle context correct');
  equal(innerView.get('context'), b, 'inner context correct');

  run(function() {
    innerView.destroy();
    middleView.destroy();
    outerView.destroy();
  });
});

