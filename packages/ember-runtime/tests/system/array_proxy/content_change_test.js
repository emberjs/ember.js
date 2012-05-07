// ==========================================================================
// Project:  Ember Runtime
// Copyright: ©2011 Strobe Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

module("Ember.ArrayProxy - content change");

test("should update length for null content", function() {
  var proxy = Ember.ArrayProxy.create({
        content: Ember.A([1,2,3])
      });

  equal(proxy.get('length'), 3, "precond - length is 3");

  proxy.set('content', null);

  equal(proxy.get('length'), 0, "length updates");
});
