/**
 * Complex Nested Records (SC.Record) Unit Test
 *
 * @author Evin Grano
 */

// ..........................................................
// Basic Set up needs to move to the setup and teardown
// 
var NestedRecord, store, testParent; 

var initModels = function(){
  NestedRecord.Address = SC.Record.extend({
    street: SC.Record.attr(String),
    city: SC.Record.attr(String),
    state: SC.Record.attr(String, {defaultValue: 'VA'})
  });
  
  NestedRecord.Person = SC.Record.extend({
    /** Child Record Namespace */
    nestedRecordNamespace: NestedRecord,
    
    name: SC.Record.attr(String),
    address: SC.Record.toOne('NestedRecord.Address', { nested: true })
  });
  
  NestedRecord.ParentRecordTest = SC.Record.extend({
    /** Child Record Namespace */
    nestedRecordNamespace: NestedRecord,

    name: SC.Record.attr(String),
    person: SC.Record.toOne('NestedRecord.Person', { nested: true })
  });
};

// ..........................................................
// Basic SC.Record Stuff
// 
module("Basic SC.Record Functions w/ a Parent > Child > Child", {

  setup: function() {
    NestedRecord = SC.Object.create({
      store: SC.Store.create()
    });
    store = NestedRecord.store;
    initModels();
    SC.RunLoop.begin();
    testParent = store.createRecord(NestedRecord.ParentRecordTest, {
      name: 'Parent Name',
      person: {
        type: 'Person',
        name: 'Albert',
        address: {
          type: 'Address',
          street: '123 Sesame St',
          city: 'New York',
          state: 'NY'
        }
      }
    });
    SC.RunLoop.end();
  },

  teardown: function() {
    delete NestedRecord.ParentRecordTest;
    delete NestedRecord.Person;
    delete NestedRecord.Address;
    NestedRecord = null;
    testParent = null;
    store = null;
  }
});

test("Function: readAttribute() in the Parent Record",
function() {
  
  equals(testParent.readAttribute('name'), 'Parent Name', "readAttribute should be correct for name attribute");
  equals(testParent.readAttribute('nothing'), null, "readAttribute should be correct for invalid key");
  same(testParent.readAttribute('person'),   
    {
      type: 'Person',
      name: 'Albert',
      address: {
        type: 'Address',
        street: '123 Sesame St',
        city: 'New York',
        state: 'NY'
      }
    },
    "readAttribute should be correct for 'person' child attribute");
});

test("Function: readAttribute() in the Parent > Child",
function() {
  var person = testParent.get('person');
  ok(person, "check to see if the first child in the chain exists");
  equals(person.readAttribute('name'), 'Albert', "child readAttribute should be correct for name attribute");
  equals(person.readAttribute('nothing'), null, "child readAttribute should be correct for invalid key");
  same(person.readAttribute('address'),   
    {
      type: 'Address',
      street: '123 Sesame St',
      city: 'New York',
      state: 'NY'
    },
    "readAttribute should be correct for address on the child");
});

test("Function: readAttribute() in the Parent > Child > Child",
function() {
  var address = testParent.getPath('person.address');
  ok(address, "check to see if the child of the child in the chain exists with a getPath()");
  equals(address.readAttribute('street'), '123 Sesame St', "child readAttribute should be correct for street attribute w/ getPath()");
  equals(address.readAttribute('nothing'), null, "child readAttribute should be correct for invalid key w/ getPath()");
  
  // Test the individual gets
  var person = testParent.get('person');
  var address2 = person.get('address');
  ok(address2, "check to see if the child of the child in the chain exists with a get");
  equals(address2.readAttribute('street'), '123 Sesame St', "child readAttribute should be correct for street attribute w/ get()");
  equals(address2.readAttribute('nothing'), null, "child readAttribute should be correct for invalid key w/ get()");
});

test("Function: writeAttribute() in the Parent Record",
function() {
  
  testParent.writeAttribute('name', 'New Parent Name');
  equals(testParent.get('name'), 'New Parent Name', "writeAttribute should be the new name attribute");
  
  testParent.writeAttribute('nothing', 'nothing');
  equals(testParent.get('nothing'), 'nothing', "writeAttribute should be correct for new key");
  
  testParent.writeAttribute('person', 
  {
    type: 'Person',
    name: 'Al Gore',
    address: {
      type: 'Address',
      street: '123 Crazy St',
      city: 'Khacki Pants',
      state: 'Insanity'
    }
  });
  same(testParent.readAttribute('person'),   
    {
      type: 'Person',
      name: 'Al Gore',
      address: {
        type: 'Address',
        street: '123 Crazy St',
        city: 'Khacki Pants',
        state: 'Insanity'
      }
    },
    "writeAttribute with readAttribute should be correct for person child attribute");
});

test("Function: writeAttribute() in the Parent > Child",
function() {  
  var person = testParent.get('person');
  person.writeAttribute('name', 'Luke Skywalker');
  equals(person.readAttribute('name'), 'Luke Skywalker', "writeAttribute should be the new name attribute on the child");
  var p = testParent.readAttribute('person');
  equals(p.name, 'Luke Skywalker', "check to see if a writeAttribute single change on the child will reflect on the parent");
  
  // check for a change on the child of the child
  var newAddress = {
    type: 'Address',
    street: '1 Way Street',
    city: 'Springfield',
    state: 'IL'
  };
  person.writeAttribute('address', newAddress);
  same(person.readAttribute('address'), {
    type: 'Address',
    street: '1 Way Street',
    city: 'Springfield',
    state: 'IL'
  }, "writeAttribute should be the new address attribute on the child");
  p = testParent.readAttribute('person');
  same(p.address, {
    type: 'Address',
    street: '1 Way Street',
    city: 'Springfield',
    state: 'IL'
  }, "check to see if a writeAttribute address change on the child will reflect on the parent");
});

