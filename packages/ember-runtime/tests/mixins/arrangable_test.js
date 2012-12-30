var get = Ember.get, set = Ember.set;

var unarrangedArray, arrangedArrayController;

module("Ember.Arrangeable");

module("Ember.Arrangeable with content - sorting", {
  setup: function() {
    Ember.run(function() {
      var array = [
        { id: 1, name: "Scumbag Dale" }, 
        { id: 2, name: "Scumbag Katz" }, 
        { id: 3, name: "Scumbag Bryn" }
      ];

      unarrangedArray = Ember.A(Ember.A(array).copy());

      arrangedArrayController = Ember.ArrayProxy.createWithMixins(Ember.ArrangeableMixin, {
        content: unarrangedArray
      });
    });
  },

  teardown: function() {
    Ember.run(function() {
      arrangedArrayController.set('content', null);
      arrangedArrayController.destroy();
    });
  }
});

test("if you do not specify `sortProperties` sortable have no effect", function() {
  equal(arrangedArrayController.get('length'), 3, 'array has 3 items');
  equal(arrangedArrayController.objectAt(0).name, 'Scumbag Dale', 'array is in it natural order');

  unarrangedArray.pushObject({id: 4, name: 'Scumbag Chavard'});

  equal(arrangedArrayController.get('length'), 4, 'array has 4 items');
  equal(arrangedArrayController.objectAt(3).name, 'Scumbag Chavard', 'a new object was inserted in the natural order');
});

test("you can change sorted properties", function() {
  arrangedArrayController.set('sortProperties', ['id']);

  equal(arrangedArrayController.objectAt(0).name, 'Scumbag Dale', 'array is sorted by id');
  equal(arrangedArrayController.get('length'), 3, 'array has 3 items');

  arrangedArrayController.set('sortAscending', false);

  equal(arrangedArrayController.objectAt(0).name, 'Scumbag Bryn', 'array is sorted by id in DESC order');
  equal(arrangedArrayController.objectAt(2).name, 'Scumbag Dale', 'array is sorted by id in DESC order');
  equal(arrangedArrayController.get('length'), 3, 'array has 3 items');

  arrangedArrayController.set('sortProperties', ['name']);

  equal(arrangedArrayController.objectAt(0).name, 'Scumbag Katz', 'array is sorted by name in DESC order');
  equal(arrangedArrayController.get('length'), 3, 'array has 3 items');
});

test("you can override sortFunction", function() {
  var array = [
    { id: 1, name: "Scumbag Dale" },
    { id: 2, name: "Scumbag Katz" },
    { id: 3, name: "Scumbag Bryn" }
  ];

  unarrangedArray = Ember.A(Ember.A(array).copy());

  arrangedArrayController = Ember.ArrayController.create({
    content: unarrangedArray,
    sortProperties: ['name'], //needed to activate sorting
    sortFunction: function(item1, item2) {
      return Ember.compare(item1, item2) * -1; // reverse sort
    }
  });

  equal(arrangedArrayController.get('length'), 3, 'array has 3 items');
  equal(arrangedArrayController.objectAt(0).name, 'Scumbag Katz', 'Yehuda should be first');
});

test("changing sort order triggers observers", function() {
  var observer, changeCount = 0;
  observer = Ember.Object.createWithMixins({
    array: arrangedArrayController,
    arrangedDidChange: Ember.observer(function() {
      changeCount++;
    }, 'array.[]')
  });

  equal(changeCount, 0, 'precond - changeCount starts at 0');

  arrangedArrayController.set('sortProperties', ['id']);

  equal(changeCount, 1, 'setting sortProperties increments changeCount');

  arrangedArrayController.set('sortAscending', false);

  equal(changeCount, 2, 'changing sortAscending increments changeCount');

  arrangedArrayController.set('sortAscending', true);

  equal(changeCount, 3, 'changing sortAscending again increments changeCount');

  Ember.run(function() { observer.destroy(); });
});

