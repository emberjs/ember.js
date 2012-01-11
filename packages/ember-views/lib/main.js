// ==========================================================================
// Project:   Ember - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

require("ember-runtime");

ember_assert("Ember is only compatible with jQuery 1.6+", parseFloat(jQuery().jquery) >= 1.6);
Ember.$ = jQuery;

require("ember-views/system");
require("ember-views/views");
