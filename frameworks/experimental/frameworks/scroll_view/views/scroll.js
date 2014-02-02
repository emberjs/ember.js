// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

sc_require('views/desktop/scroll');
sc_require('views/touch/scroll');

SC.ScrollView = SC.platform.touch ? SC.TouchScrollView : SC.DesktopScrollView;

// Spoofed browsers should use TouchScrollView.
if (SC.browser && SC.platform && SC.browser.isMobileSafari && !SC.platform.touch) {
  SC.ScrollView = SC.TouchScrollView;
}
