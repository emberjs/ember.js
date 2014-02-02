/**
 * Nested Record Array (SC.ChildRecord) Unit Test
 *
 * @author Evin Grano
 */

// ..........................................................
// Basic Set up needs to move to the setup and teardown
//
var NestedRecord, store, testParent, peopleData1, peopleData2, personData1, addressData1;

var initModels = function(){
  NestedRecord.Group = SC.Record.extend({
    /** Child Record Namespace */
    nestedRecordNamespace: NestedRecord,

    name: SC.Record.attr(String),
    people: SC.Record.toMany('NestedRecord.Person', { nested: true })
  });

  NestedRecord.Person = SC.Record.extend({
    /** Child Record Namespace */
    nestedRecordNamespace: NestedRecord,

    name: SC.Record.attr(String),
    addresses: SC.Record.toMany('NestedRecord.Address', { nested: true })
  });

  NestedRecord.Address = SC.Record.extend({
    street: SC.Record.attr(String),
    city: SC.Record.attr(String),
    state: SC.Record.attr(String, {defaultValue: "VA"})
  });
};

// ..........................................................
// Basic SC.ParentRecord with an Array of Children
//
module("Complex SC.Record: Parent > Array of Children > Array of Children", {

  setup: function() {
    NestedRecord = SC.Object.create({
      store: SC.Store.create()
    });
    window.NestedRecord = NestedRecord;
    store = NestedRecord.store;
    initModels();
    SC.RunLoop.begin();
    testParent = store.createRecord(NestedRecord.Group, {
      name: 'Test Group',
      people: [
        {
          type: 'Person',
          name: 'Barack Obama',
          addresses: [
            { type: 'Address', street: '123 Some Street', city: 'Chicago', state: 'IL'},
            { type: 'Address', street: '222 Socialist Way ', city: 'Washington', state: 'DC'}
          ]
        },
        {
          type: 'Person',
          name: 'John Doe',
          addresses: [
            { type: 'Address', street: '1111 Cross Street', city: 'Anywhere', state: 'CA'},
            { type: 'Address', street: '555 18th Street ', city: 'Boulder', state: 'CO'},
            { type: 'Address', street: '444 Goofy Street ', city: 'Redneck', state: 'AR'}
          ]
        },
        {
          type: 'Person',
          name: 'Jane Doe',
          addresses: [
            { type: 'Address', street: '987 Crispy Kreme Lane', city: 'Lard', state: 'TX'}
          ]
        }
      ]
    });
    SC.RunLoop.end();
    // Second Array for testings
    peopleData2 = [
      {
        type: 'Person',
        name: 'Tom Jones',
        addresses: [
          { type: 'Address', street: '1 Freezing Circle', city: 'Nome', state: 'AK'},
          { type: 'Address', street: '444 Not Unusual Love Place', city: 'Las Vegas', state: 'NV'},
          { type: 'Address', street: '66 On The Road', city: 'Touring', state: 'Anywhere'}
        ]
      },
      {
        type: 'Person',
        name: 'Dick Smothers',
        addresses: [
          { type: 'Address', street: '1 Mom Likes Best Place', city: 'Tujunga', state: 'CA'}
        ]
      }
    ];

    personData1 = {
      type: 'Person',
      name: 'Testikles, God Of Fertility',
      addresses: [
        { type: 'Address', street: '45 Gods and Goddess Place', city: 'Mount', state: 'Olympus'},
        { type: 'Address', street: '1 Special Circle', city: 'Your Mom', state: 'Your State'}
      ]
    };

    // Address Test Data
    addressData1 = [
      { type: 'Address', street: '1 Main Street', city: 'Greenbow', state: 'AL'},
      { type: 'Address', street: '666 Wall Street', city: 'New York', state: 'NY'},
      { type: 'Address', street: '4 Dirt Road', city: 'Pleasent', state: 'CO'},
      { type: 'Address', street: '1 Yellow Brick Road', city: 'Dorothy', state: 'KA'}
    ];
  },

  teardown: function() {
    delete NestedRecord.Group;
    delete NestedRecord.Person;
    delete NestedRecord.Address;
    //delete window.NestedRecord;
    NestedRecord = null;
    testParent = null;
    peopleData1 = null;
    peopleData2 = null;
    personData1 = null;
    addressData1 = null;
    store = null;
  }
});

