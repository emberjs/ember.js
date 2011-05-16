/**
 * Nested Record Array of SC.Records Unit Test
 *
 * @author Evin Grano
 */

// ..........................................................
// Basic Set up needs to move to the setup and teardown
// 
var NestedRecord, store, testParent, testParent2; 

var initModels = function(){
  NestedRecord.ParentRecordTest = SC.Record.extend({
    /** Child Record Namespace */
    nestedRecordNamespace: NestedRecord,

    name: SC.Record.attr(String),
    elements: SC.Record.toMany('SC.Record', { nested: true })
  });

  NestedRecord.ChildRecordTest1 = SC.Record.extend({
    name: SC.Record.attr(String),
    value: SC.Record.attr(String)
  });
  
  NestedRecord.ChildRecordTest2 = SC.Record.extend({
     name: SC.Record.attr(String),
     info: SC.Record.attr(String),
     value: SC.Record.attr(String)
   });
};

// ..........................................................
// Basic SC.Record with an Array of Children
// 
module("Basic SC.Record w/ a Parent > Array of Children", {

  setup: function() {
    NestedRecord = SC.Object.create({
      store: SC.Store.create()
    });
    store = NestedRecord.store;
    initModels();
    SC.RunLoop.begin();
    testParent = store.createRecord(NestedRecord.ParentRecordTest, {
      name: 'Parent Name',
      elements: [
        {
          type: 'ChildRecordTest1',
          name: 'Child 1',
          value: 'eeney'
        },
        {
          type: 'ChildRecordTest2',
          name: 'Child 2',
          info: 'This is the other type',
          value: 'meeney'
        },
        {
          type: 'ChildRecordTest1',
          name: 'Child 3',
          value: 'miney'
        },
        {
          type: 'ChildRecordTest1',
          name: 'Child 4',
          value: 'moe'
        }
      ]
    });

    // FIXME: [EG] this configuration should work
    testParent2 = store.createRecord(NestedRecord.ParentRecordTest, {
      name: 'Parent 2',
      elements: []
    });
    SC.RunLoop.end();
  },

  teardown: function() {
    delete NestedRecord.ParentRecordTest;
    delete NestedRecord.ChildRecordTest;
    testParent = null;
    testParent2 = null;
    store = null;
    NestedRecord = null;
  }
});

test("Function: readAttribute()", function() {
  var elemsAry = testParent.readAttribute('elements');
  ok(elemsAry, "check to see that the child records array exists");
  equals(elemsAry.get('length'), 4, "checking to see that the length of the elements array is 4");
  same(elemsAry[0], 
    {
      type: 'ChildRecordTest1',
      name: 'Child 1',
      value: 'eeney'
    },
    "check to see if the first child is as expected"); 
  same(elemsAry[3], 
    {
      type: 'ChildRecordTest1',
      name: 'Child 4',
      value: 'moe'
    },
    "check to see if the last child is as expected"); 
});

test("Function: writeAttribute()", function() {
    
  testParent.writeAttribute('elements', 
    [
      {
        type: 'ChildRecordTest1',
        name: 'Tom',
        value: 'Jones'
      },
      {
        type: 'ChildRecordTest1',
        name: 'Dick',
        value: 'Smothers'
      },
      {
        type: 'ChildRecordTest1',
        name: 'Harry',
        value: 'Balls'
      }
    ]
  );
  var elemsAry = testParent.readAttribute('elements');
  ok(elemsAry, "after writeAttribute(), check to see that the child records array exists");
  equals(elemsAry.length, 3, "after writeAttribute(), checking to see that the length of the elements array is 3");
  same(elemsAry[0], 
    {
      type: 'ChildRecordTest1',
      name: 'Tom',
      value: 'Jones'
    },
    "check to see if the first child is as expected"); 
  same(elemsAry[2], 
    {
      type: 'ChildRecordTest1',
      name: 'Harry',
      value: 'Balls'
    },
    "check to see if the last child is as expected"); 
});

