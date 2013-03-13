var get = Ember.get, set = Ember.set;

module("Ember.Groupable");

test("has no groups when there is no content", function() {
  var groupedArray = Ember.ArrayProxy.createWithMixins(Ember.GroupableMixin,{
    groupBy: 'kind',
  });

  var groups = get(groupedArray, 'groupedContent');

  ok(!groups, "Groups empty");
});

test("groups an array according to property", function() {
  var groupedArray = Ember.ArrayProxy.createWithMixins(Ember.GroupableMixin,{
    groupBy: 'kind',
    content: Ember.A([
      Ember.Object.create({kind: "car", name: "Mustang"}),
      Ember.Object.create({kind: "car", name: "Corvette"}),
      Ember.Object.create({kind: "fruit", name: "Apple"}),
      Ember.Object.create({kind: "fruit", name: "Orange"})
    ])
  });

  var groups = get(groupedArray, 'groupedContent');

  ok(groups, "Groups generated");

  var carGroup = groups.find(function(item) {
    return item.get('name') === 'car';
  });

  ok(carGroup, "Group generated from groupBy attribute");
  equal("Mustang", get(carGroup, 'firstObject.name'));

  equal(2, carGroup.get('length'));

  var fruitGroup = groups.find(function(item) {
    return item.get('name') === 'fruit';
  });

  ok(fruitGroup, "Group generated from groupBy attribute");
  equal("Apple", get(fruitGroup, 'firstObject.name'));

  equal(2, carGroup.get('length'));
});

test("regenerates groups when group property changes", function() {
  var groupedArray = Ember.ArrayProxy.createWithMixins(Ember.GroupableMixin,{
    groupBy: 'kind',
    content: Ember.A([
      Ember.Object.create({kind: "car", name: "Mustang"}),
      Ember.Object.create({kind: "car", name: "Corvette"}),
      Ember.Object.create({kind: "fruit", name: "Apple"}),
      Ember.Object.create({kind: "fruit", name: "Orange"})
    ])
  });

  var groups = get(groupedArray, 'groupedContent');

  equal(2, get(groups, 'length'));

  set(groupedArray, 'groupBy', 'name');

  equal(4, get(groups, 'length'), "Groups updated by property change");
});
