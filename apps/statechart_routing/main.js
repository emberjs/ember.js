// ==========================================================================
// Project:   Test
// Copyright: @2011 My Company, Inc.
// ==========================================================================
/*globals Test */

Test.main = function main() {

  var sc = Test.statechart;
  SC.RootResponder.responder.set('defaultResponder', sc);
  sc.initStatechart();

} ;

function main() { Test.main(); }
