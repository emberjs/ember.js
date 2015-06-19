import Ember from "ember-metal/core";
import {set} from "ember-metal/property_set";
import run from "ember-metal/run_loop";
import {observer as emberObserver} from "ember-metal/mixin";
import {listenersFor} from "ember-metal/events";
import ArrayProxy from "ember-runtime/system/array_proxy";
import SortableMixin from "ember-runtime/mixins/sortable";
import EmberObject from "ember-runtime/system/object";
import ArrayController, { arrayControllerDeprecation } from "ember-runtime/controllers/array_controller";

var unsortedArray, sortedArrayController;

QUnit.module("Ember.Sortable");

QUnit.module("Ember.Sortable with content", {
  setup() {
    run(function() {
      var array = [{ id: 1, name: "Scumbag Dale" }, { id: 2, name: "Scumbag Katz" }, { id: 3, name: "Scumbag Bryn" }];

      unsortedArray = Ember.A(Ember.A(array).copy());

      sortedArrayController = ArrayProxy.extend(SortableMixin).create({
        content: unsortedArray
      });
    });
  },

  teardown() {
    run(function() {
      sortedArrayController.set('content', null);
      sortedArrayController.destroy();
    });
  }
});

QUnit.test("if you do not specify `sortProperties` sortable have no effect", function() {
  equal(sortedArrayController.get('length'), 3, 'array has 3 items');
  equal(sortedArrayController.objectAt(0).name, 'Scumbag Dale', 'array is in it natural order');

  unsortedArray.pushObject({ id: 4, name: 'Scumbag Chavard' });

  equal(sortedArrayController.get('length'), 4, 'array has 4 items');
  equal(sortedArrayController.objectAt(3).name, 'Scumbag Chavard', 'a new object was inserted in the natural order');

  sortedArrayController.set('sortProperties', []);
  unsortedArray.pushObject({ id: 5, name: 'Scumbag Jackson' });

  equal(sortedArrayController.get('length'), 5, 'array has 5 items');
  equal(sortedArrayController.objectAt(4).name, 'Scumbag Jackson', 'a new object was inserted in the natural order with empty array as sortProperties');
});

QUnit.test("you can change sorted properties", function() {
  sortedArrayController.set('sortProperties', ['id']);

  equal(sortedArrayController.objectAt(0).name, 'Scumbag Dale', 'array is sorted by id');
  equal(sortedArrayController.get('length'), 3, 'array has 3 items');

  sortedArrayController.set('sortAscending', false);

  equal(sortedArrayController.objectAt(0).name, 'Scumbag Bryn', 'array is sorted by id in DESC order');
  equal(sortedArrayController.objectAt(2).name, 'Scumbag Dale', 'array is sorted by id in DESC order');
  equal(sortedArrayController.get('length'), 3, 'array has 3 items');

  sortedArrayController.set('sortProperties', ['name']);

  equal(sortedArrayController.objectAt(0).name, 'Scumbag Katz', 'array is sorted by name in DESC order');
  equal(sortedArrayController.get('length'), 3, 'array has 3 items');
});

QUnit.test("changing sort order triggers observers", function() {
  var observer;
  var changeCount = 0;
  observer = EmberObject.extend({
    arrangedDidChange: emberObserver('array.[]', function() {
      changeCount++;
    })
  }).create({
    array: sortedArrayController
  });

  equal(changeCount, 0, 'precond - changeCount starts at 0');

  sortedArrayController.set('sortProperties', ['id']);

  equal(changeCount, 1, 'setting sortProperties increments changeCount');

  sortedArrayController.set('sortAscending', false);

  equal(changeCount, 2, 'changing sortAscending increments changeCount');

  sortedArrayController.set('sortAscending', true);

  equal(changeCount, 3, 'changing sortAscending again increments changeCount');

  run(function() { observer.destroy(); });
});

