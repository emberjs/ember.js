// ==========================================================================
// Project:  Ember Runtime
// Copyright: ©2011 Strobe Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

module('mixins/observable');

test('should be able to use getProperties to get a POJO of provided keys', function() {
  var obj = Ember.Object.create({
    firstName: "Steve",
    lastName: "Jobs",
    companyName: "Apple, Inc."
  });
  
  var pojo = obj.getProperties("firstName", "lastName");
  equals("Steve", pojo.firstName);
  equals("Jobs", pojo.lastName);
});