test("Function: readAttribute()", function() {
  var ppl;
  ppl = testParent.readAttribute('people');
  ok(ppl, "check to see that the child records array exists");
  equals(ppl.length, 3, "checking to see that the length of the elements array is 3");

  // Check the first person
  equals(ppl[0].name, 'Barack Obama', "first person, check to see name is Barack Obama");
  equals(ppl[0].addresses.length, 2, "first person, check to see length of the addresses is 2");
  same(ppl[0].addresses[0], { type: 'Address', street: '123 Some Street', city: 'Chicago', state: 'IL'},
    "check to see if the first person's first address is as expected");
  same(ppl[0].addresses[1], { type: 'Address', street: '222 Socialist Way ', city: 'Washington', state: 'DC'},
    "check to see if the first person's last address is as expected");

  // Check Last person
  equals(ppl[2].name, 'Jane Doe', "last person, check to see name is Jane Doe");
  equals(ppl[2].addresses.length, 1, "last person, check to see length of the addresses is 2");
  same(ppl[2].addresses[0], { type: 'Address', street: '987 Crispy Kreme Lane', city: 'Lard', state: 'TX'},
    "check to see if the last person's first address is as expected");
});

test("Function: writeAttribute()", function() {
  var ppl;
  testParent.writeAttribute('people', peopleData2);
  ppl = testParent.readAttribute('people');
  ok(ppl, "after writeAttribute(), check to see that the child records array exists");
  equals(ppl.length, 2, "after writeAttribute(), checking to see that the length of the elements array is 2");

  // Check the first person
  equals(ppl[0].name, 'Tom Jones', "first person, check to see name is Tom Jones");
  equals(ppl[0].addresses.length, 3, "first person, check to see length of the addresses is 3");
  same(ppl[0].addresses[0], { type: 'Address', street: '1 Freezing Circle', city: 'Nome', state: 'AK'},
    "check to see if the first person's first address is as expected");
  same(ppl[0].addresses[2], { type: 'Address', street: '66 On The Road', city: 'Touring', state: 'Anywhere'},
    "check to see if the first person's last address is as expected");

  // Check Last person
  equals(ppl[1].name, 'Dick Smothers', "last person, check to see name is Dick Smothers");
  equals(ppl[1].addresses.length, 1, "last person, check to see length of the addresses is 2");
  same(ppl[1].addresses[0], { type: 'Address', street: '1 Mom Likes Best Place', city: 'Tujunga', state: 'CA'},
    "check to see if the last person's first address is as expected");

});

test("Basic Read, Testing the First Child Array", function() {
  var ppl, pplAttr, pplDup, p, pDup, pStore, key, oldKey;
  // Test general gets
  equals(testParent.get('name'), 'Test Group', "get should be correct for name attribute: Test Group");
  equals(testParent.get('nothing'), null, "get should be correct for invalid key");

  // Test Person (Child Record) creation
  ppl = testParent.get('people');
  // Check Model Class information

  ok(SC.instanceOf(ppl, SC.ChildArray), "check that get() creates an actual instance of a SC.ChildArray");
  equals(ppl.get('length'), 3, "check that the length of the array of child records is 3");
  p = ppl.objectAt(0);
  ok(SC.kindOf(p, SC.Record), "check that first ChildRecord from the get() creates an actual instance that is a kind of a SC.Record Object");
  ok(SC.instanceOf(p, NestedRecord.Person), "check that first ChildRecord from the get() creates an actual instance of a Person Object");

  // Check reference information
  key = p.get('id');
  pStore = store.find(NestedRecord.Person, key);
  ok(pStore, 'check that first ChildRecord that the store has the instance of the child record with proper primary key');
  equals(p, pStore, "check the parent reference to the first child is the same as the direct store reference");

  // Check to see if the attributes of a Child Record match the reference of the parent
  pplAttr = testParent.readAttribute('people');
  ok(!SC.instanceOf(pplAttr, SC.ChildArray), "check that readAttribute() does not create an actual instance of a SC.ChildArray");
  same(pplAttr[0], pStore.get('attributes'), "check that the ChildRecord's attributes are the same as the ParentRecord's readAttribute for the reference");

  // Duplication check
  pplDup = testParent.get('people');
  ok(pplDup, 'check to see that we get an array on the second call to the parent for the child records');
  equals(pplDup.get('length'), 3, "check that the length of the array of child records is still 3");
  pDup = pplDup.objectAt(0);
  ok(pDup, "check to see if we have an instance of a child record again");
  oldKey = p.get('id');
  key = pDup.get('id');
  equals(key, oldKey, "check to see if the primary keys are the same");
  equals(SC.guidFor(pDup), SC.guidFor(p), "check to see if the guid are the same");
  same(pDup, p, "check to see that it is the same child record as before");
});

