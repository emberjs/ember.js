var get = Ember.get, set = Ember.set;


var array, unfilteredArray, filteredArrayController;

module("Ember.Filterable");

module("Ember.Filterable with content", {
  setup: function() {
    Ember.run(function() {
      array = [{ id: 1, name: "Scumbag Dale" }, { id: 2, name: "Scumbag Katz" }, { id: 3, name: "Scumbag Bryn" }];
      unfilteredArray = Ember.A(array);

      filteredArrayController = Ember.ArrayProxy.create(Ember.FilterableMixin, {
        content: unfilteredArray
      });
    });
  },

  teardown: function() {
    Ember.run(function() {
      filteredArrayController.set('content', null);
      filteredArrayController.destroy();
    });
  }
});

test("if you do not specify `filterProperties` filterable has no effect", function() {
  equal(filteredArrayController.get('length'), 3, 'array has 3 items');

  unfilteredArray.pushObject({id: 4, name: 'Scumbag Chavard'});

  equal(filteredArrayController.get('length'), 4, 'array has 4 items');
});

test("you can change the filterProperties and filterCondition", function() {
  equal(filteredArrayController.get('length'), 3, 'precond - array has 3 items');

  filteredArrayController.filterCondition = function(item){ return get(item, 'id') === 1; };
  filteredArrayController.set('filterProperties', ['id']);

  equal(filteredArrayController.get('length'), 1, 'array has 1 item');
  equal(filteredArrayController.objectAt(0).name, 'Scumbag Dale', 'array is filtered by id');
});


module("Ember.Filterable with content, filterProperties and filterCondition", {
  setup: function() {
    Ember.run(function() {
      array = [{ id: 1, name: "Scumbag Dale" }, { id: 2, name: "Scumbag Katz" }, { id: 3, name: "Scumbag Bryn" }];
      unfilteredArray = Ember.A(array);

      filteredArrayController = Ember.ArrayProxy.create(Ember.FilterableMixin, {
        content: unfilteredArray,
        filterProperties: ['id'],
        filterCondition: function(item){ return get(item, 'id') === 1; }
      });
    });
  },

  teardown: function() {
    Ember.run(function() {
      filteredArrayController.destroy();
    });
  }
});

test("filtered object will expose filtered content", function() {
  equal(filteredArrayController.get('length'), 1, 'array is filtered by id');
  equal(filteredArrayController.objectAt(0).name, 'Scumbag Dale', 'the object is the correct one');
});

test("you can add objects in the filtered array", function() {
  equal(filteredArrayController.get('length'), 1, 'array has 1 item');

  unfilteredArray.pushObject({id: 1, name: 'Scumbag Chavard'});

  equal(filteredArrayController.get('length'), 2, 'array has 2 items');
  equal(filteredArrayController.objectAt(1).name, 'Scumbag Chavard', 'a new object added to content was inserted according to given constraint');

  unfilteredArray.addObject({id: 1, name: 'Scumbag Fucs'});

  equal(filteredArrayController.get('length'), 3, 'array has 3 items');
  equal(filteredArrayController.objectAt(2).name, 'Scumbag Fucs', 'a new object added to controller was inserted according to given constraint');
});

test("new objects don't get added if they don't meet the filter condition", function() {
  equal(filteredArrayController.get('length'), 1, 'array has 1 item');

  unfilteredArray.pushObject({id: 5, name: 'Scumbag Chavard'});

  equal(filteredArrayController.get('length'), 1, 'array has 1 item');
});

test("you can change a filter property and the content will be removed", function() {
  equal(filteredArrayController.get('length'), 1, 'array has 1 item');
  equal(filteredArrayController.objectAt(0).name, 'Scumbag Dale', 'dale is the only one');

  set(filteredArrayController.objectAt(0), 'id', 2);

  equal(filteredArrayController.get('length'), 0, 'array has no items');
});

