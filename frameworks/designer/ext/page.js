// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================


/** 
  Extend `SC.Page` to emit a design document for the entire page.
*/
SC.Page.prototype.emitDesign = function() {

  // awake all views.  this is needed to emit the design for them.
  this.awake();

  // the pageName must be set on the page so we can emit properly
  var pageName = this.get('pageName');
  
  // now encode the page.
  var ret = SC.DesignCoder.encode(this);
  
  // and add some wrapper
  ret = ['// SproutCore ViewBuilder Design Format v1.0',
    '// WARNING: This file is automatically generated.  DO NOT EDIT.  Changes you',
    '// make to this file will be lost.', '',
    '%@ = %@;'.fmt(pageName, ret),''].join("\n");
  
  return ret ;
};

/**
  Extend `SC.Page` to create a `PageDesignController` on demand.
  
  @property {SC.PageDesignController}
*/
SC.Page.prototype.designController = function() {
  if (!this._designController) {
    this._designController = SC.PageDesignController.create({ page: this });
  }
  return this._designController ;
}.property().cacheable();

/** @private implement support for encoders */
SC.Page.prototype.encodeDesign = function(c) {
  // step through and find all views.  encode them.
  for(var key in this) {
    if(!this.hasOwnProperty(key)) continue;
    var view = this[key];
    if (key !== '__sc_super__' && key !== '_designController' &&
        (view instanceof SC.View || view instanceof SC.Controller || view instanceof SC.Object)){
     c.js(key, view.emitDesign());      
    }
  }
  
  // save page name;
  c.string('pageName', this.get('pageName'));
};
  