module("Ember.Arrangeable with content and sortProperties", {
  setup: function() {
    Ember.run(function() {
      var array = [
        { id: 1, name: "Scumbag Dale" },
        { id: 2, name: "Scumbag Katz" },
        { id: 3, name: "Scumbag Bryn" }
      ];

      unarrangedArray = Ember.A(Ember.A(array).copy());

      arrangedArrayController = Ember.ArrayController.create({
        content: unarrangedArray,
        sortProperties: ['name']
      });
    });
  },

  teardown: function() {
    Ember.run(function() {
      arrangedArrayController.destroy();
    });
  }
});

test("sortable object will expose associated content in the right order", function() {
  equal(arrangedArrayController.get('length'), 3, 'array has 3 items');
  equal(arrangedArrayController.objectAt(0).name, 'Scumbag Bryn', 'array is sorted by name');
});

test("you can add objects in sorted order", function() {
  equal(arrangedArrayController.get('length'), 3, 'array has 3 items');

  unarrangedArray.pushObject({id: 4, name: 'Scumbag Chavard'});

  equal(arrangedArrayController.get('length'), 4, 'array has 4 items');
  equal(arrangedArrayController.objectAt(1).name, 'Scumbag Chavard', 'a new object added to content was inserted according to given constraint');

  arrangedArrayController.addObject({id: 5, name: 'Scumbag Fucs'});

  equal(arrangedArrayController.get('length'), 5, 'array has 5 items');
  equal(arrangedArrayController.objectAt(3).name, 'Scumbag Fucs', 'a new object added to controller was inserted according to given constraint');
});

test("you can push objects in sorted order", function() {
  equal(arrangedArrayController.get('length'), 3, 'array has 3 items');

  unarrangedArray.pushObject({id: 4, name: 'Scumbag Chavard'});

  equal(arrangedArrayController.get('length'), 4, 'array has 4 items');
  equal(arrangedArrayController.objectAt(1).name, 'Scumbag Chavard', 'a new object added to content was inserted according to given constraint');

  arrangedArrayController.pushObject({id: 5, name: 'Scumbag Fucs'});

  equal(arrangedArrayController.get('length'), 5, 'array has 5 items');
  equal(arrangedArrayController.objectAt(3).name, 'Scumbag Fucs', 'a new object added to controller was inserted according to given constraint');
});

test("you can unshift objects in sorted order", function() {
  equal(arrangedArrayController.get('length'), 3, 'array has 3 items');

  unarrangedArray.unshiftObject({id: 4, name: 'Scumbag Chavard'});

  equal(arrangedArrayController.get('length'), 4, 'array has 4 items');
  equal(arrangedArrayController.objectAt(1).name, 'Scumbag Chavard', 'a new object added to content was inserted according to given constraint');

  arrangedArrayController.addObject({id: 5, name: 'Scumbag Fucs'});

  equal(arrangedArrayController.get('length'), 5, 'array has 5 items');
  equal(arrangedArrayController.objectAt(3).name, 'Scumbag Fucs', 'a new object added to controller was inserted according to given constraint');
});

test("addObject does not insert duplicates", function() {
  var sortedArrayProxy, obj = {};
  sortedArrayProxy = Ember.ArrayProxy.create(Ember.ArrangeableMixin, {
    content: Ember.A([obj])
  });

  equal(sortedArrayProxy.get('length'), 1, 'array has 1 item');

  sortedArrayProxy.addObject(obj);

  equal(sortedArrayProxy.get('length'), 1, 'array still has 1 item');
});

test("you can change a sort property and the content will rearrenge", function() {
  equal(arrangedArrayController.get('length'), 3, 'array has 3 items');
  equal(arrangedArrayController.objectAt(0).name, 'Scumbag Bryn', 'bryn is first');

  set(arrangedArrayController.objectAt(0), 'name', 'Scumbag Fucs');
  equal(arrangedArrayController.objectAt(0).name, 'Scumbag Dale', 'dale is first now');
  equal(arrangedArrayController.objectAt(1).name, 'Scumbag Fucs', 'fucs is second');
});

