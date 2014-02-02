// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// License:   Licensed under MIT license (see license.js)
// ==========================================================================
/*global module, test, htmlbody*/

module("SC.Cursor", {
  setup: function () {
    htmlbody('<style title="wrong-style"></style>');
  },

  teardown: function () {
    clearHtmlbody();
  }
});

/**
  There was a bug that if any additional style elements exist in the body
  the cursor would create a stylesheet in the head, but then retrieve the
  last stylesheet object which would be wrong.
*/
test("The cursor's stylesheet object should be the right object.", function () {
  var actual = SC.Cursor.sharedStyleSheet(),
    wrong;

  wrong = document.styleSheets[document.styleSheets.length - 1];
  ok(actual !== wrong, "The last stylesheet is not correct.");
});
