module("Ember.View - controller property");

test("controller property should be inherited from nearest ancestor with controller", function() {
  var grandparent = Ember.ContainerView.create();
  var parent = Ember.ContainerView.create();
  var child = Ember.ContainerView.create();
  var grandchild = Ember.ContainerView.create();

  var grandparentController = {};
  var parentController = {};

  Ember.run(function() {
    grandparent.set('controller', grandparentController);
    parent.set('controller', parentController);

    grandparent.pushObject(parent);
    parent.pushObject(child);
  });

  strictEqual(grandparent.get('controller'), grandparentController);
  strictEqual(parent.get('controller'), parentController);
  strictEqual(child.get('controller'), parentController);
  strictEqual(grandchild.get('controller'), null);

  Ember.run(function() {
    child.pushObject(grandchild);
  });

  strictEqual(grandchild.get('controller'), parentController);

  var newController = {};
  Ember.run(function() {
    parent.set('controller', newController);
  });

  strictEqual(parent.get('controller'), newController);
  strictEqual(child.get('controller'), newController);
  strictEqual(grandchild.get('controller'), newController);

  Ember.run(function() {
    grandparent.destroy();
    parent.destroy();
    child.destroy();
    grandchild.destroy();
  });
});