test("you can change the position of the middle item", function() {
  equal(arrangedArrayController.get('length'), 3, 'array has 3 items');

  equal(arrangedArrayController.objectAt(1).name, 'Scumbag Dale', 'Dale is second');
  set(arrangedArrayController.objectAt(1), 'name', 'Alice'); // Change Dale to Alice

  equal(arrangedArrayController.objectAt(0).name, 'Alice', 'Alice (previously Dale) is first now');
});

test("don't remove and insert if position didn't change", function() {
  var insertItemArrangedCalled = false;

  arrangedArrayController.reopen({
    insertItemArranged: function(item) {
      insertItemArrangedCalled = true;
      this._super(item);
    }
  });

  Ember.set(arrangedArrayController.objectAt(0), 'name', 'Scumbag Brynjolfsson');

  ok(!insertItemArrangedCalled, "insertItemArranged should not have been called");
});

module("Ember.Arrangeable with sortProperties", {
  setup: function() {
    Ember.run(function() {
      arrangedArrayController = Ember.ArrayController.create({
        sortProperties: ['name']
      });

      var array = [
        { id: 1, name: "Scumbag Dale" }, 
        { id: 2, name: "Scumbag Katz" }, 
        { id: 3, name: "Scumbag Bryn" }
      ];

      unarrangedArray = Ember.A(Ember.A(array).copy());
    });
  },

  teardown: function() {
    Ember.run(function() {
      arrangedArrayController.destroy();
    });
  }
});

test("you can set content later and it will be sorted", function() {
  equal(arrangedArrayController.get('length'), 0, 'array has 0 items');

  Ember.run(function() {
    arrangedArrayController.set('content', unarrangedArray);
  });

  equal(arrangedArrayController.get('length'), 3, 'array has 3 items');
  equal(arrangedArrayController.objectAt(0).name, 'Scumbag Bryn', 'array is sorted by name');
});

module("Ember.Arrangeable with content - filtering", {
  setup: function() {
    Ember.run(function() {
      var array = [
        { id: 1, name: "Scumbag Dale" }, 
        { id: 2, name: "Scumbag Katz" }, 
        { id: 3, name: "Scumbag Bryn" }
      ];

      unarrangedArray = Ember.A(Ember.A(array).copy());

      arrangedArrayController = Ember.ArrayProxy.createWithMixins(Ember.ArrangeableMixin, {
        content: unarrangedArray
      });
    });
  },

  teardown: function() {
    Ember.run(function() {
      arrangedArrayController.set('content', null);
      arrangedArrayController.destroy();
    });
  }
});

test("if you do not specify `filterProperties` filterable has no effect", function() {
  equal(arrangedArrayController.get('length'), 3, 'array has 3 items');

  unarrangedArray.pushObject({id: 4, name: 'Scumbag Chavard'});

  equal(arrangedArrayController.get('length'), 4, 'array has 4 items');
});

test("filters properties by string equality", function() {
  equal(arrangedArrayController.get('length'), 3, 'precond - array has 3 items');

  arrangedArrayController.set('filterProperties', [['name', 'Scumbag Dale']]);

  equal(arrangedArrayController.get('length'), 1, 'array has 1 item');
  equal(arrangedArrayController.objectAt(0).name, "Scumbag Dale",  'Tom Dale should be filtered');
});

test("filters properties by regex matching", function() {
  equal(arrangedArrayController.get('length'), 3, 'precond - array has 3 items');

  arrangedArrayController.set('filterProperties', [['name', /dale/i]]);

  equal(arrangedArrayController.get('length'), 1, 'array has 1 item');
  equal(arrangedArrayController.objectAt(0).name, "Scumbag Dale",  'Tom Dale should be filtered');
});

test("filters properties by booleans", function() {
  unarrangedArray.pushObject({id: 4, name: "Adam Hawkins", female: false});

  arrangedArrayController.set('filterProperties', [['female', false]]);

  equal(arrangedArrayController.get('length'), 1, 'array has 1 item');
  equal(arrangedArrayController.objectAt(0).name, 'Adam Hawkins',  'Adam Hawkins should be filtered');
});

