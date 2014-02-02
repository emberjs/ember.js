// ==========================================================================
// Project:   SC.WebSocket
// Copyright: ©2013 Nicolas BADIA and contributors
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

sc_require('mixins/websocket_delegate');

/**
  @class

  Implements support for WebSocket.
  
  Example Usage:

    var ws = SC.WebSocket.create({
      server: 'ws://server',
    }).connect();
    
    ws.notify(this, 'wsReceivedMessage');
    
    ws.send('message');

  @since SproutCore 1.11
  @extends SC.Object
  @extends SC.DelegateSupport
  @author Nicolas BADIA
*/
SC.WebSocket = SC.Object.extend(SC.DelegateSupport, SC.WebSocketDelegate, {
  
  /**
    URL of the WebSocket server.

    @type String
    @default null
  */
  server: null,

  /**
    Determines if the browser support the WebSocket protocol.

    @type Boolean
    @default null
    @readOnly
  */
  isSupported: null,

  /**
    Determines if the connection is open or not.

    @type Boolean
    @readOnly
  */
  isConnected: false,

  /**
    In order to handle authentification, set `isAuth` to NO in the 
    `webSocketDidOpen` delegate method just after sending a request to 
    authentificate the connection. This way, any futher message will be put in 
    queue until the server tels you the connection is authentified. Once it
    did, you should set `isAuth` to YES to resume the queue.

    If you don't need authentification, leave `isAuth` to null.

    @type Boolean
    @default null
  */  
  isAuth: null,

  /**
    Processes the messages as JSON if possible.

    @type Boolean
    @default true
  */
  isJSON: true,

  /**
    A WebSocket delegate.
    
    @see SC.WebSocketDelegate
    @type {SC.WebSocketDelegate}
    @default null
  */
  delegate: null,

  /**
    Determines if we should attempt to try an automatic reconnection
    if the connection is close.

    @type {SC.WebSocketDelegate}
    @default null
  */
  autoReconnect: true,

  /**
    The interval in milliseconds to waits before trying a reconnection.

    @type {SC.WebSocketDelegate}
    @default null
  */
  reconnectInterval: 10000, // 10 secondes


  // ..........................................................
  // PUBLIC METHODS
  //

  /**
    Call this method to open a connection.

    @returns {SC.WebSocket} 
  */
  connect: function() {
    var that = this;

    if (this.isSupported === null) this.set('isSupported', !!window.WebSocket);

    if (!this.isSupported || this.socket) return this;

    try {
      var socket = this.socket = new WebSocket(this.get('server')); 

      socket.onopen = function() {
        SC.RunLoop.begin(); 
        that.onOpen.apply(that, arguments); 
        SC.RunLoop.end(); 
      };

      socket.onmessage = function() {
        SC.RunLoop.begin(); 
        that.onMessage.apply(that, arguments); 
        SC.RunLoop.end(); 
      };

      socket.onclose = function() {
        SC.RunLoop.begin(); 
        that.onClose.apply(that, arguments); 
        SC.RunLoop.end(); 
      };

      socket.onerror = function() {
        SC.RunLoop.begin(); 
        that.onError.apply(that, arguments); 
        SC.RunLoop.end(); 
      };
    } catch(e) {
      SC.error('An error has occurred while connnecting to the websocket server: '+e);
    }

    return this;
  },

  /**
    Call this method to close a connection.
    
    @param code {Number} A numeric value indicating the status code explaining why the connection is being closed. If this parameter is not specified, a default value of 1000 (indicating a normal "transaction complete" closure) is assumed.
    @param reason {String} A human-readable string explaining why the connection is closing. This string must be no longer than 123 bytes of UTF-8 text (not characters).
    @returns {SC.WebSocket} 
  */
  close: function(code, reason) {
    var socket = this.socket;

    if (socket && socket.readyState === SC.WebSocket.OPEN) {
      this.socket.close(code, reason);
    }

    return this;
  },

  /**
    Configures a callback to execute when an event happen. You must pass 
    at least a target and action/method to this and optionally an event name.

    You may also pass additional arguments which will then be passed along to
    your callback.

    Example:
        
        var websocket = SC.WebSocket.create({ server: 'ws://server' }).connect();

        webSocket.notify('onopen', this, 'wsWasOpen');
        webSocket.notify('onmessage', this, 'wsReceivedMessage'); // You can ommit onmessage here
        webSocket.notify('onclose', this, 'wsWasClose');
        webSocket.notify('onerror', this, 'wsDidError');

    ## Callback Format

    Your notification callback should expect to receive the WebSocket object as
    the first parameter and the event or message; plus any additional parameters that you pass. If your callback handles the notification and to prevent further handling, it
    should return YES.
    
    @param target {String} String Event name.
    @param target {Object} The target object for the callback action.
    @param action {String|Function} The method name or function to call on the target.
    @returns {SC.WebSocket} The SC.WebSocket object.
  */
  notify: function(event, target, action) {
    var args;

    if (SC.typeOf(event) !== SC.T_STRING) {
      args = SC.A(arguments).slice(2);

      // Shift the arguments
      action = target;
      target = event;
      event = 'onmessage';
    } else {
      args = SC.A(arguments).slice(3);
    }

    var listeners = this.get('listeners');
    if (!listeners) { this.set('listeners', listeners = {}); }
    if(!listeners[event]) { listeners[event] = []; }

    //@if(debug)
    for (var i = listeners[event].length - 1; i >= 0; i--) {
      var listener = listeners[event][i];
      if (listener.event === event && listener.target === target && listener.action === action) {
        SC.warn("Developer Warning: This listener is already defined.");
      }
    };
    //@endif

    // Add another listener for the given event name.
    listeners[event].push({target: target, action: action, args: args});

    return this;
  },

  /**
    Send the passed message. If the connection is not yet open or anthentified,
    the message will be put in the queue.
    
    @param message {String|Object} The message to send.
    @returns {SC.WebSocket} 
  */
  send: function(message) {
    if (this.isConnected === true && this.isAuth !== false) {
      if (this.isJSON) {
        var message = JSON.stringify(message);
      }

      this.socket.send(message);
    }
    else {
      this.addToQueue(message);
    }
    return this;
  },

  // ..........................................................
  // PRIVATE METHODS
  //

  /**
     @private
  */
  onOpen: function(event) {
    var del = this.get('objectDelegate');

    this.set('isConnected', true);

    var ret = del.webSocketDidOpen(this, event);
    if (ret !== true) this._notifyListeners('onopen', event);

    this.fireQueue();
  },

  /**
     @private
  */
  onMessage: function(messageEvent) {
    if (messageEvent) {
      var message = data = messageEvent.data,
        del = this.get('objectDelegate'),
        ret = del.webSocketDidReceiveMessage(this, data);

      if (ret !== true) {
        if (this.isJSON) {
          message = JSON.parse(data);
        }
        this._notifyListeners('onmessage', message);
      }
    }

    // If there is message in the queue, we fire them
    this.fireQueue();
  },

  /**
     @private
  */
  onClose: function(closeEvent) {
    var del = this.get('objectDelegate');

    this.set('isConnected', false);
    this.set('isAuth', null);
    this.socket = null;

    var ret = del.webSocketDidClose(this, closeEvent);
    
    if (ret !== true) {
      this._notifyListeners('onclose', closeEvent);
      this.tryReconnect();
    }
  },

  /**
     @private
  */
  onError: function(event) {
    var del = this.get('objectDelegate'), 
      ret = del.webSocketDidError(this, event);

    if (ret !== true) this._notifyListeners('onerror', event);
  },

  /**
     @private

     Add the message to the queue
  */
  addToQueue: function(message) {
    var queue = this.queue;
    if (!queue) { this.queue = queue = []; }

    queue.push(message);
  },

  /**
     @private

     Send the messages from the queue.
  */
  fireQueue: function() {
    var queue = this.queue;
    if (!queue || queue.length === 0) return;

    queue = SC.A(queue);
    this.queue = null;

    for (var i = 0, len = queue.length; i < len; i++) {
      var message = queue[i];
      this.send(message);
    }
  },

  /**
    @private
  */
  tryReconnect: function() {
    if (!this.get('autoReconnect')) return;

    var that = this;
    setTimeout(function() { that.connect(); }, this.get('reconnectInterval'));
  },

  /**
    @private

    Will notify each listener. Returns true if any of the listeners handle.
  */
  _notifyListeners: function(event, message) {
    var listeners = (this.listeners || {})[event], notifier, target, action, args;
    if (!listeners) { return NO; }

    var handled = NO,
      len = listeners.length;

    for (var i = 0; i < len; i++) {
      notifier = listeners[i];
      args = (notifier.args || []).copy();
      args.unshift(message);
      args.unshift(this);

      target = notifier.target;
      action = notifier.action;
      if (SC.typeOf(action) === SC.T_STRING) { action = target[action]; }

      handled = action.apply(target, args);
      if (handled === true) return handled;
    }

    return handled;
  },

  /**
    @private
  */
  objectDelegate: function () {
    var del = this.get('delegate');
    return this.delegateFor('isWebSocketDelegate', del, this);
  }.property('delegate').cacheable(),

  // ..........................................................
  // PRIVATE PROPERTIES
  //

  /**
    @private

    @type WebSocket
    @default null
  */
  socket: null,
  
  /**
    @private

    @type Object
    @default null
  */
  listeners: null,
  
  /**
    @private

    Messages that needs to be send once the connection is open.

    @type Array
    @default null
  */
  queue: null,

});

// Class Methods
SC.WebSocket.mixin( /** @scope SC.WebSocket */ {

  // ..........................................................
  // CONSTANTS
  //

  /**
    The connection is not yet open.

    @static
    @constant
    @type Number
    @default 0
  */
  CONNECTING: 0,

  /**
    The connection is open and ready to communicate.

    @static
    @constant
    @type Number
    @default 1
  */
  OPEN: 1,

  /**
    The connection is in the process of closing.

    @static
    @constant
    @type Number
    @default 2
  */
  CLOSING: 2,

  /**
    The connection is closed or couldn't be opened.

    @static
    @constant
    @type Number
    @default 3
  */
  CLOSED: 3,

});
