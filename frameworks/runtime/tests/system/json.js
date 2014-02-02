// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

// ========================================================================
// SC.json Base Tests
// ========================================================================
/*globals module test ok isObj equals expects */

module("Json Module");
test("Encoding and decoding object graphs",function(){
	var tester = { foo: [1,2,3], bar: { a: "a", b: "b" } };
	var str = SC.json.encode(tester);
	var result = SC.json.decode(str);
	same(result,tester, "round trips");
});


