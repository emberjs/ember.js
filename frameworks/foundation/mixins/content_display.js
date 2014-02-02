// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

/**
  @namespace

  The SC.ContentDisplay mixin makes it easy to automatically update your view
  display whenever relevant properties on a content object change.  To use
  this mixin, include it in your view and then add the names of the
  properties on the content object you want to trigger a displayDidChange()
  method on your view. Your updateDisplay() method will then be called at the
  end of the run loop.

  ## Example

      MyApp.MyViewClass = SC.View.extend(SC.ContentDisplay, {
        contentDisplayProperties: 'title isEnabled hasChildren'.w(),
        ...
      });

  @since SproutCore 1.0
*/
SC.ContentDisplay = {

  /** @private */
  concatenatedProperties: 'contentDisplayProperties',

  /** @private */
  displayProperties: ['content'],

  /**
    Add an array with the names of any property on the content object that
    should trigger an update of the display for your view.  Changes to the
    content object will only invoke your display method once per runloop.

    @type Array
    @default []
  */
  contentDisplayProperties: [],

  /** @private
    Setup observers on the content object when initializing the mixin.
  */
  initMixin: function() {
    this._display_contentDidChange();
  },

  /**
   * Remove observer on existing content object, if present
   * @private
   */
  destroyMixin: function () {
    if (!this._display_content) return;
    this._display_stopObservingContent(this._display_content);
    this._display_content = null;
  },

  /** @private */
  _display_beginObservingContent: function(content) {
    var f = this._display_contentPropertyDidChange;

    if (SC.isArray(content)) {
      content.invoke('addObserver', '*', this, f);
    }
    else if (content.addObserver) {
      content.addObserver('*', this, f);
    }
  },

  /** @private */
  _display_stopObservingContent: function(content) {
    var f = this._display_contentPropertyDidChange;

    if (SC.isArray(content)) {
      content.invoke('removeObserver', '*', this, f);
    }
    else if (content.removeObserver) {
      content.removeObserver('*', this, f);
    }
  },

  /** @private */
  _display_contentDidChange: function(target, key, value) {
    // handle changes to the content...
    if ((value = this.get('content')) === this._display_content) return;

    // stop listening to old content.
    var content = this._display_content;
    if (content) this._display_stopObservingContent(content);

    // start listening for changes on the new content object.
    content = this._display_content = value;
    if (content) this._display_beginObservingContent(content);

    this.displayDidChange();
  }.observes('content'),

  /** @private Invoked when properties on the content object change. */
  _display_contentPropertyDidChange: function(target, key, value, propertyRevision) {
    if (key === '*') {
      this.displayDidChange() ;
    } else {
      // only update if a displayProperty actually changed...s
      var ary = this.get('contentDisplayProperties') ;
      if (ary && ary.indexOf(key)>=0) this.displayDidChange();
    }
  }

} ;