QUnit.test("changing sortProperties and sortAscending with setProperties, sortProperties appearing first", function() {
  sortedArrayController.set('sortProperties', ['name']);
  sortedArrayController.set('sortAscending', false);

  equal(sortedArrayController.objectAt(0).name, 'Scumbag Katz', 'array is sorted by name in DESC order');
  equal(sortedArrayController.objectAt(2).name, 'Scumbag Bryn', 'array is sorted by name in DESC order');

  sortedArrayController.setProperties({ sortProperties: ['id'], sortAscending: true });

  equal(sortedArrayController.objectAt(0).id, 1, 'array is sorted by id in ASC order after setting sortAscending and sortProperties');
  equal(sortedArrayController.objectAt(2).id, 3, 'array is sorted by id in ASC order after setting sortAscending and sortProperties');

  sortedArrayController.setProperties({ sortProperties: ['name'], sortAscending: false });

  equal(sortedArrayController.objectAt(0).name, 'Scumbag Katz', 'array is sorted by name in DESC order after setting sortAscending and sortProperties');
  equal(sortedArrayController.objectAt(2).name, 'Scumbag Bryn', 'array is sorted by name in DESC order after setting sortAscending and sortProperties');

  sortedArrayController.setProperties({ sortProperties: ['id'], sortAscending: false });

  equal(sortedArrayController.objectAt(0).id, 3, 'array is sorted by id in DESC order after setting sortAscending and sortProperties');
  equal(sortedArrayController.objectAt(2).id, 1, 'array is sorted by id in DESC order after setting sortAscending and sortProperties');

  sortedArrayController.setProperties({ sortProperties: ['id'], sortAscending: true });

  equal(sortedArrayController.objectAt(0).id, 1, 'array is sorted by id in ASC order after setting sortAscending and sortProperties');
  equal(sortedArrayController.objectAt(2).id, 3, 'array is sorted by id in ASC order after setting sortAscending and sortProperties');

});

QUnit.test("changing sortProperties and sortAscending with setProperties, sortAscending appearing first", function() {
  sortedArrayController.set('sortProperties', ['name']);
  sortedArrayController.set('sortAscending', false);

  equal(sortedArrayController.objectAt(0).name, 'Scumbag Katz', 'array is sorted by name in DESC order');
  equal(sortedArrayController.objectAt(2).name, 'Scumbag Bryn', 'array is sorted by name in DESC order');

  sortedArrayController.setProperties({ sortAscending: true, sortProperties: ['id'] });

  equal(sortedArrayController.objectAt(0).id, 1, 'array is sorted by id in ASC order after setting sortAscending and sortProperties');
  equal(sortedArrayController.objectAt(2).id, 3, 'array is sorted by id in ASC order after setting sortAscending and sortProperties');

  sortedArrayController.setProperties({ sortAscending: false, sortProperties: ['name'] });

  equal(sortedArrayController.objectAt(0).name, 'Scumbag Katz', 'array is sorted by name in DESC order after setting sortAscending and sortProperties');
  equal(sortedArrayController.objectAt(2).name, 'Scumbag Bryn', 'array is sorted by name in DESC order after setting sortAscending and sortProperties');

  sortedArrayController.setProperties({ sortAscending: false, sortProperties: ['id'] });

  equal(sortedArrayController.objectAt(0).id, 3, 'array is sorted by id in DESC order after setting sortAscending and sortProperties');
  equal(sortedArrayController.objectAt(2).id, 1, 'array is sorted by id in DESC order after setting sortAscending and sortProperties');

  sortedArrayController.setProperties({ sortAscending: true, sortProperties: ['id'] });

  equal(sortedArrayController.objectAt(0).id, 1, 'array is sorted by id in ASC order after setting sortAscending and sortProperties');
  equal(sortedArrayController.objectAt(2).id, 3, 'array is sorted by id in ASC order after setting sortAscending and sortProperties');

});

QUnit.module("Ember.Sortable with content and sortProperties", {
  setup() {
    run(function() {
      var array = [{ id: 1, name: "Scumbag Dale" }, { id: 2, name: "Scumbag Katz" }, { id: 3, name: "Scumbag Bryn" }];

      unsortedArray = Ember.A(Ember.A(array).copy());

      expectDeprecation(arrayControllerDeprecation);
      sortedArrayController = ArrayController.create({
        content: unsortedArray,
        sortProperties: ['name']
      });
    });
  },

  teardown() {
    run(function() {
      sortedArrayController.destroy();
    });
  }
});

