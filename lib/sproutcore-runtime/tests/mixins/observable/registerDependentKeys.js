// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

/*globals module test ok equals same people */

var object ;

module("object.registerDependentKeys()", {  
  setup: function() {
    object = SC.Object.create({

        // normal properties
        firstName:  'John',
        lastName:   'Doe',
        observedValue: '',

        // computed property
        fullName: function() {
          return this.getEach('firstName','lastName').compact().join(' ');
        }.property(),

        // init to setup registerDependentKey...
        init: function() {
          sc_super();
          this.registerDependentKey('fullName', 'firstName', 'lastName');
        },

        //observer that should fire whenever the 'fullName' property changes
        fullNameDidChange:  function() {
          this.set('observedValue', this.get('fullName')) ;
        }.observes('fullName')
    });
  }
});


test("should indicate the registered property changes if the dependent key value changes", function() {
  // now, change the firstName...
  object.set('firstName', 'Jane');

  // since fullName is 'dependent' on firstName, then the observer for  
  // 'fullName' should fire here because you changed a dependent key.
  equals(object.get('observedValue'), 'Jane Doe');

  // now change the lastName
  object.set('lastName', 'Johnson');

  // again, fullName is 'dependent' on lastName, so observer for  
  // fullName should fire.
  equals(object.get('observedValue'), 'Jane Johnson');
});


test("should indicate the registered property changes if the dependent key value changes and change is within begin property loop ", function() {
  // Wrap the changes with begin property changes call
  object.beginPropertyChanges();
  
  // now, change the firstName & lastname...
  object.set('firstName', 'Jane');
  object.set('lastName', 'Johnson');
  
  // The observer for fullName should not have fired yet at this  
  // point because we are inside a propertyChange loop.
  equals(object.get('observedValue'), '');
  
  //End the property changes loop.
  object.endPropertyChanges();
  
  // now change the lastName
  object.set('lastName', 'Johnson');

  // again, fullName is 'dependent' on lastName, so observer for  
  // fullName should fire.
  equals(object.get('observedValue'), 'Jane Johnson');
});

module("object.registerDependentKeys() - @each");

test("should invalidate computed property once per changed key", function() {
  var setCalls = 0;
  var getCalls = 0;

  window.people = SC.Object.create({
    content: [SC.Object.create({name:'Juan'}),
              SC.Object.create({name:'Camilo'}),
              SC.Object.create({name:'Pinzon'})],

    fullName: function(key, value) {
      if (value !== undefined) {
        setCalls++;
        this.content.setEach('name', value);
      } else {
        getCalls++;
      }

      return this.content.getEach('name').join(' ');
    }.property('content.@each.name')
  });

  var peopleWatcher = SC.Object.create({
    nameBinding: 'window.people.fullName'
  });

  SC.run(function() { people.set('fullName', 'foo bar baz'); });
  equals(setCalls, 1, "calls set once");
  equals(getCalls, 3, "calls get three times");
});

test("should invalidate key when properties higher up in the chain change", function() {
  var notified = 0;
  
  var obj = SC.Object.create({
    contact: null,
    
    fullName: function(key, value) {
      return [this.getPath('contact.firstName'), this.getPath('contact.lastName')].join(' ');
    }.property('contact.firstName', 'contact.lastName').cacheable(),
    
    fullNameDidChange: function() {
      notified++;
    }.observes('fullName')
  });

  var johnDoe = SC.Object.create({ firstName: 'John', lastName: 'Doe' });
  var janeDoe = SC.Object.create({ firstName: 'Jane', lastName: 'Doe' });
  
  equals(notified, 0, 'should start empty');
  SC.run(function() {  obj.set('contact', johnDoe);  });
  equals(notified, 1, 'should notify once after set content=johnDoe');
  equals(obj.get('fullName'), 'John Doe', 'should get proper name');
  
  notified = 0;
  SC.run(function() { johnDoe.set('firstName', 'JOHNNY'); });
  equals(notified, 1, 'should notify again after set firstName=JOHNNY');
  equals(obj.get('fullName'), 'JOHNNY Doe', 'should get proper name');
  
  notified = 0;
  SC.run(function() { obj.set('contact', janeDoe); });
  equals(notified, 1, 'should notify again after set content=janeDoe');
  equals(obj.get('fullName'), 'Jane Doe', 'should get proper name');

  notified = 0;
  SC.run(function() { johnDoe.set('firstName', 'JON'); });
  equals(notified, 0, 'should NOT notify again after set johnDoe.firstName=JON (johnDoe is not current contact)');
  equals(obj.get('fullName'), 'Jane Doe', 'should get proper name while janeDoe is current');

  notified = 0;
  SC.run(function() { janeDoe.set('firstName', 'Janna'); });
  equals(notified, 1, 'should notify again after set janeDoe.firstName=Janna');
  equals(obj.get('fullName'), 'Janna Doe', 'should get proper name after firstname=Janna');  
});
