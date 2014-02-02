// ==========================================================================
// Project:   SC.WebSocket
// Copyright: ©2013 Nicolas BADIA and contributors
// License:   Licensed under MIT license (see license.js)
// ==========================================================================
// SC.WebSocket Base Tests

var url = 'ws://url';

SC.WebSocket.reopen({
  server: url,
  autoReconnect: false
});

module("SC.WebSocket", {
  setup: function () {},
  teardown: function () {}
});

test("Basic Requirements", function () {
  ok(SC.WebSocket, "SC.WebSocket is defined");

  var webSocket = SC.WebSocket.create().connect();

  ok(webSocket.isSupported === true, "webSocket should be supported");
  ok(webSocket.socket !== null, "webSocket.socket object is not null");
});

test("Test nofitications", function () {
  var webSocket = SC.WebSocket.create({
      isJSON: false
    }).connect(),
    socket = webSocket.socket,
    didNotifyOnOpen = didNotifySecondOnOpenListener = false,
    didNotifyOnMessage = false,
    didNotifyOnClose = didNotifySecondOnCloseListener = false,
    didNotifyOnError = false;

  webSocket.notify('onopen', this, function(websocket, response, arg) {
    equals(response.type, 'open', "response type should be 'open'");
    equals(arg, 'arg', "arg should be 'arg'");
    didNotifyOnOpen = true;
  }, 'arg');

  webSocket.notify('onopen', this, function(websocket, response, arg) {
    didNotifySecondOnOpenListener = true;
  });

  webSocket.notify('onmessage', this, function(websocket, response) {
    equals(response.type, 'message', "response type should be 'message'");
    didNotifyOnMessage = true;
  });

  webSocket.notify('onclose', this, function(websocket, response) {
    equals(response.type, 'close', "response type should be 'close'");
    didNotifyOnClose = true;
    return true;
  });
  
  webSocket.notify('onclose', this, function(websocket, response) {
    didNotifySecondOnCloseListener = true;
  });

  webSocket.notify('onerror', this, function(websocket, response) {
    equals(response.type, 'error', "response type should be 'error'");
    didNotifyOnError = true;
  });


  stop(100);
  setTimeout(function () {
    socket.onopen({ type: 'open' });
    socket.onmessage({ data: { type: 'message' } });
    socket.onclose({ type: 'close' });
    socket.onerror({ type: 'error' });

    ok(didNotifyOnOpen, "onopen listener should have been notified");
    ok(didNotifySecondOnOpenListener, "second onopen listener should have been notified");
    ok(didNotifyOnMessage, "onmessage listener should have been notified");
    ok(didNotifyOnClose, "onclose listener should have been notified");
    ok(!didNotifySecondOnCloseListener, "second onclose listener should not have been notified");
    ok(didNotifyOnError, "onerror listener should have been notified");

    window.start();
  }, 50);
});

test("Test delegate handling", function () {
  var webSocket = SC.WebSocket.create({
    delegate: SC.Object.create(SC.WebSocketDelegate, {
      webSocketDidOpen: function (webSocket, event) { return true; },
      webSocketDidReceiveMessage: function (webSocket, data) { return true; },
      webSocketDidClose: function (webSocket, closeEvent) { return true; },
      webSocketDidError: function (webSocket, event) { return true; },
    })
  }).connect(),
  socket = webSocket.socket,
  count = 0;

  webSocket.notify('onopen', this, function () { count++; });
  webSocket.notify('onmessage', this, function () { count++; });
  webSocket.notify('onclose', this, function () { count++; });
  webSocket.notify('onerror', this, function () { count++; });

  stop(100);
  setTimeout(function () {
    socket.onopen({ type: 'open' });
    socket.onmessage({ data: { type: 'message' } });
    socket.onclose({ type: 'close' });
    socket.onerror({ type: 'error' });

    equals(count, 0, "listeners should not have been notified");
    window.start();
  }, 50);
});

test("Test auto reconnection", function () {
  var count = 0,
    webSocket = SC.WebSocket.create({
      autoReconnect: true,
      reconnectInterval: 10,
      
      webSocketDidClose: function (webSocket, closeEvent) {
        count++;
        if (count > 1) {
          return true;
        }
      },
    }).connect();
  
  stop(100);
  setTimeout(function () {
    ok(count > 1, "should have try a reconnection");
    window.start();
  }, 50);
});

test("Test queue", function () {
  var count = 0,
    webSocket = SC.WebSocket.create({
      onClose: function(closeEvent) {},
    }).connect(),
    socket = webSocket.socket;
  

  webSocket.socket.send =  function() { 
    count++;
  }

  webSocket.send('message1');
  webSocket.send('message2');

  equals(webSocket.queue.length, 2, "2 messages should be in the queue");

  socket.onopen();

  equals(webSocket.queue, null, "the queue should be empty");
});

test("Test authentification", function () {
  var count = 0,
    webSocket = SC.WebSocket.create({
      onClose: function(closeEvent) {},

      delegate: SC.Object.create(SC.WebSocketDelegate, {
        webSocketDidOpen: function (webSocket, event) { 
          webSocket.send({ op: "auth", clientId: 'xxx' });
          webSocket.set('isAuth', false);
        },
        webSocketDidReceiveMessage: function (webSocket, data) { 
          if (data === 'isAuth') {
            webSocket.set('isAuth', true);
            return true;
          }
        },
      })
    }).connect(),
    socket = webSocket.socket;
  
  webSocket.socket.send =  function() {}

  ok(!webSocket.isAuth, "the connection should not be authentified");

  socket.onopen();

  webSocket.send('message1');

  equals(webSocket.queue.length, 1, "1 message should be in the queue");

  socket.onmessage({ data: 'isAuth' });

  webSocket.send('message2');

  ok(webSocket.isAuth, "the connection should be authentified");
  equals(webSocket.queue, null, "the queue should be empty");
});
