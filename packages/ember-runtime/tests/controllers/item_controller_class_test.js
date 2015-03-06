import Ember from "ember-metal/core";
import {guidFor} from "ember-metal/utils";
import run from "ember-metal/run_loop";
import {get} from "ember-metal/property_get";
import {computed} from "ember-metal/computed";
import compare from "ember-runtime/compare";
import EmberObject from "ember-runtime/system/object";
import ArrayController from "ember-runtime/controllers/array_controller";
import Controller from "ember-runtime/controllers/controller";
import {sort} from "ember-runtime/computed/reduce_computed_macros";
import Registry from "container/registry";
import { map } from "ember-metal/enumerable_utils";

var lannisters, arrayController, controllerClass, otherControllerClass, registry, container, itemControllerCount,
    tywin, jaime, cersei, tyrion;

QUnit.module("Ember.ArrayController - itemController", {
  setup() {
    registry = new Registry();
    container = registry.container();

    tywin = EmberObject.create({ name: 'Tywin' });
    jaime = EmberObject.create({ name: 'Jaime' });
    cersei = EmberObject.create({ name: 'Cersei' });
    tyrion = EmberObject.create({ name: 'Tyrion' });
    lannisters = Ember.A([tywin, jaime, cersei]);

    itemControllerCount = 0;
    controllerClass = Controller.extend({
      init() {
        ++itemControllerCount;
        this._super.apply(this, arguments);
      },

      toString() {
        return "itemController for " + this.get('name');
      }
    });

    otherControllerClass = Controller.extend({
      toString() {
        return "otherItemController for " + this.get('name');
      }
    });

    registry.register("controller:Item", controllerClass);
    registry.register("controller:OtherItem", otherControllerClass);
  },
  teardown() {
    run(function() {
      container.destroy();
    });
    registry = container = null;
  }
});

function createUnwrappedArrayController() {
  arrayController = ArrayController.create({
    container: container,
    model: lannisters
  });
}

function createArrayController() {
  arrayController = ArrayController.create({
    container: container,
    itemController: 'Item',
    model: lannisters
  });
}

function createDynamicArrayController() {
  arrayController = ArrayController.create({
    container: container,
    lookupItemController(object) {
      if ("Tywin" === object.get("name")) {
        return "Item";
      } else {
        return "OtherItem";
      }
    },
    model: lannisters
  });
}

QUnit.test("when no `itemController` is set, `objectAtContent` returns objects directly", function() {
  createUnwrappedArrayController();

  strictEqual(arrayController.objectAtContent(1), jaime, "No controller is returned when itemController is not set");
});

QUnit.test("when `itemController` is set, `objectAtContent` returns an instance of the controller", function() {
  createArrayController();

  var jaimeController = arrayController.objectAtContent(1);

  ok(controllerClass.detectInstance(jaimeController), "A controller is returned when itemController is set");
});


QUnit.test("when `idx` is out of range, `objectAtContent` does not create a controller", function() {
  controllerClass.reopen({
    init() {
      ok(false, "Controllers should not be created when `idx` is out of range");
    }
  });

  createArrayController();
  strictEqual(arrayController.objectAtContent(50), undefined, "no controllers are created for out of range indexes");
});

QUnit.test("when the underlying object is null, a controller is still returned", function() {
  createArrayController();
  arrayController.unshiftObject(null);
  var firstController = arrayController.objectAtContent(0);
  ok(controllerClass.detectInstance(firstController), "A controller is still created for null objects");
});

QUnit.test("the target of item controllers is the parent controller", function() {
  createArrayController();

  var jaimeController = arrayController.objectAtContent(1);

  equal(jaimeController.get('target'), arrayController, "Item controllers' targets are their parent controller");
});

QUnit.test("the parentController property of item controllers is set to the parent controller", function() {
  createArrayController();

  var jaimeController = arrayController.objectAtContent(1);

  equal(jaimeController.get('parentController'), arrayController, "Item controllers' targets are their parent controller");
});

