// ==========================================================================
// Project:   Ember - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

Ember.assert("Ember requires jQuery 1.6 or 1.7", window.jQuery && window.jQuery().jquery.match(/^1\.[67](\.\d+)?(pre|rc\d?)?/));
Ember.$ = window.jQuery;
