// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

sc_require('system/response');

/**
  @class

  Implements support for Ajax requests using XHR, XHR 2 and other protocols.

  SC.Request is much like an inverted version of the request/response objects
  you receive when implementing HTTP servers.

  To send a request, you just need to create your request object, configure
  your options, and call send() to initiate the request.

  @extends SC.Object
  @extends SC.Copyable
  @extends SC.Freezable
  @since SproutCore 1.0
*/
SC.Request = SC.Object.extend(SC.Copyable, SC.Freezable,
/** @scope SC.Request.prototype */ {

  // ..........................................................
  // PROPERTIES
  //

  /**
    Sends the request asynchronously instead of blocking the browser. You
    should almost always make requests asynchronous. You can change this
    options with the async() helper option (or simply set it directly).

    @type Boolean
    @default YES
  */
  isAsynchronous: YES,

  /**
    Processes the request and response as JSON if possible. You can change
    this option with the json() helper method.

    @type Boolean
    @default NO
  */
  isJSON: NO,

  /**
    Process the request and response as XML if possible. You can change this
    option with the xml() helper method.

    @type Boolean
    @default NO
  */
  isXML: NO,

  /**
    Specifies whether or not the request will have custom headers attached
    to it. By default, SC.Request attaches X-Requested-With and
    X-SproutCore-Version headers to all outgoing requests. This allows
    you to override that behavior.

    You may want to set this to NO if you are making simple CORS requests
    in compatible browsers. See <a href="http://www.w3.org/TR/cors/">CORS
    Spec for more information.</a>

    TODO: Add unit tests for this feature

    @type Boolean
    @default YES
  */
  attachIdentifyingHeaders: YES,

  /**
    Current set of headers for the request

    @field
    @type Hash
    @default {}
  */
  headers: function() {
    var ret = this._headers;
    if (!ret) { ret = this._headers = {}; }
    return ret;
  }.property().cacheable(),

  /**
    Underlying response class to actually handle this request. Currently the
    only supported option is SC.XHRResponse which uses a traditional
    XHR transport.

    @type SC.Response
    @default SC.XHRResponse
  */
  responseClass: SC.XHRResponse,

  /**
    The original request for copied requests.

    @property SC.Request
    @default null
  */
  source: null,

  /**
    The URL this request to go to.

    @type String
    @default null
  */
  address: null,

  /**
    The HTTP method to use.

    @type String
    @default 'GET'
  */
  type: 'GET',

  /**
    An optional timeout value of the request, in milliseconds. The timer
    begins when SC.Response#fire is actually invoked by the request manager
    and not necessarily when SC.Request#send is invoked. If this timeout is
    reached before a response is received, the equivalent of
    SC.Request.manager#cancel() will be invoked on the SC.Response instance
    and the didReceive() callback will be called.

    An exception will be thrown if you try to invoke send() on a request that
    has both a timeout and isAsyncronous set to NO.

    @type Number
    @default null
  */
  timeout: null,

  /**
    The body of the request.  May be an object is isJSON or isXML is set,
    otherwise should be a string.

    @type Object|String
    @default null
  */
  body: null,

  /**
    The body, encoded as JSON or XML if needed.

    @field
    @type Object|String
    @default #body
  */
  encodedBody: function() {
    // TODO: support XML
    var ret = this.get('body');
    if (ret && this.get('isJSON')) { ret = SC.json.encode(ret); }
    return ret;
  }.property('isJSON', 'isXML', 'body').cacheable(),


  // ..........................................................
  // CALLBACKS
  //

  /**
    Invoked on the original request object just before a copied request is
    frozen and then sent to the server. This gives you one last change to
    fixup the request; possibly adding headers and other options.

    If you do not want the request to actually send, call cancel().

    @param {SC.Request} request A copy of the request object, not frozen
    @param {SC.Response} response The object that will wrap the response
  */
  willSend: function(request, response) {},

  /**
    Invoked on the original request object just after the request is sent to
    the server. You might use this callback to update some state in your
    application.

    The passed request is a frozen copy of the request, indicating the
    options set at the time of the request.

    @param {SC.Request} request A copy of the request object, frozen
    @param {SC.Response} response The object that will wrap the response
    @returns {Boolean} YES on success, NO on failure
  */
  didSend: function(request, response) {},

  /**
    Invoked when a response has been received but not yet processed. This is
    your chance to fix up the response based on the results. If you don't
    want to continue processing the response call response.cancel().

    @param {SC.Request} request A copy of the request object, frozen
    @param {SC.Response} response The object that will wrap the response
  */
  willReceive: function(request, response) {},

  /**
    Invoked after a response has been processed but before any listeners are
    notified. You can do any standard processing on the request at this
    point. If you don't want to allow notifications to continue, call
    response.cancel()

    @param {SC.Request} request A copy of the request object, frozen
    @param {SC.Response} response The object that will wrap the response
  */
  didReceive: function(request, response) {},


  // ..........................................................
  // HELPER METHODS
  //

  /** @private */
  concatenatedProperties: 'COPY_KEYS',

  /** @private */
  COPY_KEYS: ['attachIdentifyingHeaders', 'isAsynchronous', 'isJSON', 'isXML', 'address', 'type', 'timeout', 'body', 'responseClass', 'willSend', 'didSend', 'willReceive', 'didReceive'],

  /**
    Returns a copy of the current request. This will only copy certain
    properties so if you want to add additional properties to the copy you
    will need to override copy() in a subclass.

    @returns {SC.Request} new request
  */
  copy: function() {
    var ret = {},
        keys = this.COPY_KEYS,
        loc = keys.length,
        key, listeners, headers;

    while(--loc >= 0) {
      key = keys[loc];
      if (this.hasOwnProperty(key)) {
        ret[key] = this.get(key);
      }
    }

    if (this.hasOwnProperty('listeners')) {
      ret.listeners = SC.copy(this.get('listeners'));
    }

    if (this.hasOwnProperty('_headers')) {
      ret._headers = SC.copy(this._headers);
    }

    ret.source = this.get('source') || this;

    return this.constructor.create(ret);
  },

  /**
    To set headers on the request object. Pass either a single key/value
    pair or a hash of key/value pairs. If you pass only a header name, this
    will return the current value of the header.

    @param {String|Hash} key
    @param {String} value
    @returns {SC.Request|Object} receiver
  */
  header: function(key, value) {
    var header, headers;

    if (SC.typeOf(key) === SC.T_STRING) {
      headers = this._headers;
      if (arguments.length === 1) {
        return headers ? headers[key] : null;
      } else {
        this.propertyWillChange('headers');
        if (!headers) { headers = this._headers = {}; }
        headers[key] = value;
        this.propertyDidChange('headers');
        return this;
      }

    // handle parsing hash of parameters
    } else if (value === undefined) {
      headers = key;
      this.beginPropertyChanges();
      for(header in headers) {
        if (!headers.hasOwnProperty(header)) { continue; }
        this.header(header, headers[header]);
      }
      this.endPropertyChanges();
      return this;
    }

    return this;
  },

  /**
    Clears the list of headers that were set on this request.
    This could be used by a subclass to blow-away any custom
    headers that were added by the super class.
  */
  clearHeaders: function() {
    this.propertyWillChange('headers');
    this._headers = {};
    this.propertyDidChange('headers');
  },

  /**
    Converts the current request to be asynchronous.

    @param {Boolean} flag YES to make asynchronous, NO or undefined. Default YES.
    @returns {SC.Request} receiver
  */
  async: function(flag) {
    if (flag === undefined) { flag = YES; }
    return this.set('isAsynchronous', flag);
  },

  /**
    Sets the maximum amount of time the request will wait for a response.

    @param {Number} timeout The timeout in milliseconds.
    @returns {SC.Request} receiver
  */
  timeoutAfter: function(timeout) {
    return this.set('timeout', timeout);
  },

  /**
    Converts the current request to use JSON.

    @param {Boolean} flag YES to make JSON, NO or undefined. Default YES.
    @returns {SC.Request} receiver
  */
  json: function(flag) {
    if (flag === undefined) { flag = YES; }
    if (flag) { this.set('isXML', NO); }
    return this.set('isJSON', flag);
  },

  /**
    Converts the current request to use XML.

    @param {Boolean} flag YES to make XML, NO or undefined. Default YES.
    @returns {SC.Request} recevier
  */
  xml: function(flag) {
    if (flag === undefined) { flag = YES; }
    if (flag) { this.set('isJSON', NO); }
    return this.set('isXML', flag);
  },

  /**
    Called just before a request is enqueued.  This will encode the body
    into JSON if it is not already encoded, and set identifying headers
  */
  _prep: function() {
    var hasContentType = !!this.header('Content-Type');

    if (this.get('attachIdentifyingHeaders')) {
      this.header('X-Requested-With', 'XMLHttpRequest');
      this.header('X-SproutCore-Version', SC.VERSION);
    }

    // Set the Content-Type header only if not specified and the request
    // includes a body.
    if (!hasContentType && !!this.get('body')) {
      if (this.get('isJSON')) {
        this.header('Content-Type', 'application/json');
      } else if (this.get('isXML')) {
        this.header('Content-Type', 'text/xml');
      }
    }
    return this;
  },

  /**
    Will fire the actual request. If you have set the request to use JSON
    mode then you can pass any object that can be converted to JSON as the
    body. Otherwise you should pass a string body.

    @param {String|Object} [body]
    @returns {SC.Response} New response object
  */
  send: function(body) {
    // Sanity-check: Be sure a timeout value was not specified if the request
    // is synchronous (because it wouldn't work).
    var timeout = this.get('timeout');
    if (timeout && !this.get('isAsynchronous')) {
      throw new Error("Timeout values cannot be used with synchronous requests");
    } else if (timeout === 0) {
      throw new Error("The timeout value must either not be specified or must be greater than 0");
    }

    if (body) { this.set('body', body); }
    return SC.Request.manager.sendRequest(this.copy()._prep());
  },

  /**
    Resends the current request. This is more efficient than calling send()
    for requests that have already been used in a send. Otherwise acts just
    like send(). Does not take a body argument.

    @returns {SC.Response} new response object
  */
  resend: function() {
    var req = this.get('source') ? this : this.copy()._prep();
    return SC.Request.manager.sendRequest(req);
  },

  /**
    Configures a callback to execute as a request progresses or completes. You
    must pass at least a target and action/method to this and optionally an
    event name or status code.

    You may also pass additional arguments which will then be passed along to
    your callback.

    ## Scoping With Status Codes

    If you pass a status code as the first argument to this method, the
    accompanying notification callback will only be called if the response
    status matches the status code. For example, if you pass 201 (or
    SC.Request.CREATED), the accompanying method will only be called if the
    response status from the server is also 201.

    You can also pass "generic" status codes such as 200, 300, or 400, which
    will be invoked anytime the status code is in the same range and if a more
    specific notifier was not registered first and returned YES.

    Finally, passing a status code of 0 or no status at all will cause your
    method to be executed no matter what the resulting status is unless a
    more specific notifier was registered first and returned YES.

    For example,

        var req = SC.Request.create({type: 'POST'});
        req.notify(201, this, this.reqWasCreated);  // Handle a specific status code
        req.notify(401, this, this.reqWasUnauthorized);  // Handle a specific status code
        req.notify(400, this, this.reqDidRedirect);  // Handle any 4xx status
        req.notify(this, function(response, arg1, arg2) {
          // do something
        }, arg1, arg2);  // Handle any status.  Also, passing additional arguments to the callback handler

    ## Notifying on Progress Events

    If you pass a progress event name your callback will be called each time
    the event fires on the response.  For example, the XMLHttpRequest Level 2
    specification defines several progress events: loadstart, progress, abort,
    error, load, timeout and loadend.  Therefore, when using the default
    SC.Request responseClass, SC.XHRResponse, you can be notified of each of
    these events by simply providing the matching event name.

    Note that many older browsers do not support XMLHttpRequest Level 2.  See
    http://caniuse.com/xhr2 for a list of supported browsers.

    For example,

      var req = SC.Request.create({type: 'GET'});
      req.notify('progress', this, this.reqDidProgress); // Handle 'progress' events
      req.notify('abort', this, this.reqDidAbort); // Handle 'abort' events
      req.notify('upload.progress', this, this.reqUploadDidProgress); // Handle 'progress' events on the XMLHttpRequestUpload
      req.send();

    ## Callback Format

    Your notification callback should expect to receive the Response object as
    the first parameter for status code notifications and the Event object for
    progress notifications; plus any additional parameters that you pass. If
    your callback handles the notification and to prevent further handling, it
    should return YES.

    @param [statusOrEvent] {Number|String} A Number status code or String Event name.
    @param target {Object} The target object for the callback action.
    @param action {String|Function} The method name or function to call on the target.
    @returns {SC.Request} The SC.Request object.
  */
  notify: function(statusOrEvent, target, action) {
    var args;

    // Normalize arguments
    if (SC.typeOf(statusOrEvent) !== SC.T_NUMBER && SC.typeOf(statusOrEvent) !== SC.T_STRING) {
      // Accept multiple additional arguments (Do so before shifting the arguments!)
      args = SC.A(arguments).slice(2);

      // Shift the arguments
      action = target;
      target = statusOrEvent;
      statusOrEvent = 0;
    } else {
      // Accept multiple additional arguments.
      args = SC.A(arguments).slice(3);
    }

    // Prepare listeners for this object and notification target.
    var listeners = this.get('listeners');
    if (!listeners) { this.set('listeners', listeners = {}); }
    if(!listeners[statusOrEvent]) { listeners[statusOrEvent] = []; }

    // Add another listener for the given status code or event name.
    listeners[statusOrEvent].push({target: target, action: action, args: args});

    return this;
  }

});

