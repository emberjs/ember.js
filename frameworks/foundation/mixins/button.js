// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

if(SC.Button) {
  SC.Button.initMixin = function(){
    throw new Error("SC.Button is deprecated as a mixin and is now a subclass of SC.TemplateView. Subclass SC.ButtonView instead.");
  };
}

