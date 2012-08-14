// ==========================================================================
// Project:   Ember - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

Ember.assert("Ember Views require jQuery 1.7 or 1.8", window.jQuery && (window.jQuery().jquery.match(/^1\.[78](\.\d+)?(pre|rc\d?)?/) || Ember.ENV.FORCE_JQUERY));
Ember.$ = window.jQuery;
