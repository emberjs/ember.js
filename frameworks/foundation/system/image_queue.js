// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

SC.IMAGE_ABORTED_ERROR = SC.$error("SC.Image.AbortedError", "Image", -100) ;

SC.IMAGE_FAILED_ERROR = SC.$error("SC.Image.FailedError", "Image", -101) ;

/**
  @class
  
  The image queue can be used to control the order of loading images.
  
  Images queues are necessary because browsers impose strict limits on the 
  number of concurrent connections that can be open at any one time to any one 
  host. By controlling the order and timing of your loads using this image 
  queue, you can improve the percieved performance of your application by 
  ensuring the images you need most load first.
  
  Note that if you use the SC.ImageView class, it will use this image queue 
  for you automatically.
  
  ## Loading Images
  
  When you need to display an image, simply call the loadImage() method with 
  the URL of the image, along with a target/method callback. The signature of 
  your callback should be:
  
      imageDidLoad: function(imageUrl, imageOrError) {
        //...
      }

  The "imageOrError" parameter will contain either an image object or an error 
  object if the image could not be loaded for some reason.  If you receive an 
  error object, it will be one of SC.IMAGE_ABORTED_ERROR or 
  SC.IMAGE_FAILED_ERROR.
  
  You can also optionally specify that the image should be loaded in the 
  background.  Background images are loaded with a lower priority than 
  foreground images.
  
  ## Aborting Image Loads
  
  If you request an image load but then no longer require the image for some 
  reason, you should notify the imageQueue by calling the releaseImage() 
  method.  Pass the URL, target and method that you included in your original 
  loadImage() request.  
  
  If you have requested an image before, you should always call releaseImage() 
  when you are finished with it, even if the image has already loaded.  This 
  will allow the imageQueue to properly manage its own internal resources.
  
  This method may remove the image from the queue of images that need or load 
  or it may abort an image load in progress to make room for other images.  If 
  the image is already loaded, this method will have no effect.
  
  ## Reloading an Image
  
  If you have already loaded an image, the imageQueue will avoid loading the 
  image again.  However, if you need to force the imageQueue to reload the 
  image for some reason, you can do so by calling reloadImage(), passing the 
  URL.
  
  This will cause the image queue to attempt to load the image again the next 
  time you call loadImage on it.
  
  @extends SC.Object
  @since SproutCore 1.0
*/
SC.imageQueue = SC.Object.create(/** @scope SC.imageQueue.prototype */ {

  /**
    The maximum number of images that can load from a single hostname at any
    one time.  For most browsers 4 is a reasonable number, though you may 
    tweak this on a browser-by-browser basis.
  */
  loadLimit: 4,
  
  /**
    The number of currently active requests on the queue. 
  */
  activeRequests: 0,
  
  /**
    Loads an image from the server, calling your target/method when complete.
    
    You should always pass at least a URL and optionally a target/method.  If 
    you do not pass the target/method, the image will be loaded in background 
    priority.  Usually, however, you will want to pass a callback to be 
    notified when the image has loaded.  Your callback should have a signature 
    like:

        imageDidLoad: function(imageUrl, imageOrError) { .. }

    If you do pass a target/method you can optionally also choose to load the 
    image either in the foreground or in the background.  The imageQueue 
    prioritizes foreground images over background images.  This does not impact 
    how many images load at one time.
    
    @param {String} url
    @param {Object} target
    @param {String|Function} method
    @param {Boolean} isBackgroundFlag
    @returns {SC.imageQueue} receiver
  */
  loadImage: function(url, target, method, isBackgroundFlag) {
    // normalize params
    var type = SC.typeOf(target);
    if (SC.none(method) && SC.typeOf(target)===SC.T_FUNCTION) {
      target = null; method = target ;
    }
    if (SC.typeOf(method) === SC.T_STRING) {
      method = target[method];      
    }
    // if no callback is passed, assume background image.  otherwise, assume
    // foreground image.
    if (SC.none(isBackgroundFlag)) {
      isBackgroundFlag = SC.none(target) && SC.none(method);
    }
    
    // get image entry in queue.  If entry is loaded, just invoke callback
    // and quit.
    var entry = this._imageEntryFor(url) ;
    if (entry.status === this.IMAGE_LOADED) {
      if (method) method.call(target || entry.image, entry.url, entry.image);
      
    // otherwise, add to list of callbacks and queue image.
    } else {
      if (target || method) this._addCallback(entry, target, method);
      entry.retainCount++; // increment retain count, regardless of callback
      this._scheduleImageEntry(entry, isBackgroundFlag);
    }
  },
  
  /**
    Invoke this method when you are finished with an image URL.  If you 
    passed a target/method, you should also pass it here to remove it from
    the list of callbacks.
    
    @param {String} url
    @param {Object} target
    @param {String|Function} method
    @returns {SC.imageQueue} receiver
  */
  releaseImage: function(url, target, method) {
    // get entry.  if there is no entry, just return as there is nothing to 
    // do.
    var entry = this._imageEntryFor(url, NO) ;
    if (!entry) return this ;
    
    // there is an entry, decrement the retain count.  If <=0, delete!
    if (--entry.retainCount <= 0) {
      this._deleteEntry(entry); 
    
    // if >0, just remove target/method if passed
    } else if (target || method) {
      // normalize
      var type = SC.typeOf(target);
      if (SC.none(method) && SC.typeOf(target)===SC.T_FUNCTION) {
        target = null; method = target ;
      }
      if (SC.typeOf(method) === SC.T_STRING) {
        method = target[method];      
      }

      // and remove
      this._removeCallback(entry, target, method) ;
    }
  },

  /** 
    Forces the image to reload the next time you try to load it.
  */
  reloadImage: function(url) {
    var entry = this._imageEntryFor(url, NO); 
    if (entry && entry.status===this.IMAGE_LOADED) {
      entry.status = this.IMAGE_WAITING;
    }
  },
  
  /**
    Initiates a load of the next image in the image queue.  Normally you will
    not need to call this method yourself as it will be initiated 
    automatically when the queue becomes active.
  */
  loadNextImage: function() {
    var entry = null, queue;

    // only run if we don't have too many active request...
    if (this.get('activeRequests')>=this.get('loadLimit')) return; 
    
    // first look in foreground queue
    queue = this._foregroundQueue ;
    while(queue.length>0 && !entry) entry = queue.shift();
    
    // then look in background queue
    if (!entry) {
      queue = this._backgroundQueue ;
      while(queue.length>0 && !entry) entry = queue.shift();
    }
    this.set('isLoading', !!entry); // update isLoading...
    
    // if we have an entry, then initiate an image load with the proper 
    // callbacks.
    if (entry) {
      // var img = (entry.image = new Image()) ;
      var img = entry.image ;
      if(!img) return;

      // Using bind here instead of setting onabort/onerror/onload directly
      // fixes an issue with images having 0 width and height
      $(img).bind('abort', this._imageDidAbort);
      $(img).bind('error', this._imageDidError);
      $(img).bind('load', this._imageDidLoad);
      img.src = entry.url ;
      
      // add to loading queue.
      this._loading.push(entry) ;
    
      // increment active requests and start next request until queue is empty
      // or until load limit is reached.
      this.incrementProperty('activeRequests');
      this.loadNextImage();
    } 
  },
  
  // ..........................................................
  // SUPPORT METHODS
  // 

  /** @private Find or create an entry for the URL. */
  _imageEntryFor: function(url, createIfNeeded) {
    if (createIfNeeded === undefined) createIfNeeded = YES;
    var entry = this._images[url] ;
    if (!entry && createIfNeeded) {
      var img = new Image() ;
      entry = this._images[url] = { 
        url: url, status: this.IMAGE_WAITING, callbacks: [], retainCount: 0, image: img
      };
      img.entry = entry ; // provide a link back to the image
    } else if (entry && entry.image === null) {
    	// Ensure that if we retrieve an entry that it has an associated Image,
    	// since failed/aborted images will have had their image property nulled.
    	entry.image = new Image();
    	entry.image.entry = entry;
    }
    return entry ;
  },
  
  /** @private deletes an entry from the image queue, descheduling also */
  _deleteEntry: function(entry) {
    this._unscheduleImageEntry(entry) ;
    delete this._images[entry.url];    
  },
  
  /** @private 
    Add a callback to the image entry.  First search the callbacks to make
    sure this is only added once.
  */
  _addCallback: function(entry, target, method) {
    var callbacks = entry.callbacks;

    // try to find in existing array
    var handler = callbacks.find(function(x) {
      return x[0]===target && x[1]===method;
    }, this);
    
    // not found, add...
    if (!handler) callbacks.push([target, method]);
    callbacks = null; // avoid memory leaks
    return this ;
  },
  
  /** @private
    Removes a callback from the image entry.  Removing a callback just nulls
    out that position in the array.  It will be skipped when executing.
  */
  _removeCallback: function(entry, target, method) {
    var callbacks = entry.callbacks ;
    callbacks.forEach(function(x, idx) {
      if (x[0]===target && x[1]===method) callbacks[idx] = null;
    }, this);
    callbacks = null; // avoid memory leaks
    return this ;
  },
  
  /** @private 
    Adds an entry to the foreground or background queue to load.  If the 
    loader is not already running, start it as well.  If the entry is in the
    queue, but it is in the background queue, possibly move it to the
    foreground queue.
  */
  _scheduleImageEntry: function(entry, isBackgroundFlag) {

    var background = this._backgroundQueue ;
    var foreground = this._foregroundQueue ;
    
    // if entry is loaded, nothing to do...
    if (entry.status === this.IMAGE_LOADED) return this;

    // if image is already in background queue, but now needs to be
    // foreground, simply remove from background queue....
    if ((entry.status===this.IMAGE_QUEUED) && !isBackgroundFlag && entry.isBackground) {
      background[background.indexOf(entry)] = null ;
      entry.status = this.IMAGE_WAITING ;
    }
    
    // if image is not in queue already, add to queue.
    if (entry.status!==this.IMAGE_QUEUED) {
      var queue = (isBackgroundFlag) ? background : foreground ;
      queue.push(entry);
      entry.status = this.IMAGE_QUEUED ;
      entry.isBackground = isBackgroundFlag ;
    }
    
    // if the image loader is not already running, start it...
    if (!this.isLoading) this.invokeLater(this.loadNextImage, 100);
    this.set('isLoading', YES);
    
    return this ; // done!
  },
  
  /** @private
    Removes an entry from the foreground or background queue.  
  */
  _unscheduleImageEntry: function(entry) {
    // if entry is not queued, do nothing
    if (entry.status !== this.IMAGE_QUEUED) return this ;
    
    var queue = entry.isBackground ? this._backgroundQueue : this._foregroundQueue ;
    queue[queue.indexOf(entry)] = null; 
    
    // if entry is loading, abort it also.  Call local abort method in-case
    // browser decides not to follow up.
    if (this._loading.indexOf(entry) >= 0) {
      // In some cases queue.image is undefined. Is it ever defined?
      if (queue.image) queue.image.abort();
      this.imageStatusDidChange(entry, this.ABORTED);
    }
    
    return this ;
  },
  
  /** @private invoked by Image().  Note that this is the image instance */
  _imageDidAbort: function() {
    SC.run(function() {
      SC.imageQueue.imageStatusDidChange(this.entry, SC.imageQueue.ABORTED);
    }, this);
  },
  
  _imageDidError: function() {
    SC.run(function() {
      SC.imageQueue.imageStatusDidChange(this.entry, SC.imageQueue.ERROR);
    }, this);
  },
  
  _imageDidLoad: function() {
    SC.run(function() {
      SC.imageQueue.imageStatusDidChange(this.entry, SC.imageQueue.LOADED);
    }, this);
  },

  /** @private called whenever the image loading status changes.  Notifies
    items in the queue and then cleans up the entry.
  */
  imageStatusDidChange: function(entry, status) {
    if (!entry) return; // nothing to do...
    
    var url = entry.url ;
    
    // notify handlers.
    var value ;
    switch(status) {
      case this.LOADED:
        value = entry.image;
        break;
      case this.ABORTED:
        value = SC.IMAGE_ABORTED_ERROR;
        break;
      case this.ERROR:
        value = SC.IMAGE_FAILED_ERROR ;
        break;
      default:
        value = SC.IMAGE_FAILED_ERROR ;
        break;
    }
    entry.callbacks.forEach(function(x){
      var target = x[0], method = x[1];
      method.call(target, url, value);
    },this);
    
    // now clear callbacks so they aren't called again.
    entry.callbacks = [];
    
    // finally, if the image loaded OK, then set the status.  Otherwise
    // set it to waiting so that further attempts will load again
    entry.status = (status === this.LOADED) ? this.IMAGE_LOADED : this.IMAGE_WAITING ;
    
    // now cleanup image...
    var image = entry.image ;
    if (image) {
      image.onload = image.onerror = image.onabort = null ; // no more notices
      if (status !== this.LOADED) entry.image = null;
    }

    // remove from loading queue and periodically compact
    this._loading[this._loading.indexOf(entry)]=null;
    if (this._loading.length > this.loadLimit*2) {
      this._loading = this._loading.compact();
    }
    
    this.decrementProperty('activeRequests');
    this.loadNextImage() ;
  },
  
  init: function() {
    sc_super();
    this._images = {};
    this._loading = [] ;
    this._foregroundQueue = [];
    this._backgroundQueue = [];
  },
  
  IMAGE_LOADED: "loaded",
  IMAGE_QUEUED: "queued",
  IMAGE_WAITING: "waiting",
  
  ABORTED: 'aborted',
  ERROR: 'error',
  LOADED: 'loaded'
});