test("filters properties by functions", function() {
  equal(arrangedArrayController.get('length'), 3, 'precond - array has 3 items');

  arrangedArrayController.set('filterProperties', [['name', function(k,v) { return v === "Scumbag Dale"; }]]);

  equal(arrangedArrayController.get('length'), 1, 'array has 1 item');
  equal(arrangedArrayController.objectAt(0).name, "Scumbag Dale",  'Tom Dale should be filtered');
});

test("you can change filtering to match any or all properties", function() {
  var array = [
    { a: false, b: false }, 
    { a: false, b: true }, 
    { a: true, b: false },
    { a: true, b: true }
  ];

  unarrangedArray = Ember.A(array);

  arrangedArrayController = Ember.ArrayProxy.createWithMixins(Ember.ArrangeableMixin, {
    content: unarrangedArray,
    filterProperties: ['a', 'b']
  });

  set(arrangedArrayController, 'filterAllProperties', true);
  equal(arrangedArrayController.get('length'), 1, "Only one should match all properties");

  set(arrangedArrayController, 'filterAllProperties', false);
  equal(arrangedArrayController.get('length'), 3, "Only one item doesn't match any properties");
});

module("Ember.Arrangeable with content and filterProperties", {
  setup: function() {
    Ember.run(function() {
      var array = [
        { id: 1, name: "Scumbag Dale" }, 
        { id: 2, name: "Scumbag Katz" }, 
        { id: 3, name: "Scumbag Bryn" }
      ];

      unarrangedArray = Ember.A(array);

      arrangedArrayController = Ember.ArrayProxy.createWithMixins(Ember.ArrangeableMixin, {
        content: unarrangedArray,
        filterProperties: [['id', 1]]
      });
    });
  },

  teardown: function() {
    Ember.run(function() {
      arrangedArrayController.destroy();
    });
  }
});

test("you can add objects in the filtered array", function() {
  equal(arrangedArrayController.get('length'), 1, 'array has 1 item');

  unarrangedArray.pushObject({id: 1, name: 'Scumbag Chavard'});

  equal(arrangedArrayController.get('length'), 2, 'array has 2 items');
  equal(arrangedArrayController.objectAt(1).name, 'Scumbag Chavard', 'a new object added to content was inserted according to given constraint');

  unarrangedArray.addObject({id: 1, name: 'Scumbag Fucs'});

  equal(arrangedArrayController.get('length'), 3, 'array has 3 items');
  equal(arrangedArrayController.objectAt(2).name, 'Scumbag Fucs', 'a new object added to controller was inserted according to given constraint');
});

test("new objects don't get added if they don't meet the filter condition", function() {
  equal(arrangedArrayController.get('length'), 1, 'array has 1 item');

  unarrangedArray.pushObject({id: 5, name: 'Scumbag Chavard'});

  equal(arrangedArrayController.get('length'), 1, 'array has 1 item');
});

test("you can change a filter property and the content will be removed", function() {
  equal(arrangedArrayController.get('length'), 1, 'array has 1 item');
  equal(arrangedArrayController.objectAt(0).name, 'Scumbag Dale', 'dale is the only one');

  set(arrangedArrayController.objectAt(0), 'id', 2);

  equal(arrangedArrayController.get('length'), 0, 'array has no items');
});

test("you can change a filter property and the content will be added", function() {
  equal(arrangedArrayController.get('length'), 1, 'array has 1 item');
  equal(arrangedArrayController.objectAt(0).name, 'Scumbag Dale', 'dale is the only one');

  set(unarrangedArray.objectAt(1), 'id', 1);

  equal(arrangedArrayController.get('length'), 2, 'array has two items');
  equal(arrangedArrayController.objectAt(0).name, 'Scumbag Dale', 'dale is there');
  equal(arrangedArrayController.objectAt(1).name, 'Scumbag Katz', 'katz is there');
});