SC.Request.mixin(
/** @scope SC.Request */ {

  /**
    Helper method for quickly setting up a GET request.

    @param {String} address url of request
    @returns {SC.Request} receiver
  */
  getUrl: function(address) {
    return this.create().set('address', address).set('type', 'GET');
  },

  /**
    Helper method for quickly setting up a POST request.

    @param {String} address url of request
    @param {String} body
    @returns {SC.Request} receiver
  */
  postUrl: function(address, body) {
    var req = this.create().set('address', address).set('type', 'POST');
    if(body) { req.set('body', body) ; }
    return req ;
  },

  /**
    Helper method for quickly setting up a DELETE request.

    @param {String} address url of request
    @returns {SC.Request} receiver
  */
  deleteUrl: function(address) {
    return this.create().set('address', address).set('type', 'DELETE');
  },

  /**
    Helper method for quickly setting up a PUT request.

    @param {String} address url of request
    @param {String} body
    @returns {SC.Request} receiver
  */
  putUrl: function(address, body) {
    var req = this.create().set('address', address).set('type', 'PUT');
    if(body) { req.set('body', body) ; }
    return req ;
  },

  /**
    Helper method for quickly setting up a PATCH request.

    @param {String} address url of request
    @param {String} body
    @returns {SC.Request} receiver
  */
  patchUrl: function(address, body) {
    var req = this.create().set('address', address).set('type', 'PATCH');
    if(body) { req.set('body', body) ; }
    return req ;
  }

});

