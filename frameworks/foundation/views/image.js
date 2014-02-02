// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
//            Portions ©2010 Strobe Inc.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

SC.IMAGE_STATE_NONE = 'none';
SC.IMAGE_STATE_LOADING = 'loading';
SC.IMAGE_STATE_LOADED = 'loaded';
SC.IMAGE_STATE_FAILED = 'failed';

SC.IMAGE_TYPE_NONE = 'NONE';
SC.IMAGE_TYPE_URL = 'URL';
SC.IMAGE_TYPE_CSS_CLASS = 'CSS_CLASS';

/**
  URL to a transparent GIF.  Used for spriting.
*/
SC.BLANK_IMAGE_DATAURL = "data:image/gif;base64,R0lGODlhAQABAJAAAP///wAAACH5BAUQAAAALAAAAAABAAEAAAICBAEAOw==";

SC.BLANK_IMAGE_URL = SC.browser.isIE && SC.browser.compare(SC.browser.version, '8') <= 0 ? sc_static('blank.gif') : SC.BLANK_IMAGE_DATAURL;

SC.BLANK_IMAGE = new Image();
SC.BLANK_IMAGE.src = SC.BLANK_IMAGE_URL;
SC.BLANK_IMAGE.width = SC.BLANK_IMAGE.height = 1;

