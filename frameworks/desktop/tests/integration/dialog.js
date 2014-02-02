// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================


/*global module test equals context ok same htmlbody */

var pane ;

module("A dialog with some basic controls and buttons", {
  teardown: function(){
    if (pane) pane.remove();
  }
});

test("adding dialog to screen", function() {


  var delegate = SC.Object.create({

    couldNotSend: function() {
      pane = SC.AlertPane.warn({
        message: "Email could not be sent",
        description: 'There might be a problem with the server or with your internet connection.  Try again in a few minutes.',
        buttons: [
          { title: "Try Again" },
          { title: "Cancel" },
          { title: 'Report Problem...' }
        ],
        delegate: this
      });
    },

    showMoreInfo: function() {
      pane = SC.AlertPane.info({
        message: "Sending Email",
        description: "Sometimes email doesn't make it.  It's a fact of life.  We all love email, but hey that's how it goes.\n" +
                      "Anyway, the nice thing is that we can provide this helpful dialog message, with multiple paragraphs and everything because of SproutCore.\n" +
                      "Email is OK, AlertPanes are great. So just deal m'kay?  Bye bye.",
        delegate: delegate
      });
    },

    alertPaneDidDismiss: function(alert, status) {
      switch(status) {
        case SC.OK_STATUS:
          this.invokeLater(this.couldNotSend, 1000);
          break;
        case SC.EXTRA_STATUS:
          this.showMoreInfo();
          break;
      }
    }
  });

  SC.RunLoop.begin();
  delegate.couldNotSend();
  SC.RunLoop.end();
}) ;

