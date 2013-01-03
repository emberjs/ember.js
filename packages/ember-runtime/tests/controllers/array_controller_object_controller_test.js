var get = Ember.get, set = Ember.set;
var lannisters, container, tywin, jaime, cersei, tyrion;

var buildContainer = function(namespace) {
  var container = new Ember.Container();

  container.set = Ember.set;
  container.register('application', 'main', namespace, { instantiate: false });

  return container;
};

var createArrayController = function() {
  container.register('controller', 'list', Ember.ArrayController.extend({
    objectController: 'item',
    content: lannisters
  }));

  return container.lookup('controller:list');
};

var createDynamicArrayController = function() {
  container.register('controller', 'list', Ember.ArrayController.extend({
    objectControllerAt: function(idx, object) {
      if ("Tywin" === object.get("name")) {
        return this.objectControllerFor('item', object);
      } else {
        return this.objectControllerFor('otherItem', object);
      }
    },
    content: lannisters
  }));

  return container.lookup('controller:list');
};

module("Ember.ArrayController - objectController", {
  setup: function() {
    tywin = Ember.Object.create({ name: 'Tywin' });
    jaime = Ember.Object.create({ name: 'Jaime' });
    cersei = Ember.Object.create({ name: 'Cersei' });
    tyrion = Ember.Object.create({ name: 'Tyrion' });
    lannisters = Ember.A([ tywin, jaime, cersei ]);

    var namespace = Ember.Namespace.create();
    container = buildContainer(namespace);

    container.register('controller', 'item', Ember.ObjectController.extend({
      toString: function() {
        return "itemController for " + this.get('name');
      }
    }));
    container.register('controller', 'otherItem', Ember.ObjectController.extend({
      toString: function() {
        return "otherItemController for " + this.get('name');
      }
    }));
  },
  teardown: function() {
    Ember.run(function() {
      if (container) {
        container.destroy();
      }
    });
  }
});

test("when no `objectController` is set, `objectAt` returns objects directly", function() {
  var arrayController = createArrayController(null);
  set(arrayController, 'objectController', null);

  strictEqual(arrayController.objectAt(1), jaime, "No controller is returned when objectController is not set");
});

test("when `objectController` is set, `objectAt` returns an instance of the controller", function() {
  var arrayController = createArrayController();
  var jaimeController = arrayController.objectAt(1);

  ok(Ember.ObjectController.detectInstance(jaimeController), "A controller is returned when objectController is set");
});

test("when `idx` is out of range, `objectAt` does not create a controller", function() {
  var arrayController = createArrayController();
  strictEqual(arrayController.objectAt(50), undefined);
});

test("when the underlying object is null we raise an error", function() {
  var arrayController = createArrayController();

  raises(function() {
    arrayController.unshiftObject(null);
  }, 'should raise an error if item is null');
});

test("the target of object controllers is the parent controller", function() {
  var arrayController = createArrayController();
  var jaimeController = arrayController.objectAtContent(1);

  equal(get(jaimeController, 'target'), arrayController, "Object Controllers' targets are their parent controller");
});

test("when the underlying object has not changed, `objectAt` always returns the same instance", function() {
  var arrayController = createArrayController();

  strictEqual(arrayController.objectAt(1), arrayController.objectAt(1), "Controller instances are reused");
});

test("when the index changes, `objectAt` still returns the same instance", function() {
  var arrayController = createArrayController();
  var jaimeController = arrayController.objectAt(1);
  arrayController.unshiftObject(tyrion);

  strictEqual(arrayController.objectAt(2), jaimeController, "Controller instances are reused");
});

test("when the controller is cleared, references to controllers for removed items are released", function() {
  var arrayController = createArrayController();
  // cause some controllers to be instantiated
  arrayController.objectAt(1);
  arrayController.objectAt(2);

  arrayController.clear();
  var containers = get(arrayController, '_containers');

  ok(!containers.has(tywin), "Old controllers should be cleaned up");
  ok(!containers.has(jaime), "Old controllers should be cleaned up");
  ok(!containers.has(cersei), "Old controllers should be cleaned up");
});

test("when the underlying array is cleared, references to controllers for removed items are released", function() {
  var arrayController = createArrayController();
  // cause some controllers to be instantiated
  arrayController.objectAt(1);
  arrayController.objectAt(2);

  get(arrayController, 'content').clear();
  var containers = get(arrayController, '_containers');

  ok(!containers.has(tywin), "Old controllers should be cleaned up");
  ok(!containers.has(jaime), "Old controllers should be cleaned up");
  ok(!containers.has(cersei), "Old controllers should be cleaned up");
});

test("when the underlying array changes, references to controllers for removed items are released", function() {
  var arrayController = createArrayController();
  // cause some controllers to be instantiated
  arrayController.objectAt(1);
  arrayController.objectAt(2);

  set(arrayController, 'content', Ember.A());
  var containers = get(arrayController, '_containers');

  ok(!containers.has(tywin), "Old controllers should be cleaned up");
  ok(!containers.has(jaime), "Old controllers should be cleaned up");
  ok(!containers.has(cersei), "Old controllers should be cleaned up");
});

test("item controllers are created lazily", function() {
  var arrayController = createArrayController();

  var jaimeController = arrayController.objectAt(1);

  var containers = get(arrayController, '_containers');

  ok(containers.has(jaime), "item controllers are created lazily");
  ok(!containers.has(cersei), "item controllers are created lazily");
});

test("when items are removed from the arrayController, references to controllers for removed items are released", function() {
  var arrayController = createArrayController(),
      jaimeController = arrayController.objectAt(1),
      cerseiController = arrayController.objectAt(2);

  arrayController.removeObject(cersei);

  var containers = get(arrayController, '_containers');

  ok(containers.has(jaime), "Retained objects should not have their controllers cleaned up");
  ok(containers.has(cersei), "Removed objects should have their controllers cleaned up");
});

test("when items are removed from the underlying array, references to controllers for removed items are released", function() {
  var arrayController = createArrayController(),
      jaimeController = arrayController.objectAt(1),
      cerseiController = arrayController.objectAt(2);

  lannisters.removeObject(get(cersei, 'content'));

  var containers = get(arrayController, '_containers');

  ok(containers.has(jaime), "Retained objects should not have their controllers cleaned up");
  ok(containers.has(cersei), "Removed objects should have their controllers cleaned up");
});

test("`objectController` can be dynamic by overwriting `objectControllerAt`", function() {
  var arrayController = createDynamicArrayController(),
      tywinController = arrayController.objectAt(0),
      jaimeController = arrayController.objectAt(1);

  ok(tywinController.toString().match(/Tywin/), "objectControllerAt can return different classes for different objects");
  ok(jaimeController.toString().match(/Jaime/), "objectControllerAt can return different classes for different objects");
});