test("Basic Read", function() {
  
  // Test general gets
  equals(testParent.get('name'), 'Parent Name', "get should be correct for name attribute");
  equals(testParent.get('nothing'), null, "get should be correct for invalid key");
  
  // Test Child Record creation
  var arrayOfCRs = testParent.get('elements');
  // Check Model Class information
  
  ok(SC.instanceOf(arrayOfCRs, SC.ChildArray), "check that get() creates an actual instance of a SC.ChildArray");
  equals(arrayOfCRs.get('length'), 4, "check that the length of the array of child records is 4");
  var cr = arrayOfCRs.objectAt(0);
  ok(SC.kindOf(cr, SC.Record), "check that first ChildRecord from the get() creates an actual instance that is a kind of a SC.Record Object");
  ok(SC.instanceOf(cr, NestedRecord.ChildRecordTest1), "check that first ChildRecord from the get() creates an actual instance of a ChildRecordTest1 Object");
  
  // Check reference information
  var pm = cr.get('primaryKey');
  var key = cr.get(pm);
  var storeRef = store.find(NestedRecord.ChildRecordTest1, key);
  ok(storeRef, 'check that first ChildRecord that the store has the instance of the child record with proper primary key');
  equals(cr, storeRef, "check the parent reference to the first child is the same as the direct store reference");
  
  // Check to see if the attributes of a Child Record match the refrence of the parent
  var parentArray = testParent.readAttribute('elements');
  ok(!SC.instanceOf(parentArray, SC.ChildArray), "check that get() creates an actual instance of a SC.ChildArray");
  same(parentArray[0], storeRef.get('attributes'), "check that the ChildRecord's attributes are the same as the ParentRecord's readAttribute for the reference");
  
  // // Duplication check
  var sameArray = testParent.get('elements');
  ok(sameArray, 'check to see that we get an array on the second call to the parent for the child records');
  equals(sameArray.get('length'), 4, "check that the length of the array of child records is still 4");
  var sameCR = sameArray.objectAt(0);
  ok(sameCR, "check to see if we have an instance of a child record again");
  var oldKey = cr.get(pm), newKey = sameCR.get(pm);
  equals(oldKey, newKey, "check to see if the primary key are the same");
  equals(SC.guidFor(cr), SC.guidFor(sameCR), "check to see if the guid are the same");
  same(sameCR, cr, "check to see that it is the same child record as before");
});

test("Basic Write", function() {
  
  // Test general gets
  testParent.set('name', 'New Parent Name');
  equals(testParent.get('name'), 'New Parent Name', "set() should change name attribute");
  testParent.set('nothing', 'nothing');
  equals(testParent.get('nothing'), 'nothing', "set should change non-existent property to a new property");
  
  // Test Child Record creation
  var oldCR = testParent.get('elements');
  var newChildren = [
   { type: 'ChildRecordTest1', name: 'Tom', value: 'Jones'},
   { type: 'ChildRecordTest1', name: 'Dick', value: 'Smothers'},
   { type: 'ChildRecordTest1', name: 'Harry', value: 'Balls'}
  ];

  testParent.set('elements', newChildren);
  var newArray = testParent.get('elements');
  ok(SC.instanceOf(newArray, SC.ChildArray), "check that get() creates an actual instance of a SC.ChildArray");
  equals(newArray.get('length'), 3, "after set() on parent, check that the length of the array of child records is 3");
  var cr = newArray.objectAt(0);

  ok(SC.kindOf(cr, SC.Record), "check that first ChildRecord from the get() creates an actual instance that is a kind of a SC.Record Object");
  ok(SC.instanceOf(cr, NestedRecord.ChildRecordTest1), "check that first ChildRecord from the get() creates an actual instance of a ChildRecordTest1 Object");
});

