// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================
// ========================================================================
// SC.Timer Base Tests
// ========================================================================
/*globals module test ok isObj equals expects */

var objectA, objectB, object;

module("SC.Timer.fireTime + SC.Timer.performAction ",{
  	setup: function() {
    	objectA = {} ;
    	objectB = {} ;
		
		object = SC.Object.create({			
			performActionProp:'',
		  	callAction:function(){
		    	this.set('performActionProp','performAction');
		    }	
		});	
  	}

});

test("performAction() should call the specified method ",function(){
	var timerObj;
    timerObj = SC.Timer.create(); //created a timer object
 	timerObj.action = object.callAction();	
	timerObj.performAction();
	equals('performAction',object.performActionProp);
});



test("fireTime() should return the next time the timer should fire", function(){
	var timerObj;	
	
	timerObj = SC.Timer.create();

	equals(-1,timerObj.fireTime(),'for isValid YES');	
	equals(-1,timerObj.fireTime(),'for startTime not set');	
	
	timerObj.startTime = 10;
	timerObj.interval = 10;	
	timerObj.lastFireTime = 5;
	equals(20,timerObj.fireTime(),'next fire time');	
	
});

test("fire() should call the action", function() {
	var count = 0;
	SC.RunLoop.begin() ;
	var start = SC.RunLoop.currentRunLoop.get('startTime') ;
	var t = SC.Timer.schedule({
		target: this,
		action: function() {
			count++;
		},
		interval: 100
	});
	t.fire();
	SC.RunLoop.end() ;
	stop(2500) ; // stops the test runner, fails after 2500ms
	setTimeout(function() {
		equals(2, count) ;
		window.start() ; // starts the test runner
		}, 1500);
});



