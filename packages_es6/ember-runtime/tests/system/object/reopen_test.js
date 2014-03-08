import {get} from "ember-metal/property_get";
import EmberObject from "ember-runtime/system/object";

module('system/core_object/reopen');

test('adds new properties to subclass instance', function() {

  var Subclass = EmberObject.extend();
  Subclass.reopen({
    foo: function() { return 'FOO'; },
    bar: 'BAR'
  });

  equal( new Subclass().foo(), 'FOO', 'Adds method');
  equal(get(new Subclass(), 'bar'), 'BAR', 'Adds property');
});

test('reopened properties inherited by subclasses', function() {

  var Subclass = EmberObject.extend();
  var SubSub = Subclass.extend();

  Subclass.reopen({
    foo: function() { return 'FOO'; },
    bar: 'BAR'
  });


  equal( new SubSub().foo(), 'FOO', 'Adds method');
  equal(get(new SubSub(), 'bar'), 'BAR', 'Adds property');
});

// We plan to allow this in the future
test('does not allow reopening already instantiated classes', function() {
  var Subclass = EmberObject.extend();

  Subclass.create();

  Subclass.reopen({
    trololol: true
  });

  equal(Subclass.create().get('trololol'), true, "reopen works");
});
