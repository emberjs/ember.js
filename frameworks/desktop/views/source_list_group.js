// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

sc_require('mixins/collection_group');
sc_require('views/disclosure');

/**
  @class
  
  Displays a group view in a source list.  Handles displaying a disclosure
  triangle which can be used to show/hide children.
  
  @extends SC.View
  @extends SC.Control
  @extends SC.CollectionGroup
  @author Charles Jolley
  @author Erich Ocean
  @version 1.0
  @since 0.9
*/
SC.SourceListGroupView = SC.View.extend(SC.Control, SC.CollectionGroup,
/** @scope SC.SourceListGroupView.prototype */ {
  
  /**
    @type Array
    @default ['sc-source-list-group']
    @see SC.View#classNames
  */
  classNames: ['sc-source-list-group'],
  
  // ..........................................................
  // KEY PROPERTIES
  // 
  
  /**
    The content object the source list group will display.
    
    @type SC.Object
    @default null
  */
  content: null,
  
  /**
    The current group visibility.  Used by the source list to determine the 
    layout size of the group.
    
    @type Boolean
    @default YES
  */
  isGroupVisible: YES,
  
  /** 
    YES if group is showing its titlebar.
    
    Group views will typically hide their header if the content is set to 
    null.  You can also override this method to always hide the header if 
    you want and the SourceListView will not leave room for it.
    
    @type Boolean
    @default YES
  */
  hasGroupTitle: YES,
  
  /**
    The content property key to use as the group view's title.
    
    @type String
    @default null
  */
  groupTitleKey: null,
  
  /**
    The content property key to use to determine if the group's children are 
    visible or not.
    
    @type String
    @default null
  */
  groupVisibleKey: null,
  
  /** @private */
  render: function(context, firstTime) {
    context.push('<div role="button" class="sc-source-list-label sc-disclosure-view sc-button-view button disclosure no-disclosure">',
              '<img src="'+SC.BLANK_IMAGE_URL+'" class="button" />',
              '<span class="label"></span></div>') ;
  },
  
  /** @private */
  createChildViews: function() {
    
  },
  
  /** @private */
  contentPropertyDidChange: function(target, key) {
    var content = this.get('content') ;
    var labelView = this.outlet('labelView') ;
    
    // hide labelView if content is null.
    if (content === null) {
      labelView.setIfChanged('isVisible', NO) ;
      this.setIfChanged('hasGroupTitle', NO) ;
      return ;
    } else {
      labelView.setIfChanged('isVisible', YES) ;
      this.setIfChanged('hasGroupTitle', YES) ;
    }
    
   // set the title if that changed.
    var groupTitleKey = this.getDelegateProperty('groupTitleKey', this.displayDelegate) ;
    if ((key == '*') || (groupTitleKey && (key == groupTitleKey))) {
      var title = (content && content.get && groupTitleKey) ? content.get(groupTitleKey) : content;
      if (title != this._title) {
        this._title = title ;
        if (title) title = title.capitalize() ;
        labelView.set('title', title) ;
      }
    }
    
    // set the group visibility if changed
    var groupVisibleKey = this.getDelegateProperty('groupVisibleKey', this.displayDelegate) ;
    if ((key == '*') || (groupVisibleKey && (key == groupVisibleKey))) {
      if (groupVisibleKey) {
        labelView.removeClassName('no-disclosure') ;
        
        var isVisible = (content && content.get) ?
          !!content.get(groupVisibleKey) :
          YES ;
        if (isVisible != this.get('isGroupVisible')) {
          this.set('isGroupVisible', isVisible) ;
          labelView.set('value', isVisible) ;
        }
      } else labelView.addClassName('no-disclosure') ;
    }
  },
  
  /** @private
    Called when the user clicks on the disclosure triangle
  */
  disclosureValueDidChange: function(newValue) {
    if (newValue == this.get('isGroupVisible')) return; // nothing to do
    
    // update group if necessary
    var group = this.get('content') ;
    var groupVisibleKey = this.getDelegateProperty('groupVisibleKey', this.displayDelegate) ;
    if (group && group.set && groupVisibleKey) {
      group.set(groupVisibleKey, newValue) ;
    }
    
    // update my own value and then update my collection view.
    this.set('isGroupVisible', newValue) ;
    if (this.owner && this.owner.updateChildren) this.owner.updateChildren(true) ;
    
  },
  
  /** @private */
  labelView: SC.DisclosureView.extend({
    
    /** @private */
    value: YES,
    
    /** @private
      If the disclosure value changes, call the owner's method.  Note
      normally you would do this with a binding, but since this is a semi-
      private class anyway, there is no reason to go to all that trouble.
    */
    _valueObserver: function() {
      if (this.owner) this.owner.disclosureValueDidChange(this.get('value')) ;
    }.observes('value')
    
  })
  
});
