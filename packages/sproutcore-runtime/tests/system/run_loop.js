// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================
module("System:run_loop() - chained binding", {
  setup: function() {
    first = SC.Object.create({ 
		output: 'first' 
	}) ;
    
	second = SC.Object.create({ 
      input: 'second',
      output: 'second',
      
      inputDidChange: function() {
        this.set("output", this.get("input")) ;
      }.observes("input") 

    }) ;
    
    third = SC.Object.create({ 
		input: "third" 
	}) ;
  }
});

test("Should propograte bindings after the RunLoop completes (using SC.RunLoop)", function() {
	SC.RunLoop.begin();
		//Binding of output of first object to input of second object
  		binding1 = SC.Binding.from("output", first).to("input", second).connect() ;
    	
		//Binding of output of second object to input of third object
		binding2 = SC.Binding.from("output", second).to("input", third).connect() ;
		
		SC.Binding.flushPendingChanges() ; // actually sets up the connection
		
		//Based on the above binding if you change the output of first object it should
		//change the all the variable of first,second and third object
		first.set("output", "change") ;
		
		//Changes the output of the first object
		equals(first.get("output"), "change") ;
		
		//since binding has not taken into effect the value still remains as change.
		equals(second.get("output"), "first") ;
	SC.RunLoop.end(); // allows bindings to trigger...
	
	//Value of the output variable changed to 'change'
	equals(first.get("output"), "change") ;
	
	//Since binding triggered after the end loop the value changed to 'change'.
	equals(second.get("output"), "change") ;
});

test("Should propograte bindings after the RunLoop completes (using SC.beginRunLoop)", function() {
	SC.beginRunLoop;
		//Binding of output of first object to input of second object
  		binding1 = SC.Binding.from("output", first).to("input", second).connect() ;
    	
		//Binding of output of second object to input of third object
		binding2 = SC.Binding.from("output", second).to("input", third).connect() ;
		
		SC.Binding.flushPendingChanges() ; // actually sets up the connection
		
		//Based on the above binding if you change the output of first object it should
		//change the all the variable of first,second and third object
		first.set("output", "change") ;
		
		//Changes the output of the first object
		equals(first.get("output"), "change") ;
		
		//since binding has not taken into effect the value still remains as change.
		equals(second.get("output"), "first") ;
	SC.endRunLoop; // allows bindings to trigger...
	SC.Binding.flushPendingChanges() ; // actually sets up the connection
	
	//Value of the output variable changed to 'change'
	equals(first.get("output"), "change") ;
	
	//Since binding triggered after the end loop the value changed to 'change'.
	equals(second.get("output"), "change") ;
});

test("Should propograte bindings after the RunLoop completes (checking invokeOnce() function)", function() {
	SC.RunLoop.begin();
		//Binding of output of first object to input of second object
  		binding1 = SC.Binding.from("output", first).to("input", second).connect() ;
    	
		//Binding of output of second object to input of third object
		binding2 = SC.Binding.from("output", second).to("input", third).connect() ;
		
		SC.Binding.flushPendingChanges() ; // actually sets up the connection
		
		//Based on the above binding if you change the output of first object it should
		//change the all the variable of first,second and third object
		first.set("output", "change") ;
		
		//Changes the output of the first object
		equals(first.get("output"), "change") ;
		
		//since binding has not taken into effect the value still remains as change.
		equals(second.get("output"), "first") ;
		
		// Call the invokeOnce function to set the function which needs to be called once
		second.invokeOnce('second','inputDidChange');
		
	SC.RunLoop.end(); // allows bindings to trigger...
	
	//Value of the output variable changed to 'change'
	equals(first.get("output"), "change") ;
	
	//Since binding triggered after the end loop the value changed to 'change'.
	equals(second.get("output"), "change") ;
	
	//Set the output for the first so that the 'inputDidChange' function in the second object is called again
	first.set("output", "againChanged") ;
	
	//Value of the output variable changed to 'change'
	equals(first.get("output"), "againChanged") ;
	
	//Since the invoker function is called only once the value of output did not change.
	equals(second.get("output"), "change") ;
	
}); 