// ==========================================================================
// Project:  SproutCore Runtime
// Copyright: ©2011 Strobe Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

module('mixins/observable');

test('should be able to use getProperties to get a POJO of provided keys', function() {
  var obj = SC.Object.create({
    firstName: "Steve",
    lastName: "Jobs",
    zipCode: 94301
  });
  
  var pojo = obj.getProperties("firstName lastName".w());
  equals("Steve", pojo.firstName);
  equals("Jobs", pojo.lastName);
});