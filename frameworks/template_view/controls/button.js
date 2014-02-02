// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

sc_require('views/template');

/**
  @class
  @extends SC.TemplateView
  @extends SC.ActionSupport
*/
SC.Button = SC.TemplateView.extend(SC.ActionSupport,
/** @scope SC.Button.prototype */{

  classNames: ['sc-button'],

  mouseDown: function() {
    this.set('isActive', true);
    this._isMouseDown = YES;
  },

  mouseExited: function() {
    this.set('isActive', false);
  },

  mouseEntered: function() {
    if (this._isMouseDown) {
      this.set('isActive', true);
    }
  },

  rootResponder: function() {
    var pane = this.get('pane');
    return pane.get('rootResponder');
  }.property('pane').cacheable(),

  mouseUp: function(event) {
    if (this.get('isActive')) {
      this.fireAction();
      this.set('isActive', false);
    }

    this._isMouseDown = NO;
  },

  touchStart: function(touch) {
    this.mouseDown(touch);
  },

  touchEnd: function(touch) {
    this.mouseUp(touch);
  },

  keyDown: function(evt) {
    var ret = NO,
        view;
    if (evt.which === 9 || evt.keyCode === 9) {
      view = evt.shiftKey ? this.get('previousValidKeyView') : this.get('nextValidKeyView');
      if (view) {
        view.becomeFirstResponder();
      } else {
        evt.allowDefault();
      }
      ret = YES;
    } else if (evt.which === SC.Event.KEY_SPACE || evt.which === SC.Event.KEY_RETURN) {
      this.set('isActive', YES);
      this.invokeLater('_runAction', SC.ButtonView.TRIGGER_DELAY);
      ret = YES;
    }

    return ret;
  },

  keyUp: function(evt) {
    this.set('isActive', NO);
    return YES;
  },

  _runAction: function() {
    this.fireAction();
    this.set('isActive', NO);
  }

});