QUnit.test("sortable object will expose associated content in the right order", function() {
  equal(sortedArrayController.get('length'), 3, 'array has 3 items');
  equal(sortedArrayController.objectAt(0).name, 'Scumbag Bryn', 'array is sorted by name');
});

QUnit.test("you can add objects in sorted order", function() {
  equal(sortedArrayController.get('length'), 3, 'array has 3 items');

  unsortedArray.pushObject({ id: 4, name: 'Scumbag Chavard' });

  equal(sortedArrayController.get('length'), 4, 'array has 4 items');
  equal(sortedArrayController.objectAt(1).name, 'Scumbag Chavard', 'a new object added to content was inserted according to given constraint');

  sortedArrayController.addObject({ id: 5, name: 'Scumbag Fucs' });

  equal(sortedArrayController.get('length'), 5, 'array has 5 items');
  equal(sortedArrayController.objectAt(3).name, 'Scumbag Fucs', 'a new object added to controller was inserted according to given constraint');
});

QUnit.test("you can push objects in sorted order", function() {
  equal(sortedArrayController.get('length'), 3, 'array has 3 items');

  unsortedArray.pushObject({ id: 4, name: 'Scumbag Chavard' });

  equal(sortedArrayController.get('length'), 4, 'array has 4 items');
  equal(sortedArrayController.objectAt(1).name, 'Scumbag Chavard', 'a new object added to content was inserted according to given constraint');

  sortedArrayController.pushObject({ id: 5, name: 'Scumbag Fucs' });

  equal(sortedArrayController.get('length'), 5, 'array has 5 items');
  equal(sortedArrayController.objectAt(3).name, 'Scumbag Fucs', 'a new object added to controller was inserted according to given constraint');
});

QUnit.test("you can unshift objects in sorted order", function() {
  equal(sortedArrayController.get('length'), 3, 'array has 3 items');

  unsortedArray.unshiftObject({ id: 4, name: 'Scumbag Chavard' });

  equal(sortedArrayController.get('length'), 4, 'array has 4 items');
  equal(sortedArrayController.objectAt(1).name, 'Scumbag Chavard', 'a new object added to content was inserted according to given constraint');

  sortedArrayController.addObject({ id: 5, name: 'Scumbag Fucs' });

  equal(sortedArrayController.get('length'), 5, 'array has 5 items');
  equal(sortedArrayController.objectAt(3).name, 'Scumbag Fucs', 'a new object added to controller was inserted according to given constraint');
});

QUnit.test("addObject does not insert duplicates", function() {
  var sortedArrayProxy;
  var obj = {};
  sortedArrayProxy = ArrayProxy.extend(SortableMixin).create({
    content: Ember.A([obj])
  });

  equal(sortedArrayProxy.get('length'), 1, 'array has 1 item');

  sortedArrayProxy.addObject(obj);

  equal(sortedArrayProxy.get('length'), 1, 'array still has 1 item');
});

QUnit.test("you can change a sort property and the content will rearrange", function() {
  equal(sortedArrayController.get('length'), 3, 'array has 3 items');
  equal(sortedArrayController.objectAt(0).name, 'Scumbag Bryn', 'bryn is first');

  set(sortedArrayController.objectAt(0), 'name', 'Scumbag Fucs');
  equal(sortedArrayController.objectAt(0).name, 'Scumbag Dale', 'dale is first now');
  equal(sortedArrayController.objectAt(1).name, 'Scumbag Fucs', 'foucs is second');
});

QUnit.test("you can change the position of the middle item", function() {
  equal(sortedArrayController.get('length'), 3, 'array has 3 items');

  equal(sortedArrayController.objectAt(1).name, 'Scumbag Dale', 'Dale is second');
  set(sortedArrayController.objectAt(1), 'name', 'Alice'); // Change Dale to Alice

  equal(sortedArrayController.objectAt(0).name, 'Alice', 'Alice (previously Dale) is first now');
});