test("Function: writeAttribute() in the Parent > Child > Child",
function() {  
  var address = testParent.getPath('person.address');
  address.writeAttribute('street', '1 Death Star Lane');
  equals(address.readAttribute('street'), '1 Death Star Lane', "writeAttribute should be the new name attribute on the child.street");
  // Now, test the person
  var p = testParent.readAttribute('person');
  equals(p.address.street, '1 Death Star Lane', "check to see if a writeAttribute change on the child will reflect on the child > child.address.street");
  // now test the Parent record
  var parentAttrs = testParent.get('attributes');
  equals(parentAttrs.person.address.street, '1 Death Star Lane', "check to see if a writeAttribute change on the child will reflect on the child > child > parent.attributes.person.address.street");
});

test("Basic Read",
function() {
  
  // Test general gets
  equals(testParent.get('name'), 'Parent Name', "Parent.get() should be correct for name attribute");
  equals(testParent.get('nothing'), null, "Parent.get() should be correct for invalid key");
  
  // Test Child Record creation
  var p = testParent.get('person');
  // Check Model Class information
  ok(SC.kindOf(p, SC.Record), "(parent > child).get() creates an actual instance that is a kind of a SC.Record Object");
  ok(SC.instanceOf(p, NestedRecord.Person), "(parent > child).get() creates an actual instance of a Person Object");
  
  // Check reference information
  var pm = p.get('primaryKey');
  var pKey = p.get(pm);
  var storeRef = store.find(NestedRecord.Person, pKey);
  ok(storeRef, 'checking that the store has the instance of the child record with proper primary key');
  equals(p, storeRef, "checking the parent reference is the same as the direct store reference");
  same(storeRef.get('attributes'), testParent.readAttribute('person'), "check that the ChildRecord's attributes are the same as the parent.person's readAttribute for the reference");
  
  var a = testParent.getPath('person.address');
  // Check Model Class information
  ok(SC.kindOf(a, SC.Record), "(parent > child > child) w/ getPath() creates an actual instance that is a kind of a SC.Record Object");
  ok(SC.instanceOf(a, NestedRecord.Address), "(parent > child > child) w/ getPath() creates an actual instance of an Address Object");
  
  // Check reference information
  var aKey = a.get(pm);
  storeRef = store.find(NestedRecord.Address, aKey);
  ok(storeRef, 'checking that the store has the instance of the (parent > child > child) record with proper primary key');
  equals(a, storeRef, "checking the (parent > child > child) reference is the same as the direct store reference");
  same(storeRef.get('attributes'), p.readAttribute('address'), "check that the ChildRecord's attributes are the same as the (parent > child.address)'s readAttribute for the reference");
});

test("Basic Write",
function() {
  var oldP, p, key, oldKey, storeRef;
  var pm, a, parentAttrs;
  // Test general gets
  testParent.set('name', 'New Parent Name');
  equals(testParent.get('name'), 'New Parent Name', "set() should change name attribute");
  testParent.set('nothing', 'nothing');
  equals(testParent.get('nothing'), 'nothing', "set should change non-existent property to a new property");
  
  // Test Child Record creation
  oldP = testParent.get('person');
  testParent.set('person', {
    type: 'Person',
    name: 'Al Gore',
    address: {
      type: 'Address',
      street: '123 Crazy St',
      city: 'Khacki Pants',
      state: 'Insanity'
    }
  });
  p = testParent.get('person');
  // Check Model Class information
  ok(SC.kindOf(p, SC.Record), "set() with an object creates an actual instance that is a kind of a SC.Record Object");
  ok(SC.instanceOf(p, NestedRecord.Person), "set() with an object creates an actual instance of a ChildRecordTest Object");
  
  // Check reference information
  pm = p.get('primaryKey');
  key = p.get(pm);
  storeRef = store.find(NestedRecord.Person, key);
  ok(storeRef, 'after a set() with an object, checking that the store has the instance of the child record with proper primary key');
  equals(p, storeRef, "after a set with an object, checking the parent reference is the same as the direct store reference");
  oldKey = oldP.get(pm);
  ok(!(oldKey === key), 'check to see that the old child record has a different key from the new child record');
  
  // Check for changes on the child bubble to the parent.
  p.set('name', 'Child Name Change');
  equals(p.get('name'), 'Child Name Change', "after a set('name', <new>) on child, checking that the value is updated");
  ok(p.get('status') & SC.Record.DIRTY, 'check that the child record is dirty');
  ok(testParent.get('status') & SC.Record.DIRTY, 'check that the parent record is dirty');
  oldP = p;
  p = testParent.get('person');
  same(p, oldP, "after a set('name', <new>) on child, checking to see that the parent has recieved the changes from the child record");
  same(testParent.readAttribute('person'), p.get('attributes'), "after a set('name', <new>) on child, readAttribute on the parent should be correct for info child attributes");
  
  // Check changes on the address
  a = testParent.getPath('person.address');
  a.set('street', '321 Nutty Professor Lane');
  parentAttrs = testParent.readAttribute('person');
  same(a.get('attributes'), parentAttrs.address, "after a set('street', <new>) on address child, checking to see that the parent has recieved the changes from the child record");
});

test("Basic normalize()", function() {
  var pAttrs;
  testParent.set('person', {
    type: 'Person',
    name: 'Al Gore',
    address: {
      type: 'Address',
      street: '123 Crazy St',
      city: 'Khacki Pants'
    }
  });
  testParent.normalize();
  pAttrs = testParent.get('attributes');
  equals(pAttrs.person.address.state, 'VA', "test normalization is the default value of VA");
});