QUnit.test("when the underlying object has not changed, `objectAtContent` always returns the same instance", function() {
  createArrayController();

  strictEqual(arrayController.objectAtContent(1), arrayController.objectAtContent(1), "Controller instances are reused");
});

QUnit.test("when the index changes, `objectAtContent` still returns the same instance", function() {
  createArrayController();
  var jaimeController = arrayController.objectAtContent(1);
  arrayController.unshiftObject(tyrion);

  strictEqual(arrayController.objectAtContent(2), jaimeController, "Controller instances are reused");
});

QUnit.test("when the underlying array changes, old subcontainers are destroyed", function() {
  createArrayController();
  // cause some controllers to be instantiated
  arrayController.objectAtContent(1);
  arrayController.objectAtContent(2);

  // Not a public API; just checking for cleanup
  var subControllers = get(arrayController, '_subControllers');
  var jaimeController = subControllers[1];
  var cerseiController = subControllers[2];

  equal(!!jaimeController.isDestroying, false, "precond - nobody is destroyed yet");
  equal(!!cerseiController.isDestroying, false, "precond - nobody is destroyed yet");

  run(function() {
    arrayController.set('model', Ember.A());
  });

  equal(!!jaimeController.isDestroying, true, "old subcontainers are destroyed");
  equal(!!cerseiController.isDestroying, true, "old subcontainers are destroyed");
});


QUnit.test("item controllers are created lazily", function() {
  createArrayController();

  equal(itemControllerCount, 0, "precond - no item controllers yet");

  arrayController.objectAtContent(1);

  equal(itemControllerCount, 1, "item controllers are created lazily");
});

QUnit.test("when items are removed from the arrayController, their respective subcontainers are destroyed", function() {
  createArrayController();
  var jaimeController = arrayController.objectAtContent(1);
  var cerseiController = arrayController.objectAtContent(2);
  get(arrayController, '_subControllers');

  equal(!!jaimeController.isDestroyed, false, "precond - nobody is destroyed yet");
  equal(!!cerseiController.isDestroyed, false, "precond - nobody is destroyed yet");

  run(function() {
    arrayController.removeObject(cerseiController);
  });

  equal(!!cerseiController.isDestroying, true, "Removed objects' containers are cleaned up");
  equal(!!jaimeController.isDestroying, false, "Retained objects' containers are not cleaned up");
});

QUnit.test("one cannot remove wrapped model directly when specifying `itemController`", function() {
  createArrayController();
  var cerseiController = arrayController.objectAtContent(2);

  equal(arrayController.get('length'), 3, "precondition - array is in initial state");
  arrayController.removeObject(cersei);

  equal(arrayController.get('length'), 3, "cannot remove wrapped objects directly");

  run(function() {
    arrayController.removeObject(cerseiController);
  });
  equal(arrayController.get('length'), 2, "can remove wrapper objects");
});

QUnit.test("when items are removed from the underlying array, their respective subcontainers are destroyed", function() {
  createArrayController();
  var jaimeController = arrayController.objectAtContent(1);
  var cerseiController = arrayController.objectAtContent(2);
  get(arrayController, 'subContainers');

  equal(!!jaimeController.isDestroying, false, "precond - nobody is destroyed yet");
  equal(!!cerseiController.isDestroying, false, "precond - nobody is destroyed yet");

  run(function() {
    lannisters.removeObject(cersei); // if only it were that easy
  });

  equal(!!jaimeController.isDestroyed, false, "Retained objects' containers are not cleaned up");
  equal(!!cerseiController.isDestroyed, true, "Removed objects' containers are cleaned up");
});

QUnit.test("`itemController` can be dynamic by overwriting `lookupItemController`", function() {
  createDynamicArrayController();

  var tywinController = arrayController.objectAtContent(0);
  var jaimeController = arrayController.objectAtContent(1);

  ok(controllerClass.detectInstance(tywinController), "lookupItemController can return different classes for different objects");
  ok(otherControllerClass.detectInstance(jaimeController), "lookupItemController can return different classes for different objects");
});

