// ==========================================================================
// Project:   Ember - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

function isCompatibleJQuery() {
  if (!window.jQuery) { return false; }

  var version = window.jQuery().jquery,
      regex = /^1\.(\d+)(\.\d+)?(pre|rc\d?)?/,
      match = regex.exec(version);

  if (!match) { return false; }

  var minor = parseInt(match[1], 10);
  return minor >= 6;
}

Ember.assert("Ember Views require jQuery ~1.6", isCompatibleJQuery());
Ember.$ = window.jQuery;
