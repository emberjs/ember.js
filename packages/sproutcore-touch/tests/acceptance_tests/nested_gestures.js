//// ==========================================================================
// Project:  SproutCore Runtime
// Copyright: ©2011 Strobe Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

var set = SC.set;
var get = SC.get;
var outerdiv;
var application;

var pinchStartWasCalled = false;
var pinchChangeWasCalled = false;
var pinchEndWasCalled = false;
var panStartWasCalled = false;
var panChangeWasCalled = false;
var panEndWasCalled = false;

module("Nested gesture recognizers", {
  setup: function() {
    application = SC.Application.create();
    pinchStartWasCalled = false;
    pinchChangeWasCalled = false;
    pinchEndWasCalled = false;

    panStartWasCalled = false;
    panChangeWasCalled = false;
    panEndWasCalled = false;

    application.PinchPanView = SC.ContainerView.extend({
      scale: 1,

      translate: {
        x: 0,
        y: 0
      },

      pinchStart: function(recognizer) {
        pinchStartWasCalled = true;
        this.scale = recognizer.get('scale');
      },

      pinchChange: function(recognizer) {
        pinchChangeWasCalled = true;
        this.scale = recognizer.get('scale');
      },

      pinchEnd: function(recognizer) {
        pinchChangeWasCalled = true;
        this.scale = recognizer.get('scale');
      },

      panStar: function(recognizer) {
        panStartWasCalled = true;
        this.translate = recognizer.get('translation');
      },

      panChange: function(recognizer) {
        panChangeWasCalled = true;
        this.translate = recognizer.get('translation');
      },

      panEnd: function(recognizer) {
        panEndWasCalled = true;
        this.translate = recognizer.get('translation');
      },
    });

    application.OuterView = application.PinchPanView.extend({
      elementId: 'outer-div',
      childViews: ['nestedView'],

      nestedView: application.PinchPanView.extend({
        classNames: ['nestedId'],
      })
    });

    SC.run(function() {
      outerdiv = application.OuterView.create();
      outerdiv.append();
    });

  },

  teardown: function() {
    application.destroy();
  }
});

test("Nested event managers should get called appropriately", function() {

  // ====================================
  // Make it possible

  var touchEvent = jQuery.Event('touchstart');
  touchEvent['originalEvent'] = {
    targetTouches: [
      {
        identifier: 0,
        pageX: 0,
        pageY: 10
      },
      {
        identifier: 1,
        pageX: 0,
        pageY: 10
      }
    ]
  };

  $('#nested-div').trigger(touchEvent);

  // ====================================
  // Start with pan

  touchEvent = jQuery.Event('touchstart');
  touchEvent['originalEvent'] = {
    changedTouches: [
      {
        identifier: 0,
        pageX: 10,
        pageY: 10
      },
      {
        identifier: 1,
        pageX: 10,
        pageY: 10
      }
    ]
  };

  $('#nested-div').trigger(touchEvent);
});
