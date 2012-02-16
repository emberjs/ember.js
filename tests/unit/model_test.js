var get = Ember.get, set = Ember.set, getPath = Ember.getPath;

module("DS.Model");

var modelIsInState = function(model, stateName) {
  var state = getPath(model, 'stateManager.currentState');
  ok(state, "precond - there is a current state");
  var expected = getPath(model, 'stateManager.states.rootState.' + stateName);
  equal(state, expected, "the current state should be " + stateName);
};

test("a new DS.Model is in the empty state", function() {
  var model = DS.Model._create();
  modelIsInState(model, 'empty');
});

test("a DS.Model can receive data, which puts it into the loaded state", function() {
  var model = DS.Model._create();
  model.send('loadingData');
  model.send('setData', { scumbag: "tom" });
  modelIsInState(model, 'loaded.saved');
});

test("can have a property set on it", function() {
  var model = DS.Model._create();
  set(model, 'foo', 'bar');

  equal(get(model, 'foo'), 'bar', "property was set on the model");
});

test("a record reports its unique id via the `id` property", function() {
  var record = DS.Model._create();
  record.send('setData', { id: 1 });
  equal(get(record, 'id'), 1, "reports id as id by default");

  record = DS.Model._create({
    primaryKey: 'foobar'
  });
  record.send('setData', { id: 1, foobar: 2 });
  equal(get(record, 'id'), 2, "reports id as foobar when primaryKey is set");
});

var converts = function(type, provided, expected) {
  var model = DS.Model._create({
    name: DS.attr(type)
  });

  model.send('loadingData');
  model.send('setData', { name: provided });
  deepEqual(get(model, 'name'), expected, type + " coerces " + provided + " to " + expected);


  model = DS.Model._create({
    name: DS.attr(type)
  });

  model.send('loadingData');
  model.send('setData', {});
  set(model, 'name', provided);
  deepEqual(get(model, 'name'), expected, type + " coerces " + provided + " to " + expected);
};

var convertsFromServer = function(type, provided, expected) {
  var model = DS.Model._create({
    name: DS.attr(type)
  });

  model.send('loadingData');
  model.send('setData', { name: provided });
  deepEqual(get(model, 'name'), expected, type + " coerces " + provided + " to " + expected);
};

var convertsWhenSet = function(type, provided, expected) {
  var model = DS.Model._create({
    name: DS.attr(type)
  });

  model.send('loadingData');
  model.send('setData', {});

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

  var model = DS.Model._create({
    updatedAt: DS.attr('date')
  });

  model.send('loadingData');
  model.send('setData', {});

  model.set('updatedAt', date);
  deepEqual(date, get(model, 'updatedAt'), "setting a date returns the same date");
  convertsFromServer('date', dateString, date);
  convertsWhenSet('date', date, dateString);
});

test("it can specify which key to use when looking up properties on the hash", function() {
  var model = DS.Model._create({
    name: DS.attr('string', { key: 'full_name' })
  });

  model.send('loadingData');
  model.send('setData', { name: "Steve", full_name: "Pete" });

  equal(get(model, 'name'), "Pete", "retrieves correct value");
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
  var model = DS.Model._create({
    name: DS.attr('string', { key: 'full_name' })
  });

  model.send('loadingData');
  model.send('setData', { name: "Steve", full_name: "Pete" });

  model.set('name', "Colin");
  var data = model.get('data');
  equal(get(data, 'name'), "Steve", "did not modify name property");
  equal(get(data, 'full_name'), "Colin", "properly modified full_name property");
});

test("when a DS.Model updates its attributes, its changes affect its filtered Array membership", function() {
  var people = store.filter(Person, function(hash) {
    if (hash.name.match(/Katz$/)) { return true; }
  });

  equal(get(people, 'length'), 1, "precond - one item is in the ModelArray");

  var person = people.objectAt(0);

  equal(get(person, 'name'), "Scumbag Katz", "precond - the item is correct");

  Ember.run(function() {
    set(person, 'name', "Yehuda Katz");
  });

  equal(get(people, 'length'), 1, "there is still one item");
  equal(get(person, 'name'), "Yehuda Katz", "it has the updated item");

  Ember.run(function() {
    set(person, 'name', "Yehuda Katz-Foo");
  });

  equal(get(people, 'length'), 0, "there are now no items");
});

