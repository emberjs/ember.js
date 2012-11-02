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

    grandparent.get('childViews').pushObject(parent);
    parent.get('childViews').pushObject(child);

    strictEqual(grandparent.get('controller'), grandparentController);
    strictEqual(parent.get('controller'), parentController);
    strictEqual(child.get('controller'), parentController);
    strictEqual(grandchild.get('controller'), null);

    child.get('childViews').pushObject(grandchild);
    strictEqual(grandchild.get('controller'), parentController);

    var newController = {};
    parent.set('controller', newController);
    strictEqual(parent.get('controller'), newController);
    strictEqual(child.get('controller'), newController);
    strictEqual(grandchild.get('controller'), newController);
  });
});
