// ==========================================================================
// Project:   CoreTools.Test
// Copyright: ©2011 Apple Inc.
// ==========================================================================
/*globals CoreTools */

/**

  (Document your Model here)

  @extends SC.Record
  @version 0.1
*/
CoreTools.Test = SC.Record.extend(
/** @scope CoreTools.Test.prototype */ {

  primaryKey: "url",

  /**
    The filename for this test.
  */
  filename: SC.Record.attr(String),

  /**
    The test URL.
  */
  url: SC.Record.attr(String),

  /**
    Display name to show in the tests UI.  This is computed by removing some
    generic cruft from the filename.
  */
  displayName: function() {
    return (this.get('filename') || '').replace(/^tests\//,'');
  }.property('filename').cacheable(),

  /**
    Test icon.  To be replaced eventually with actual pass|fail icons
  */
  icon: 'sc-icon-document-16',

  /**
    Shows the "branch" at the right of the list.  Eventually this will be
    computed based on whether the test is a summary of other tests or not.
  */
  isRunnable: YES

});