QUnit.test("don't remove and insert if position didn't change", function() {
  var insertItemSortedCalled = false;

  sortedArrayController.reopen({
    insertItemSorted(item) {
      insertItemSortedCalled = true;
      this._super(item);
    }
  });

  sortedArrayController.set('sortProperties', ['name']);

  set(sortedArrayController.objectAt(0), 'name', 'Scumbag Brynjolfsson');

  ok(!insertItemSortedCalled, "insertItemSorted should not have been called");
});

QUnit.test("sortProperties observers removed on content removal", function() {
  var removedObject = unsortedArray.objectAt(2);
  equal(listenersFor(removedObject, 'name:change').length, 1,
    "Before removal, there should be one listener for sortProperty change.");
  unsortedArray.replace(2, 1, []);
  equal(listenersFor(removedObject, 'name:change').length, 0,
    "After removal, there should be no listeners for sortProperty change.");
});

QUnit.module("Ember.Sortable with sortProperties", {
  setup() {
    run(function() {
      expectDeprecation(arrayControllerDeprecation);
      sortedArrayController = ArrayController.create({
        sortProperties: ['name']
      });
      var array = [{ id: 1, name: "Scumbag Dale" }, { id: 2, name: "Scumbag Katz" }, { id: 3, name: "Scumbag Bryn" }];
      unsortedArray = Ember.A(Ember.A(array).copy());
    });
  },

  teardown() {
    run(function() {
      sortedArrayController.destroy();
    });
  }
});

QUnit.test("you can set content later and it will be sorted", function() {
  equal(sortedArrayController.get('length'), 0, 'array has 0 items');

  run(function() {
    sortedArrayController.set('content', unsortedArray);
  });

  equal(sortedArrayController.get('length'), 3, 'array has 3 items');
  equal(sortedArrayController.objectAt(0).name, 'Scumbag Bryn', 'array is sorted by name');
});

QUnit.module("Ember.Sortable with sortFunction and sortProperties", {
  setup() {
    run(function() {
      expectDeprecation(arrayControllerDeprecation);
      sortedArrayController = ArrayController.create({
        sortProperties: ['name'],
        sortFunction(v, w) {
          var lowerV = v.toLowerCase();
          var lowerW = w.toLowerCase();

          if (lowerV < lowerW) {
            return -1;
          }
          if (lowerV > lowerW) {
            return 1;
          }
          return 0;
        }
      });
      var array = [{ id: 1, name: "Scumbag Dale" },
                   { id: 2, name: "Scumbag Katz" },
                   { id: 3, name: "Scumbag bryn" }];
      unsortedArray = Ember.A(Ember.A(array).copy());
    });
  },

  teardown() {
    run(function() {
      sortedArrayController.destroy();
    });
  }
});

QUnit.test("you can sort with custom sorting function", function() {
  equal(sortedArrayController.get('length'), 0, 'array has 0 items');

  run(function() {
    sortedArrayController.set('content', unsortedArray);
  });

  equal(sortedArrayController.get('length'), 3, 'array has 3 items');
  equal(sortedArrayController.objectAt(0).name, 'Scumbag bryn', 'array is sorted by custom sort');
});

QUnit.test("Ember.Sortable with sortFunction on ArrayProxy should work like ArrayController", function() {
  run(function() {
    sortedArrayController = ArrayProxy.extend(SortableMixin).create({
      sortProperties: ['name'],
      sortFunction(v, w) {
        var lowerV = v.toLowerCase();
        var lowerW = w.toLowerCase();

        if (lowerV < lowerW) {
          return -1;
        }
        if (lowerV > lowerW) {
          return 1;
        }
        return 0;
      }
    });
    var array = [{ id: 1, name: "Scumbag Dale" }, { id: 2, name: "Scumbag Katz" }, { id: 3, name: "Scumbag Bryn" }];
    unsortedArray = Ember.A(Ember.A(array).copy());
  });
  equal(sortedArrayController.get('length'), 0, 'array has 0 items');

  run(function() {
    sortedArrayController.set('content', unsortedArray);
  });

  equal(sortedArrayController.get('length'), 3, 'array has 3 items');
  equal(sortedArrayController.objectAt(0).name, 'Scumbag Bryn', 'array is sorted by name');
});
