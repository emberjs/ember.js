// ==========================================================================
// Project:   Ember - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

require("ember-runtime");

ember_assert("Ember is only compatible with jQuery 1.6 and 1.7", jQuery().jquery.match(/^1\.[67](.\d+)?$/));
Ember.$ = jQuery;

require("ember-views/system");
require("ember-views/views");