/**
  @class

  The request manager coordinates all of the active XHR requests. It will
  only allow a certain number of requests to be active at a time; queuing
  any others. This allows you more precise control over which requests load
  in which order.

  @since SproutCore 1.0
*/
SC.Request.manager = SC.Object.create(
/** @scope SC.Request.manager */{

  /**
    Maximum number of concurrent requests allowed. 6 for all browsers.

    @type Number
    @default 6
  */
  maxRequests: 6,

  /**
    Current requests that are inflight.

    @type Array
    @default []
  */
  inflight: [],

  /**
    Requests that are pending and have not been started yet.

    @type Array
    @default []
  */
  pending: [],


  // ..........................................................
  // METHODS
  //

  /**
    Invoked by the send() method on a request. This will create a new low-
    level transport object and queue it if needed.

    @param {SC.Request} request the request to send
    @returns {SC.Object} response object
  */
  sendRequest: function(request) {
    if (!request) { return null; }

    // create low-level transport.  copy all critical data for request over
    // so that if the request has been reconfigured the transport will still
    // work.
    var response = request.get('responseClass').create({ request: request });

    // add to pending queue
    this.get('pending').pushObject(response);
    this.fireRequestIfNeeded();

    return response;
  },

  /**
    Cancels a specific request. If the request is pending it will simply
    be removed. Otherwise it will actually be cancelled.

    @param {Object} response a response object
    @returns {Boolean} YES if cancelled
  */
  cancel: function(response) {
    var pending = this.get('pending'),
        inflight = this.get('inflight'),
        idx;

    if (pending.indexOf(response) >= 0) {
      this.propertyWillChange('pending');
      pending.removeObject(response);
      this.propertyDidChange('pending');
      return YES;
    } else if (inflight.indexOf(response) >= 0) {
      response.cancel();

      inflight.removeObject(response);
      this.fireRequestIfNeeded();
      return YES;
    }

    return NO;
  },

  /**
    Cancels all inflight and pending requests.

    @returns {Boolean} YES if any items were cancelled.
  */
  cancelAll: function() {
    var pendingLen = this.getPath('pending.length'),
      inflightLen = this.getPath('inflight.length'),
      inflight = this.get('inflight'),
      pending = this.get('pending');

    if(pendingLen || inflightLen) {
      // Iterate backwards.
      for( var i = inflightLen - 1; i >= 0; i--) {
        // This will 'eventually' try to remove the request from
        // inflight, but it's not fast enough for us.
        var r = inflight.objectAt(i);
        r.cancel();
      }
      
      // Manually scrub the arrays without screwing up memory pointers.
      pending.replace(0, pendingLen);
      inflight.replace(0, inflightLen);
      
      return YES;
      
    }
    return NO;
  },

  /**
    Checks the inflight queue. If there is an open slot, this will move a
    request from pending to inflight.

    @returns {Object} receiver
  */
  fireRequestIfNeeded: function() {
    var pending = this.get('pending'),
        inflight = this.get('inflight'),
        max = this.get('maxRequests'),
        next;

    if ((pending.length>0) && (inflight.length<max)) {
      next = pending.shiftObject();
      inflight.pushObject(next);
      next.fire();
    }
  },

  /**
    Called by a response/transport object when finishes running. Removes
    the transport from the queue and kicks off the next one.
  */
  transportDidClose: function(response) {
    this.get('inflight').removeObject(response);
    this.fireRequestIfNeeded();
  }

});