/**
  @class

  Displays an image in the browser.

  The ImageView can be used to efficiently display images in the browser.
  It includes a built in support for a number of features that can improve
  your page load time if you use a lot of images including a image loading
  cache and automatic support for CSS spriting.

  Note that there are actually many controls that will natively include
  images using an icon property name.

  @extends SC.View
  @extends SC.Control
  @extends SC.InnerFrame
  @since SproutCore 1.0
*/
SC.ImageView = SC.View.extend(SC.Control, SC.InnerFrame,
/** @scope SC.ImageView.prototype */ {

  classNames: 'sc-image-view',

  // Don't apply this role until each image view can assign a non-empty string value for @aria-label <rdar://problem/9941887>
  // ariaRole: 'img',

  displayProperties: ['align', 'scale', 'value', 'displayToolTip'],

  /** @private */
  renderDelegateName: function () {
    return (this.get('useCanvas') ? 'canvasImage' : 'image') + "RenderDelegate";
  }.property('useCanvas').cacheable(),

  /** @private */
  tagName: function () {
    return this.get('useCanvas') ? 'canvas' : 'div';
  }.property('useCanvas').cacheable(),


  // ..........................................................
  // Properties
  //

  /**
    If YES, this image can load in the background.  Otherwise, it is treated
    as a foreground image.  If the image is not visible on screen, it will
    always be treated as a background image.
  */
  canLoadInBackground: NO,

  /** @private
    @type Image
    @default SC.BLANK_IMAGE
  */
  image: SC.BLANK_IMAGE,


  /** @private
    The frame for the inner img element or for the canvas to draw within, altered according to the scale
    and align properties provided by SC.InnerFrame.

    @type Object
  */
  innerFrame: function () {
    var image = this.get('image'),
      imageWidth = image.width,
      imageHeight = image.height,
      frame = this.get('frame');

    if (SC.none(frame)) return { x: 0, y: 0, width: 0, height: 0 };  // frame is 'null' until rendered when useStaticLayout === YES

    return this.innerFrameForSize(imageWidth, imageHeight, frame.width, frame.height);
  }.property('align', 'image', 'scale', 'frame').cacheable(),

  /**
    If YES, any specified toolTip will be localized before display.

    @type Boolean
    @default YES
  */
  localize: YES,

  /**
    Current load status of the image.

    This status changes as an image is loaded from the server.  If spriting
    is used, this will always be loaded.  Must be one of the following
    constants: SC.IMAGE_STATE_NONE, SC.IMAGE_STATE_LOADING,
    SC.IMAGE_STATE_LOADED, SC.IMAGE_STATE_FAILED

    @type String
  */
  status: SC.IMAGE_STATE_NONE,

  /**
    Will be one of the following constants: SC.IMAGE_TYPE_URL or
    SC.IMAGE_TYPE_CSS_CLASS

    @type String
    @observes value
  */
  type: function () {
    var value = this.get('value');

    if (SC.ImageView.valueIsUrl(value)) return SC.IMAGE_TYPE_URL;
    else if (!SC.none(value)) return SC.IMAGE_TYPE_CSS_CLASS;
    return SC.IMAGE_TYPE_NONE;
  }.property('value').cacheable(),

  /**
    The canvas element performs better than the img element since we can
    update the canvas image without causing browser reflow.  As an additional
    benefit, canvas images are less easily copied, which is generally in line
    with acting as an 'application'.

    @type Boolean
    @default YES if supported
    @since SproutCore 1.5
  */
  useCanvas: function () {
    return SC.platform.supportsCanvas && !this.get('useStaticLayout');
  }.property('useStaticLayout').cacheable(),

  /**
    If YES, image view will use the SC.imageQueue to control loading.  This
    setting is generally preferred.

    @type Boolean
    @default YES
  */
  useImageQueue: YES,

  /**
    A url or CSS class name.

    This is the image you want the view to display.  It should be either a
    url or css class name.  You can also set the content and
    contentValueKey properties to have this value extracted
    automatically.

    If you want to use CSS spriting, set this value to a CSS class name.  If
    you need to use multiple class names to set your icon, separate them by
    spaces.

    Note that if you provide a URL, it must contain at least one '/' as this
    is how we autodetect URLs.

    @type String
  */
  value: null,

  /**
    Recalculate our innerFrame if the outer frame has changed.

    @returns {void}
  */
  viewDidResize: function () {
    sc_super();

    // Note: SC.View's updateLayer() will call viewDidResize() if useStaticLayout is true.  The result of this
    // is that since our display depends on the frame, when the view or parent view resizes, viewDidResize
    // notifies that the frame has changed, so we update our view, which calls viewDidResize, which notifies
    // that the frame has changed, so we update our view, etc. in an infinite loop.
    if (this.get('useStaticLayout')) {
      if (this._updatingOnce) {
        this._updatingOnce = false;
      } else {
        // Allow a single update when the view resizes to avoid an infinite loop.
        this._updatingOnce = true;
        this.updateLayerIfNeeded();
      }
    } else {
      this.updateLayerIfNeeded();
    }
  },

  // ..........................................................
  // Methods
  //

  /** @private */
  init: function () {
    sc_super();

    // Start loading the image immediately on creation.
    this._valueDidChange();

    if (this.get('useImageCache') !== undefined) {
      //@if(debug)
      SC.warn("Developer Warning: %@ has useImageCache set, please set useImageQueue instead".fmt(this));
      //@endif
      this.set('useImageQueue', this.get('useImageCache'));
    }
  },


  // ..........................................................
  // Rendering
  //

  /**
    Called when the element is attached to the document.

    If the image uses static layout (i.e. we don't know the frame beforehand),
    then this method will call updateLayerIfNeeded in order to adjust the inner
    frame of the image according to its rendered frame.
  */
  didAppendToDocument: function () {
    // If using static layout, we can still support image scaling and aligning,
    // but we need to do it post-render.
    if (this.get('useStaticLayout')) {
      // Call updateLayer manually, because we can't have innerFrame be a
      // display property.  It causes an infinite loop with static layout.
      this.updateLayerIfNeeded();
    }
  },

  /**
    Called when the element is created.

    If the view is using a canvas element, then we can not draw to the canvas
    until it exists.  This method will call updateLayerIfNeeded in order to draw
    to the canvas.
  */
  didCreateLayer: function () {
    if (this.get('useCanvas')) {
      this.updateLayerIfNeeded();
    }
  },

  // ..........................................................
  // Value handling
  //

  /** @private
    Whenever the value changes, update the image state and possibly schedule
    an image to load.
  */
  _valueDidChange: function () {
    var value = this.get('value'),
      type = this.get('type');

    // Reset the backing image object every time.
    this.set('image', SC.BLANK_IMAGE);

    if (type == SC.IMAGE_TYPE_URL) {
      // Load the image.
      this.set('status', SC.IMAGE_STATE_LOADING);

      // order: image cache, normal load
      if (!this._loadImageUsingCache()) {
        this._loadImage();
      }
    }
  }.observes('value'),

  /** @private
    Tries to load the image value using the SC.imageQueue object. If the value is not
    a URL, it won't attempt to load it using this method.

    @returns YES if loading using SC.imageQueue, NO otherwise
  */
  _loadImageUsingCache: function () {
    var value = this.get('value'),
        type = this.get('type');

    // now update local state as needed....
    if (type === SC.IMAGE_TYPE_URL && this.get('useImageQueue')) {
      var isBackground = this.get('isVisibleInWindow') || this.get('canLoadInBackground');

      SC.imageQueue.loadImage(value, this, this._loadImageUsingCacheDidComplete, isBackground);
      return YES;
    }

    return NO;
  },

  /** @private */
  _loadImageUsingCacheDidComplete: function (url, image) {
    var value = this.get('value');

    if (value === url) {
      if (SC.ok(image)) {
        this.didLoad(image);
      } else {
        // if loading it using the cache didn't work, it's useless to try loading the image normally
        this.didError(image);
      }
    }
  },

  /** @private
    Loads an image using a normal Image object, without using the SC.imageQueue.

    @returns YES if it will load, NO otherwise
  */
  _loadImage: function () {
    var value = this.get('value'),
        type = this.get('type'),
        that = this,
        image,
        jqImage;

    if (type === SC.IMAGE_TYPE_URL) {
      image = new Image();

      var errorFunc = function () {
        SC.run(function () {
          that._loadImageDidComplete(value, SC.$error("SC.Image.FailedError", "Image", -101));
        });
      };

      var loadFunc = function () {
        SC.run(function () {
          that._loadImageDidComplete(value, image);
        });
      };

      // Don't grab the jQuery object repeatedly
      jqImage = $(image);

      // Using bind here instead of setting onabort/onerror/onload directly
      // fixes an issue with images having 0 width and height
      jqImage.bind('error', errorFunc);
      jqImage.bind('abort', errorFunc);
      jqImage.bind('load', loadFunc);

      image.src = value;
      return YES;
    }

    return NO;
  },

  /** @private */
  _loadImageDidComplete: function (url, image) {
    var value = this.get('value');

    if (value === url) {
      if (SC.ok(image)) {
        this.didLoad(image);
      } else {
        this.didError(image);
      }
    }
  },

  didLoad: function (image) {
    this.set('status', SC.IMAGE_STATE_LOADED);
    if (!image) image = SC.BLANK_IMAGE;
    this.set('image', image);
    this.displayDidChange();
  },

  didError: function (error) {
    this.set('status', SC.IMAGE_STATE_FAILED);
    this.set('image', SC.BLANK_IMAGE);
  }

});

/**
  Returns YES if the passed value looks like an URL and not a CSS class
  name.
*/
SC.ImageView.valueIsUrl = function (value) {
  return value && SC.typeOf(value) === SC.T_STRING ? value.indexOf('/') >= 0 : NO;
};
