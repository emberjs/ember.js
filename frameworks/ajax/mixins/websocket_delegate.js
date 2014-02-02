// ==========================================================================
// Project:   SC.WebSocket
// Copyright: ©2013 Nicolas BADIA and contributors
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

/** 
  @namespace
  
  A WebSocket Delegate is consulted by `SC.WebSocket` when events are received.
  You may want to handle this events before propagate them to eventual listeners.

  Example:

    var ws = SC.WebSocket.create({
      server: 'ws://server',
      delegate: MyApp.WebSocketDelegate
    });
  
  @since SproutCore 1.11
  @author Nicolas BADIA
*/
SC.WebSocketDelegate = {
  
  /**
    Walk like a duck

    @type Boolean
  */
  isWebSocketDelegate: true,

  // ..........................................................
  // CALLBACKS
  //

  /**
    The passed webSocket connection is open.

    @param webSocket {SC.WebSocket} The webSocket object
    @param event {Event}
  */
  webSocketDidOpen: function (webSocket, event) {},

  /**
    A message has been received. Before processing it, you have
    a chance to check it. 

    For example, if `isJSON` is true, you will want to check if the message
    is a correct JSON.

    @param webSocket {SC.WebSocket} The webSocket object
    @param data {String}  
    @returns {String|Boolean} Return true to prevent further handling
  */
  webSocketDidReceiveMessage: function (webSocket, data) {
    switch(data) {
      case 'ping': return true; break;
    }

    if (this.get('isJSON')) {
      try {
        JSON.parse(data);
      }
      catch(e) {
        return true;
      }
    }
  },

  /**
    The websocket connection is close. Return true to prevent a
    reconnection or further handling.

    @param webSocket {SC.WebSocket} The webSocket object
    @param closeEvent {CloseEvent} The closeEvent
    @returns {Boolean} Return true to prevent further handling
  */
  webSocketDidClose: function (webSocket, closeEvent) {},

  /**
    Call when an error occur.

    @param webSocket {SC.WebSocket} The webSocket object
    @param event {Event} 
    @returns {Boolean} Return true to prevent further handling
  */
  webSocketDidError: function (webSocket, event) {},

};

