// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

/**
  @class

  The controller base class provides some common functions you will need
  for controllers in your applications, especially related to maintaining
  an editing context.

  In general you will not use this class, but you can use a subclass such
  as ObjectController, TreeController, or ArrayController.

  ## EDITING CONTEXTS

  One major function of a controller is to mediate between changes in the
  UI and changes in the model.  In particular, you usually do not want
  changes you make in the UI to be applied to a model object directly.
  Instead, you often will want to collect changes to an object and then
  apply them only when the user is ready to commit their changes.

  The editing contact support in the controller class will help you
  provide this capability.

  @extends SC.Object
  @since SproutCore 1.0
*/
SC.Controller = SC.Object.extend(
/** @scope SC.Controller.prototype */ {

  /**
    Makes a controller editable or not editable.  The SC.Controller class
    itself does not do anything with this property but subclasses will
    respect it when modifying content.

    @type Boolean
  */
  isEditable: YES,

  /**
   * Set this to YES if you are setting the controller content to a recordArray
   * or other content that needs to be cleaned up (with `.destroy()`) when
   * new content is set.
   */
  destroyContentOnReplace: NO,

  contentObjectDidChanged: function() {
    var oldContent, newContent;

    if (!this.get('destroyContentOnReplace')) return;

    oldContent = this._oldContent;
    newContent = this.get('content');
    if (oldContent && newContent !== oldContent && oldContent.destroy) {
      oldContent.destroy();
    }
    this._oldContent = newContent;
  }.observes('content')

});
