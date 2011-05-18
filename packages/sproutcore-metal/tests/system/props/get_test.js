// ==========================================================================
// Project:   SproutCore Metal
// Copyright: ©2011 Strobe Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================


module('SC.get');

test('should get arbitrary properties on an object', function() {
  var obj = {
    string: 'string',
    number: 23,
    boolTrue: true,
    boolFalse: false,
    nullValue: null
  };
  
  for(var key in obj) {
    if (!obj.hasOwnProperty(key)) continue;
    equals(SC.get(obj, key), obj[key], key);
  }
  
});
