// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            portions copyright @2011 Apple Inc.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

/*global module test htmlbody ok equals same stop start */

var pane, view , view2;
var appleURL='http://photos4.meetupstatic.com/photos/event/4/6/9/9/600_4518073.jpeg';
module("SC.ScrollView",{
	setup: function() {
	  SC.RunLoop.begin();
	    pane = SC.MainPane.create({
		  childViews: [
		   SC.ScrollView.extend({
		     contentView: SC.ImageView.design({value: appleURL, layout: {height:4000, width:4000}})
		   }),
		   SC.ScrollView.extend({
		     contentView: SC.ImageView.design({value: appleURL, layout: {height:2000, width:2000}})
		   })
		   
		   ],
		   
		  expectedVertLine: function(line) {
			var ret = view.get('verticalLineScroll')*line;
			var alt = view.get('maximumVerticalScrollOffset');
			ret = (ret > alt)? alt : ret;
		    return ret;
		  },
		  expectedHorzLine: function(line) {
			var ret = view.get('horizontalLineScroll')*line;
			var alt = view.get('maximumHorizontalScrollOffset');
			ret = (ret > alt)? alt : ret;
		    return ret;
		  },
		  expectedVertPage: function(page) {
			var ret = view.get('verticalPageScroll')*page;
			var alt = view.get('maximumVerticalScrollOffset');
			ret = (ret > alt)? alt : ret;
		    return ret;
		  },
		  expectedHorzPage: function(page) {
			var ret = view.get('horizontalPageScroll')*page;
			var alt = view.get('maximumHorizontalScrollOffset');
			ret = (ret > alt)? alt : ret;
		    return ret;
		  }
		});
		
		
		pane.append(); // make sure there is a layer...
	  SC.RunLoop.end();	
	  view = pane.childViews[0];
	  view.get('containerView').get('frame').height = 100;
	  view.get('containerView').get('frame').width = 100;

	  view2 = pane.childViews[1];
	  view2.get('containerView').get('frame').height = 100;
	  view2.get('containerView').get('frame').width = 100;
	  
	},
	
	teardown: function() {
    	pane.remove();
    	pane = view = null ;
  	}
});



test("Scrolling to a certain co-ordinate of the container view", function() {
	equals(view.get('horizontalScrollOffset'), 0, "Initial horizontal offset must be zero");
	equals(view.get('verticalScrollOffset'), 0, "Initial vertical offset must be zero");
	SC.RunLoop.begin();
	view.scrollTo(100, 100);
	SC.RunLoop.end();
	
	equals(view.get('horizontalScrollOffset'), 100, "After scrolling to 100, horizontal offset must be");
	equals(view.get('verticalScrollOffset'), 100, "After scrolling to 100, vertical offset must be");
	view.scrollTo(5000, 5000);
	equals(view.get('horizontalScrollOffset'), view.get('maximumHorizontalScrollOffset'), "After scrolling to 400, horizontal offset must be maximum");
	equals(view.get('verticalScrollOffset'), view.get('maximumVerticalScrollOffset'), "After scrolling to 400, vertical offset must be maximum");
});

test("Scrolling relative to the current possition of the container view", function() {
	equals(view.get('horizontalScrollOffset'), 0, "Initial horizontal offset must be zero");
	equals(view.get('verticalScrollOffset'), 0, "Initial vertical offset must be zero");
	view.scrollBy(100, 100);
	equals(view.get('horizontalScrollOffset'), 100, "After scrolling by 100, horizontal offset must be");
	equals(view.get('verticalScrollOffset'), 100, "After scrolling by 100, vertical offset must be");
	view.scrollBy(100, 100);
	equals(view.get('horizontalScrollOffset'), 200, "After scrolling by 100, horizontal offset must be");
	equals(view.get('verticalScrollOffset'), 200, "After scrolling by 100, vertical offset must be");
	view.scrollBy(5000, 5000);
	equals(view.get('horizontalScrollOffset'), view.get('maximumHorizontalScrollOffset'), "After scrolling by 400, horizontal offset must be maximum");
	equals(view.get('verticalScrollOffset'), view.get('maximumVerticalScrollOffset'), "After scrolling by 400, vertical offset must be maximum");
});

test("Scrolling through line by line", function() {
	var line = 3;
	equals(view.get('horizontalScrollOffset'), 0, "Initial horizontal offset must be zero");
	equals(view.get('verticalScrollOffset'), 0, "Initial vertical offset must be zero");
	view.scrollDownLine(line);
	equals(view.get('horizontalScrollOffset'), 0, "After scrolling down by lines, horizontal offset is unchanged");
	equals(view.get('verticalScrollOffset'), pane.expectedVertLine(line), "After scrolling down by lines, vertical offset must be");
	view.scrollUpLine(line);
});

test("maximumHorizontalScrollOffset() returns the maximum horizontal scroll dimention", function() {
  var old_horizontalScrollOffset=2;
  var old_verticalScrollOffset=2;

  view2.set('horizontalScrollOffset',old_horizontalScrollOffset);
  view2.set('verticalScrollOffset',old_verticalScrollOffset);
  view2.scrollBy(5000, 0);
  view2.get('horizontalScrollOffset');

  equals(view2.get('horizontalScrollOffset'),1900, 'maximum y coordinate should be 1900');	
 
  view2.set('horizontalScrollOffset',old_horizontalScrollOffset);
  view2.set('verticalScrollOffset',old_verticalScrollOffset);
  view2.scrollBy(-5000,0);
  equals(view2.get('horizontalScrollOffset'),0, 'minimum y coordinate should be 0');	
  	
});

test("maximumVerticalScrollOffset() returns the maximum vertical scroll dimention", function() {
  var old_horizontalScrollOffset=2;
  var old_verticalScrollOffset=2;

  view2.set('horizontalScrollOffset',old_horizontalScrollOffset);
  view2.set('verticalScrollOffset',old_verticalScrollOffset);
  view2.scrollBy(0, 5000);
  view2.get('maximumVerticalScrollOffset');
  equals(view2.get('verticalScrollOffset'),1900, 'maximum coordinate should be 1900'); 
  view2.set('horizontalScrollOffset',old_horizontalScrollOffset);
  view2.set('verticalScrollOffset',old_verticalScrollOffset);
  view2.scrollBy(0,-5000);
  equals(view2.get('verticalScrollOffset'),0, 'The minimum y coordinate should be 0');
 
});