test("Basic Write: reference tests", function() {
   var pm, elems, cr, key, storeRef, newElems;
   
   elems = testParent.get('elements');
   cr = elems.objectAt(0);
   // TODO: [EG] Add test to make sure the number of ChildRecords in store
   
   // Check reference information
   pm = cr.get('primaryKey');
   key = cr.get(pm);
   storeRef = store.find(NestedRecord.ChildRecordTest1, key);
   ok(storeRef, 'after a set() with an object, checking that the store has the instance of the child record with proper primary keys');
   equals(cr, storeRef, "after a set with an object, checking the parent reference is the same as the direct store reference");
   
   // Check for changes on the child bubble to the parent.
   cr.set('name', 'Child Name Change');
   equals(cr.get('name'), 'Child Name Change', "after a set('name', <new>) on child, checking that the value is updated");
   ok(cr.get('status') & SC.Record.DIRTY, 'check that the child record is dirty');
   ok(testParent.get('status') & SC.Record.DIRTY, 'check that the parent record is dirty');
   newElems = testParent.get('elements');
   var newCR = newElems.objectAt(0);
   same(newCR, cr, "after a set('name', <new>) on child, checking to see that the parent has recieved the changes from the child record");
   var readAttrsArray = testParent.readAttribute('elements');
   ok(readAttrsArray, "checks to make sure the readAttibute works with a change to the name in the first child.");
   equals(readAttrsArray.length, 4, "after set() on parent, check that the length of the attribute array of child records is 4");
   same(readAttrsArray[0], newCR.get('attributes'), "after a set('name', <new>) on child, readAttribute on the parent should be correct for info child attributes");
});

test("Basic Array Functionality: pushObject w/ HASH", function() {   
  var elements, elementsAttrs, cr, crFirst, crLast;
  // Add something to the array
  elements = testParent.get('elements');
  // PushObject Tests
  elements.pushObject({ type: 'ChildRecordTest1', name: 'Testikles', value: 'God Of Fertility'});
  elements = testParent.get('elements');
  equals(elements.get('length'), 5, "after pushObject() on parent, check that the length of the array of child records is 5");
  cr = elements.objectAt(4);
  ok(SC.kindOf(cr, SC.Record), "check that newly added ChildRecord creates an actual instance that is a kind of a SC.Record Object");
  ok(SC.instanceOf(cr, NestedRecord.ChildRecordTest1), "check that newly added ChildRecord creates an actual instance of a ChildRecordTest1 Object");
  equals(cr.get('name'), 'Testikles', "after a pushObject on parent, check to see if it has all the right values for the attributes");
  ok(cr.get('status') & SC.Record.DIRTY, 'check that the child record is dirty');
  ok(testParent.get('status') & SC.Record.DIRTY, 'check that the parent record is dirty'); 
  
  // Verify the Attrs
  elementsAttrs = testParent.readAttribute('elements');
  equals(elementsAttrs.length, 5, "after pushObject() on parent, check that the length of the attribute array of child records is 5");
  crFirst = elements.objectAt(0).get('attributes');
  crLast = elements.objectAt(4).get('attributes');
  same(elementsAttrs[0], crFirst, "verify that parent attributes are the same as the first individual child attributes");
  same(elementsAttrs[4], crLast, "verify that parent attributes are the same as the last individual child attributes");  
});

test("Basic Array Functionality: pushObject w/ ChildRecord", function() {   
  var elements, elementsAttrs, cr, crFirst, crLast;
  // Add something to the array
  elements = testParent.get('elements');
  // PushObject Tests
  cr = store.createRecord(NestedRecord.ChildRecordTest1, { type: 'ChildRecordTest1', name: 'Testikles', value: 'God Of Fertility'});
  elements.pushObject(cr);
  elements = testParent.get('elements');
  equals(elements.get('length'), 5, "after pushObject() on parent, check that the length of the array of child records is 5");
  cr = elements.objectAt(4);
  ok(SC.kindOf(cr, SC.Record), "check that newly added ChildRecord creates an actual instance that is a kind of a SC.Record Object");
  ok(SC.instanceOf(cr, NestedRecord.ChildRecordTest1), "check that newly added ChildRecord creates an actual instance of a ChildRecordTest1 Object");
  equals(cr.get('name'), 'Testikles', "after a pushObject on parent, check to see if it has all the right values for the attributes");
  ok(cr.get('status') & SC.Record.DIRTY, 'check that the child record is dirty');
  ok(testParent.get('status') & SC.Record.DIRTY, 'check that the parent record is dirty'); 
  
  // Verify the Attrs
  elementsAttrs = testParent.readAttribute('elements');
  equals(elementsAttrs.length, 5, "after pushObject() on parent, check that the length of the attribute array of child records is 5");
  crFirst = elements.objectAt(0).get('attributes');
  crLast = elements.objectAt(4).get('attributes');
  same(elementsAttrs[0], crFirst, "verify that parent attributes are the same as the first individual child attributes");
  same(elementsAttrs[4], crLast, "verify that parent attributes are the same as the last individual child attributes");  
});