test("Basic Read, Testing the Second Child Array", function() {
  var pDup, pStore;
  var ppl, pplAttr, p, addrs, addrsDup, addrsAttr, a, aDup, aStore, key, oldKey;

  // Test Addresses (Child Record) creation
  ppl = testParent.get('people');
  p = ppl.objectAt(0);
  addrs = p.get('addresses');
  // Check Model Class information

  ok(SC.instanceOf(addrs, SC.ChildArray), "check that get() creates an actual instance of a SC.ChildArray");
  equals(addrs.get('length'), 2, "check that the length of the array of child records is 2");
  a = addrs.objectAt(0);
  ok(SC.kindOf(a, SC.Record), "check that first ChildRecord from the get() creates an actual instance that is a kind of a SC.Record Object");
  ok(SC.instanceOf(a, NestedRecord.Address), "check that first ChildRecord from the get() creates an actual instance of a Address Object");

  // Check reference information
  key = a.get('id');
  aStore = store.find(NestedRecord.Address, key);
  ok(aStore, 'check that first ChildRecord that the store has the instance of the child record with proper primary key');
  equals(a, aStore, "check the parent reference to the first child is the same as the direct store reference");

  // Check to see if the attributes of a Child Record match the reference of the parent
  addrsAttr = p.readAttribute('addresses');
  ok(!SC.instanceOf(addrsAttr, SC.ChildArray), "check that readAttribute() does not create an actual instance of a SC.ChildArray");
  same(addrsAttr[0], aStore.get('attributes'), "check that the ChildRecord's attributes are the same as the ParentRecord's readAttribute for the reference");
  pplAttr = testParent.readAttribute('people');
  ok(!SC.instanceOf(pplAttr[0].addresses, SC.ChildArray), "check from the Group (parent Record) that readAttribute() does not create an actual instance of a SC.ChildArray");
  same(pplAttr[0].addresses[0], aStore.get('attributes'), "check from the Group (parent Record) that the ChildRecord's attributes are the same as the ParentRecord's readAttribute for the reference");

  // Duplication check
  addrsDup = p.get('addresses');
  ok(addrsDup, 'check to see that we get an array on the second call to the parent for the child records');
  equals(addrsDup.get('length'), 2, "check that the length of the array of child records is still 2");
  aDup = addrsDup.objectAt(0);
  ok(aDup, "check to see if we have an instance of a child record again");
  oldKey = a.get('id');
  key = aDup.get('id');
  equals(key, oldKey, "check to see if the primary key are the same");
  equals(SC.guidFor(aDup), SC.guidFor(a), "check to see if the guid are the same");
  same(aDup, a, "check to see that it is the same child record as before");
});

test("Basic Write: Testing the First Child Array", function() {
  var ppl, p, pAddrs, pAddrsAttr, pStore, key, oldKey, aFirst, aLast;
  // Test general gets
  testParent.set('name', 'New Group');
  equals(testParent.get('name'), 'New Group', "set() should change name attribute");
  testParent.set('nothing', 'nothing');
  equals(testParent.get('nothing'), 'nothing', "set should change non-existent property to a new property");

   testParent.set('people', peopleData2);
   ppl = testParent.get('people');
   ok(SC.instanceOf(ppl, SC.ChildArray), "check that get() creates an actual instance of a SC.ChildArray");
   equals(ppl.get('length'), 2, "after set() on parent, check that the length of the array of child records is 2");
   p = ppl.objectAt(0);
   ok(SC.kindOf(p, SC.Record), "check that first ChildRecord from the get() creates an actual instance that is a kind of a SC.Record Object");
   ok(SC.instanceOf(p, NestedRecord.Person), "check that first ChildRecord from the get() creates an actual instance of a Person Object");

   // TODO: [EG] Add test to make sure the number of ChildRecords in store is correct when we add store record clearing

   // Check reference information
   key = p.get('id');
   pStore = store.find(NestedRecord.Person, key);
   ok(pStore, 'after a set() with an object, checking that the store has the instance of the child record with proper primary key');
   equals(pStore, p, "after a set with an object, checking the parent reference is the same as the direct store reference");

   // Check for changes on the child bubble to the parent.
   p.set('addresses', addressData1);
   pAddrs = p.get('addresses');
   ok(SC.kindOf(pAddrs, SC.ChildArray), "check to see that the set('addresses') has returned a SC.ChildArray");
   equals(pAddrs.get('length'), 4, "check with a get() that the new address length is 4");
   pAddrsAttr = p.readAttribute('addresses');
   equals(pAddrsAttr.length, 4, "check with a readAttribute() that the new address length is 4");
   aFirst = pAddrs.objectAt(0);
   aLast = pAddrs.objectAt(3);
   same(pAddrsAttr[0], aFirst.get('attributes'), "check from the Person (parent Record) that the first Address's attributes are the same as the Person's readAttribute for the reference");
   same(pAddrsAttr[3], aLast.get('attributes'), "check from the Person (parent Record) that the last Address's attributes are the same as the Person's readAttribute for the reference");
   ok(p.get('status') & SC.Record.DIRTY, 'check that the person (child record) is dirty');
   ok(testParent.get('status') & SC.Record.DIRTY, 'check that the group (parent record) is dirty');
});

