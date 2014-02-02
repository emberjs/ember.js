// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================
/*global ActiveXObject */

/*
  TODO Document SC.Response and SC.XHRResponse
*/

/**
  @class

  A response represents a single response from a server request.  An instance
  of this class is returned whenever you call SC.Request.send().

  @extend SC.Object
  @since SproutCore 1.0
*/
SC.Response = SC.Object.extend(
/** @scope SC.Response.prototype */ {

  /**
    Walk like a duck

    @type Boolean
  */
  isResponse: YES,

  /**
    Becomes true if there was a failure.  Makes this into an error object.

    @type Boolean
    @default NO
  */
  isError: NO,

  /**
    Always the current response

    @field
    @type SC.Response
    @default `this`
  */
  errorValue: function() {
    return this;
  }.property().cacheable(),

  /**
    The error object generated when this becomes an error

    @type SC.Error
    @default null
  */
  errorObject: null,

  /**
    Request used to generate this response.  This is a copy of the original
    request object as you may have modified the original request object since
    then.

    To retrieve the original request object use originalRequest.

    @type SC.Request
    @default null
  */
  request: null,

  /**
    The request object that originated this request series.  Mostly this is
    useful if you are looking for a reference to the original request.  To
    inspect actual properties you should use request instead.

    @field
    @type SC.Request
    @observes request
  */
  originalRequest: function() {
    var ret = this.get('request');
    while (ret.get('source')) { ret = ret.get('source'); }
    return ret;
  }.property('request').cacheable(),

  /**
    Type of request. Must be an HTTP method. Based on the request.

    @field
    @type String
    @observes request
  */
  type: function() {
    return this.getPath('request.type');
  }.property('request').cacheable(),

  /**
    URL of request.

    @field
    @type String
    @observes request
  */
  address: function() {
    return this.getPath('request.address');
  }.property('request').cacheable(),

  /**
    If set then will attempt to automatically parse response as JSON
    regardless of headers.

    @field
    @type Boolean
    @default NO
    @observes request
  */
  isJSON: function() {
    return this.getPath('request.isJSON') || NO;
  }.property('request').cacheable(),

  /**
    If set, then will attempt to automatically parse response as XML
    regardless of headers.

    @field
    @type Boolean
    @default NO
    @observes request
  */
  isXML: function() {
    return this.getPath('request.isXML') || NO;
  }.property('request').cacheable(),

  /**
    Returns the hash of listeners set on the request.

    @field
    @type Hash
    @observes request
  */
  listeners: function() {
    return this.getPath('request.listeners');
  }.property('request').cacheable(),

  /**
    The response status code.

    @type Number
    @default -100
  */
  status: -100, // READY

  /**
    Headers from the response. Computed on-demand

    @type Hash
    @default null
  */
  headers: null,

  /**
    The response body or the parsed JSON. Returns a SC.Error instance
    if there is a JSON parsing error. If isJSON was set, will be parsed
    automatically.

    @field
    @type {Hash|String|SC.Error}
  */
  body: function() {
    // TODO: support XML
    var ret = this.get('encodedBody');
    if (ret && this.get('isJSON')) {
      try {
        ret = SC.json.decode(ret);
      } catch(e) {
        return SC.Error.create({
          message: e.name + ': ' + e.message,
          label: 'Response',
          errorValue: this });
      }
    }
    return ret;
  }.property('encodedBody').cacheable(),

  /**
    @private
    @deprecated Use body instead.

    Alias for body.

    @type Hash|String
    @see #body
  */
  response: function() {
    return this.get('body');
  }.property('body').cacheable(),

  /**
    Set to YES if response is cancelled

    @type Boolean
    @default NO
  */
  isCancelled: NO,

  /**
    Set to YES if the request timed out. Set to NO if the request has
    completed before the timeout value. Set to null if the timeout timer is
    still ticking.

    @type Boolean
    @default null
  */
  timedOut: null,

  /**
    The timer tracking the timeout

    @type Number
    @default null
  */
  timeoutTimer: null,


  // ..........................................................
  // METHODS
  //

  /**
    Called by the request manager when its time to actually run. This will
    invoke any callbacks on the source request then invoke transport() to
    begin the actual request.
  */
  fire: function() {
    var req = this.get('request'),
        source = req ? req.get('source') : null;

    // first give the source a chance to fixup the request and response
    // then freeze req so no more changes can happen.
    if (source && source.willSend) { source.willSend(req, this); }
    req.freeze();

    // if the source did not cancel the request, then invoke the transport
    // to actually trigger the request.  This might receive a response
    // immediately if it is synchronous.
    if (!this.get('isCancelled')) { this.invokeTransport(); }

    // If the request specified a timeout value, then set a timer for it now.
    var timeout = req.get('timeout');
    if (timeout) {
      var timer = SC.Timer.schedule({
        target: this,
        action: 'timeoutReached',
        interval: timeout,
        repeats: NO
      });
      this.set('timeoutTimer', timer);
    }

    // if the transport did not cancel the request for some reason, let the
    // source know that the request was sent
    if (!this.get('isCancelled') && source && source.didSend) {
      source.didSend(req, this);
    }
  },

  /**
    Called by `SC.Response#fire()`. Starts the transport by invoking the
    `SC.Response#receive()` function.
  */
  invokeTransport: function() {
    this.receive(function(proceed) { this.set('status', 200); }, this);
  },

  /**
    Invoked by the transport when it receives a response. The passed-in
    callback will be invoked to actually process the response. If cancelled
    we will pass NO. You should clean up instead.

    Invokes callbacks on the source request also.

    @param {Function} callback the function to receive
    @param {Object} context context to execute the callback in
    @returns {SC.Response} receiver
  */
  receive: function(callback, context) {
    if (!this.get('timedOut')) {
      // If we had a timeout timer scheduled, invalidate it now.
      var timer = this.get('timeoutTimer');
      if (timer) { timer.invalidate(); }
      this.set('timedOut', NO);
    }

    var req = this.get('request');
    var source = req ? req.get('source') : null;

    SC.run(function() {
      // invoke the source, giving a chance to fixup the response or (more
      // likely) cancel the request.
      if (source && source.willReceive) { source.willReceive(req, this); }

      // invoke the callback.  note if the response was cancelled or not
      callback.call(context, !this.get('isCancelled'));

      // if we weren't cancelled, then give the source first crack at handling
      // the response.  if the source doesn't want listeners to be notified,
      // it will cancel the response.
      if (!this.get('isCancelled') && source && source.didReceive) {
        source.didReceive(req, this);
      }

      // notify listeners if we weren't cancelled.
      if (!this.get('isCancelled')) { this.notify(); }
    }, this);

    // no matter what, remove from inflight queue
    SC.Request.manager.transportDidClose(this);
    return this;
  },

  /**
    Default method just closes the connection. It will also mark the request
    as cancelled, which will not call any listeners.
  */
  cancel: function() {
    if (!this.get('isCancelled')) {
      this.set('isCancelled', YES);
      this.cancelTransport();
      SC.Request.manager.transportDidClose(this);
    }
  },

  /**
    Default method just closes the connection.

    @returns {Boolean} YES if this response has not timed out yet, NO otherwise
  */
  timeoutReached: function() {
    // If we already received a response yet the timer still fired for some
    // reason, do nothing.
    if (this.get('timedOut') === null) {
      this.set('timedOut', YES);
      this.cancelTransport();

      // Invokes any relevant callbacks and notifies registered listeners, if
      // any. In the event of a timeout, we set the status to 0 since we
      // didn't actually get a response from the server.
      this.receive(function(proceed) {
        if (!proceed) { return; }

        // Set our value to an error.
        var error = SC.$error("HTTP Request timed out", "Request", 0);
        error.set("errorValue", this);
        this.set('isError', YES);
        this.set('errorObject', error);
        this.set('status', 0);
      }, this);

      return YES;
    }

    return NO;
  },

  /**
    Override with concrete implementation to actually cancel the transport.
  */
  cancelTransport: function() {},

  /**
    @private

    Will notify each listener. Returns true if any of the listeners handle.
  */
  _notifyListeners: function(listeners, status) {
    var notifiers = listeners[status], args, target, action;
    if (!notifiers) { return NO; }

    var handled = NO;
    var len = notifiers.length;

    for (var i = 0; i < len; i++) {
      var notifier = notifiers[i];
      args = (notifier.args || []).copy();
      args.unshift(this);

      target = notifier.target;
      action = notifier.action;
      if (SC.typeOf(action) === SC.T_STRING) { action = target[action]; }

      handled = action.apply(target, args);
    }

    return handled;
  },

  /**
    Notifies any saved target/action. Call whenever you cancel, or end.

    @returns {SC.Response} receiver
  */
  notify: function() {
    var listeners = this.get('listeners'),
        status = this.get('status'),
        baseStat = Math.floor(status / 100) * 100,
        handled = NO;

    if (!listeners) { return this; }

    handled = this._notifyListeners(listeners, status);
    if (!handled && baseStat !== status) { handled = this._notifyListeners(listeners, baseStat); }
    if (!handled && status !== 0) { handled = this._notifyListeners(listeners, 0); }

    return this;
  },

  /**
    String representation of the response object

    @returns {String}
  */
  toString: function() {
    var ret = sc_super();
    return "%@<%@ %@, status=%@".fmt(ret, this.get('type'), this.get('address'), this.get('status'));
  }

});

