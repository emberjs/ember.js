var get = SC.get, set = SC.set, getPath = SC.getPath;

module("DS.Model");

var modelIsInState = function(model, stateName) {
  var state = getPath(model, 'stateManager.currentState');
  ok(state, "precond - there is a current state");
  var expected = getPath(model, 'stateManager.states.rootState.' + stateName);
  equals(state, expected, "the current state should be " + stateName);
};

test("a new DS.Model is in the empty state", function() {
  var model = DS.Model.create();
  modelIsInState(model, 'empty');
});

test("a DS.Model can receive data, which puts it into the loaded state", function() {
  var model = DS.Model.create();
  model.loadingData();
  model.setData({ scumbag: "tom" });
  modelIsInState(model, 'loaded');
});

var converts = function(type, provided, expected) {
  var model = DS.Model.create({
    name: DS.attr(type)
  });

  model.loadingData();
  model.setData({ name: provided });
  deepEqual(get(model, 'name'), expected, type + " coerces " + provided + " to " + expected);


  model = DS.Model.create({
    name: DS.attr(type)
  });

  model.loadingData();
  model.setData({});
  set(model, 'name', provided);
  deepEqual(get(model, 'name'), expected, type + " coerces " + provided + " to " + expected);
};

var convertsFromServer = function(type, provided, expected) {
  var model = DS.Model.create({
    name: DS.attr(type)
  });

  model.loadingData();
  model.setData({ name: provided });
  deepEqual(get(model, 'name'), expected, type + " coerces " + provided + " to " + expected);
};

var convertsWhenSet = function(type, provided, expected) {
  var model = DS.Model.create({
    name: DS.attr(type)
  });

  model.loadingData();
  model.setData({});

  set(model, 'name', provided);
  deepEqual(get(model, 'data').name, expected, type + " saves " + provided + " as " + expected);
};

test("a DS.Model can describe String attributes", function() {
  converts('string', "Scumbag Tom", "Scumbag Tom");
  converts('string', 1, "1");
  converts('string', null, null);
  converts('string', undefined, null);
  convertsFromServer('string', undefined, null);
});

test("a DS.Model can describe Integer attributes", function() {
  converts('integer', "1", 1);
  converts('integer', "0", 0);
  converts('integer', 1, 1);
  converts('integer', 0, 0);
  converts('integer', null, null);
  converts('integer', undefined, null);
  converts('integer', true, 1);
  converts('integer', false, 0);
});

test("a DS.Model can describe Boolean attributes", function() {
  converts('boolean', "1", true);
  converts('boolean', "", false);
  converts('boolean', 1, true);
  converts('boolean', 0, false);
  converts('boolean', null, false);
  converts('boolean', true, true);
  converts('boolean', false, false);
});

test("a DS.Model can describe Date attributes", function() {
  converts('date', null, null);
  converts('date', undefined, undefined);

  var dateString = "Sat, 31 Dec 2011 00:08:16 GMT";
  var date = new Date(dateString);

  var model = DS.Model.create({
    updatedAt: DS.attr('date')
  });

  model.loadingData();
  model.setData({});

  model.set('updatedAt', date);
  deepEqual(date, get(model, 'updatedAt'), "setting a date returns the same date");
  convertsFromServer('date', dateString, date);
  convertsWhenSet('date', date, dateString);
});

test("it can specify which key to use when looking up properties on the hash", function() {
  var model = DS.Model.create({
    name: DS.attr('string', { key: 'full_name' })
  });

  model.loadingData();
  model.setData({ name: "Steve", full_name: "Pete" });

  equals(get(model, 'name'), "Pete", "retrieves correct value");
});

var Person, store, array;

module("DS.Model updating", {
  setup: function() {
    array = [{ id: 1, name: "Scumbag Dale" }, { id: 2, name: "Scumbag Katz" }, { id: 3, name: "Scumbag Bryn" }];
    Person = DS.Model.extend({ name: DS.attr('string') });
    store = DS.Store.create();
    store.loadMany(Person, array);
  }
});

test("a DS.Model can update its attributes", function() {
  var person = store.find(Person, 2);

  set(person, 'name', "Brohuda Katz");
  equal(get(person, 'name'), "Brohuda Katz", "setting took hold");
});

test("it should modify the property of the hash specified by the `key` option", function() {
  var model = DS.Model.create({
    name: DS.attr('string', { key: 'full_name' })
  });

  model.loadingData();
  model.setData({ name: "Steve", full_name: "Pete" });

  model.set('name', "Colin");
  var data = model.get('data');
  equals(get(data, 'name'), "Steve", "did not modify name property");
  equals(get(data, 'full_name'), "Colin", "properly modified full_name property");
});

test("when a DS.Model updates its attributes, its changes affect its filtered Array membership", function() {
  var people = store.filter(Person, function(hash) {
    if (hash.name.match(/Katz$/)) { return true; }
  });

  equal(get(people, 'length'), 1, "precond - one item is in the ModelArray");

  var person = people.objectAt(0);

  equal(get(person, 'name'), "Scumbag Katz", "precond - the item is correct");

  set(person, 'name', "Yehuda Katz");

  equal(get(people, 'length'), 1, "there is still one item");
  equal(get(person, 'name'), "Yehuda Katz", "it has the updated item");

  set(person, 'name', "Yehuda Katz-Foo");

  equal(get(people, 'length'), 0, "there are now no items");
});

test("when a DS.Model is dirty, attempting to `load` new data raises an exception", function() {
  var yehuda = store.find(Person, 2);
  set(yehuda, 'name', "Yehuda Katz");

  raises(function() {
    store.load(Person, 2, { id: 2, name: "Scumhuda Katz" });
  });
});

module("with a simple Person model", {
  setup: function() {
    array = [{ id: 1, name: "Scumbag Dale" }, { id: 2, name: "Scumbag Katz" }, { id: 3, name: "Scumbag Bryn" }];
    Person = DS.Model.extend();
    store = DS.Store.create();
    store.loadMany(Person, array);
  }
});

test("when a DS.Model updates its attributes, its changes affect its filtered Array membership", function() {
  var people = store.filter(Person, function(hash) {
    if (hash.name.match(/Katz$/)) { return true; }
  });

  equal(get(people, 'length'), 1, "precond - one item is in the ModelArray");

  var person = people.objectAt(0);

  equal(get(person, 'name'), "Scumbag Katz", "precond - the item is correct");

  set(person, 'name', "Yehuda Katz");

  equal(get(people, 'length'), 1, "there is still one item");
  equal(get(person, 'name'), "Yehuda Katz", "it has the updated item");

  set(person, 'name', "Yehuda Katz-Foo");

  equal(get(people, 'length'), 0, "there are now no items");
});
