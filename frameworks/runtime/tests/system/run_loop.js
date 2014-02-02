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

test("Should propagate bindings after the RunLoop completes (using SC.RunLoop)", function() {
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

test("Should propagate bindings after the RunLoop completes (using SC.beginRunLoop)", function() {
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

test("Should propagate bindings after the RunLoop completes (checking invokeOnce() function)", function() {
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

test("Should flush the invoke last queue at the end of the current run loop", function () {
  var iCalled = 0;
  SC.RunLoop.begin();

  SC.RunLoop.currentRunLoop.invokeLast(function () {
    iCalled++;
  });

  ok(!iCalled, "should not have flushed the invokeLast queue");
  SC.RunLoop.end();
  ok(iCalled, "should have flushed the invokeLast queue");

  SC.RunLoop.begin();
  SC.RunLoop.end();
  equals(iCalled, 1, "should have flushed the invokeLast queue only once");
});

test("Should repeatedly flush the invoke last queue until there are no more items", function () {
  var iCalled = 0;
  SC.RunLoop.begin();

  SC.RunLoop.currentRunLoop.invokeLast(function () {
    iCalled++;
    if (iCalled < 5) {
      SC.RunLoop.currentRunLoop.invokeLast(arguments.callee);
    }
  });

  ok(!iCalled, "should not have flushed the invokeLast queue");
  SC.RunLoop.end();
  ok(iCalled, "should have flushed the invokeLast queue");
  equals(iCalled, 5, "should have flushed the invokeLast queue 5 times");
});

test("Should flush the invoke next queue at the beginning of the next run loop", function () {
  var iCalled = 0;
  SC.RunLoop.begin();

  SC.RunLoop.currentRunLoop.invokeNext(function () {
    iCalled++;
  });

  SC.RunLoop.end();
  ok(!iCalled, "should not have flushed the invokeNext queue");

  SC.RunLoop.begin();
  ok(iCalled, "should have flushed the invokeNext queue");

  SC.RunLoop.end();
  equals(iCalled, 1, "should have flushed the invokeNext queue only once");
});

test("Calling invokeNext inside an invokeNext invocation will schedule for the function to run in the next run loop", function () {
  var iCalled = 0;
  SC.RunLoop.begin();

  SC.RunLoop.currentRunLoop.invokeNext(function () {
    if (iCalled < 5) {
      SC.RunLoop.currentRunLoop.invokeNext(arguments.callee);
    }
    iCalled++;
  });

  for (var i = 0; i < 5; i++) {
    equals(iCalled, i, "should have flushed the invokeNext queue " + i + " time" + (i !== 1 ? 's' : ''));
    SC.RunLoop.end();
    SC.RunLoop.begin();
  }
  equals(iCalled, 5, "should have flushed the invokeNext queue 5 times");
  SC.RunLoop.end();
});

/**
  The previous implementation of invokeNext never actually caused the next run
  of the run loop and would only work if another run loop happened to occur.
  So if you were using invokeNext to do rendering, it would not really work
  unless the mouse moved or some other timer was firing.
*/
test("Using invokeNext should result in an additional run of the run loop immediately after it ends.", function () {
  stop(2000);

  expect(1);
  SC.run(function () {
    SC.RunLoop.currentRunLoop.invokeNext(function () {
      ok(YES, "should have started another run of the run loop");
      start();
    });
  });
});

/**
  There was a regression where unscheduling a run loop failed to clear out the
  internal state and therefore further scheduling of the run loop failed.
*/
test("Using unscheduleRunLoop should not prevent scheduleRunLoop from working.", function () {
  SC.run(function () {
    var now = new Date(),
      newTimeoutID,
      timeoutID;

    timeoutID = SC.RunLoop.currentRunLoop.scheduleRunLoop(now);
    SC.RunLoop.currentRunLoop.unscheduleRunLoop();
    newTimeoutID = SC.RunLoop.currentRunLoop.scheduleRunLoop(now);

    ok(timeoutID !== newTimeoutID, "should not be the same timeout id after unscheduling");
  });
});
