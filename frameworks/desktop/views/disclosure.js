// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

/**
  @class
  
  Disclosure triangle button. As a subclass of SC.ButtonView, this view
  takes a lot of the same properties as a button:
  
    - isEnabled: whether disclosure triangle is clickable or not
    - value: `YES` or `NO` (where `YES` implies expanded/open)
  
  A disclosure view also supports expanding and collapsing via
  the keyboard.
  
  @extends SC.ButtonView
  @since SproutCore 1.0
*/
SC.DisclosureView = SC.ButtonView.extend(
/** @scope SC.DisclosureView.prototype */ {
  
  /**
    @type Array
    @default ['sc-disclosure-view']
    @see SC.View#classNames
  */
  classNames: ['sc-disclosure-view'],

  /**
    @type String
    @default 'disclosureRenderDelegate'
  */
  renderDelegateName: 'disclosureRenderDelegate',

  /**
    @type String
    @default SC.TOGGLE_BEHAVIOR
    @see SC.ButtonView#buttonBehavior
  */
  buttonBehavior: SC.TOGGLE_BEHAVIOR,
  
  /**
    This is the value that will be set when the disclosure triangle is toggled
    open.
    
    @type Boolean
    @default YES
  */
  toggleOnValue: YES,
  
  /**
    The value that will be set when the disclosure triangle is toggled closed.
    
    @type Boolean
    @default YES
  */
  toggleOffValue: NO,
  
  /** @private */
  valueBindingDefault: SC.Binding.bool(),

  /** @private

    Allows toggling of the value with the right and left arrow keys.
    Extends the behavior inherited from SC.ButtonView.
    @param evt
  */
  keyDown: function(evt) {
    if (evt.which === 37 || evt.which === 38) {
      this.set('value', this.get('toggleOffValue')) ;
      return YES;
    }

    if (evt.which === 39 || evt.which === 40) {
      this.set('value', this.get('toggleOnValue')) ;
      return YES;
    }
    sc_super();
  }

});
