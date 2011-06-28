// ==========================================================================
// Project:  SproutCore Runtime
// Copyright: ©2011 Strobe Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

require('sproutcore-runtime/system/namespace');

/**
  @private

  Defines a namespace that will contain an executable application.  This is
  very similar to a normal namespace except that it is expected to include at
  least a 'ready' function which can be run to initialize the application.
  
  Currently SC.Application is very similar to SC.Namespace.  However, this
  class may be augmented by additional frameworks so it is important to use
  this instance when building new applications.
  
  # Example Usage
  
      MyApp = SC.Application.create({
        VERSION: '1.0.0',
        store: SC.Store.create().from(SC.fixtures)
      });
      
      MyApp.ready = function() { 
        //..init code goes here...
      }
      
*/
SC.Application = SC.Namespace.extend();

