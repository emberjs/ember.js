var get = Ember.get, set = Ember.set;

module('Ember.Groupable');

test('has no groups when there is no content', function() {
  var groupedArray = Ember.ArrayProxy.createWithMixins(Ember.GroupableMixin,{
    groupBy: 'kind'
  });

  var groups = get(groupedArray, 'groupedContent');

  ok(Ember.isEmpty(groups), 'Groups empty');
});

test('does not blow up when there is no group property', function() {
  var groupedArray = Ember.ArrayProxy.createWithMixins(Ember.GroupableMixin,{
    content: Ember.A([
      Ember.Object.create({kind: 'car', name: 'Mustang'}),
      Ember.Object.create({kind: 'car', name: 'Corvette'}),
      Ember.Object.create({kind: 'fruit', name: 'Apple'}),
      Ember.Object.create({kind: 'fruit', name: 'Orange'})
    ])
  });

  ok(Ember.isEmpty(get(groupedArray, 'groupedContent')), 'No groups');
});

test('when the group property is null', function() {
  var groupedArray = Ember.ArrayProxy.createWithMixins(Ember.GroupableMixin,{
    groupBy: 'foo',
    content: Ember.A([
      Ember.Object.create({kind: 'car', name: 'Mustang'}),
      Ember.Object.create({kind: 'car', name: 'Corvette'}),
      Ember.Object.create({kind: 'fruit', name: 'Apple'}),
      Ember.Object.create({kind: 'fruit', name: 'Orange'})
    ])
  });

  ok(Ember.isEmpty(get(groupedArray, 'groupedContent')), 'No groups');
});

test('groups an array according to property', function() {
  var groupedArray = Ember.ArrayProxy.createWithMixins(Ember.GroupableMixin,{
    groupBy: 'kind',
    content: Ember.A([
      Ember.Object.create({kind: 'car', name: 'Mustang'}),
      Ember.Object.create({kind: 'car', name: 'Corvette'}),
      Ember.Object.create({kind: 'fruit', name: 'Apple'}),
      Ember.Object.create({kind: 'fruit', name: 'Orange'})
    ])
  });

  var groups = get(groupedArray, 'groupedContent');

  ok(groups, 'Groups generated');

  var carGroup = groups.find(function(item) {
    return item.get('name') === 'car';
  });

  ok(carGroup, 'Group generated from groupBy attribute');
  equal('Mustang', get(carGroup, 'firstObject.name'));

  equal(carGroup.get('length'), 2);

  var fruitGroup = groups.find(function(item) {
    return item.get('name') === 'fruit';
  });

  ok(fruitGroup, 'Group generated from groupBy attribute');
  equal('Apple', get(fruitGroup, 'firstObject.name'));

  equal(carGroup.get('length'), 2);
});

test('regenerates groups when group property changes', function() {
  var groupedArray = Ember.ArrayProxy.createWithMixins(Ember.GroupableMixin,{
    groupBy: 'kind',
    content: Ember.A([
      Ember.Object.create({kind: 'car', name: 'Mustang'}),
      Ember.Object.create({kind: 'car', name: 'Corvette'}),
      Ember.Object.create({kind: 'fruit', name: 'Apple'}),
      Ember.Object.create({kind: 'fruit', name: 'Orange'})
    ])
  });

  equal(get(groupedArray, 'groupedContent.length'), 2);

  set(groupedArray, 'groupBy', 'name');

  equal(get(groupedArray, 'groupedContent.length'), 4, 'Groups updated by property change');
});

test('updates groups when an object is added', function() {
  var groupedArray = Ember.ArrayProxy.createWithMixins(Ember.GroupableMixin,{
    groupBy: 'kind',
    content: Ember.A([
      Ember.Object.create({kind: 'car', name: 'Mustang'}),
      Ember.Object.create({kind: 'car', name: 'Corvette'}),
      Ember.Object.create({kind: 'fruit', name: 'Apple'}),
      Ember.Object.create({kind: 'fruit', name: 'Orange'})
    ])
  });

  var beer = Ember.Object.create({kind: 'drink', name: 'Beer'});

  equal(get(groupedArray, 'groupedContent.length'), 2);

  groupedArray.pushObject(beer);

  equal(get(groupedArray, 'groupedContent.length'), 3, 'Groups changed when adding');
});

test('updates groups when an object is removed', function() {
  var beer = Ember.Object.create({kind: 'drink', name: 'Beer'});

  var groupedArray = Ember.ArrayProxy.createWithMixins(Ember.GroupableMixin,{
    groupBy: 'kind',
    content: Ember.A([
      Ember.Object.create({kind: 'car', name: 'Mustang'}),
      Ember.Object.create({kind: 'car', name: 'Corvette'}),
      Ember.Object.create({kind: 'fruit', name: 'Apple'}),
      Ember.Object.create({kind: 'fruit', name: 'Orange'}),
      beer
    ])
  });

  equal(get(groupedArray, 'groupedContent.length'), 3);

  groupedArray.removeObject(beer);

  equal(get(groupedArray, 'groupedContent.length'), 2, 'Groups changed when removing');
});

test('updates groups when content itself changes', function() {
  var beer = Ember.Object.create({kind: 'drink', name: 'Beer'});

  var groupedArray = Ember.ArrayProxy.createWithMixins(Ember.GroupableMixin,{
    groupBy: 'kind',
    content: Ember.A([
      Ember.Object.create({kind: 'car', name: 'Mustang'}),
      Ember.Object.create({kind: 'car', name: 'Corvette'}),
      Ember.Object.create({kind: 'fruit', name: 'Apple'}),
      Ember.Object.create({kind: 'fruit', name: 'Orange'})
    ])
  });

  equal(get(groupedArray, 'groupedContent.length'), 2);

  set(groupedArray, 'content', Ember.A([beer]));
  equal(get(groupedArray, 'groupedContent.length'), 1, 'Groups changed when content changed');
});

test('updates groups when underlying property changes', function() {
  var beer = Ember.Object.create({kind: 'drink', name: 'Beer'});
  var music = Ember.Object.create({kind: 'music', name: 'Trance'});

  var groupedArray = Ember.ArrayProxy.createWithMixins(Ember.GroupableMixin,{
    groupBy: 'kind',
    content: Ember.A([
      Ember.Object.create({kind: 'car', name: 'Mustang'}),
      Ember.Object.create({kind: 'car', name: 'Corvette'}),
      Ember.Object.create({kind: 'fruit', name: 'Apple'}),
      Ember.Object.create({kind: 'fruit', name: 'Orange'}),
      beer
    ])
  });

  equal(get(groupedArray, 'groupedContent.length'), 3);

  set(beer, 'kind', 'car');
  equal(get(groupedArray, 'groupedContent.length'), 2, 'Groups changed when the property changes');

  groupedArray.pushObject(music);
  equal(get(groupedArray, 'groupedContent.length'), 3);

  set(music, 'kind', 'car');
  equal(get(groupedArray, 'groupedContent.length'), 2, 'Groups changed when the property changes');
});
