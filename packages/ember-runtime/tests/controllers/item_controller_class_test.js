var lannisters, arrayController, controllerClass, otherControllerClass, container, itemControllerCount,
    tywin, jaime, cersei, tyrion,
    get = Ember.get;

module("Ember.ArrayController - itemController", {
  setup: function() {
    container = new Ember.Container();

    tywin = Ember.Object.create({ name: 'Tywin' });
    jaime = Ember.Object.create({ name: 'Jaime' });
    cersei = Ember.Object.create({ name: 'Cersei' });
    tyrion = Ember.Object.create({ name: 'Tyrion' });
    lannisters = Ember.A([ tywin, jaime, cersei ]);

    itemControllerCount = 0;
    controllerClass = Ember.ObjectController.extend({
      init: function() {
        ++itemControllerCount;
        this._super();
      },

      toString: function() {
        return "itemController for " + this.get('name');
      }
    });

    otherControllerClass = Ember.ObjectController.extend({
      toString: function() {
        return "otherItemController for " + this.get('name');
      }
    });

    container.register("controller", "Item", controllerClass);
    container.register("controller", "OtherItem", otherControllerClass);
  }
});

function createUnwrappedArrayController() {
  arrayController = Ember.ArrayController.create({
    container: container,
    content: lannisters
  });
}

function createArrayController() {
  arrayController = Ember.ArrayController.create({
    container: container,
    itemController: 'Item',
    content: lannisters
  });
}

function createDynamicArrayController() {
  arrayController = Ember.ArrayController.create({
    container: container,
    lookupItemController: function(object) {
      if ("Tywin" === object.get("name")) {
        return "Item";
      } else {
        return "OtherItem";
      }
    },
    content: lannisters
  });
}

test("when no `itemController` is set, `objectAtContent` returns objects directly", function() {
  createUnwrappedArrayController();

  strictEqual(arrayController.objectAtContent(1), jaime, "No controller is returned when itemController is not set");
});

test("when `itemController` is set, `objectAtContent` returns an instance of the controller", function() {
  createArrayController();

  var jaimeController = arrayController.objectAtContent(1);

  ok(controllerClass.detectInstance(jaimeController), "A controller is returned when itemController is set");
});


test("when `idx` is out of range, `objectAtContent` does not create a controller", function() {
  controllerClass.reopen({
    init: function() {
      ok(false, "Controllers should not be created when `idx` is out of range");
    }
  });

  createArrayController();
  strictEqual(arrayController.objectAtContent(50), undefined, "no controllers are created for out of range indexes");
});

test("when the underlying object is null, a controller is still returned", function() {
  createArrayController();
  arrayController.unshiftObject(null);
  var firstController = arrayController.objectAtContent(0);
  ok(controllerClass.detectInstance(firstController), "A controller is still created for null objects");
});

test("the target of item controllers is the parent controller", function() {
  createArrayController();

  var jaimeController = arrayController.objectAtContent(1);

  equal(jaimeController.get('target'), arrayController, "Item controllers' targets are their parent controller");
});

test("when the underlying object has not changed, `objectAtContent` always returns the same instance", function() {
  createArrayController();

  strictEqual(arrayController.objectAtContent(1), arrayController.objectAtContent(1), "Controller instances are reused");
});

test("when the index changes, `objectAtContent` still returns the same instance", function() {
  createArrayController();
  var jaimeController = arrayController.objectAtContent(1);
  arrayController.unshiftObject(tyrion);

  strictEqual(arrayController.objectAtContent(2), jaimeController, "Controller instances are reused");
});

test("when the underlying array changes, old subcontainers are destroyed", function() {
  createArrayController();
  // cause some controllers to be instantiated
  arrayController.objectAtContent(1);
  arrayController.objectAtContent(2);

  // Not a public API; just checking for cleanup
  var subContainers = get(arrayController, 'subContainers'),
      jaimeContainer = subContainers[1],
      cerseiContainer = subContainers[2];

  equal(!!jaimeContainer.isDestroyed, false, "precond - nobody is destroyed yet");
  equal(!!!!cerseiContainer.isDestroyed, false, "precond - nobody is destroyed yet");

  arrayController.set('content', Ember.A());

  equal(!!jaimeContainer.isDestroyed, true, "old subcontainers are destroyed");
  equal(!!cerseiContainer.isDestroyed, true, "old subcontainers are destroyed");
});