module("Ember.Arrangeable with filterProperties and filterCondition", {
  setup: function() {
    Ember.run(function() {
      var array = [
        { id: 1, name: "Scumbag Dale" }, 
        { id: 2, name: "Scumbag Katz" }, 
        { id: 3, name: "Scumbag Bryn" }
      ];
      unarrangedArray = Ember.A(array);

      arrangedArrayController = Ember.ArrayProxy.createWithMixins(Ember.ArrangeableMixin, {
        filterProperties: [['id', 1]]
      });
    });
  },

  teardown: function() {
    Ember.run(function() {
      arrangedArrayController.destroy();
    });
  }
});

test("you can set content later and it will be filtered", function() {
  equal(arrangedArrayController.get('length'), 0, 'array has 0 items');

  Ember.run(function() {
    arrangedArrayController.set('content', unarrangedArray);
  });

  equal(arrangedArrayController.get('length'), 1, 'array has 1 item');
  equal(arrangedArrayController.objectAt(0).name, 'Scumbag Dale', 'dale is in the filtered array');
});

module("Ember.Arrangeable with bound content and filterProperties", {
  setup: function() {
    Ember.run(function() {
      var array = [{ id: 1 }, { id: 2 }, { id: null }];

      unarrangedArray = Ember.ArrayProxy.create({
        content: Ember.A(array)
      });

      arrangedArrayController = Ember.ArrayProxy.createWithMixins(Ember.ArrangeableMixin, {
        filterProperties: ['id'],
        unarrangedArray: unarrangedArray
      });

      var binding = new Ember.Binding('content', 'unarrangedArray');
      binding.connect(arrangedArrayController);
    });
  },

  teardown: function() {
    Ember.run(function() {
      arrangedArrayController.destroy();
    });
  }
});

test("the content can be bound to another ArrayProxy", function() {
  expect(2);
  equal( arrangedArrayController.get('content.length'), 3, 'the content is bound');
  equal( arrangedArrayController.get('length'), 2, 'the content is filtered');
});

test("the content of the original ArrayProxy can be swapped out", function() {
  expect(2);
  unarrangedArray.set('content', Ember.A([{id: 4},{id: null}]));
  equal( arrangedArrayController.get('content.length'), 2, 'the content updates');
  equal( arrangedArrayController.get('length'), 1, 'the updated content is filtered');
});

module("Ember.Arrangeable with sorting and filtering", {
  setup: function() {
    Ember.run(function() {
      var array = [
        { id: 1, name: "Scumbag Dale" },
        { id: 2, name: "Scumbag Katz" }, 
        { id: 3, name: "Scumbag Bryn" },
        { id: 4, name: "Scumbag Hawkins", include: true },
        { id: 5, name: "Scumbag Cowan", include: true }
      ];

      unarrangedArray = Ember.A(Ember.A(array).copy());

      arrangedArrayController = Ember.ArrayProxy.createWithMixins(Ember.ArrangeableMixin, {
        content: unarrangedArray,
        sortProperties: ['name'],
        filterProperties: ['include']
      });
    });
  },

  teardown: function() {
    Ember.run(function() {
      arrangedArrayController.set('content', null);
      arrangedArrayController.destroy();
    });
  }
});

test("the content is arranged correctly", function() {
  equal(arrangedArrayController.get('length'), 2, 'array filtered correctly');
  equal(arrangedArrayController.objectAt(0).name, 'Scumbag Cowan', 'array in natural order');
});

test("the content is still sorted when the filter properties change", function() {
  equal(arrangedArrayController.get('length'), 2, 'array not filtered correctly');
  equal(arrangedArrayController.objectAt(0).name, 'Scumbag Cowan', 'array in natural order');

  arrangedArrayController.set('filterProperties', []);

  equal(arrangedArrayController.get('length'), 5, 'array filtered correctly');
  equal(arrangedArrayController.objectAt(0).name, 'Scumbag Bryn', 'array in natural order');
  equal(arrangedArrayController.objectAt(4).name, 'Scumbag Katz', 'array in natural order');
});

