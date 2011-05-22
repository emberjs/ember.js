// ==========================================================================
// Project:  SproutCore Runtime
// Copyright: ©2011 Strobe Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

module('SC.Application');

test('SC.Application should be a subclass of SC.Namespace', function() {

  ok(SC.Namespace.detect(SC.Application), 'SC.Application subclass of SC.Namespace');
  
});
