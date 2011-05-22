// ==========================================================================
// Project:  SproutCore Runtime
// Copyright: ©2011 Strobe Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

module('SC.Namepsace');

test('SC.Namespace should be a subclass of SC.Object', function() {
  ok(SC.Object.detect(SC.Namespace));
});