/**
  @class

  Concrete implementation of SC.Response that implements support for using
  XHR requests.

  @extends SC.Response
  @since SproutCore 1.0
*/
SC.XHRResponse = SC.Response.extend(
/** @scope SC.XHRResponse.prototype */{

  /**
    Implement transport-specific support for fetching all headers
  */
  headers: function() {
    var xhr = this.get('rawRequest'),
        str = xhr ? xhr.getAllResponseHeaders() : null,
        ret = {};

    if (!str) { return ret; }

    str.split("\n").forEach(function(header) {
      var idx = header.indexOf(':'),
          key, value;

      if (idx >= 0) {
        key = header.slice(0,idx);
        value = header.slice(idx + 1).trim();
        ret[key] = value;
      }
    }, this);

    return ret;
  }.property('status').cacheable(),

  /**
    Returns a header value if found.

    @param {String} key The header key
    @returns {String}
  */
  header: function(key) {
    var xhr = this.get('rawRequest');
    return xhr ? xhr.getResponseHeader(key) : null;
  },

  /**
    Implement transport-specific support for fetching tasks

    @field
    @type String
    @default #rawRequest
  */
  encodedBody: function() {
    var xhr = this.get('rawRequest');

    if (!xhr) { return null; }
    if (this.get('isXML')) { return xhr.responseXML; }

    return xhr.responseText;
  }.property('status').cacheable(),

  /**
    Cancels the request.
  */
  cancelTransport: function() {
    var rawRequest = this.get('rawRequest');
    if (rawRequest) { rawRequest.abort(); }
    this.set('rawRequest', null);
  },


  /**
    Starts the transport of the request

    @returns {XMLHttpRequest|ActiveXObject}
  */
  invokeTransport: function() {
    var listener, listeners, listenersForKey,
      rawRequest,
      request = this.get('request'),
      transport, handleReadyStateChange, async, headers;

    rawRequest = this.createRequest();
    this.set('rawRequest', rawRequest);

    // configure async callback - differs per browser...
    async = !!request.get('isAsynchronous');

    if (async) {
      if (window.ProgressEvent) {
        // XMLHttpRequest Level 2

        // Add progress event listeners that were specified on the request.
        listeners = request.get("listeners");
        if (listeners) {
          for (var key in listeners) {

            // Make sure the key is not an HTTP numeric status code.
            if (isNaN(parseInt(key, 10))) {
              // We still allow multiple notifiers on progress events, but we
              // don't try to optimize this by using a single listener, because
              // it is highly unlikely that the developer will add duplicate
              // progress event notifiers and if they did, it is also unlikely
              // that they would expect them to cascade in the way that the
              // status code notifiers do.
              listenersForKey = listeners[key];
              for (var i = 0, len = listenersForKey.length; i < len; i++) {
                listener = listenersForKey[i];

                var keyTarget = key.split('.');
                if (SC.none(keyTarget[1])) {
                  SC.Event.add(rawRequest, keyTarget[0], listener.target, listener.action, listener.args);
                } else {
                  SC.Event.add(rawRequest[keyTarget[0]], keyTarget[1], listener.target, listener.action, listener.args);
                }
              }
            }
          }
        }

        SC.Event.add(rawRequest, 'loadend', this, this.finishRequest);
      } else if (window.XMLHttpRequest && rawRequest.addEventListener) {
        // XMLHttpRequest Level 1 + support for addEventListener (IE prior to version 9.0 lacks support for addEventListener)
        SC.Event.add(rawRequest, 'readystatechange', this, this.finishRequest);
      } else {
        transport = this;
        handleReadyStateChange = function() {
          if (!transport) { return null; }
          var ret = transport.finishRequest();
          if (ret) { transport = null; }
          return ret;
        };
        rawRequest.onreadystatechange = handleReadyStateChange;
      }
    }

    // initiate request.
    rawRequest.open(this.get('type'), this.get('address'), async);

    // headers need to be set *after* the open call.
    headers = this.getPath('request.headers');
    for (var headerKey in headers) {
      rawRequest.setRequestHeader(headerKey, headers[headerKey]);
    }

    // now send the actual request body - for sync requests browser will
    // block here
    rawRequest.send(this.getPath('request.encodedBody'));
    if (!async) { this.finishRequest(); }

    return rawRequest;
  },

  /**
    Creates the correct XMLHttpRequest object for this browser.

    You can override this if you need to, for example, create an XHR on a
    different domain name from an iframe.

    @returns {XMLHttpRequest|ActiveXObject}
  */
  createRequest: function() {
    var rawRequest;

    // check native support first
    if (window.XMLHttpRequest) {
      rawRequest = new XMLHttpRequest();
    } else {
      // There are two relevant Microsoft MSXML object types.
      // See here for more information:
      // http://www.snook.ca/archives/javascript/xmlhttprequest_activex_ie/
      // http://blogs.msdn.com/b/xmlteam/archive/2006/10/23/using-the-right-version-of-msxml-in-internet-explorer.aspx
      // http://msdn.microsoft.com/en-us/library/windows/desktop/ms763742(v=vs.85).aspx
      try { rawRequest = new ActiveXObject("MSXML2.XMLHTTP.6.0");  } catch(e) {}
      try { if (!rawRequest) rawRequest = new ActiveXObject("MSXML2.XMLHTTP");  } catch(e) {}
    }

    return rawRequest;
  },

  /**
    @private

    Called by the XHR when it responds with some final results.

    @param {XMLHttpRequest} rawRequest the actual request
    @returns {Boolean} YES if completed, NO otherwise
  */
  finishRequest: function(evt) {
    var listener, listeners, listenersForKey,
      rawRequest = this.get('rawRequest'),
      readyState = rawRequest.readyState,
      request,
      error, status, msg;

    if (readyState === 4 && !this.get('timedOut')) {
      this.receive(function(proceed) {
        if (!proceed) { return; }

        // collect the status and decide if we're in an error state or not
        status = -1;
        try {
          status = rawRequest.status || 0;
        } catch (e) {}

        // if there was an error - setup error and save it
        if ((status < 200) || (status >= 300)) {

          try {
            msg = rawRequest.statusText || '';
          } catch(e2) {
            msg = '';
          }

          error = SC.$error(msg || "HTTP Request failed", "Request", status);
          error.set("errorValue", this);
          this.set('isError', YES);
          this.set('errorObject', error);
        }

        // set the status - this will trigger changes on related properties
        this.set('status', status);
      }, this);

      // Avoid memory leaks
      if (window.ProgressEvent) {
        // XMLHttpRequest Level 2

        SC.Event.remove(rawRequest, 'loadend', this, this.finishRequest);

        request = this.get('request');
        listeners = request.get("listeners");
        if (listeners) {
          for (var key in listeners) {

            // Make sure the key is not an HTTP numeric status code.
            if (isNaN(parseInt(key, 10))) {
              listenersForKey = listeners[key];
              for (var i = 0, len = listenersForKey.length; i < len; i++) {
                listener = listenersForKey[i];

                var keyTarget = key.split('.');
                if (SC.none(keyTarget[1])) {
                  SC.Event.remove(rawRequest, keyTarget[0], listener.target, listener.action, listener.args);
                } else {
                  SC.Event.remove(rawRequest[keyTarget[0]], keyTarget[1], listener.target, listener.action, listener.args);
                }
              }
            }
          }
        }
      } else if (window.XMLHttpRequest && rawRequest.addEventListener) {
        // XMLHttpRequest Level 1 + support for addEventListener (IE prior to version 9.0 lacks support for addEventListener)
        SC.Event.remove(rawRequest, 'readystatechange', this, this.finishRequest);
      } else {
        rawRequest.onreadystatechange = null;
      }

      return YES;
    }
    return NO;
  }

});
