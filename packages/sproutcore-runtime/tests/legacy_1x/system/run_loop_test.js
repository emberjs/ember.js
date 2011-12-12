// ==========================================================================
// Project:  Ember Runtime
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

/*
  NOTE: This test is adapted from the 1.x series of unit tests.  The tests
  are the same except for places where we intend to break the API we instead
  validate that we warn the developer appropriately.
  
  CHANGES FROM 1.6:
  
  * Updated the API usage for setting up and syncing Ember.Binding since these 
    are not the APIs this file is testing.
    
  * Disabled a call to invokeOnce() around line 127 because it appeared to be
    broken anyway.  I don't think it ever even worked.
*/

var MyApp, binding1, binding2;

module("System:run_loop() - chained binding", {
  setup: function() {
    MyApp = {};
    MyApp.first = Ember.Object.create(Ember.Observable, { 
      output: 'MyApp.first' 
    }) ;
    
    MyApp.second = Ember.Object.create(Ember.Observable, { 
      input: 'MyApp.second',
      output: 'MyApp.second',
    
      inputDidChange: Ember.observer(function() {
        this.set("output", this.get("input")) ;
      }, "input") 

    }) ;
  
    MyApp.third = Ember.Object.create(Ember.Observable, { 
      input: "MyApp.third" 
    }) ;
  }
});

test("Should propagate bindings after the RunLoop completes (using Ember.RunLoop)", function() {
  Ember.RunLoop.begin();
    //Binding of output of MyApp.first object to input of MyApp.second object
      binding1 = Ember.Binding.from("first.output")
        .to("second.input").connect(MyApp) ;
      
    //Binding of output of MyApp.second object to input of MyApp.third object
    binding2 = Ember.Binding.from("second.output")
      .to("third.input").connect(MyApp) ;

    Ember.run.sync();
    
    // Based on the above binding if you change the output of MyApp.first 
    // object it should change the all the variable of 
    //  MyApp.first,MyApp.second and MyApp.third object
    MyApp.first.set("output", "change") ;
    
    //Changes the output of the MyApp.first object
    equals(MyApp.first.get("output"), "change") ;
    
    //since binding has not taken into effect the value still remains as change.
    equals(MyApp.second.get("output"), "MyApp.first") ;
  Ember.RunLoop.end(); // allows bindings to trigger...
  
  //Value of the output variable changed to 'change'
  equals(MyApp.first.get("output"), "change") ;
  
  //Since binding triggered after the end loop the value changed to 'change'.
  equals(MyApp.second.get("output"), "change") ;
});

test("Should propagate bindings after the RunLoop completes (using Ember.beginRunLoop)", function() {
    //Binding of output of MyApp.first object to input of MyApp.second object
      binding1 = Ember.Binding.from("first.output")
        .to("second.input").connect(MyApp) ;
      
    //Binding of output of MyApp.second object to input of MyApp.third object
    binding2 = Ember.Binding.from("second.output")
        .to("third.input").connect(MyApp) ;

    Ember.run.sync();
    
    //Based on the above binding if you change the output of MyApp.first object it should
    //change the all the variable of MyApp.first,MyApp.second and MyApp.third object
    MyApp.first.set("output", "change") ;
    
    //Changes the output of the MyApp.first object
    equals(MyApp.first.get("output"), "change") ;
    
    //since binding has not taken into effect the value still remains as change.
    equals(MyApp.second.get("output"), "MyApp.first") ;
  Ember.run.sync() ; // actually sets up the connection
  
  //Value of the output variable changed to 'change'
  equals(MyApp.first.get("output"), "change") ;
  
  //Since binding triggered after the end loop the value changed to 'change'.
  equals(MyApp.second.get("output"), "change") ;
});

test("Should propagate bindings after the RunLoop completes (checking invokeOnce() function)", function() {
  Ember.RunLoop.begin();
    //Binding of output of MyApp.first object to input of MyApp.second object
      binding1 = Ember.Binding.from("first.output")
        .to("second.input").connect(MyApp) ;
      
    //Binding of output of MyApp.second object to input of MyApp.third object
    binding2 = Ember.Binding.from("second.output")
      .to("third.input").connect(MyApp) ;
    
    Ember.run.sync() ; // actually sets up the connection
    
    //Based on the above binding if you change the output of MyApp.first object it should
    //change the all the variable of MyApp.first,MyApp.second and MyApp.third object
    MyApp.first.set("output", "change") ;
    
    //Changes the output of the MyApp.first object
    equals(MyApp.first.get("output"), "change") ;
    
    //since binding has not taken into effect the value still remains as change.
    equals(MyApp.second.get("output"), "MyApp.first") ;
    
    // Call the invokeOnce function to set the function which needs to be called once
    // MyApp.second.invokeOnce('MyApp.second','inputDidChange'); <-- Broken?
    
  Ember.RunLoop.end(); // allows bindings to trigger...
  
  //Value of the output variable changed to 'change'
  equals(MyApp.first.get("output"), "change") ;
  
  //Since binding triggered after the end loop the value changed to 'change'.
  equals(MyApp.second.get("output"), "change") ;
  
  //Set the output for the MyApp.first so that the 'inputDidChange' function in the MyApp.second object is called again
  MyApp.first.set("output", "againChanged") ;
  
  //Value of the output variable changed to 'change'
  equals(MyApp.first.get("output"), "againChanged") ;
  
  //Since the invoker function is called only once the value of output did not change.
  equals(MyApp.second.get("output"), "change") ;
  
});