// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

sc_require('views/text_field') ;
sc_require('system/utils/misc') ;
sc_require('delegates/inline_text_field');
sc_require('mixins/inline_editor');

/**
  @class

  The inline text editor is used to display an editable area for controls
  that are not always editable such as label views and source list views.

  You generally will not use the inline editor directly but instead will
  invoke beginEditing() and endEditing() on the views you are
  editing. If you would like to use the inline editor for your own views,
  you can do that also by using the editing API described here.

  ## Using the Inline Editor in Your Own Views

  To use the inlineEditor on a custom view you should mixin SC.InlineEditable on
  it. SC.InlineTextFieldView is the default editor so you do not need to do any
  other setup. The class methods beginEditing, commitEditing, and discardEditing
  still exist for backwards compatibility but should not be used on new views.

      MyProject.MyView = SC.View.extend(SC.InlineEditable, {
      });

  ### Starting the Editor

  The inline editor works by positioning itself over the top of your view
  with the same offset, width, and font information.

  To start it simply call beginEditing on your view.

      myView.beginEditing();

  By default, if the inline editor is currently in use elsewhere, it will automatically
  close itself over there and begin editing for your view instead. This behavior
  is defined by the inlineEditorDelegate of your view, and can be changed by using
  one other than the default.

  ## Customizing the editor

  The editor has several parameters that can be used to customize it to your
  needs. These options should be set on the editor passed to your delegate's (or
  view's) inlineEditorWillBeginEditing method:

   - `exampleFrame` -- The editors initial frame in viewport coordinates.
   - `value` -- Initial value of the edit field.
   - `exampleElement` -- A DOM element to use when copying styles.
   - `multiline` -- If YES then the hitting return will add to the value instead
     of exiting the inline editor.
   - `commitOnBlur` -- If YES then blurring will commit the value, otherwise it
     will discard the current value.  Defaults to YES.
   - `validator` -- Validator to be attached to the field.

  For backwards compatibility, calling the class method beginEditing with an
  options hash will translate the values in the hash to the correct settings on
  the editor.

  ## Committing or Discarding Changes

  Normally the editor will automatically commit or discard its changes
  whenever the user exits the edit mode by pressing enter, escape, or clicking
  elsewhere on the page. If you need to force the editor to end editing, you can
  do so by calling commitEditing() or discardEditing():

      myView.commitEditing();
      myView.discardEditing();

  Both methods will try to end the editing context and will call the
  relevant delegate methods on the inlineEditorDelegate set on your view.

  Note that it is possible an editor may not be able to commit editing
  changes because either the delegate disallowed it or because its validator
  failed.  In this case commitEditing() will return NO.  If you want to
  end editing anyway, you can discard the editing changes instead by calling
  discardEditing().  This method will generally succeed unless your delegate
  refuses it as well.

  @extends SC.TextFieldView
  @since SproutCore 1.0
*/
SC.InlineTextFieldView = SC.TextFieldView.extend(SC.InlineEditor,
/** @scope SC.InlineTextFieldView.prototype */ {
  classNames: ['inline-editor'],

  /**
    Over-write magic number from SC.TextFieldView
  */
  _topOffsetForFirefoxCursorFix: 0,

  /**
    The default size of the inline text field is 0 x 0 so that when it is
    appended, but before it is positioned it doesn't fill the parent view
    entirely.

    This is important, because if the parent view layer allows overflow,
    we could inadvertently alter the scrollTop or scrollLeft properties
    of the layer.
    */
  layout: { height: 0, width: 0 },

  /*
    @private

    Prevents the view from taking part in child view layout plugins.
  */
  useAbsoluteLayout: YES,

  /*
  * @private
  * @method
  *
  * Scans the given element for presentation styles from css.
  *
  * @params {element} the dom element to scan
  * @returns {String} a style string that was copied from the element
  */
  _updateViewStyle: function(el) {
    var styles = '',
        s=SC.getStyle(el,'font-size');

    if(s && s.length>0) styles = styles + "font-size: "+ s + " !important; ";

    s=SC.getStyle(el,'font-family');
    if(s && s.length>0) styles = styles + "font-family: " + s + " !important; ";

    s=SC.getStyle(el,'font-weight');
    if(s && s.length>0) styles = styles + "font-weight: " + s + " !important; ";

    s=SC.getStyle(el,'z-index');
    if(s && s.length>0) styles = styles + "z-index: " + s + " !important; ";

    s=SC.getStyle(el,'line-height');
    if(s && s.length>0) styles = styles + "line-height: " + s + " !important; ";

    s=SC.getStyle(el,'text-align');
    if(s && s.length>0) styles = styles + "text-align: " + s + " !important; ";

    s=SC.getStyle(el,'top-margin');
    if(s && s.length>0) styles = styles + "top-margin: " + s + " !important; ";

    s=SC.getStyle(el,'bottom-margin');
    if(s && s.length>0) styles = styles + "bottom-margin: " + s + " !important; ";

    s=SC.getStyle(el,'left-margin');
    if(s && s.length>0) styles = styles + "left-margin: " + s + " !important; ";

    s=SC.getStyle(el,'right-margin');
    if(s && s.length>0) styles = styles + "right-margin: " + s + " !important; ";

    return styles;
  },

  /*
  * @private
  * @method
  *
  * Scans the given element for positioning styles from css.
  *
  * @params {element} the dom element to scan
  * @returns {String} a style string copied from the element
  */
  _updateViewPaddingStyle: function(el) {
    var styles = '',
    s=SC.getStyle(el,'padding-top');

    if(s && s.length>0) styles = styles + "top: "+ s + " !important; ";

    s=SC.getStyle(el,'padding-bottom');
    if(s && s.length>0) styles = styles + "bottom: " + s + " !important; ";

    s=SC.getStyle(el,'padding-left');
    if(s && s.length>0) styles = styles + "left: " + s + " !important; ";

    s=SC.getStyle(el,'padding-right');
    if(s && s.length>0) styles = styles + "right: " + s + " !important; ";

    return styles;
	},

  /*
  * @private
  * @method
  *
  * Scans the given element for styles and copies them into a style element in
  * the head. This allows the styles to be overridden by css matching classNames
  * on the editor.
  *
  * @params {element} the dom element to copy
  */
	updateStyle: function(exampleElement) {
    if(exampleElement.length) exampleElement = exampleElement[0];

    // the styles are placed into a style element so that they can be overridden
    // by your css based on the editor className
    var styleElement = document.getElementById('sc-inline-text-field-style'),
		s = this._updateViewStyle(exampleElement),
		p = this._updateViewPaddingStyle(exampleElement),

		str = ".inline-editor input{"+s+"}" +
					".inline-editor textarea{"+s+"}" +
					".inline-editor .padding{"+p+"}";

    // the style element is lazily created
    if(!styleElement) {
      var head = document.getElementsByTagName('head')[0];
      styleElement = document.createElement('style');

      styleElement.type= 'text/css';
      styleElement.media= 'screen';
      styleElement.id = 'sc-inline-text-field-style';

      head.appendChild(styleElement);
    }

    // now that we know the element exists, write the styles

    // IE method
    if(styleElement.styleSheet) styleElement.styleSheet.cssText= str;
    // other browsers
    else styleElement.innerHTML = str;
	},

  /*
  * @method
  *
  * Positions the editor over the target view.
  *
  * If you want to tweak the positioning of the editor, you may pass a custom
  * frame for it to position itself on.
  *
  * @param {SC.View} the view to be positioned over
  * @param {Hash} optional custom frame
  * @param {Boolean} if the view is a member of a collection
  */
	positionOverTargetView: function(target, exampleFrame, elem, _oldExampleFrame, _oldElem) {
    var targetLayout = target.get('layout'),
        layout = {};

    // Deprecates isCollection and pane arguments by fixing them up if they appear.
    if (!SC.none(_oldExampleFrame)) {
      exampleFrame = _oldExampleFrame;
      elem = _oldElem;

      // @if(debug)
      SC.warn("Developer Warning: the isCollection and pane arguments have been deprecated and can be removed.  The inline text field will now position itself within the same parent element as the target, thus removing the necessity to calculate the position of the target relative to the pane.");
      // @endif
    }

    // In case where the label is part of an SC.ListItemView
    if (exampleFrame && elem) {
      var frame = SC.offset(elem, 'parent');

      layout.top = targetLayout.top + frame.y - exampleFrame.height/2;
      layout.left = targetLayout.left + frame.x;
      layout.height = exampleFrame.height;
      layout.width = exampleFrame.width;
    } else {
      layout = SC.copy(targetLayout);
    }

    this.set('layout', layout);
  },

  /*
  * Flag indicating whether the editor is allowed to use multiple lines.
  * If set to yes it will be rendered using a text area instead of a text input.
  *
  * @type {Boolean}
  */
  multiline: NO,

  /*
  * Translates the multiline flag into something TextFieldView understands.
  *
  * @type {Boolean}
  */
  isTextArea: function() {
    return this.get('multiline');
  }.property('multiline').cacheable(),

  /*
  * Begins editing the given view, positions the editor on top of the view, and
  * copies the styling of the view onto the editor.
  *
  * @params {SC.InlineEditable} the view being edited
  *
  * @returns {Boolean} YES on success
  */
  beginEditing: function(original, label) {
		if(!original(label)) return NO;

    var pane = label.get('pane'),
      elem = this.get('exampleElement');

    this.beginPropertyChanges();

    if (label.multiline) this.set('multiline', label.multiline);

    // if we have an exampleElement we need to make sure it's an actual
    // DOM element not a jquery object
    if (elem) {
      if(elem.length) elem = elem[0];
    }

    // if we don't have an element we need to get it from the target
    else {
      elem = label.$()[0];
    }

    this.updateStyle(elem);

    this.positionOverTargetView(label, this.get('exampleFrame'), elem);

    this._previousFirstResponder = pane ? pane.get('firstResponder') : null;
    this.becomeFirstResponder();
    this.endPropertyChanges() ;

    return YES;
  }.enhance(),

  /**
    Invoked whenever the editor loses (or should lose) first responder
    status to commit or discard editing.

    @returns {Boolean}
  */
  // TODO: this seems to do almost the same thing as fieldDidBlur
  blurEditor: function(evt) {
    if (this.get('isEditing')) {
      return this.commitOnBlur ? this.commitEditing() : this.discardEditing();
    } else {
      return true;
    }
  },

  /**
    @method
    @private

    Called by commitEditing and discardEditing to actually end editing.

  */
  _endEditing: function(original) {
    var ret = original();

    // resign first responder if not done already.  This may call us in a
    // loop but since isEditing is already NO, nothing will happen.
    if (this.get('isFirstResponder')) {
      var pane = this.get('pane');
      if (pane && this._previousFirstResponder) {
        pane.makeFirstResponder(this._previousFirstResponder);
      } else this.resignFirstResponder();
    }
    this._previousFirstResponder = null ; // clearout no matter what

    return ret;
  }.enhance(),

  // TODO: make textArea automatically resize to fit content

  /** @private */
  mouseDown: function(e) {
    arguments.callee.base.call(this, e) ;
    return this.get('isEditing');
  },

  touchStart: function(e){
    this.mouseDown(e);
  },

  _scitf_blurInput: function() {
    var el = this.$input()[0];
    if (el) el.blur();
    el = null;
  },

  // [Safari] if you don't take key focus away from an element before you
  // remove it from the DOM key events are no longer sent to the browser.
  /** @private */
  willRemoveFromParent: function() {
    return this._scitf_blurInput();
  },

  // ask owner to end editing.
  /** @private */
  willLoseFirstResponder: function(responder, evt) {
    if (responder !== this) return;

    // if we're about to lose first responder for any reason other than
    // ending editing, make sure we clear the previous first responder so
    // isn't cached
    this._previousFirstResponder = null;

    // store the original event that caused this to loose focus so that
    // it can be passed to the delegate
    this._origEvent = evt;

    // should have been covered by willRemoveFromParent, but this was needed
    // too.
    this._scitf_blurInput();
    return this.blurEditor(evt) ;
  },

  /**
    invoked when the user presses escape.  Returns true to ignore keystroke

    @returns {Boolean}
  */
  cancel: function() {
    this.discardEditing();
    return YES;
  },

  // Invoked when the user presses return.  If this is a multi-line field,
  // then allow the new line to proceed by calling the super class.
  // Otherwise, try to commit the edit.
  /** @private */
  insertNewline: function(evt) {
    if (this.get('isTextArea')) {
      return sc_super();
    } else {
      this.commitEditing() ;
      return YES ;
    }
  },

  // Tries to find the next key view when tabbing.  If the next view is
  // editable, begins editing.
  /** @private */
  insertTab: function(evt) {
    var target = this.target; // removed by commitEditing()
    this.resignFirstResponder();
    if(target){
      var next = target.get('nextValidKeyView');
      if(next && next.beginEditing) next.beginEditing();
    }
    return YES ;
  },

  /** @private */
  insertBacktab: function(evt) {
    var target = this.target; // removed by commitEditing()
    this.resignFirstResponder();
    if(target){
      var prev = target.get('previousValidKeyView');
      if(prev && prev.beginEditing) prev.beginEditing();
    }
    return YES ;
  }
});
