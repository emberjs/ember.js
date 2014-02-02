// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

/** @class

  Used to display an iframe. The source, (specified by the value property) of
  the iFrame should be from the same domain. (i.e. the src / value should be
  from the same domain) if you want to access the contents of the iframe.

  @extends SC.View
  @extends SC.Control
  @since SproutCore 1.0
*/
SC.WebView = SC.View.extend(SC.Control, {/** @scope SC.WebView.prototype */
  classNames: 'sc-web-view',

  /**
    @type Array
    @default ['value', 'shouldAutoResize']
    @see SC.View#displayProperties
  */
  displayProperties: ['value', 'shouldAutoResize'],

  /**
    The content of the iframe can be bigger than the size specified when creating
    the view. If you want the view to be auto-resized to the dimensions of the
    iframe, then set the value of this property to YES.
    The web view can be auto resized only if the contents are from the same
    domain as the parent domain.

    @type Boolean
    @default NO
  */
  shouldAutoResize: NO,

  /**
    @param {SC.RenderContext} context
    @param {Boolean} firstTime
  */
  render: function(context, firstTime) {
    var src = this.get('value') || '',
      iframe;

    if (firstTime) {
      context.push('<iframe src="' + src +
      '" style="position: absolute; width: 100%; height: 100%; border: 0px; margin: 0px; padding: 0px;"></iframe>');
    }
    else if(src!==this._lastSrc) {
      iframe = this.$('iframe');
      // clear out the previous src, to force a reload
      iframe.attr('src', 'javascript:;');
      iframe.attr('src', src);
    }

    this._lastSrc = src;
  },

  /**
    Called when the layer gets created.
  */
  didCreateLayer: function() {
    var f = this.$('iframe');
    // Attach an onload event to the iframe.
    SC.Event.add(f, 'load', this, this.iframeDidLoad);
  },

  /**
    Called before the layer gets destroyed.
  */
  willDestroyLayer: function() {
    var f = this.$('iframe');
    // Remove the onload event so that the iframe can be released
    SC.Event.remove(f, 'load', this, this.iframeDidLoad);
  },

  /**  @private
    Called when iframe onload event is fired.
    1. Resizes the view to fit the contents of the iframe using the
    scroll width and scroll height of the contents of the iframe

    The iframe contents can be accessed only when the src is from the same
    domain as the parent document
  */
  iframeDidLoad: function() {

    //fit the iframe to size of the contents.
    if (this.get('shouldAutoResize') === YES) {
      var contentWindow;
      var iframeElt = this.$('iframe')[0];
      if(iframeElt && iframeElt.contentWindow) {
        contentWindow = iframeElt.contentWindow;
        if(contentWindow && contentWindow.document && contentWindow.document.documentElement){
          var docElement = contentWindow.document.documentElement;
          // setting the width before the height gives more accurate results..
          // at least for the test iframe content i'm using.
          //TODO: try out document flows other than top to bottom.
          if (!SC.browser.isIE) {
            this.$().width(docElement.scrollWidth);
            this.$().height(docElement.scrollHeight);
          }
          else {
            this.$().width(docElement.scrollWidth + 12);
            this.$().height(docElement.scrollHeight + 5);
          }
        }
      }
    }
  }

});
