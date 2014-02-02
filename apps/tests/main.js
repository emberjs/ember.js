// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2013 7x7 Software, Inc.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================
/*global TestRunner */

// This is the function that will start your app running.  The default
// implementation will load any fixtures you have created then instantiate
// your controllers and awake the elements on your page.
//
// As you develop your application you will probably want to override this.
// See comments for some pointers on what to do next.
//
TestRunner.main = function main() {
  // Add the main pane.
  TestRunner.getPath('mainPage.mainPane').append();

};

function main() { TestRunner.main(); }
