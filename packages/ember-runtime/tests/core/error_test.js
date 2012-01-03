// ==========================================================================
// Project:  Ember Runtime
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

module("Ember Error Throwing");

test("new Ember.Error displays provided message", function() {
  raises( function(){
    throw new Ember.Error('A Message');
  }, function(e){
    return e.message === 'A Message';
  }, 'the assigned message was displayed' );
});