test("Basic Write: Testing the Second Child Array", function() {
  var ppl, pplAttr, p, addrsAttr, addrs, a;

  ppl = testParent.get('people');
  p = ppl.objectAt(0);
  addrs = p.get('addresses');
  a = addrs.objectAt('0');

  // New do the test on the address
  a.set('street', '123 New Street');
  ok(a.get('status') & SC.Record.DIRTY, 'check that the address (child record) is dirty');
  ok(p.get('status') & SC.Record.DIRTY, 'check that the person (child record) is dirty');
  ok(testParent.get('status') & SC.Record.DIRTY, 'check that the group (parent record) is dirty');

  // Check for changes on the child bubble to the parent.
  addrsAttr = p.readAttribute('addresses');
  equals(addrsAttr.length, 2, "check the length of the address attribute is still 2");
  equals(addrsAttr[0], a.get('attributes'), "check to see if the person's address attribute is the same as the address's attributes");

  // Check the group people stuff
  pplAttr = testParent.readAttribute('people');
  equals(pplAttr[0].addresses[0], a.get('attributes'), "check to see if the groups reference's address attribute is the same as the address's attributes");
});

test("Basic Array Functionality: pushObject", function() {
  var ppl, pplAttr, p, pFirst, pLast;
  // Add something to the array
  ppl = testParent.get('people');
  // PushObject Tests
  ppl.pushObject(personData1);
  ppl = testParent.get('people');
  equals(ppl.get('length'), 4, "after pushObject() on parent, check that the length of the array of child records is 4");
  p = ppl.objectAt(3);
  ok(SC.kindOf(p, SC.Record), "check that newly added ChildRecord creates an actual instance that is a kind of a SC.Record Object");
  ok(SC.instanceOf(p, NestedRecord.Person), "check that newly added ChildRecord creates an actual instance of a Person Object");
  equals(p.get('name'), 'Testikles, God Of Fertility', "after a pushObject on parent, check to see if it has all the right values for the attributes");
  ok(p.get('status') & SC.Record.DIRTY, 'check that the child record is dirty');
  ok(testParent.get('status') & SC.Record.DIRTY, 'check that the parent record is dirty');

  // Verify the Attrs
  pplAttr = testParent.readAttribute('people');
  equals(pplAttr.length, 4, "after pushObject() on parent, check that the length of the attribute array of child records is 4");
  pFirst = ppl.objectAt(0);
  pLast = ppl.objectAt(3);
  same(pplAttr[0], pFirst.get('attributes'), "verify that parent attributes are the same as the first individual child attributes");
  same(pplAttr[3], pLast.get('attributes'), "verify that parent attributes are the same as the last individual child attributes");
});

test("Advanced Array Functionality: pushObject", function() {
  var ppl, that = this;
  that.willChange = 0;
  that.didChange = 0;
  that.removedCount = 0;
  that.addedCount = 0;

  this.arrayContentWillChange = function(start, removedCount, addedCount) {
    that.willChange += 1;
  };
  this.arrayContentDidChange = function(start, removedCount, addedCount) {
    that.didChange += 1;
    that.removedCount += removedCount;
    that.addedCount += addedCount;
  };

  // Create thea rray and add observers
  ppl = testParent.get('people');
  ppl.addArrayObservers({
    target: this,
    willChange: this.arrayContentWillChange,
    didChange: this.arrayContentDidChange
  });

  // This should fire willChange and didChange once each
  ppl.pushObject(peopleData2[0]);
  equals(that.willChange, 1, "arrayContentWillChange should have been executed once");
  equals(that.didChange, 1, "arrayContentDidChange should have been executed once");
  equals(that.removedCount, 0, "Zero records were removed");
  equals(that.addedCount, 1, "1 Record was added");

  // Reset
  that.willChange = 0;
  that.didChange = 0;
  that.removedCount = 0;
  that.addedCount = 0;

  // This should fire willChange and didChange once each
  ppl.pushObject(peopleData2[1]);
  equals(that.willChange, 1, "arrayContentWillChange should have been executed once");
  equals(that.didChange, 1, "arrayContentDidChange should have been executed once");
  equals(that.removedCount, 0, "Zero records were removed");
  equals(that.addedCount, 1, "A second record was added");
});

