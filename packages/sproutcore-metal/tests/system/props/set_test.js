// ==========================================================================
// Project:   SproutCore Metal
// Copyright: ©2011 Strobe Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================


module('SC.set');

test('should set arbitrary properties on an object', function() {
  var obj = {
    string: 'string',
    number: 23,
    boolTrue: true,
    boolFalse: false,
    nullValue: null
  };
  
  var newObj = {};
  
  for(var key in obj) {
    if (!obj.hasOwnProperty(key)) continue;
    equals(SC.set(newObj, key, obj[key]), obj[key], 'should return value');
    equals(SC.get(newObj, key), obj[key], 'should set value');
  }
  
});