QUnit.test("when `idx` is out of range, `lookupItemController` is not called", function() {
  arrayController = ArrayController.create({
    container: container,
    lookupItemController(object) {
      ok(false, "`lookupItemController` should not be called when `idx` is out of range");
    },
    model: lannisters
  });

  strictEqual(arrayController.objectAtContent(50), undefined, "no controllers are created for indexes that are superior to the length");
  strictEqual(arrayController.objectAtContent(-1), undefined, "no controllers are created for indexes less than zero");
});

QUnit.test("if `lookupItemController` returns a string, it must be resolvable by the container", function() {
  arrayController = ArrayController.create({
    container: container,
    lookupItemController(object) {
      return "NonExistent";
    },
    model: lannisters
  });

  throws(function() {
      arrayController.objectAtContent(1);
    },
    /NonExistent/,
    "`lookupItemController` must return either null or a valid controller name");
});

QUnit.test("target and parentController are set to the concrete parentController", function() {
  var parent = ArrayController.create({

  });

  // typically controller created for {{each itemController="foo"}}
  var virtual = ArrayController.create({
    itemController: 'Item',
    container: container,
    target: parent,
    parentController: parent,
    _isVirtual: true,
    model: Ember.A([
      { name: 'kris seldenator' }
    ])
  });

  var itemController = virtual.objectAtContent(0);

  equal(itemController.get('parentController'), parent);
  equal(itemController.get('target'), parent);

  run(function() {
    parent.destroy();
    virtual.destroy();
  });

});

QUnit.test("array observers can invoke `objectAt` without overwriting existing item controllers", function() {
  createArrayController();

  var tywinController = arrayController.objectAtContent(0);
  var arrayObserverCalled = false;

  arrayController.reopen({
    lannistersWillChange() { return this; },
    lannistersDidChange(_, idx, removedAmt, addedAmt) {
      arrayObserverCalled = true;
      equal(this.objectAt(idx).get('model.name'), "Tyrion", "Array observers get the right object via `objectAt`");
    }
  });
  arrayController.addArrayObserver(arrayController, {
    willChange: 'lannistersWillChange',
    didChange: 'lannistersDidChange'
  });

  run(function() {
    lannisters.unshiftObject(tyrion);
  });

  equal(arrayObserverCalled, true, "Array observers are called normally");
  equal(tywinController.get('model.name'), "Tywin", "Array observers calling `objectAt` does not overwrite existing controllers' model");
});

QUnit.test("`itemController`'s life cycle should be entangled with its parent controller", function() {
  createDynamicArrayController();

  var tywinController = arrayController.objectAtContent(0);
  var jaimeController = arrayController.objectAtContent(1);

  run(arrayController, 'destroy');

  equal(tywinController.get('isDestroyed'), true);
  equal(jaimeController.get('isDestroyed'), true);
});

QUnit.module('Ember.ArrayController - itemController with arrayComputed', {
  setup() {
    registry = new Registry();
    container = registry.container();

    cersei = EmberObject.create({ name: 'Cersei' });
    jaime = EmberObject.create({ name: 'Jaime' });
    lannisters = Ember.A([jaime, cersei]);

    controllerClass = Controller.extend({
      title: computed(function () {
        switch (get(this, 'name')) {
          case 'Jaime':   return 'Kingsguard';
          case 'Cersei':  return 'Queen';
        }
      }).property('name'),

      toString() {
        return "itemController for " + this.get('name');
      }
    });

    registry.register("controller:Item", controllerClass);
  },
  teardown() {
    run(function() {
      container.destroy();
    });
  }
});

QUnit.test("item controllers can be used to provide properties for array computed macros", function() {
  createArrayController();

  ok(compare(guidFor(cersei), guidFor(jaime)) < 0, "precond - guid tiebreaker would fail test");

  arrayController.reopen({
    sortProperties: Ember.A(['title']),
    sorted: sort('@this', 'sortProperties')
  });

  var sortedNames = map(arrayController.get('sorted'), function(item) {
    return get(item, 'model.name');
  });

  deepEqual(sortedNames, ['Jaime', 'Cersei'], "ArrayController items can be sorted on itemController properties");
});
