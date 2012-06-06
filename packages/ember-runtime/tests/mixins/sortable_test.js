var get = Ember.get, set = Ember.set;

var array = [{ id: 1, name: "Scumbag Dale" }, { id: 2, name: "Scumbag Katz" }, { id: 3, name: "Scumbag Bryn" }];

var unsortedArray, sortedArrayController;

module("Ember.Sortable");

module("Ember.Sortable with content", {
  setup: function() {
    Ember.run(function() {
      unsortedArray = Ember.A(Ember.A(array).copy());

      sortedArrayController = Ember.ArrayProxy.create(Ember.SortableMixin, {
        content: unsortedArray
      });
    });
  },

  teardown: function() {
    Ember.run(function() {
      sortedArrayController.set('content', null);
      sortedArrayController.destroy();
    });
  }
});

test("if you do not specify `sortProperties` sortable have no effect", function() {
  equal(sortedArrayController.get('length'), 3, 'array has 3 items');
  equal(sortedArrayController.objectAt(0).name, 'Scumbag Dale', 'array is in it natural order');

  unsortedArray.pushObject({id: 4, name: 'Scumbag Chavard'});

  equal(sortedArrayController.get('length'), 4, 'array has 4 items');
  equal(sortedArrayController.objectAt(3).name, 'Scumbag Chavard', 'a new object was inserted in the natural order');
});

test("you can change sorted properties", function() {
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

module("Ember.Sortable with content and sortProperties", {
  setup: function() {
    Ember.run(function() {
      unsortedArray = Ember.A(Ember.A(array).copy());

      sortedArrayController = Ember.ArrayController.create({
        content: unsortedArray,
        sortProperties: ['name']
      });
    });
  },

  teardown: function() {
    Ember.run(function() {
      sortedArrayController.destroy();
    });
  }
});

test("sortable object will expose associated content in the right order", function() {
  equal(sortedArrayController.get('length'), 3, 'array has 3 items');
  equal(sortedArrayController.objectAt(0).name, 'Scumbag Bryn', 'array is sorted by name');
});

test("you can add objects in sorted order", function() {
  equal(sortedArrayController.get('length'), 3, 'array has 3 items');

  unsortedArray.pushObject({id: 4, name: 'Scumbag Chavard'});

  equal(sortedArrayController.get('length'), 4, 'array has 4 items');
  equal(sortedArrayController.objectAt(1).name, 'Scumbag Chavard', 'a new object added to content was inserted according to given constraint');

  sortedArrayController.addObject({id: 5, name: 'Scumbag Fucs'});

  equal(sortedArrayController.get('length'), 5, 'array has 5 items');
  equal(sortedArrayController.objectAt(3).name, 'Scumbag Fucs', 'a new object added to controller was inserted according to given constraint');
});

test("you can unshift objects in sorted order", function() {
  equal(sortedArrayController.get('length'), 3, 'array has 3 items');

  unsortedArray.unshiftObject({id: 4, name: 'Scumbag Chavard'});

  equal(sortedArrayController.get('length'), 4, 'array has 4 items');
  equal(sortedArrayController.objectAt(1).name, 'Scumbag Chavard', 'a new object added to content was inserted according to given constraint');

  sortedArrayController.addObject({id: 5, name: 'Scumbag Fucs'});

  equal(sortedArrayController.get('length'), 5, 'array has 5 items');
  equal(sortedArrayController.objectAt(3).name, 'Scumbag Fucs', 'a new object added to controller was inserted according to given constraint');
});

test("you can change a sort property and the content will rearrenge", function() {
  equal(sortedArrayController.get('length'), 3, 'array has 3 items');
  equal(sortedArrayController.objectAt(0).name, 'Scumbag Bryn', 'bryn is first');

  set(sortedArrayController.objectAt(0), 'name', 'Scumbag Fucs');
  equal(sortedArrayController.objectAt(0).name, 'Scumbag Dale', 'dale is first now');
  equal(sortedArrayController.objectAt(1).name, 'Scumbag Fucs', 'foucs is second');
});

module("Ember.Sortable with sortProperties", {
  setup: function() {
    Ember.run(function() {
      sortedArrayController = Ember.ArrayController.create({
        sortProperties: ['name']
      });
      var array = [{ id: 1, name: "Scumbag Dale" }, { id: 2, name: "Scumbag Katz" }, { id: 3, name: "Scumbag Bryn" }];
      unsortedArray = Ember.A(Ember.A(array).copy());
    });
  },

  teardown: function() {
    Ember.run(function() {
      sortedArrayController.destroy();
    });
  }
});

test("you can set content later and it will be sorted", function() {
  equal(sortedArrayController.get('length'), 0, 'array has 0 items');

  Ember.run(function() {
    sortedArrayController.set('content', unsortedArray);
  });

  equal(sortedArrayController.get('length'), 3, 'array has 3 items');
  equal(sortedArrayController.objectAt(0).name, 'Scumbag Bryn', 'array is sorted by name');
});
