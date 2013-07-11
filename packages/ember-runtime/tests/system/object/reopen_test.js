module('system/core_object/reopenClass');

test('adds new properties to subclass instance', function() {

  var Subclass = Ember.Object.extend();
  Subclass.reopen({
    foo: function() { return 'FOO'; },
    bar: 'BAR'
  });

  equal( new Subclass().foo(), 'FOO', 'Adds method');
  equal(Ember.get(new Subclass(), 'bar'), 'BAR', 'Adds property');
});

test('reopened properties inherited by subclasses', function() {

  var Subclass = Ember.Object.extend();
  var SubSub = Subclass.extend();

  Subclass.reopen({
    foo: function() { return 'FOO'; },
    bar: 'BAR'
  });


  equal( new SubSub().foo(), 'FOO', 'Adds method');
  equal(Ember.get(new SubSub(), 'bar'), 'BAR', 'Adds property');
});

// We plan to allow this in the future
test('does not allow reopening already instantiated classes', function() {
  var Subclass = Ember.Object.extend();

  Subclass.create();

  Subclass.reopen({
    trololol: true
  });

  equal(Subclass.create().get('trololol'), true, "reopen works");
});

test('reopen adds properties to classes of already created instances', function() {
  var klass = Ember.Object.extend();

  var object = klass.create();

  klass.reopen({
    added: true
  });

  // works fine if you uncomment this line
  //var somethingElse = klass.create();

  equal(object.get('added'), true, "reopen works");
});
