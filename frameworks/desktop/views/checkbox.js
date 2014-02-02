// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

/** @class

  Represents a Checkbox Button.

  The view is an `SC.ButtonView` put into toggle mode and with the 'theme' property
  set to "checkbox".

  Rendering
  ----------------------------
  SC.ButtonView delegates its rendering to its theme. As the theme is set
  to "checkbox", the way the checkbox renders (including DOM) will actually
  be different than SC.ButtonView's.

  @extends SC.ButtonView
  @since SproutCore 1.0
*/
SC.CheckboxView = SC.ButtonView.extend(
/** @scope SC.CheckboxView.prototype */ {

  /**
    @type Array
    @default ['sc-checkbox-view', 'sc-checkbox-control']
    @see SC.View#classNames
  */
  classNames: ['sc-checkbox-view', 'sc-checkbox-control'],

  /**
    The WAI-ARIA role of checkbox.

    @type String
    @readOnly
  */
  ariaRole: 'checkbox',

  // no special theme for Checkbox; button defaults to 'square', so we have to stop that.
  themeName: null,

  /**
    @type String
    @default 'checkboxRenderDelegate'
  */
  renderDelegateName: 'checkboxRenderDelegate',

  /**
    Ellipsis is disabled by default to allow multiline text

    @type Boolean
    @default NO
  */
  needsEllipsis: NO,

  /**
    `YES` if `isEnabledInPane` is `YES`, `NO` otherwise

    @type Boolean
    @default NO
    @observes isEnabledInPane
  */
  acceptsFirstResponder: function() {
    if (SC.FOCUS_ALL_CONTROLS) { return this.get('isEnabledInPane'); }
    return NO;
  }.property('isEnabledInPane'),

  /** @private */
  _toggleValue: function(){
    var isOn = this.get('value') === this.get('toggleOnValue');
    this.set('value', isOn ? this.get('toggleOffValue') : this.get('toggleOnValue'));
  },

  /** @private */
  mouseDown: function(evt) {
    if(!this.get('isEnabledInPane')) return YES;
    this.set('isActive', YES);
    this._isMouseDown = YES;
    if (evt && this.get('acceptsFirstResponder')) evt.allowDefault();
    return YES;
  },

  /** @private */
  mouseUp: function(evt) {
    if(!this.get('isEnabledInPane')) return YES;

    this.set('isActive', NO);
    this._isMouseDown = NO;

    // fire action
    if (this.get('buttonBehavior') !== SC.HOLD_BEHAVIOR) {
      if (this.$().within(evt.target)) {
        this._toggleValue();
        this._action(evt);
      }
    }

    return YES;

  },

  /** @private */
  keyDown: function(evt) {
    // handle tab key
    if(!this.get('isEnabledInPane')) return YES;

    if (evt.which === 9 || evt.keyCode === 9) {
      var view = evt.shiftKey ? this.get('previousValidKeyView') : this.get('nextValidKeyView');
      if(view) view.becomeFirstResponder();
      else evt.allowDefault();
      return YES ; // handled
    }

    if (evt.which === 13 || evt.which === 32) {
      this._toggleValue();

      // fire action
      if (this.get('buttonBehavior') !== SC.HOLD_BEHAVIOR) {
        if (this.$().within(evt.target)) { this._action(evt); }
      }

      return YES ; // handled
    }

    // let other keys through to browser
    evt.allowDefault();

    return NO;
  },



  /** @private */
  touchStart: function(evt) {
    return this.mouseDown(evt);
  },

  /** @private */
  touchEnd: function(evt) {
    return this.mouseUp(evt);
  }

});