test("Basic Array Functionality: popObject", function() {   
  var elements, elementsAttrs, cr, crFirst, crLast;
  // Add something to the array
  elements = testParent.get('elements');
  // PushObject Tests
  elements.popObject();
  elements = testParent.get('elements');
  equals(elements.get('length'), 3, "after popObject() on parent, check that the length of the array of child records is 3");
  ok(testParent.get('status') & SC.Record.DIRTY, 'check that the parent record is dirty'); 
  
  // Verify the Attrs
  elementsAttrs = testParent.readAttribute('elements');
  equals(elementsAttrs.length, 3, "after pushObject() on parent, check that the length of the attribute array of child records is 3");
  crFirst = elements.objectAt(0).get('attributes');
  crLast = elements.objectAt(2).get('attributes');
  same(elementsAttrs[0], crFirst, "verify that parent attributes are the same as the first individual child attributes");
  same(elementsAttrs[2], crLast, "verify that parent attributes are the same as the last individual child attributes");
});

test("Basic Array Functionality: shiftObject", function() {   
  var elements, cr;
  // Add something to the array
  elements = testParent.get('elements');
  // PushObject Tests
  elements.shiftObject();
  elements = testParent.get('elements');
  equals(elements.get('length'), 3, "after shiftObject() on parent, check that the length of the array of child records is 3");
  ok(testParent.get('status') & SC.Record.DIRTY, 'check that the parent record is dirty'); 
});

test("Basic Array Functionality: unshiftObject", function() {   
  var elements, elementsAttrs, cr, crFirst, crLast;
  // Add something to the array
  elements = testParent.get('elements');
  // PushObject Tests
  elements.unshiftObject({ type: 'ChildRecordTest1', name: 'Testikles', value: 'God Of Fertility'});
  elements = testParent.get('elements');
  equals(elements.get('length'), 5, "after pushObject() on parent, check that the length of the array of child records is 5");
  cr = elements.objectAt(0);
  ok(SC.kindOf(cr, SC.Record), "check that newly added ChildRecord creates an actual instance that is a kind of a SC.Record Object");
  ok(SC.instanceOf(cr, NestedRecord.ChildRecordTest1), "check that newly added ChildRecord creates an actual instance of a ChildRecordTest1 Object");
  equals(cr.get('name'), 'Testikles', "after a pushObject on parent, check to see if it has all the right values for the attributes");
  ok(cr.get('status') & SC.Record.DIRTY, 'check that the child record is dirty');
  ok(testParent.get('status') & SC.Record.DIRTY, 'check that the parent record is dirty'); 
  
  // Verify the Attrs
  elementsAttrs = testParent.readAttribute('elements');
  equals(elementsAttrs.length, 5, "after pushObject() on parent, check that the length of the attribute array of child records is 5");
  crFirst = elements.objectAt(0).get('attributes');
  crLast = elements.objectAt(4).get('attributes');
  same(elementsAttrs[0], crFirst, "verify that parent attributes are the same as the first individual child attributes");
  same(elementsAttrs[4], crLast, "verify that parent attributes are the same as the last individual child attributes");  
});

test("Create Parent with Broken Child Array", function(){
  var elements = testParent2.get('elements');
  ok (!SC.none(elements), "elements should be something");
  var isChildRecordArrays = elements.instanceOf(SC.ChildArray);
  ok(isChildRecordArrays, 'elements array is of right type');

  var length = elements.get('length');
  equals(length, 0, 'length should be zero');

  elements.pushObject({type: 'ChildRecordTest1',name: 'Child 1',value: 'eeney'});
  length = elements.get('length');
  equals(length, 1, 'length should be one');

});