test("you can change a filter property and the content will be added", function() {
  equal(filteredArrayController.get('length'), 1, 'array has 1 item');
  equal(filteredArrayController.objectAt(0).name, 'Scumbag Dale', 'dale is the only one');

  set(unfilteredArray.objectAt(1), 'id', 1);

  equal(filteredArrayController.get('length'), 2, 'array has two items');
  equal(filteredArrayController.objectAt(0).name, 'Scumbag Dale', 'dale is there');
  equal(filteredArrayController.objectAt(1).name, 'Scumbag Katz', 'katz is there');
});

module("Ember.Filterable with filterProperties and filterCondition", {
  setup: function() {
    Ember.run(function() {
      array = [{ id: 1, name: "Scumbag Dale" }, { id: 2, name: "Scumbag Katz" }, { id: 3, name: "Scumbag Bryn" }];
      unfilteredArray = Ember.A(array);

      filteredArrayController = Ember.ArrayProxy.create(Ember.FilterableMixin, {
        filterProperties: ['id'],
        filterCondition: function(item){
          return get(item,'id') === 1;
        }
      });
    });
  },

  teardown: function() {
    Ember.run(function() {
      filteredArrayController.destroy();
    });
  }
});

test("you can set content later and it will be filtered", function() {
  equal(filteredArrayController.get('length'), 0, 'array has 0 items');

  Ember.run(function() {
    filteredArrayController.set('content', unfilteredArray);
  });

  equal(filteredArrayController.get('length'), 1, 'array has 1 item');
  equal(filteredArrayController.objectAt(0).name, 'Scumbag Dale', 'dale is in the filtered array');
});

module("Ember.Filterable with content and filterProperties", {
  setup: function() {
    Ember.run(function() {
      array = [{ id: 1, name: "Scumbag Dale" }, { id: 2, name: "Scumbag Katz" }, { id: 3, name: null }];
      unfilteredArray = Ember.A(array);

      filteredArrayController = Ember.ArrayProxy.create(Ember.FilterableMixin, {
        content: unfilteredArray,
        filterProperties: ['id', 'name']
      });
    });
  },

  teardown: function() {
    Ember.run(function() {
      filteredArrayController.destroy();
    });
  }
});

test("by default it tests if all filterProperties are truthy", function() {
  equal(filteredArrayController.get('length'), 2, 'array has 2 items');

  unfilteredArray.pushObject({id: 4, name: 'Scumbag Chavard'});

  equal(filteredArrayController.get('length'), 3, 'adds valid items to the filtered array');

  unfilteredArray.pushObject({id: undefined, name: 'Scumbag Chavard'});
  unfilteredArray.pushObject({id: 6, name: ''});

  equal(filteredArrayController.get('length'), 3, "it doesn't add invalid items to the filtered array");
});

test("the content can be swapped out and the array still filters", function() {
  filteredArrayController.set('content', Ember.A([{id: 1, name: 'James'}, {id: 2, name: null}]));

  equal(filteredArrayController.get('length'), 1, 'filters the new array');
});

module("Ember.Filterable with bound content and filterProperties", {
  setup: function() {
    Ember.run(function() {
      array = [{ id: 1 }, { id: 2 }, { id: null }];
      unfilteredArray = Ember.ArrayProxy.create({
        content: Ember.A(array)
      });

      filteredArrayController = Ember.ArrayProxy.create(Ember.FilterableMixin, {
        filterProperties: ['id'],
        unfilteredArray: unfilteredArray
      });

      var binding = new Ember.Binding('content', 'unfilteredArray');
      binding.connect(filteredArrayController);
    });
  },

  teardown: function() {
    Ember.run(function() {
      filteredArrayController.destroy();
    });
  }
});

test("the content can be bound to another ArrayProxy", function() {
  expect(2);
  equal( filteredArrayController.get('content.length'), 3, 'the content is bound');
  equal( filteredArrayController.get('length'), 2, 'the content is filtered');
});

test("the content of the original ArrayProxy can be swapped out", function() {
  expect(2);
  unfilteredArray.set('content', Ember.A([{id: 4},{id: null}]));
  equal( filteredArrayController.get('content.length'), 2, 'the content updates');
  equal( filteredArrayController.get('length'), 1, 'the updated content is filtered');
});