test("item controllers are created lazily", function() {
  createArrayController();

  equal(itemControllerCount, 0, "precond - no item controllers yet");

  arrayController.objectAtContent(1);

  equal(itemControllerCount, 1, "item controllers are created lazily");
});

test("when items are removed from the arrayController, their respective subcontainers are destroyed", function() {
  createArrayController();
  var jaimeController = arrayController.objectAtContent(1),
      cerseiController = arrayController.objectAtContent(2),
      subContainers = get(arrayController, 'subContainers'),
      jaimeContainer = subContainers[1],
      cerseiContainer = subContainers[2];

  equal(!!cerseiContainer.isDestroyed, false, "precond - nobody is destroyed yet");
  equal(!!jaimeContainer.isDestroyed, false, "precond - nobody is destroyed yet");

  arrayController.removeObject(cerseiController);

  equal(!!cerseiContainer.isDestroyed, true, "Removed objects' containers are cleaned up");
  equal(!!jaimeContainer.isDestroyed, false, "Retained objects' containers are not cleaned up");
});

test("one cannot remove wrapped content directly when specifying `itemController`", function() {
  createArrayController();
  var jaimeController = arrayController.objectAtContent(1),
      cerseiController = arrayController.objectAtContent(2);

  equal(arrayController.get('length'), 3, "precondition - array is in initial state");
  arrayController.removeObject(cersei);

  equal(arrayController.get('length'), 3, "cannot remove wrapped objects directly");

  arrayController.removeObject(cerseiController);
  equal(arrayController.get('length'), 2, "can remove wrapper objects");
});

test("when items are removed from the underlying array, their respective subcontainers are destroyed", function() {
  createArrayController();
  var jaimeController = arrayController.objectAtContent(1),
      cerseiController = arrayController.objectAtContent(2),
      subContainers = get(arrayController, 'subContainers'),
      jaimeContainer = subContainers[1],
      cerseiContainer = subContainers[2];

  equal(!!jaimeContainer.isDestroyed, false, "precond - nobody is destroyed yet");
  equal(!!cerseiContainer.isDestroyed, false, "precond - nobody is destroyed yet");

  lannisters.removeObject(cersei); // if only it were that easy

  equal(!!jaimeContainer.isDestroyed, false, "Retained objects' containers are not cleaned up");
  equal(!!cerseiContainer.isDestroyed, true, "Removed objects' containers are cleaned up");
});

test("`itemController` can be dynamic by overwriting `lookupItemController`", function() {
  createDynamicArrayController();

  var tywinController = arrayController.objectAtContent(0),
      jaimeController = arrayController.objectAtContent(1);

  ok(controllerClass.detectInstance(tywinController), "lookupItemController can return different classes for different objects");
  ok(otherControllerClass.detectInstance(jaimeController), "lookupItemController can return different classes for different objects");
});

test("if `lookupItemController` returns a string, it must be resolvable by the container", function() {
  arrayController = Ember.ArrayController.create({
    container: container,
    lookupItemController: function(object) {
      return "NonExistant";
    },
    content: lannisters
  });

  throws(function() {
      arrayController.objectAtContent(1);
    },
    /NonExistant/,
    "`lookupItemController` must return either null or a valid controller name");
});

test("array observers can invoke `objectAt` without overwriting existing item controllers", function() {
  createArrayController();

  var tywinController = arrayController.objectAtContent(0),
      arrayObserverCalled = false;

  arrayController.reopen({
    lannistersWillChange: Ember.K,
    lannistersDidChange: function(_, idx, removedAmt, addedAmt) {
      arrayObserverCalled = true;
      equal(this.objectAt(idx).get('name'), "Tyrion", "Array observers get the right object via `objectAt`");
    }
  });
  arrayController.addArrayObserver(arrayController, {
    willChange: 'lannistersWillChange',
    didChange: 'lannistersDidChange'
  });

  Ember.run(function() {
    lannisters.unshiftObject(tyrion);
  });

  equal(arrayObserverCalled, true, "Array observers are called normally");
  equal(tywinController.get('name'), "Tywin", "Array observers calling `objectAt` does not overwrite existing controllers' content");
});