module("with a simple Person model", {
  setup: function() {
    array = [{ id: 1, name: "Scumbag Dale" }, { id: 2, name: "Scumbag Katz" }, { id: 3, name: "Scumbag Bryn" }];
    Person = DS.Model.extend({
      name: DS.attr('string')
    });
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

  Ember.run(function() {
    set(person, 'name', "Yehuda Katz");
  });

  equal(get(people, 'length'), 1, "there is still one item");
  equal(get(person, 'name'), "Yehuda Katz", "it has the updated item");

  Ember.run(function() {
    set(person, 'name', "Yehuda Katz-Foo");
  });

  equal(get(people, 'length'), 0, "there are now no items");
});

test("when a new record depends on the state of another record, it enters the pending state", function() {
  var Comment = DS.Model.extend();

  var parentComment = store.createRecord(Comment);
  var childComment = store.createRecord(Comment);

  childComment.waitingOn(parentComment);

  equal(get(childComment, 'isPending'), true, "Child comment is pending on the parent comment");

  parentComment.send('willCommit');
  parentComment.send('setData', { id: 'foo' });
  parentComment.send('didCommit');

  equal(get(parentComment, 'isLoaded'), true, "precond - Parent comment is loaded");
  equal(get(parentComment, 'isDirty'), false, "precond - Parent comment is not dirty");
  equal(get(childComment, 'isPending'), false, "Child comment is no longer pending on the parent comment");
});

test("when an updated record depends on the state of another record, it enters the pending state", function() {
  var Comment = DS.Model.extend({
    title: DS.attr('string')
  });

  var parentComment = store.createRecord(Comment);
  var childComment = store.createRecord(Comment);

  childComment.send('willCommit');
  childComment.send('setData', {});
  childComment.send('didCommit');

  childComment.set('title', "foo");

  equal(childComment.get('isDirty'), true, "precond - record is marked as dirty");
  equal(childComment.get('isNew'), false, "precond - record is not new");

  childComment.waitingOn(parentComment);

  equal(get(childComment, 'isPending'), true, "Child comment is pending on the parent comment");

  parentComment.send('willCommit');
  parentComment.send('setData', { id: 'foo' });
  parentComment.send('didCommit');

  equal(get(parentComment, 'isLoaded'), true, "precond - Parent comment is loaded");
  equal(get(parentComment, 'isDirty'), false, "precond - Parent comment is not dirty");
  equal(get(childComment, 'isPending'), false, "Child comment is no longer pending on the parent comment");
});

test("when a loaded record depends on the state of another record, it enters the updated pending state", function() {
  var Comment = DS.Model.extend({
    title: DS.attr('string')
  });

  var parentComment = store.createRecord(Comment);
  var childComment = store.createRecord(Comment);

  childComment.send('willCommit');
  childComment.send('setData', {});
  childComment.send('didCommit');

  equal(childComment.get('isDirty'), false, "precond - record is not marked as dirty");
  equal(childComment.get('isNew'), false, "precond - record is not new");

  childComment.waitingOn(parentComment);

  equal(get(childComment, 'isDirty'), true, "child comment is marked as dirty once a dependency has been created");
  equal(get(childComment, 'isPending'), true, "Child comment is pending on the parent comment");

  parentComment.send('willCommit');
  parentComment.send('setData', { id: 'foo' });
  parentComment.send('didCommit');

  equal(get(parentComment, 'isLoaded'), true, "precond - Parent comment is loaded");
  equal(get(parentComment, 'isDirty'), false, "precond - Parent comment is not dirty");
  equal(get(childComment, 'isPending'), false, "Child comment is no longer pending on the parent comment");
});

test("when a record depends on another record, we can delete the first record and finish loading the second record", function() {
  var Comment = DS.Model.extend({
    title: DS.attr('string')
  });

  var parentComment = store.createRecord(Comment);
  var childComment = store.createRecord(Comment);

  childComment.waitingOn(parentComment);
  childComment.deleteRecord();

  equal(get(childComment, 'isDeleted'), true, "child record is marked as deleted");
  equal(get(parentComment, 'isDirty'), true, "parent comment has not yet been saved");

  parentComment.send('willCommit');
  parentComment.send('setData', { id: 'foo' });
  parentComment.send('didCommit');

  equal(get(parentComment, 'isDirty'), false, "parent comment has been saved");

  ok(true, "no exception was thrown");
});