test("the content is still filtered when the sort properties change", function() {
  equal(arrangedArrayController.get('length'), 2, 'array filtered correctly');
  equal(arrangedArrayController.objectAt(0).name, 'Scumbag Cowan', 'array in natural order');

  arrangedArrayController.set('sortProperties', ['id']);

  equal(arrangedArrayController.get('length'), 2, 'array filtered correctly');
  equal(arrangedArrayController.objectAt(0).name, 'Scumbag Hawkins', 'array in natural order');
  equal(arrangedArrayController.objectAt(1).name, 'Scumbag Cowan', 'array in natural order');
});

test("can add objects in filtered order and maintain sorting", function() {
  equal(arrangedArrayController.get('length'), 2, 'array filtered correctly');
  equal(arrangedArrayController.objectAt(0).name, 'Scumbag Cowan', 'array in natural order');

  unarrangedArray.pushObject({id: 6, name: 'Scumbag Melia', include: true});

  equal(arrangedArrayController.get('length'), 3, 'array filtered correctly');
  equal(arrangedArrayController.objectAt(2).name, 'Scumbag Melia', 'array in natural order');

  unarrangedArray.pushObject({id: 7, name: 'Scumbag Jones', include: false});

  equal(arrangedArrayController.get('length'), 3, 'array filtered correctly');
  equal(arrangedArrayController.objectAt(0).name, 'Scumbag Cowan', 'array in natural order');
});

test("can add objects in sorted order and maintain filtering", function() {
  equal(arrangedArrayController.get('length'), 2, 'array filtered correctly');
  equal(arrangedArrayController.objectAt(0).name, 'Scumbag Cowan', 'array in natural order');

  unarrangedArray.pushObject({id: 6, name: 'Scumbag Asikainen', include: true});

  equal(arrangedArrayController.get('length'), 3, 'array filtered correctly');
  equal(arrangedArrayController.objectAt(0).name, 'Scumbag Asikainen', 'array in natural order');

  unarrangedArray.pushObject({id: 7, name: 'Scumbag Shaw', include: true});

  equal(arrangedArrayController.get('length'), 4, 'array filtered correctly');
  equal(arrangedArrayController.objectAt(3).name, 'Scumbag Shaw', 'array in natural order');
});

test("changing a filter property maintains sorting", function() {
  equal(arrangedArrayController.get('length'), 2, 'array filtered correctly');
  equal(arrangedArrayController.objectAt(0).name, 'Scumbag Cowan', 'array in natural order');

  var content = arrangedArrayController.get('content');
  equal(get(content.objectAt(2), 'name'), "Scumbag Bryn", "Should be Erik Bryn");
  set(content.objectAt(2), 'include', true); // Scumbag Bryn

  equal(arrangedArrayController.get('length'), 3, 'array filtered correctly');
  equal(arrangedArrayController.objectAt(0).name, 'Scumbag Bryn', 'array did resort correctly');
});

test("changing a sort property maintains filtering", function() {
  equal(arrangedArrayController.get('length'), 2, 'array filtered correctly');
  equal(arrangedArrayController.objectAt(0).name, 'Scumbag Cowan', 'array in natural order');

  var content = arrangedArrayController.get('content');
  set(content.objectAt(3), 'name', "Adam"); // Scumbag Hawkins

  equal(arrangedArrayController.get('length'), 2, 'array filtered correctly');
  equal(arrangedArrayController.objectAt(0).name, 'Adam', 'array in natural order');
  equal(arrangedArrayController.objectAt(1).name, 'Scumbag Cowan', 'array in natural order');
});

test("changing the sort order maintains filtering", function() {
  equal(arrangedArrayController.get('length'), 2, 'array filtered correctly');
  equal(arrangedArrayController.objectAt(0).name, 'Scumbag Cowan', 'array in natural order');

  arrangedArrayController.set('sortAscending', false);

  equal(arrangedArrayController.get('length'), 2, 'array filtered correctly');
  equal(arrangedArrayController.objectAt(0).name, 'Scumbag Hawkins', 'array in natural order');
  equal(arrangedArrayController.objectAt(1).name, 'Scumbag Cowan', 'array in natural order');
});