test("Basic Array Functionality: popObject", function() {
  var ppl, pplAttr, p, pFirst, pLast;
  // Add something to the array
  ppl = testParent.get('people');
  // popObject Tests
  ppl.popObject();
  ppl = testParent.get('people');
  equals(ppl.get('length'), 2, "after popObject() on parent, check that the length of the array of child records is 2");
  p = ppl.objectAt(0);
  ok(SC.kindOf(p, SC.Record), "check that newly added ChildRecord creates an actual instance that is a kind of a SC.Record Object");
  ok(SC.instanceOf(p, NestedRecord.Person), "check that newly added ChildRecord creates an actual instance of a Person Object");
  equals(p.get('name'), 'Barack Obama', "after a pushObject on parent, check to see if it has all the right values for the attributes");
  ok(p.get('status') & SC.Record.DIRTY, 'check that the child record is dirty');
  ok(testParent.get('status') & SC.Record.DIRTY, 'check that the parent record is dirty');

  // Verify the Attrs
  pplAttr = testParent.readAttribute('people');
  equals(pplAttr.length, 2, "after pushObject() on parent, check that the length of the attribute array of child records is 2");
  pFirst = ppl.objectAt(0);
  pLast = ppl.objectAt(1);
  same(pplAttr[0], pFirst.get('attributes'), "verify that parent attributes are the same as the first individual child attributes");
  same(pplAttr[1], pLast.get('attributes'), "verify that parent attributes are the same as the last individual child attributes");
});

test("Basic Array Functionality: shiftObject", function() {
  var ppl, p;
  // Add something to the array
  ppl = testParent.get('people');
  // PushObject Tests
  ppl.shiftObject();
  ppl = testParent.get('people');
  equals(ppl.get('length'), 2, "after shiftObject() on parent, check that the length of the array of child records is 2");
  p = ppl.objectAt('0');
  equals(p.get('name'), 'John Doe', "after a shiftObject on parent, check to see if it has all the right values for the attributes");
  ok(testParent.get('status') & SC.Record.DIRTY, 'check that the parent record is dirty');
});

test("Basic Array Functionality: unshiftObject", function() {
  var ppl, pplAttr, p, pFirst, pLast;
  // Add something to the array
  ppl = testParent.get('people');
  // PushObject Tests
  ppl.unshiftObject(personData1);
  ppl = testParent.get('people');
  equals(ppl.get('length'), 4, "after unshiftObject() on parent, check that the length of the array of child records is 4");
  p = ppl.objectAt(0);
  ok(SC.kindOf(p, SC.Record), "check that newly added ChildRecord creates an actual instance that is a kind of a SC.Record Object");
  ok(SC.instanceOf(p, NestedRecord.Person), "check that newly added ChildRecord creates an actual instance of a Person Object");
  equals(p.get('name'), 'Testikles, God Of Fertility', "after a pushObject on parent, check to see if it has all the right values for the attributes");
  ok(p.get('status') & SC.Record.DIRTY, 'check that the child record is dirty');
  ok(testParent.get('status') & SC.Record.DIRTY, 'check that the parent record is dirty');

  // Verify the Attrs
  pplAttr = testParent.readAttribute('people');
  equals(pplAttr.length, 4, "after unshiftObject() on parent, check that the length of the attribute array of child records is 4");
  pFirst = ppl.objectAt(0);
  pLast = ppl.objectAt(3);
  same(pplAttr[0], pFirst.get('attributes'), "verify that parent attributes are the same as the first individual child attributes");
  same(pplAttr[3], pLast.get('attributes'), "verify that parent attributes are the same as the last individual child attributes");
});

test("Test: normalization on complex nested records", function() {
  var ppl, addresses, pAttrs;
  // Add something to the array
  ppl = testParent.get('people');
  addresses = ppl.objectAt(0).get('addresses');

  // PushObject Tests
  addresses.pushObject({ type: 'Address', street: '2 Main Street', city: 'Awesome'});
  testParent.normalize();
  pAttrs = testParent.get('attributes');
  equals(pAttrs.people[0].addresses[2].state, 'VA', "test normalization is the default value of VA");
});


