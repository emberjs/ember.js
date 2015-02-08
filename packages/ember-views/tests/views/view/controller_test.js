import run from "ember-metal/run_loop";

import ContainerView from "ember-views/views/container_view";

QUnit.module("Ember.View - controller property");

QUnit.test("controller property should be inherited from nearest ancestor with controller", function() {
  var grandparent = ContainerView.create();
  var parent = ContainerView.create();
  var child = ContainerView.create();
  var grandchild = ContainerView.create();

  var grandparentController = {};
  var parentController = {};

  run(function() {
    grandparent.set('controller', grandparentController);
    parent.set('controller', parentController);

    grandparent.pushObject(parent);
    parent.pushObject(child);
  });

  strictEqual(grandparent.get('controller'), grandparentController);
  strictEqual(parent.get('controller'), parentController);
  strictEqual(child.get('controller'), parentController);
  strictEqual(grandchild.get('controller'), null);

  run(function() {
    child.pushObject(grandchild);
  });

  strictEqual(grandchild.get('controller'), parentController);

  var newController = {};
  run(function() {
    parent.set('controller', newController);
  });

  strictEqual(parent.get('controller'), newController);
  strictEqual(child.get('controller'), newController);
  strictEqual(grandchild.get('controller'), newController);

  run(function() {
    grandparent.destroy();
    parent.destroy();
    child.destroy();
    grandchild.destroy();
  });
});
